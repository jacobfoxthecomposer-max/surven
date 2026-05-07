/**
 * Plain-English hero sentence builder for the dashboard.
 *
 * Translates raw scan results into the language a non-technical SMB owner
 * uses ("Linda the lawyer"): named business, named industry, named city,
 * specific scan counts. Returns a single typed shape the Hero component
 * renders without further computation.
 */

import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { Business, ScanResult } from "@/types/database";

export type VisibilityWord = "strong" | "moderate" | "thin" | "not yet measured";

export interface DashboardHero {
  /** Italic colored keyword: strong / moderate / thin / not yet measured */
  word: VisibilityWord;
  /** Hex color for the keyword (sage / gold / rust / neutral) */
  color: string;
  /** Number of answers where the business was mentioned */
  mentioned: number;
  /** Total number of scanned answers */
  total: number;
  /** Mention rate as a 0-100 number (rounded) */
  rate: number;
  /** Industry phrase, lowercased, ready to drop into a sentence */
  industryPhrase: string;
  /** Location phrase, e.g. "in Ellington, CT" — empty string if no location */
  locationPhrase: string;
  /** Human-readable last-scan label, e.g. "May 7" — null if never scanned */
  lastScanLabel: string | null;
}

const STRONG_RATE = 50;
const MODERATE_RATE = 25;

export function buildDashboardHero({
  business,
  results,
  lastScanDate,
}: {
  business: Pick<Business, "industry" | "city" | "state"> | null;
  results: ScanResult[];
  lastScanDate: string | null;
}): DashboardHero {
  const total = results.length;
  const mentioned = results.filter((r) => r.business_mentioned).length;
  const rate = total > 0 ? Math.round((mentioned / total) * 100) : 0;

  let word: VisibilityWord = "not yet measured";
  let color: string = SURVEN_SEMANTIC.neutral;
  if (lastScanDate && total > 0) {
    if (rate >= STRONG_RATE) {
      word = "strong";
      color = SURVEN_SEMANTIC.good;
    } else if (rate >= MODERATE_RATE) {
      word = "moderate";
      color = SURVEN_SEMANTIC.mid;
    } else {
      word = "thin";
      color = SURVEN_SEMANTIC.bad;
    }
  }

  const industryPhrase = (business?.industry ?? "your industry").toLowerCase();
  const locationPhrase = business?.city
    ? business.state
      ? `in ${business.city}, ${business.state}`
      : `in ${business.city}`
    : "";

  const lastScanLabel = lastScanDate
    ? new Date(lastScanDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return {
    word,
    color,
    mentioned,
    total,
    rate,
    industryPhrase,
    locationPhrase,
    lastScanLabel,
  };
}

/**
 * Picks the named competitor with the most mentions across the latest
 * scan results. Returns null if there are no named competitors or the
 * top one has zero mentions (the leaderboard would be misleading).
 */
export function topMentionedCompetitor(
  results: ScanResult[],
  competitors: { name: string }[],
): { name: string; count: number } | null {
  if (results.length === 0 || competitors.length === 0) return null;
  const counts = new Map<string, number>();
  for (const c of competitors) counts.set(c.name, 0);
  for (const r of results) {
    for (const [name, present] of Object.entries(r.competitor_mentions ?? {})) {
      if (!present) continue;
      if (!counts.has(name)) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[0][1] === 0) return null;
  return { name: ranked[0][0], count: ranked[0][1] };
}

/**
 * Sentiment summary for the KPI strip — verdict word + counts.
 * Mirrors the canonical Brand Sentiment "verdict" pill voice
 * (Strong / Mixed / Concerning) used on /sentiment, scoped to scan results.
 */
export type SentimentVerdict = "Strong" | "Mixed" | "Concerning" | "No data";

export function summarizeSentiment(results: ScanResult[]): {
  verdict: SentimentVerdict;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  color: string;
} {
  const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const r of mentioned) {
    if (r.sentiment === "positive") positive++;
    else if (r.sentiment === "neutral") neutral++;
    else if (r.sentiment === "negative") negative++;
  }
  const total = mentioned.length;
  if (total === 0) {
    return {
      verdict: "No data",
      total: 0,
      positive,
      neutral,
      negative,
      color: SURVEN_SEMANTIC.neutral,
    };
  }
  const posPct = (positive / total) * 100;
  const negPct = (negative / total) * 100;
  // Same verdict rule the Sentiment page uses: Concerning needs negative >=20%
  // OR negative > positive when positive is also low. Strong needs positive
  // >= 70 AND negative <= 10. Else Mixed.
  let verdict: SentimentVerdict;
  let color: string;
  if (negPct >= 20 || (negative > positive && posPct < 50)) {
    verdict = "Concerning";
    color = SURVEN_SEMANTIC.bad;
  } else if (posPct >= 70 && negPct <= 10) {
    verdict = "Strong";
    color = SURVEN_SEMANTIC.good;
  } else {
    verdict = "Mixed";
    color = SURVEN_SEMANTIC.mid;
  }
  return { verdict, total, positive, neutral, negative, color };
}
