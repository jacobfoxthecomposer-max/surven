import { AUDIT_RULES } from "./auditRules";
import type { CrawledPage, AuditFinding } from "@/types/audit";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export function analyzeWebsite(pages: CrawledPage[]): AuditFinding[] {
  const homepage = pages[0];
  if (!homepage) return [];

  const findings: AuditFinding[] = [];
  for (const rule of AUDIT_RULES) {
    const finding = rule.check(homepage, pages);
    if (finding) findings.push(finding);
  }

  return findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}
