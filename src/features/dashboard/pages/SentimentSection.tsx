"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import type { ScanResult } from "@/types/database";

interface SentimentSectionProps {
  results: ScanResult[];
}

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "#fbbf24", bg: "bg-amber-500/15", text: "text-amber-400" },
  neutral:  { label: "Neutral",  color: "#94a3b8", bg: "bg-slate-500/15",   text: "text-slate-400"   },
  negative: { label: "Negative", color: "#ef4444", bg: "bg-red-500/15",     text: "text-red-400"     },
} as const;

export function SentimentSection({ results }: SentimentSectionProps) {
  const { counts, total, dominant } = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of mentioned) {
      if (r.sentiment) counts[r.sentiment]++;
    }
    const total = mentioned.length;
    const dominant = total > 0
      ? (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof counts)
      : null;
    return { counts, total, dominant };
  }, [results]);

  if (total === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Brand Sentiment</h2>
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Summary label */}
          <div className="text-center sm:text-left shrink-0">
            <p className="text-sm text-[var(--color-fg-muted)]">Overall tone</p>
            {dominant && (
              <p className={`text-2xl font-bold mt-1 ${SENTIMENT_CONFIG[dominant].text}`}>
                {SENTIMENT_CONFIG[dominant].label}
              </p>
            )}
            <p className="text-xs text-[var(--color-fg-muted)] mt-1">
              across {total} mention{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Bar chart */}
          <div className="flex-1 w-full space-y-3">
            {(["positive", "neutral", "negative"] as const).map((s) => {
              const pct = total > 0 ? Math.round((counts[s] / total) * 100) : 0;
              const cfg = SENTIMENT_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`text-xs w-16 shrink-0 ${cfg.text}`}>{cfg.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)]">
                    <motion.div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-fg-muted)] w-10 text-right shrink-0">
                    {pct}%
                  </span>
                  <span className="text-xs text-[var(--color-fg-muted)] w-4 text-right shrink-0">
                    ({counts[s]})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}
