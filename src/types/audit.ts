export type AuditSeverity = "critical" | "high" | "medium" | "low";

export interface AuditFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  affectedPages: number;
  estimatedFixTime: number;
  estimatedImpact: number;
  whyItMatters: string;
  howToFix: string;
}

export interface CrawlStats {
  pagesCrawled: number;
  pagesCapped: boolean;
  crawlDurationMs: number;
}

export interface AuditResult {
  id: string;
  businessId: string;
  siteUrl: string;
  status: "completed" | "failed";
  errorMessage?: string;
  findings: AuditFinding[];
  crawlStats: CrawlStats;
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
}
