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
