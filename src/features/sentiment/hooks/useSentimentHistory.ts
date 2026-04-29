"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";

export interface SentimentDataPoint {
  date: string;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  total: number;
}

async function getSentimentHistory(businessId: string): Promise<SentimentDataPoint[]> {
  // Fetch all scans
  const { data: scans, error: scansError } = await supabase
    .from("scans")
    .select("id, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (scansError) throw scansError;
  if (!scans || scans.length === 0) return [];

  // Fetch all results for this business's scans in one query
  const scanIds = scans.map((s) => s.id);
  const { data: results, error: resultsError } = await supabase
    .from("scan_results")
    .select("scan_id, sentiment, business_mentioned")
    .in("scan_id", scanIds)
    .eq("business_mentioned", true);

  if (resultsError) throw resultsError;

  // Group by scan
  const byScan: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {};
  for (const r of results ?? []) {
    if (!byScan[r.scan_id]) byScan[r.scan_id] = { positive: 0, neutral: 0, negative: 0, total: 0 };
    byScan[r.scan_id].total++;
    if (r.sentiment === "positive") byScan[r.scan_id].positive++;
    else if (r.sentiment === "neutral") byScan[r.scan_id].neutral++;
    else if (r.sentiment === "negative") byScan[r.scan_id].negative++;
  }

  return scans
    .filter((s) => byScan[s.id]?.total > 0)
    .map((s) => {
      const d = byScan[s.id];
      return {
        date: s.created_at,
        positivePct: Math.round((d.positive / d.total) * 100),
        neutralPct:  Math.round((d.neutral  / d.total) * 100),
        negativePct: Math.round((d.negative / d.total) * 100),
        total: d.total,
      };
    });
}

export function useSentimentHistory(businessId: string | undefined) {
  return useQuery<SentimentDataPoint[]>({
    queryKey: ["sentimentHistory", businessId],
    queryFn: () => getSentimentHistory(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
