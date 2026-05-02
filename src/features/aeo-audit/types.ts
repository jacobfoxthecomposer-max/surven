// AEO audit types — shared between server (api route) and client (UI).

export type CheckStatus = "pass" | "partial" | "fail";

export type Pillar = "discoverable" | "structured" | "quotable" | "trustworthy";

export const PILLAR_LABELS: Record<Pillar, string> = {
  discoverable: "Discoverable",
  structured: "Structured",
  quotable: "Quotable",
  trustworthy: "Trustworthy",
};

export const PILLAR_BLURBS: Record<Pillar, string> = {
  discoverable:
    "Crawlers can find and reach your site, and the AI bots are welcome.",
  structured:
    "Headings, schema, and metadata help AI parse what your page is about.",
  quotable:
    "Substantial, fresh, answer-shaped content AI can lift into responses.",
  trustworthy:
    "Citations, authoritative links, and the modern AI well-known files.",
};

export interface CheckResult {
  id: string;
  pillar: Pillar;
  label: string;
  status: CheckStatus;
  /** Points earned out of `max`. Allows partial credit. */
  earned: number;
  max: number;
  /** Short explanation of what was found. */
  detail: string;
  /** One sentence on how this check affects how AI reads the page. */
  readabilityImpact: string;
  /** What to do if the check failed or partial. Empty when passed cleanly. */
  recommendation: string;
}

export interface PillarScore {
  pillar: Pillar;
  earned: number;
  max: number;
  /** "good" | "average" | "poor" — derived from earned/max ratio. */
  grade: "good" | "average" | "poor";
}

export interface ScanResult {
  url: string;
  scannedAt: string; // ISO timestamp
  durationMs: number;
  /** 0–100 overall score, rounded to nearest int. */
  score: number;
  pillars: PillarScore[];
  checks: CheckResult[];
  /** Top-level error if the scan couldn't complete (e.g. network failure). */
  error?: string;
}

/** Helper to grade a pillar from its earned/max ratio. */
export function pillarGrade(earned: number, max: number): PillarScore["grade"] {
  if (max === 0) return "poor";
  const pct = earned / max;
  if (pct >= 0.75) return "good";
  if (pct >= 0.45) return "average";
  return "poor";
}
