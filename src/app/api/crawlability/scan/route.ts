import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";
import { z } from "zod";
import { crawlWebsite } from "@/utils/crawler";
import { analyzeCrawlability } from "@/utils/analyzeCrawlability";
import { normalizeSiteUrl, checkSsrfSafety } from "@/utils/normalizeUrl";
import type { CrawlabilityResult } from "@/types/crawlability";

export const maxDuration = 60;

const PAID_PLANS = ["plus", "premium", "admin"];
const SCAN_RATE_LIMIT_MS = 5 * 60 * 1000;

const ScanRequestSchema = z.object({
  businessId: z.string().uuid(),
  siteUrl: z.string().url(),
  force: z.boolean().optional(),
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
  const parse = ScanRequestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  const { businessId, force } = parse.data;
  let siteUrl: string;
  try {
    siteUrl = normalizeSiteUrl(parse.data.siteUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // SSRF protection
  const ssrf = checkSsrfSafety(siteUrl);
  if (ssrf) {
    return NextResponse.json(
      { error: "ssrf_blocked", reason: ssrf },
      { status: 422 }
    );
  }

  const supabaseAdmin = createServerClient();

  // Plan gate — fetch plan server-side, never trust client
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  if (!PAID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "upgrade_required", plan },
      { status: 403 }
    );
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

  // Cache check (24h)
  if (!force) {
    const { data: cached } = await supabaseAdmin
      .from("crawlability_audits")
      .select("*")
      .eq("business_id", businessId)
      .eq("site_url", siteUrl)
      .gte("cache_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return NextResponse.json({
        ...dbRowToResult(cached),
        fromCache: true,
      });
    }
  }

  // Scan rate limit (5 min) — independent of cache
  const fiveMinAgo = new Date(Date.now() - SCAN_RATE_LIMIT_MS).toISOString();
  const { data: recentScan } = await supabaseAdmin
    .from("crawlability_audits")
    .select("scan_started_at")
    .eq("business_id", businessId)
    .gte("scan_started_at", fiveMinAgo)
    .order("scan_started_at", { ascending: false })
    .limit(1)
    .single();

  if (recentScan && !force) {
    return NextResponse.json(
      { error: "scan_in_progress", retryAfterSec: 300 },
      { status: 429 }
    );
  }

  const scanStartedAt = new Date();

  try {
    const { pages, pageLinks, hitLimit, durationMs } = await crawlWebsite(siteUrl);

    if (pages[0]?.statusCode === 0) {
      return NextResponse.json(
        { error: "Could not reach that website. Check the URL and try again." },
        { status: 422 }
      );
    }

    const analysis = await analyzeCrawlability(pages, pageLinks, siteUrl);
    const scanCompletedAt = new Date();
    const cacheExpiresAt = new Date(scanCompletedAt.getTime() + 24 * 60 * 60 * 1000);

    const homepage = pages[0];
    const domain = new URL(siteUrl).hostname;
    const homepageMeta = {
      title: homepage?.title ?? "",
      description: homepage?.metaDescription ?? "",
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    };

    const { data: inserted } = await supabaseAdmin
      .from("crawlability_audits")
      .insert({
        business_id: businessId,
        site_url: siteUrl,
        status: "completed",
        crawlability_score: analysis.crawlabilityScore,
        findings: analysis.findings,
        status_breakdown: analysis.statusBreakdown,
        category_scores: analysis.categoryScores,
        homepage_meta: homepageMeta,
        robots_analysis: analysis.robotsAnalysis,
        sitemap_analysis: analysis.sitemapAnalysis,
        redirect_chains: analysis.redirectChains,
        crawl_pages: pages.length,
        crawl_hit_limit: hitLimit,
        crawl_duration_ms: durationMs,
        scan_started_at: scanStartedAt.toISOString(),
        scan_completed_at: scanCompletedAt.toISOString(),
        cache_expires_at: cacheExpiresAt.toISOString(),
      })
      .select()
      .single();

    return NextResponse.json(dbRowToResult(inserted));
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Crawlability scan failed.",
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
    .from("crawlability_audits")
    .select("*, businesses!inner(user_id)")
    .eq("id", auditId)
    .eq("businesses.user_id", user.id)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(dbRowToResult(audit));
}

function dbRowToResult(row: Record<string, unknown> | null): CrawlabilityResult {
  if (!row) {
    throw new Error("Empty audit row");
  }
  const siteUrl = String(row.site_url ?? "");
  const domain = (() => {
    try {
      return new URL(siteUrl).hostname;
    } catch {
      return "";
    }
  })();
  const meta = (row.homepage_meta as Record<string, string> | null) ?? {};

  return {
    id: row.id as string,
    businessId: row.business_id as string,
    siteUrl,
    status: row.status as "completed" | "failed",
    errorMessage: row.error_message as string | undefined,
    crawlabilityScore: (row.crawlability_score as number) ?? 0,
    findings: (row.findings as CrawlabilityResult["findings"]) ?? [],
    statusBreakdown: (row.status_breakdown as CrawlabilityResult["statusBreakdown"]) ?? {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
    },
    categoryScores: (row.category_scores as CrawlabilityResult["categoryScores"]) ?? {
      http: 0,
      indexability: 0,
      content: 0,
      security: 0,
      links: 0,
    },
    robotsAnalysis: row.robots_analysis as CrawlabilityResult["robotsAnalysis"],
    sitemapAnalysis: row.sitemap_analysis as CrawlabilityResult["sitemapAnalysis"],
    redirectChains: (row.redirect_chains as CrawlabilityResult["redirectChains"]) ?? [],
    homepageMeta: {
      title: meta.title ?? "",
      description: meta.description ?? "",
      faviconUrl:
        meta.faviconUrl ??
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    },
    crawlStats: {
      pagesCrawled: (row.crawl_pages as number) ?? 0,
      pagesCapped: (row.crawl_hit_limit as boolean) ?? false,
      crawlDurationMs: (row.crawl_duration_ms as number) ?? 0,
    },
    scanStartedAt: row.scan_started_at as string,
    scanCompletedAt: row.scan_completed_at as string,
    cacheExpiresAt: row.cache_expires_at as string,
  };
}
