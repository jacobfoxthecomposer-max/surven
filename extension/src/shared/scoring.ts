import type { AuditFinding, AuditSeverity } from "./types";

export type ScoreTier = "strong" | "moderate" | "needs-work" | "critical";

export interface VisibilityScore {
  score: number;
  tier: ScoreTier;
  label: string;
  color: string;
  topFindings: AuditFinding[];
  totalFindings: number;
}

const SEVERITY_PENALTY: Record<AuditSeverity, number> = {
  critical: 7,
  high: 4,
  medium: 2,
  low: 1,
};

const SEVERITY_RANK: Record<AuditSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TIER_BY_SCORE: Array<{ min: number; tier: ScoreTier; label: string; color: string }> = [
  { min: 80, tier: "strong", label: "Healthy", color: "#96A283" },
  { min: 60, tier: "moderate", label: "Good", color: "#D4A95A" },
  { min: 40, tier: "needs-work", label: "Needs Work", color: "#C97B45" },
  { min: 0, tier: "critical", label: "Critical", color: "#B54631" },
];

export function computeVisibilityScore(findings: AuditFinding[]): VisibilityScore {
  let score = 100;
  for (const f of findings) {
    score -= SEVERITY_PENALTY[f.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const { tier, label, color } = TIER_BY_SCORE.find((t) => score >= t.min) ?? TIER_BY_SCORE[TIER_BY_SCORE.length - 1];

  const topFindings = [...findings]
    .sort((a, b) => {
      const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.estimatedImpact - a.estimatedImpact;
    })
    .slice(0, 3);

  return { score, tier, label, color, topFindings, totalFindings: findings.length };
}
