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
import { MANAGED_PLAN_CTA, PAID_PLANS } from "@/utils/managedPlanCta";

export const maxDuration = 30;

const Schema = z.object({
  siteUrl: z.string().url(),
  findingId: z.string().min(1),
  findingTitle: z.string().min(1),
  fixType: z.string().min(1),
  fixCode: z.string().min(1),
  businessId: z.string().uuid().optional(),
  /** URLs from the finding's `affectedUrls` field — required for per-page html fixes. */
  affectedUrls: z.array(z.string().url()).optional(),
});

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

  const { siteUrl, findingId, findingTitle, fixType, fixCode, businessId, affectedUrls } = parse.data;

  // Dispatch by fix type. Three branches:
  //   1. Single-file fixes (robots, sitemap, llms) → applyFixToGithub
  //   2. Per-page HTML fixes (canonical_missing, etc.) → applyHtmlFixToGithub
  //   3. Anything else → manual paste with managed-plan upsell
  const isSingleFile = isFixTypeSupportedForGithub(fixType);
  const isHtmlFix = fixType === "html" && isHtmlFixSupportedForGithub(findingId);

  if (!isSingleFile && !isHtmlFix) {
    return NextResponse.json(
      {
        error: "fix_type_not_supported",
        message: `Auto-apply for ${fixType} fixes isn't wired yet. Copy the code manually.`,
        manualSnippet: fixCode,
        manualNote: `${fixType} fixes need a per-page edit that isn't automated yet. Copy the snippet and paste it into your site, or upgrade to Managed and we'll do it for you.`,
        managedPlanCta: MANAGED_PLAN_CTA,
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
    // No GitHub connection. WordPress users hitting GitHub-only fixes (canonical,
    // viewport, OG, robots, sitemap, llms) land here too — give them the same
    // friendly manual-paste card + Managed-plan upsell instead of a "connect
    // GitHub" error that doesn't reflect their actual setup.
    return NextResponse.json(
      {
        error: "manual_required",
        message: "Auto-deploy for this fix needs a GitHub connection. Copy the snippet below and paste it into your site, or upgrade to Managed and we'll do it for you.",
        manualSnippet: fixCode,
        manualNote: "This fix isn't auto-deployable on your current connection (it needs GitHub). Paste the snippet into your site's <head>, or let our Managed team handle it.",
        connectUrl: `${request.nextUrl.origin}/onboarding/connect`,
        managedPlanCta: MANAGED_PLAN_CTA,
      },
      { status: 422 }
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
      {
        error: "encryption_unavailable",
        message: "Stored credentials couldn't be decrypted. Reconnect GitHub.",
        connectUrl: `${request.nextUrl.origin}/settings`,
      },
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

  // Per-page HTML branch (canonical_missing + future viewport/og)
  if (isHtmlFix) {
    const urls = affectedUrls && affectedUrls.length > 0 ? affectedUrls : [siteUrl];
    const htmlResult = await applyHtmlFixToGithub({
      token,
      repo: connection.repo,
      branch: connection.branch ?? "main",
      findingId,
      findingTitle,
      affectedUrls: urls,
    });

    // Next.js detection or no-results case → manual fallback with managed-plan CTA.
    if (!htmlResult.ok) {
      if (pendingRow) {
        await supabaseAdmin
          .from("applied_fixes")
          .update({
            status: htmlResult.manualSnippet ? "skipped" : "failed",
            error_message: htmlResult.error ?? htmlResult.manualNote ?? null,
          })
          .eq("id", pendingRow.id);
      }
      await writeAuditLog({
        eventType: "fix_failed",
        source: "api/audit/apply-fix",
        severity: "error",
        userId,
        businessId: connection.business_id,
        connectionId: connection.id,
        payload: { findingId, fixType, error: htmlResult.error, manualNote: htmlResult.manualNote, source: "extension" },
        ipAddress: ipFromRequest(request),
      });
      return NextResponse.json(
        {
          error: htmlResult.manualSnippet ? "manual_required" : "apply_failed",
          message: htmlResult.error ?? "Could not apply fix",
          manualSnippet: htmlResult.manualSnippet,
          manualNote: htmlResult.manualNote,
          perPageResult: htmlResult.perPageResult,
          managedPlanCta: MANAGED_PLAN_CTA,
        },
        { status: htmlResult.manualSnippet ? 422 : 502 },
      );
    }

    const perPage = htmlResult.perPageResult!;
    const commitUrl = perPage.commitUrl;
    const commitSha = perPage.commitSha;

    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({
          status: "applied",
          committed_sha: commitSha ?? null,
          commit_url: commitUrl ?? null,
          file_path: `${perPage.succeeded.length} HTML file(s)`,
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
        commitSha,
        commitUrl,
        succeeded: perPage.succeeded.length,
        skipped: perPage.skipped.length,
        failed: perPage.failed.length,
        total: perPage.total,
        source: "extension",
      },
      ipAddress: ipFromRequest(request),
    });

    return NextResponse.json({
      ok: true,
      committedSha: commitSha,
      commitUrl,
      perPageResult: perPage,
      // Show CTA when not all pages were updated — partial successes are an upsell moment.
      managedPlanCta: perPage.failed.length > 0 || perPage.skipped.length > 0 ? MANAGED_PLAN_CTA : undefined,
    });
  }

  // Single-file branch (robots, sitemap, llms)
  const result = await applyFixToGithub({
    token,
    repo: connection.repo,
    branch: connection.branch ?? "main",
    fixType: fixType as "robots" | "sitemap" | "llms",
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
      { error: "apply_failed", message: result.error ?? "Could not apply fix", managedPlanCta: MANAGED_PLAN_CTA },
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
