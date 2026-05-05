// ============================================
// Surven Strategic Color System
// Single source of truth for every brand-standard page.
//
// Two palettes — never mix them, never invent new hexes:
//   SURVEN_SEMANTIC    → encodes status / health (good / mid / bad)
//   SURVEN_CATEGORICAL → encodes which bucket a thing belongs to
//
// Rules:
//   1. "You" / "your brand" / "your site" always anchors at categorical
//      index 0 (sage) so it's the visual anchor in every chart.
//   2. Brand chrome (filter pills, buttons, AIOverview accent, sidebar
//      active state, NextScanCard) stays sage regardless of metric values.
//      Color only varies for data, never for chrome.
//   3. Each metric defines its own { good, mid } thresholds — a 75% score
//      is sage on Crawlability (excellent), rust on Branded Visibility
//      (concerning, where 90%+ is the bar).
//   4. Max 6 categorical slices per chart — group long tail into "Other"
//      or convert to a sortable table with a single sage bar.
//
// HOW TO USE:
//   - For CSS / inline styles: prefer `var(--color-primary)` etc. defined
//     in globals.css. Tweak the hex there to recolor the whole app.
//   - For chart libs / TS values that need a raw hex: import SURVEN_SEMANTIC
//     or SURVEN_CATEGORICAL from this file. Don't type the hex by hand.
//   - Never paste a literal hex like "#7D8E6C" into a component. If you
//     find one, replace it with a token reference.
// ============================================

/** Status / health palette. Use anywhere color encodes good vs mid vs bad. */
export const SURVEN_SEMANTIC = {
  /** Primary "good" — used on hero word, gauge fill above-threshold, KPI icon for healthy metric */
  good: "#7D8E6C",
  /** Lighter sage variant — used on chip fills, soft backgrounds, secondary "good" surfaces */
  goodAlt: "#96A283",
  /** "Medium / watch" — gold. Mid-band metrics (e.g., 60–75% on a 90% target). */
  mid: "#C9A95B",
  /** "Bad / concerning" — rust. Below threshold, warnings, negative deltas. */
  bad: "#B54631",
  /** Neutral / unknown — warm gray. Use when there is no value to color (no data yet, N/A). */
  neutral: "#A09890",
} as const;

/** Categorical palette — encodes which bucket / entity / engine a thing is. */
export const SURVEN_CATEGORICAL = [
  "#7D8E6C", // 0 — sage (always "you" / "your brand" / your category anchor)
  "#B54631", // 1 — rust
  "#5B7BAB", // 2 — blue
  "#C9A95B", // 3 — gold
  "#8E7AAD", // 4 — purple
  "#6FA89A", // 5 — teal
  "#8C3522", // 6 — deep rust (only if 6+ slices needed)
] as const;

export type SurvenSemanticKey = keyof typeof SURVEN_SEMANTIC;

/**
 * Pick a semantic color from a value + per-metric thresholds.
 * Returns the hex; do not pass through any other transformation.
 *
 * @example
 *   colorForValue(82, { good: 75, mid: 50 })           // → SURVEN_SEMANTIC.good
 *   colorForValue(82, { good: 90, mid: 70 })           // → SURVEN_SEMANTIC.mid
 *   colorForValue(null, { good: 75, mid: 50 })         // → SURVEN_SEMANTIC.neutral
 */
export function colorForValue(
  value: number | null | undefined,
  thresholds: { good: number; mid: number },
): string {
  if (value == null || Number.isNaN(value)) return SURVEN_SEMANTIC.neutral;
  if (value >= thresholds.good) return SURVEN_SEMANTIC.good;
  if (value >= thresholds.mid) return SURVEN_SEMANTIC.mid;
  return SURVEN_SEMANTIC.bad;
}

/**
 * Pick a categorical color for an item, with "you" pinned to sage.
 *
 * @param index 0-based position in your data array
 * @param isYou true if this item represents the user's own brand/site
 */
export function categoricalColor(index: number, isYou = false): string {
  if (isYou) return SURVEN_CATEGORICAL[0];
  // If this slot is sage and isn't "you", shift to the next color so sage
  // remains a visual anchor for "you" only.
  const i = Math.max(0, index) % (SURVEN_CATEGORICAL.length - 1);
  return SURVEN_CATEGORICAL[i + 1];
}

/**
 * Per-metric threshold presets used across Surven pages.
 * Add new entries here so threshold logic stays in one place.
 */
export const SURVEN_THRESHOLDS = {
  /** Branded visibility (your brand mention rate on branded prompts). 90%+ is the bar. */
  brandedVisibility: { good: 90, mid: 70 },
  /** Generic / category visibility (mention rate on non-branded prompts). 50%+ is healthy. */
  categoryVisibility: { good: 50, mid: 25 },
  /** Crawlability score — 70%+ excellent, 50–70 watch, <50 concerning. */
  crawlability: { good: 70, mid: 50 },
  /** Citation rate — % of prompts where your domain is cited. */
  citationRate: { good: 50, mid: 25 },
  /** Authority mix — % of citations from high-authority sources. */
  highAuthorityMix: { good: 60, mid: 30 },
  /** Sentiment positivity rate. */
  sentimentPositive: { good: 70, mid: 40 },
} as const;
