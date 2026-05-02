import type { AuditSeverity } from "@/types/audit";

export type CrawlabilityCategory =
  | "http"
  | "indexability"
  | "content"
  | "security"
  | "links";

export interface CrawlabilityFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  category: CrawlabilityCategory;
  affectedPages: number;
  affectedUrls?: string[];
  estimatedFixTime: number;
  estimatedImpact: number;
  whatIsIt: string;
  whyItMatters: string;
  howToFix: string;
  fixCode?: string;
  fixType?: "html" | "robots" | "sitemap" | "config" | "llms";
  fixLabel?: string;
  isApplied?: boolean;
}

export interface LlmsTxtAnalysis {
  exists: boolean;
  url?: string;
  byteLength?: number;
  rawContent?: string;
}

export interface StatusBreakdown {
  "2xx": number;
  "3xx": number;
  "4xx": number;
  "5xx": number;
}

export interface CategoryScores {
  http: number;
  indexability: number;
  content: number;
  security: number;
  links: number;
}

export interface RobotsAnalysis {
  exists: boolean;
  isValid: boolean;
  blocksGooglebot: boolean;
  blocksGPTBot: boolean;
  blocksAnthropicAI: boolean;
  disallowedPaths: string[];
  hasSitemapReference: boolean;
  sitemapUrls: string[];
  crawlDelay?: number;
  rawContent?: string;
}

export interface SitemapAnalysis {
  found: boolean;
  url?: string;
  totalUrls: number;
  brokenUrlsCount: number;
  coveragePct: number;
  missingPages: string[];
}

export interface RedirectChain {
  startUrl: string;
  chain: { url: string; status: number }[];
  finalUrl: string;
  hops: number;
  loop: boolean;
}

export interface CrawlabilityResult {
  id: string;
  businessId: string;
  siteUrl: string;
  status: "completed" | "failed";
  errorMessage?: string;
  crawlabilityScore: number;
  findings: CrawlabilityFinding[];
  statusBreakdown: StatusBreakdown;
  categoryScores: CategoryScores;
  robotsAnalysis: RobotsAnalysis;
  sitemapAnalysis: SitemapAnalysis;
  llmsTxtAnalysis?: LlmsTxtAnalysis;
  redirectChains: RedirectChain[];
  homepageMeta: { title: string; description: string; faviconUrl: string };
  crawlStats: { pagesCrawled: number; pagesCapped: boolean; crawlDurationMs: number };
  scanStartedAt: string;
  scanCompletedAt: string;
  cacheExpiresAt: string;
  fromCache?: boolean;
}
