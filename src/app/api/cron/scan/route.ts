import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/services/supabaseServer";
import { runMockScan } from "@/services/mockScanEngine";
import type { ModelName } from "@/types/database";

// Vercel Cron calls this route on schedule. Validate via CRON_SECRET env var.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch all businesses with their competitors and active custom prompts
  const { data: businesses, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, industry, city, state, competitors(name), search_prompts(prompt_text)");

  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const scanResults: { businessId: string; status: string; error?: string }[] = [];

  for (const business of businesses ?? []) {
    const competitors = (business.competitors as { name: string }[] | null) ?? [];
    const customPrompts = (business.search_prompts as { prompt_text: string }[] | null) ?? [];

    const input = {
      businessName: business.name,
      industry: business.industry,
      city: business.city,
      state: business.state,
      competitors: competitors.map((c) => c.name),
      customPrompts: customPrompts.map((p) => p.prompt_text),
    };

    type ResultRow = {
      prompt_text: string;
      model_name: ModelName;
      response_text: string;
      business_mentioned: boolean;
      competitor_mentions: Record<string, boolean>;
    };

    let visibilityScore = 0;
    let modelScores: Record<string, number> | null = null;
    let results: ResultRow[] = [];

    try {
      const res = await fetch(`${baseUrl}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.useMock) {
          const mock = runMockScan(input);
          visibilityScore = mock.visibilityScore;
          results = mock.results;
        } else {
          visibilityScore = json.visibilityScore;
          modelScores = json.modelScores ?? null;
          results = json.results;
        }
      } else {
        const mock = runMockScan(input);
        visibilityScore = mock.visibilityScore;
        results = mock.results;
      }
    } catch {
      const mock = runMockScan(input);
      visibilityScore = mock.visibilityScore;
      results = mock.results;
    }

    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        business_id: business.id,
        visibility_score: visibilityScore,
        scan_type: "automated",
        model_scores: modelScores,
      })
      .select()
      .single();

    if (scanError) {
      scanResults.push({ businessId: business.id, status: "error", error: scanError.message });
      continue;
    }

    const resultRows = results.map((r) => ({ scan_id: scan.id, ...r }));
    const { error: resultsError } = await supabase.from("scan_results").insert(resultRows);

    if (resultsError) {
      scanResults.push({ businessId: business.id, status: "error", error: resultsError.message });
    } else {
      scanResults.push({ businessId: business.id, status: "success" });
    }
  }

  return NextResponse.json({
    scanned: scanResults.filter((r) => r.status === "success").length,
    failed: scanResults.filter((r) => r.status === "error").length,
    results: scanResults,
  });
}
