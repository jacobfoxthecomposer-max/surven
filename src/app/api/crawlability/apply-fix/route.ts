import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";
import { z } from "zod";
import { decryptCredentials } from "@/utils/credentialsEncryption";
import {
  applyFixToGithub,
  isFixTypeSupportedForGithub,
} from "@/features/crawlability/services/applyFix/githubHandler";
import type { CrawlabilityFinding } from "@/types/crawlability";

const PREMIUM_PLANS = ["premium", "admin"];
export const maxDuration = 30;

const ApplyFixSchema = z.object({
  businessId: z.string().uuid(),
  auditId: z.string().uuid(),
  findingId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createSupabaseSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parse = ApplyFixSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const { businessId, auditId, findingId } = parse.data;
  const supabaseAdmin = createServerClient();

  // Premium plan gate
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  if (!PREMIUM_PLANS.includes(plan)) {
    return NextResponse.json({ error: "premium_required", plan }, { status: 403 });
  }

  // Verify business ownership
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Load the audit
  const { data: audit } = await supabaseAdmin
    .from("crawlability_audits")
    .select("id, findings")
    .eq("id", auditId)
    .eq("business_id", businessId)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const findings = (audit.findings ?? []) as CrawlabilityFinding[];
  const finding = findings.find((f) => f.id === findingId);
  if (!finding) {
    return NextResponse.json({ error: "Finding not found in audit" }, { status: 404 });
  }

  if (!finding.fixCode || !finding.fixType) {
    return NextResponse.json(
      { error: "no_fix_available", message: "This finding doesn't have a one-click fix." },
      { status: 422 }
    );
  }

  if (!isFixTypeSupportedForGithub(finding.fixType)) {
    return NextResponse.json(
      {
        error: "fix_type_not_yet_supported",
        message: `${finding.fixType} fixes can't be auto-applied yet — copy the code manually.`,
      },
      { status: 422 }
    );
  }

  // Load active GitHub connection
  const { data: connection } = await supabaseAdmin
    .from("site_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("platform", "github")
    .eq("status", "active")
    .single();

  if (!connection) {
    return NextResponse.json(
      {
        error: "no_connection",
        message: "Connect GitHub in Settings → Integrations first.",
      },
      { status: 400 }
    );
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
        message: "Could not decrypt stored credentials. Please reconnect GitHub.",
      },
      { status: 500 }
    );
  }

  // Insert pending applied_fix row
  const { data: pendingRow } = await supabaseAdmin
    .from("applied_fixes")
    .insert({
      business_id: businessId,
      audit_id: auditId,
      finding_id: findingId,
      fix_type: finding.fixType,
      platform: "github",
      status: "pending",
    })
    .select("id")
    .single();

  // Apply via GitHub
  const result = await applyFixToGithub({
    token,
    repo: connection.repo!,
    branch: connection.branch ?? "main",
    fixType: finding.fixType,
    content: finding.fixCode,
    findingId: finding.id,
    findingTitle: finding.title,
  });

  if (!result.ok) {
    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({ status: "failed", error_message: result.error })
        .eq("id", pendingRow.id);
    }
    return NextResponse.json(
      { error: "apply_failed", message: result.error ?? "Could not apply fix" },
      { status: 502 }
    );
  }

  // Mark applied_fix as applied
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

  // Mark finding as applied in the audit's findings JSONB
  const updatedFindings = findings.map((f) =>
    f.id === findingId ? { ...f, isApplied: true } : f
  );

  await supabaseAdmin
    .from("crawlability_audits")
    .update({ findings: updatedFindings })
    .eq("id", auditId);

  return NextResponse.json({
    ok: true,
    committedSha: result.committedSha,
    commitUrl: result.commitUrl,
    filePath: result.filePath,
  });
}
