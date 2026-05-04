/**
 * /api/audit/apply-fix
 *
 * Called by the Chrome extension to one-click-fix a finding.
 * Auth: x-api-key header (extension API key, validated against extension_api_keys).
 *
 * Unlike /api/crawlability/apply-fix (which is user-session based and uses an audit_id),
 * this endpoint receives the fix payload directly from the extension since the extension
 * is the source of truth for the finding it audited.
 *
 * Flow:
 *   1. Validate API key → resolve to user_id + plan
 *   2. Find user's GitHub site_connection (auto-pick if multiple businesses; URL-match preferred)
 *   3. Run applyFixToGithub
 *   4. Insert applied_fixes row + audit log
 *   5. Return commit URL
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabaseServer";
import { decryptCredentials } from "@/utils/credentialsEncryption";
import {
  applyFixToGithub,
  applyHtmlFixToGithub,
  isFixTypeSupportedForGithub,
  isHtmlFixSupportedForGithub,
} from "@/features/crawlability/services/applyFix/githubHandler";
import { writeAuditLog, ipFromRequest } from "@/services/auditLog";

export const maxDuration = 30;

const Schema = z.object({
  siteUrl: z.string().url(),
  findingId: z.string().min(1),
  findingTitle: z.string().min(1),
  fixType: z.string().min(1),
  fixCode: z.string().min(1),
  businessId: z.string().uuid().optional(),
});

const PAID_PLANS = ["plus", "premium", "admin"];

interface ConnectionRow {
  id: string;
  user_id: string;
  business_id: string;
  platform: string;
  credentials: { iv: string; ciphertext: string; tag: string };
  repo: string | null;
  branch: string | null;
  site_url: string | null;
  status: string;
}

export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: keyRows, error: keyErr } = await supabase.rpc("validate_extension_api_key", {
    p_key: apiKey,
  });

  if (keyErr || !keyRows || keyRows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [keyData] = keyRows;
  if (!keyData.valid || !PAID_PLANS.includes(keyData.plan)) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }

  const userId = keyData.user_id as string;

  // Validate body
  const body = await request.json().catch(() => null);
  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const { siteUrl, findingId, findingTitle, fixType, fixCode, businessId } = parse.data;

  if (!isFixTypeSupportedForGithub(fixType)) {
    return NextResponse.json(
      {
        error: "fix_type_not_supported",
        message: `Auto-apply for ${fixType} fixes isn't wired yet. Copy the code manually.`,
      },
      { status: 422 }
    );
  }

  const supabaseAdmin = createServerClient();

  // Find the right GitHub connection — prefer one matching this site_url, else first available
  let connection: ConnectionRow | null = null;
  let connectionLookup;

  if (businessId) {
    connectionLookup = await supabaseAdmin
      .from("site_connections")
      .select("id, user_id, business_id, platform, credentials, repo, branch, site_url, status")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .eq("platform", "github")
      .eq("status", "active")
      .single<ConnectionRow>();
    connection = connectionLookup.data;
  } else {
    // Auto-select: try matching by hostname first, fall back to first active GitHub conn
    const hostname = (() => {
      try {
        return new URL(siteUrl).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })();

    const { data: connections } = await supabaseAdmin
      .from("site_connections")
      .select("id, user_id, business_id, platform, credentials, repo, branch, site_url, status")
      .eq("user_id", userId)
      .eq("platform", "github")
      .eq("status", "active")
      .returns<ConnectionRow[]>();

    if (connections && connections.length > 0) {
      if (hostname) {
        connection =
          connections.find((c) => {
            if (!c.site_url) return false;
            try {
              return new URL(c.site_url).hostname.replace(/^www\./, "") === hostname;
            } catch {
              return false;
            }
          }) ?? null;
      }
      connection = connection ?? connections[0]!;
    }
  }

  if (!connection) {
    return NextResponse.json(
      {
        error: "no_connection",
        message: "Connect GitHub to your Surven account first.",
        connectUrl: `${request.nextUrl.origin}/onboarding/connect`,
      },
      { status: 400 }
    );
  }

  if (!connection.repo) {
    return NextResponse.json({ error: "Connection missing repo" }, { status: 400 });
  }

  // Decrypt credentials
  let token: string;
  try {
    const creds = decryptCredentials<{ token: string }>(connection.credentials);
    token = creds.token;
  } catch {
    return NextResponse.json(
      { error: "encryption_unavailable", message: "Stored credentials couldn't be decrypted. Reconnect GitHub." },
      { status: 500 }
    );
  }

  // Insert pending applied_fixes row (audit_id is null since this came via the extension, not a saved audit)
  const { data: pendingRow } = await supabaseAdmin
    .from("applied_fixes")
    .insert({
      business_id: connection.business_id,
      audit_id: null,
      finding_id: findingId,
      fix_type: fixType,
      platform: "github",
      status: "pending",
    })
    .select("id")
    .single();

  // Apply via GitHub
  const result = await applyFixToGithub({
    token,
    repo: connection.repo,
    branch: connection.branch ?? "main",
    fixType,
    content: fixCode,
    findingId,
    findingTitle,
  });

  if (!result.ok) {
    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({ status: "failed", error_message: result.error })
        .eq("id", pendingRow.id);
    }
    await writeAuditLog({
      eventType: "fix_failed",
      source: "api/audit/apply-fix",
      severity: "error",
      userId,
      businessId: connection.business_id,
      connectionId: connection.id,
      payload: { findingId, fixType, error: result.error, source: "extension" },
      ipAddress: ipFromRequest(request),
    });
    return NextResponse.json(
      { error: "apply_failed", message: result.error ?? "Could not apply fix" },
      { status: 502 }
    );
  }

  if (pendingRow) {
    await supabaseAdmin
      .from("applied_fixes")
      .update({
        status: "applied",
        committed_sha: result.committedSha,
        commit_url: result.commitUrl,
        file_path: result.filePath,
      })
      .eq("id", pendingRow.id);
  }

  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/apply-fix",
    userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId,
      fixType,
      filePath: result.filePath,
      commitSha: result.committedSha,
      commitUrl: result.commitUrl,
      source: "extension",
    },
    ipAddress: ipFromRequest(request),
  });

  return NextResponse.json({
    ok: true,
    committedSha: result.committedSha,
    commitUrl: result.commitUrl,
    filePath: result.filePath,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "POST only", hint: "Send {siteUrl, findingId, findingTitle, fixType, fixCode}" },
    { status: 405 }
  );
}
