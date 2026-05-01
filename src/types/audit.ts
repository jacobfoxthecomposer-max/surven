export type AuditSeverity = "critical" | "high" | "medium" | "low";

export interface AuditFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  affectedPages: number;
  estimatedFixTime: number;
  estimatedImpact: number;
  whatIsIt: string;
  whyItMatters: string;
  howToFix: string;
}

export interface CrawlStats {
  pagesCrawled: number;
  pagesCapped: boolean;
  crawlDurationMs: number;
}

export interface HomepageMeta {
  title: string;
  description: string;
  faviconUrl: string;
}

export interface AuditResult {
  id: string;
  businessId: string;
  siteUrl: string;
  status: "completed" | "failed";
  errorMessage?: string;
  findings: AuditFinding[];
  crawlStats: CrawlStats;
  homepageMeta: HomepageMeta;
  scanStartedAt: string;
  scanCompletedAt: string;
  cacheExpiresAt: string;
}

export interface CrawledPage {
  url: string;
  title: string;
  metaDescription: string;
  h1: string[];
  content: string;
  schemaTypes: string[];
  schemas: Record<string, unknown>[];
  lastModified?: Date;
  statusCode: number;

  // Crawlability extensions (optional, backwards compatible with existing audit rules)
  canonical?: string;
  metaRobots?: string;
  imageStats?: { total: number; missingAlt: number };
  hasViewportMeta?: boolean;
  ogTags?: { title?: string; description?: string; image?: string };
  responseTimeMs?: number;
}
