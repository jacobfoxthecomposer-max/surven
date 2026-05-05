/**
 * GET /api/fixes/history
 *
 * Returns the Chrome extension user's applied_fixes rows.
 * Auth: x-api-key header (extension API key).
 *
 * Query params:
 *   - businessId (optional) — scope to a specific business; defaults to all businesses owned by user
 *   - days (optional, default 30) — only return fixes applied within last N days; pass 0 for all-time
 *
 * Each row includes a `canRevert` flag the UI uses to show or grey-out the checkbox:
 *   - GitHub fixes with status='applied' and a committed_sha → canRevert true
 *   - WordPress fixes with status='applied' and previous_value present → canRevert true
 *   - Already 'reverted', 'failed', 'skipped', 'pending' → canRevert false
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabaseServer";
import { PAID_PLANS } from "@/utils/managedPlanCta";

export const maxDuration = 15;

const QuerySchema = z.object({
  businessId: z.string().uuid().optional(),
  days: z.coerce.number().int().min(0).max(365).optional(),
});

export async function GET(request: NextRequest) {
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
  if (!keyData.valid || !(PAID_PLANS as readonly string[]).includes(keyData.plan)) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }
  const userId = keyData.user_id as string;

  const url = new URL(request.url);
  const parse = QuerySchema.safeParse({
    businessId: url.searchParams.get("businessId") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }
  const { businessId, days = 30 } = parse.data;

  const supabaseAdmin = createServerClient();

  // Resolve businesses owned by this user.
  const { data: businesses } = await supabaseAdmin
    .from("businesses")
    .select("id, name")
    .eq("user_id", userId);

  const ownedIds = (businesses ?? []).map((b) => b.id as string);
  if (ownedIds.length === 0) {
    return NextResponse.json({ fixes: [], businesses: [] });
  }

  const filterIds = businessId ? ownedIds.filter((id) => id === businessId) : ownedIds;
  if (filterIds.length === 0) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  let query = supabaseAdmin
    .from("applied_fixes")
    .select(
      "id, business_id, finding_id, fix_type, platform, status, committed_sha, commit_url, file_path, error_message, applied_at, reverted_at, reverted_commit_sha, previous_value"
    )
    .in("business_id", filterIds)
    .order("applied_at", { ascending: false })
    .limit(500);

  if (days > 0) {
    const cutoff = new Date(Date.now() - days * 86400 * 1000).toISOString();
    query = query.gte("applied_at", cutoff);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Database error", message: error.message }, { status: 500 });
  }

  const businessNameById = new Map(
    (businesses ?? []).map((b) => [b.id as string, b.name as string])
  );

  const fixes = (rows ?? []).map((r) => {
    const platform = r.platform as string;
    const status = r.status as string;
    let canRevert = false;
    let cantRevertReason: string | undefined;
    if (status !== "applied") {
      cantRevertReason =
        status === "reverted" ? "Already reverted"
        : status === "failed" ? "Apply failed — nothing to revert"
        : status === "skipped" ? "Skipped — nothing to revert"
        : "Not applied yet";
    } else if (platform === "github") {
      if (r.committed_sha) {
        canRevert = true;
      } else {
        cantRevertReason = "No commit SHA captured";
      }
    } else if (platform === "wordpress") {
      if (r.previous_value) {
        canRevert = true;
      } else {
        cantRevertReason = "No previous value captured (older fix). Edit manually in WordPress.";
      }
    } else {
      cantRevertReason = `Auto-revert for ${platform} isn't wired yet`;
    }

    return {
      id: r.id,
      businessId: r.business_id,
      businessName: businessNameById.get(r.business_id as string) ?? "Unknown",
      findingId: r.finding_id,
      fixType: r.fix_type,
      platform,
      status,
      filePath: r.file_path,
      commitUrl: r.commit_url,
      committedSha: r.committed_sha,
      appliedAt: r.applied_at,
      revertedAt: r.reverted_at,
      revertedCommitSha: r.reverted_commit_sha,
      errorMessage: r.error_message,
      canRevert,
      cantRevertReason,
    };
  });

  return NextResponse.json({
    fixes,
    businesses: (businesses ?? []).map((b) => ({ id: b.id, name: b.name })),
  });
}
