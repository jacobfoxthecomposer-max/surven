// AEO audit types — shared between server (api route) and client (UI).

export type CheckStatus = "pass" | "partial" | "critical";

export type Pillar = "discoverable" | "structured" | "quotable" | "trustworthy";

export const PILLAR_LABELS: Record<Pillar, string> = {
  discoverable: "Findable",
  structured: "Organized",
  quotable: "Citable",
  trustworthy: "Authoritative",
};

export const PILLAR_BLURBS: Record<Pillar, string> = {
  discoverable:
    "Whether AI crawlers like GPTBot, ClaudeBot, and PerplexityBot can actually reach and index your site. Covers HTTPS, robots.txt rules, sitemaps, canonical URLs, and indexability — if this fails, nothing else in the audit matters because AI never sees the page.",
  structured:
    "How parseable your page is once a crawler arrives. Covers the title tag, meta description, heading hierarchy, JSON-LD schema coverage, Open Graph tags, viewport, and image alt text — the markup that turns a page into something a model can confidently understand.",
  quotable:
    "Whether your content is substantial and answer-shaped enough for AI engines to lift into responses. Covers body word count, freshness signals (dateModified, Last-Modified headers, sitemap lastmod), and FAQ-style markup. Sparse or stale content gets skipped in favor of richer sources.",
  trustworthy:
    "The trust signals AI weighs when picking which source to cite. Covers internal link density, outbound citations to credible sources, the modern AI well-known files (llms.txt, ai.txt), and a favicon. Pages with weak credibility signals lose ground to authoritative competitors.",
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
  /** Estimated time to fix in minutes — used for effort tags on priority cards. */
  effortMin: number;
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
