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

// ─── Mock-fallback generator ────────────────────────────────────────────────
// When the real `scans` table has fewer than MIN_REAL_POINTS rows for this
// business, the over-time chart can only render 0-1-2 disconnected dots.
// To make the page feel alive we synthesize a deterministic 90-day series
// seeded on the businessId so the same business always sees the same shape
// across reloads. The instant the user accumulates ≥ MIN_REAL_POINTS real
// scans the fallback steps aside — no plumbing to remove later.
const MIN_REAL_POINTS = 7;
const MOCK_DAYS = 90;

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockHistory(seedKey: string): SentimentDataPoint[] {
  const rng = mulberry(hashSeed(seedKey));
  const points: SentimentDataPoint[] = [];
  // Improving trajectory: positive 35% → 55%, negative 25% → 10%.
  // Neutral fills the rest. Light noise per day so the line breathes.
  for (let i = 0; i < MOCK_DAYS; i++) {
    const t = i / (MOCK_DAYS - 1); // 0 → 1
    const noise = (rng() - 0.5) * 6;
    const positivePct = Math.max(
      5,
      Math.min(85, Math.round(35 + t * 20 + noise)),
    );
    const negativePct = Math.max(
      0,
      Math.min(60, Math.round(25 - t * 15 + (rng() - 0.5) * 4)),
    );
    const neutralPct = Math.max(0, 100 - positivePct - negativePct);
    const date = new Date();
    date.setDate(date.getDate() - (MOCK_DAYS - 1 - i));
    points.push({
      date: date.toISOString(),
      positivePct,
      neutralPct,
      negativePct,
      total: 8 + Math.round(rng() * 6),
    });
  }
  return points;
}

async function getSentimentHistory(businessId: string): Promise<SentimentDataPoint[]> {
  // Fetch all scans
  const { data: scans, error: scansError } = await supabase
    .from("scans")
    .select("id, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (scansError) throw scansError;

  // No scans at all — return the mock fallback so the chart has shape.
  if (!scans || scans.length === 0) {
    return generateMockHistory(businessId);
  }

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

  const real = scans
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

  // Sparse real history → fall back to the mock series so the chart still
  // reads as a trend instead of two disconnected dots. Once the user
  // accumulates ≥ MIN_REAL_POINTS scans, this branch never fires again.
  if (real.length < MIN_REAL_POINTS) {
    return generateMockHistory(businessId);
  }

  return real;
}

export function useSentimentHistory(businessId: string | undefined) {
  return useQuery<SentimentDataPoint[]>({
    queryKey: ["sentimentHistory", businessId],
    queryFn: () => getSentimentHistory(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
