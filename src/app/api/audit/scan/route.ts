import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";
import { z } from "zod";
import { crawlWebsite } from "@/utils/crawler";
import { analyzeWebsite } from "@/utils/analyzeWebsite";

// Allow up to 60s — crawl can take up to 25s
export const maxDuration = 60;

const AuditRequestSchema = z.object({
  businessId: z.string().uuid(),
  siteUrl: z.string().url(),
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

  const body = await request.json();
  const parse = AuditRequestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const { businessId, siteUrl } = parse.data;
  const supabaseAdmin = createServerClient();

  // Verify user owns this business
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Return cached result if available (< 24h old)
  const { data: cached } = await supabaseAdmin
    .from("audits")
    .select("*")
    .eq("business_id", businessId)
    .eq("site_url", siteUrl)
    .gte("cache_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    return NextResponse.json(dbRowToResult(cached));
  }

  const scanStartedAt = new Date();

  try {
    const { pages, hitLimit, durationMs } = await crawlWebsite(siteUrl);

    if (pages[0]?.statusCode === 0) {
      return NextResponse.json(
        { error: "Could not reach that website. Check the URL and try again." },
        { status: 422 }
      );
    }

    const findings = analyzeWebsite(pages);
    const scanCompletedAt = new Date();
    const cacheExpiresAt = new Date(scanCompletedAt.getTime() + 24 * 60 * 60 * 1000);

    const { data: inserted } = await supabaseAdmin
      .from("audits")
      .insert({
        business_id: businessId,
        site_url: siteUrl,
        status: "completed",
        findings,
        crawl_pages: pages.length,
        crawl_hit_limit: hitLimit,
        crawl_duration_ms: durationMs,
        scan_started_at: scanStartedAt.toISOString(),
        scan_completed_at: scanCompletedAt.toISOString(),
        cache_expires_at: cacheExpiresAt.toISOString(),
      })
      .select()
      .single();

    return NextResponse.json(
      dbRowToResult(inserted ?? {
        id: crypto.randomUUID(),
        business_id: businessId,
        site_url: siteUrl,
        status: "completed",
        findings,
        crawl_pages: pages.length,
        crawl_hit_limit: hitLimit,
        crawl_duration_ms: durationMs,
        scan_started_at: scanStartedAt.toISOString(),
        scan_completed_at: scanCompletedAt.toISOString(),
        cache_expires_at: cacheExpiresAt.toISOString(),
      })
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Audit failed. Try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auditId = request.nextUrl.searchParams.get("auditId");
  if (!auditId) {
    return NextResponse.json({ error: "Missing auditId" }, { status: 400 });
  }

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

  const supabaseAdmin = createServerClient();
  const { data: audit } = await supabaseAdmin
    .from("audits")
    .select("*, businesses!inner(user_id)")
    .eq("id", auditId)
    .eq("businesses.user_id", user.id)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(dbRowToResult(audit));
}

function dbRowToResult(row: Record<string, unknown>) {
  return {
    id: row.id,
    businessId: row.business_id,
    siteUrl: row.site_url,
    status: row.status,
    errorMessage: row.error_message,
    findings: row.findings ?? [],
    crawlStats: {
      pagesCrawled: row.crawl_pages ?? 0,
      pagesCapped: row.crawl_hit_limit ?? false,
      crawlDurationMs: row.crawl_duration_ms ?? 0,
    },
    scanStartedAt: row.scan_started_at,
    scanCompletedAt: row.scan_completed_at,
    cacheExpiresAt: row.cache_expires_at,
  };
}
