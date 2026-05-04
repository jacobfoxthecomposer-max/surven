export type AuditSeverity = "critical" | "high" | "medium" | "low";

export interface AuditFinding {
  id: string;
  title: string;
  severity: AuditSeverity;
  affectedPages: number;
  /** URLs of the affected pages — used by per-page fixes (canonical_missing, etc.). */
  affectedUrls?: string[];
  estimatedFixTime: number;
  estimatedImpact: number;
  whatIsIt: string;
  whyItMatters: string;
  howToFix: string;
  // Fix metadata (only present on findings the backend can auto-fix)
  fixCode?: string;
  fixType?: "html" | "robots" | "sitemap" | "config" | "llms";
  fixLabel?: string;
  isApplied?: boolean;
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

export interface ManagedPlanCta {
  url: string;
  headline: string;
  body: string;
  buttonLabel: string;
}

export interface PerPageFixResult {
  total: number;
  succeeded: Array<{ url: string; filePath: string }>;
  skipped: Array<{ url: string; reason: string; filePath?: string }>;
  failed: Array<{ url: string; reason: string }>;
  commitSha?: string;
  commitUrl?: string;
}

export interface ApplyFixResponse {
  ok: boolean;
  committedSha?: string;
  commitUrl?: string;
  filePath?: string;
  error?: string;
  message?: string;
  connectUrl?: string;
  /** Present on per-page HTML fixes (canonical, etc.). */
  perPageResult?: PerPageFixResult;
  manualSnippet?: string;
  manualNote?: string;
  managedPlanCta?: ManagedPlanCta;
  /** Which integration handled the fix — drives the success-card link label. */
  platform?: string;
}

export interface ApplyFixRequest {
  siteUrl: string;
  findingId: string;
  findingTitle: string;
  fixType: NonNullable<AuditFinding["fixType"]>;
  fixCode: string;
  /** URLs from the finding's affectedUrls — required by per-page HTML fixes. */
  affectedUrls?: string[];
}
