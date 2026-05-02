import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/services/supabase";
import { crawlWebsite } from "@/utils/crawler";
import { analyzeWebsite } from "@/utils/analyzeWebsite";
import { analyzeCrawlability } from "@/utils/analyzeCrawlability";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate API key against database
  const { data, error } = await supabase.rpc("validate_extension_api_key", {
    p_key: apiKey,
  });

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const PAID_PLANS = ["plus", "premium", "admin"];
  const [keyData] = data;
  if (!keyData.valid || !PAID_PLANS.includes(keyData.plan)) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const siteUrl = body?.siteUrl;

  if (!siteUrl) {
    return NextResponse.json({ error: "Missing siteUrl" }, { status: 400 });
  }

  try {
    new URL(siteUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const { pages, pageLinks, hitLimit, durationMs } = await crawlWebsite(siteUrl);

    if (pages[0]?.statusCode === 0) {
      return NextResponse.json(
        { error: "Could not reach that website. Check the URL and try again." },
        { status: 422 }
      );
    }

    // Always run the legacy audit — fast, never throws.
    const legacyFindings = analyzeWebsite(pages);

    // Run the full crawlability audit in a soft envelope:
    // - 25-second internal cap so we leave headroom under the 60s function limit
    // - Any failure falls back to legacy findings only
    let crawlabilityResult: Awaited<ReturnType<typeof analyzeCrawlability>> | null = null;
    let crawlabilityError: string | null = null;
    try {
      crawlabilityResult = await Promise.race([
        analyzeCrawlability(pages, pageLinks, siteUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("crawlability_timeout")), 25_000)
        ),
      ]);
    } catch (err) {
      crawlabilityError = err instanceof Error ? err.message : "crawlability_failed";
      console.error("[api/audit/run] crawlability failed:", crawlabilityError);
    }

    // Merge: crawlability findings override legacy ones with the same id (carry fixCode/fixType).
    const byId = new Map<string, unknown>();
    for (const f of legacyFindings) byId.set(f.id, f);
    if (crawlabilityResult) {
      for (const f of crawlabilityResult.findings) byId.set(f.id, f);
    }
    const findings = Array.from(byId.values());

    return NextResponse.json({
      findings,
      crawlabilityScore: crawlabilityResult?.crawlabilityScore,
      categoryScores: crawlabilityResult?.categoryScores,
      crawlabilityError,
      crawlStats: {
        pagesCrawled: pages.length,
        pagesCapped: hitLimit,
        crawlDurationMs: durationMs,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 }
    );
  }
}
