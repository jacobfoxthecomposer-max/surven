"use client";

/**
 * Brand sentiment card — heading inside the card with bottom-border separator
 * (canonical Surven section pattern). Shows the dominant sentiment verdict
 * (Strong / Mixed / Concerning) plus a 3-row bar chart of positive / neutral
 * / negative shares. Verdict logic mirrors `/sentiment` and the Surven
 * KPI strip.
 */

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { AIOverview } from "@/components/atoms/AIOverview";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { summarizeSentiment } from "@/features/dashboard/utils/heroSentence";
import type { ScanResult } from "@/types/database";

const SENTIMENT_BAR = {
  positive: { label: "Positive", color: SURVEN_SEMANTIC.good },
  neutral: { label: "Neutral", color: SURVEN_SEMANTIC.neutral },
  negative: { label: "Negative", color: SURVEN_SEMANTIC.bad },
} as const;

interface SentimentSectionProps {
  results: ScanResult[];
}

export function SentimentSection({ results }: SentimentSectionProps) {
  const summary = useMemo(() => summarizeSentiment(results), [results]);

  if (summary.total === 0) return null;

  const insight = useMemo(() => {
    if (summary.verdict === "Concerning") {
      return `Sentiment is concerning — ${summary.negative} of ${summary.total} mentions are negative. Address them before they spread.`;
    }
    if (summary.verdict === "Strong") {
      return `Sentiment is strong — AI describes you positively in ${summary.positive} of ${summary.total} mentions.`;
    }
    return `Sentiment is mixed — ${summary.positive} positive, ${summary.neutral} neutral, ${summary.negative} negative across ${summary.total} mentions.`;
  }, [summary]);

  const rows = (["positive", "neutral", "negative"] as const).map((key) => {
    const count =
      key === "positive"
        ? summary.positive
        : key === "neutral"
          ? summary.neutral
          : summary.negative;
    const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
    return { key, count, pct, ...SENTIMENT_BAR[key] };
  });

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <SectionHeading
            text="Brand sentiment"
            info="When AI describes your business, how positive, neutral, or negative the tone is across all mentions in the latest scan."
          />
        </div>
        <Link
          href="/sentiment"
          className="inline-flex items-center gap-1 font-semibold opacity-70 hover:opacity-100 hover:gap-1.5 transition-all shrink-0"
          style={{ fontSize: 11.5, color: SURVEN_SEMANTIC.good }}
        >
          See full report
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mb-4">
        <AIOverview text={insight} size="sm" />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center sm:text-left shrink-0">
          <p
            className="text-[var(--color-fg-muted)] uppercase"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}
          >
            Verdict
          </p>
          <p
            className="font-semibold mt-1"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              lineHeight: 1,
              color: summary.color,
              fontStyle: "italic",
            }}
          >
            {summary.verdict}
          </p>
          <p
            className="text-[var(--color-fg-muted)] mt-1.5"
            style={{ fontSize: 11.5 }}
          >
            across {summary.total} mention{summary.total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 w-full space-y-2.5">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <span
                className="shrink-0 text-[var(--color-fg-secondary)]"
                style={{ fontSize: 12, fontWeight: 600, width: 64 }}
              >
                {row.label}
              </span>
              <div
                className="flex-1 overflow-hidden"
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "var(--color-border)",
                }}
              >
                <motion.span
                  className="block h-full"
                  style={{ backgroundColor: row.color, borderRadius: 4 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.pct}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span
                className="tabular-nums shrink-0 text-[var(--color-fg)]"
                style={{ fontSize: 12, fontWeight: 600, width: 38, textAlign: "right" }}
              >
                {row.pct}%
              </span>
              <span
                className="tabular-nums shrink-0 text-[var(--color-fg-muted)]"
                style={{ fontSize: 11, width: 28, textAlign: "right" }}
              >
                ({row.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
