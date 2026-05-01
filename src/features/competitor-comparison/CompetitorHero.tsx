"use client";

import { motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";

const ease = [0.16, 1, 0.3, 1] as const;

interface CompetitorHeroProps {
  businessName: string;
  score: number;
  avgCompetitorScore: number;
  competitorCount: number;
  onExport: () => void;
}

export function CompetitorHero({
  businessName,
  score,
  avgCompetitorScore,
  competitorCount,
  onExport,
}: CompetitorHeroProps) {
  const gap = score - avgCompetitorScore;
  const verdictWord =
    gap > 5 ? "outpacing" : gap < -5 ? "trailing" : "matching";
  const verdictColor =
    gap > 5
      ? SURVEN_SEMANTIC.good
      : gap < -5
        ? SURVEN_SEMANTIC.bad
        : SURVEN_SEMANTIC.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="flex items-start justify-between gap-6"
    >
      <div className="space-y-2 min-w-0 flex-1">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 3.5vw, 48px)",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
          }}
        >
          You&apos;re{" "}
          <span style={{ color: verdictColor, fontStyle: "italic" }}>
            {verdictWord}
          </span>{" "}
          the competition.
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          {businessName} vs {competitorCount} competitor
          {competitorCount !== 1 ? "s" : ""} across AI platforms
        </p>
      </div>

      <div className="flex flex-col gap-2 shrink-0 min-w-[180px]">
        <NextScanCard />
        <button
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>
        <a
          href="/settings"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Manage competitors
        </a>
      </div>
    </motion.div>
  );
}
