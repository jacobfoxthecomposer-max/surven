"use client";

import { motion } from "framer-motion";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";

const ease = [0.16, 1, 0.3, 1] as const;

interface CompetitorHeroProps {
  businessName: string;
  score: number;
  avgCompetitorScore: number;
  competitorCount: number;
}

export function CompetitorHero({
  businessName,
  score,
  avgCompetitorScore,
  competitorCount,
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
      className="space-y-2 min-w-0"
    >
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
    </motion.div>
  );
}
