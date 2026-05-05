/**
 * POST /api/fixes/revert
 *
 * Body: { fixIds: string[] }
 *
 * For each fix the user owns, dispatches platform-specific revert logic:
 *   - GitHub → write parent state of committed_sha back at HEAD (new revert commit)
 *   - WordPress → PATCH `previous_value` back into the meta field, alt text, or strip schema
 *
 * Always processes every requested ID even if some fail. Returns a per-fix result list
 * so the UI can show "5 of 7 reverted, 2 failed" with reasons.
 *
 * Auth: x-api-key (extension API key, premium-gated).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabaseServer";
import { PAID_PLANS } from "@/utils/managedPlanCta";
import { writeAuditLog, ipFromRequest } from "@/services/auditLog";
import { revertGithubFix } from "@/features/crawlability/services/revertFix/githubRevert";
import { revertWordpressFix } from "@/features/crawlability/services/revertFix/wordpressRevert";

export const maxDuration = 60;

const Schema = z.object({
  fixIds: z.array(z.string().uuid()).min(1).max(50),
});

interface ConnectionRow {
  id: string;
  business_id: string;
  platform: string;
  credentials: { iv: string; ciphertext: string; tag: string };
  repo: string | null;
  branch: string | null;
  site_url: string | null;
  status: string;
}

interface FixRow {
  id: string;
  business_id: string;
  finding_id: string;
  fix_type: string;
  platform: string;
  status: string;
  committed_sha: string | null;
  commit_url: string | null;
  file_path: string | null;
  previous_value: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: keyRows, error: keyErr } = await supabase.rpc("validate_extension_api_key", {
    p_key: apiKey,
  });
  if (keyErr || !keyRows || keyRows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [keyData] = keyRows;
  if (!keyData.valid || !(PAID_PLANS as readonly string[]).includes(keyData.plan)) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }
  const userId = keyData.user_id as string;

  const body = await request.json().catch(() => null);
  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { fixIds } = parse.data;
  const ipAddress = ipFromRequest(request);
  const supabaseAdmin = createServerClient();

  // Ownership check + load fix rows.
  const { data: ownedBusinesses } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("user_id", userId);
  const ownedIds = new Set((ownedBusinesses ?? []).map((b) => b.id as string));

  const { data: fixRows } = await supabaseAdmin
    .from("applied_fixes")
    .select("id, business_id, finding_id, fix_type, platform, status, committed_sha, commit_url, file_path, previous_value")
    .in("id", fixIds)
    .returns<FixRow[]>();

  const owned = (fixRows ?? []).filter((f) => ownedIds.has(f.business_id));
  if (owned.length === 0) {
    return NextResponse.json({ error: "No matching fixes found for this user" }, { status: 404 });
  }

  // Cache connections by business_id+platform so we don't re-query for every fix.
  const connectionCache = new Map<string, ConnectionRow | null>();

  const getConnection = async (businessId: string, platform: string): Promise<ConnectionRow | null> => {
    const key = `${businessId}:${platform}`;
    if (connectionCache.has(key)) return connectionCache.get(key)!;
    const { data } = await supabaseAdmin
      .from("site_connections")
      .select("id, business_id, platform, credentials, repo, branch, site_url, status")
      .eq("business_id", businessId)
      .eq("platform", platform)
      .eq("status", "active")
      .maybeSingle()
      .returns<ConnectionRow>();
    connectionCache.set(key, data ?? null);
    return data ?? null;
  };

  const results: Array<{
    id: string;
    ok: boolean;
    error?: string;
    revertedCommitSha?: string;
  }> = [];

  for (const fix of owned) {
    if (fix.status !== "applied") {
      results.push({ id: fix.id, ok: false, error: `Already ${fix.status} — nothing to revert.` });
      continue;
    }

    const connection = await getConnection(fix.business_id, fix.platform);
    if (!connection) {
      results.push({
        id: fix.id,
        ok: false,
        error: `${fix.platform} site is no longer connected. Reconnect to revert.`,
      });
      continue;
    }

    if (fix.platform === "github") {
      if (!fix.committed_sha) {
        results.push({ id: fix.id, ok: false, error: "No commit SHA on this fix — can't revert." });
        continue;
      }
      if (!connection.repo || !connection.branch) {
        results.push({ id: fix.id, ok: false, error: "GitHub connection is missing repo/branch." });
        continue;
      }
      const result = await revertGithubFix({
        credsBlob: connection.credentials,
        repo: connection.repo,
        branch: connection.branch,
        committedSha: fix.committed_sha,
      });
      if (!result.ok) {
        results.push({ id: fix.id, ok: false, error: result.error });
        continue;
      }
      await supabaseAdmin
        .from("applied_fixes")
        .update({
          status: "reverted",
          reverted_at: new Date().toISOString(),
          reverted_commit_sha: result.revertedCommitSha ?? null,
        })
        .eq("id", fix.id);
      await writeAuditLog({
        eventType: "fix_reverted",
        source: "api/fixes/revert",
        userId,
        businessId: fix.business_id,
        connectionId: connection.id,
        payload: {
          fixId: fix.id,
          findingId: fix.finding_id,
          platform: "github",
          originalCommitSha: fix.committed_sha,
          revertedCommitSha: result.revertedCommitSha,
          revertedFiles: result.revertedFiles,
        },
        ipAddress,
      });
      results.push({ id: fix.id, ok: true, revertedCommitSha: result.revertedCommitSha });
      continue;
    }

    if (fix.platform === "wordpress") {
      if (!connection.site_url) {
        results.push({ id: fix.id, ok: false, error: "WordPress connection is missing site URL." });
        continue;
      }
      const result = await revertWordpressFix({
        credsBlob: connection.credentials,
        siteUrl: connection.site_url,
        previousValue: fix.previous_value,
      });
      if (!result.ok) {
        results.push({ id: fix.id, ok: false, error: result.error });
        continue;
      }
      await supabaseAdmin
        .from("applied_fixes")
        .update({
          status: "reverted",
          reverted_at: new Date().toISOString(),
        })
        .eq("id", fix.id);
      await writeAuditLog({
        eventType: "fix_reverted",
        source: "api/fixes/revert",
        userId,
        businessId: fix.business_id,
        connectionId: connection.id,
        payload: {
          fixId: fix.id,
          findingId: fix.finding_id,
          platform: "wordpress",
        },
        ipAddress,
      });
      results.push({ id: fix.id, ok: true });
      continue;
    }

    results.push({ id: fix.id, ok: false, error: `Auto-revert for ${fix.platform} isn't wired.` });
  }

  const successCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    requested: fixIds.length,
    succeeded: successCount,
    failed: results.length - successCount,
    results,
  });
}
