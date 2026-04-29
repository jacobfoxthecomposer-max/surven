"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import type { ScanResult, ModelName } from "@/types/database";

const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface Props {
  results: ScanResult[];
}

export function SentimentByPlatform({ results }: Props) {
  const rows = useMemo(() => {
    return MODELS.map((model) => {
      const modelResults = results.filter((r) => r.business_mentioned && r.model_name === model);
      const total = modelResults.length;
      if (total === 0) return { model, total: 0, positive: 0, neutral: 0, negative: 0 };
      return {
        model,
        total,
        positive: Math.round((modelResults.filter((r) => r.sentiment === "positive").length / total) * 100),
        neutral:  Math.round((modelResults.filter((r) => r.sentiment === "neutral").length  / total) * 100),
        negative: Math.round((modelResults.filter((r) => r.sentiment === "negative").length / total) * 100),
      };
    }).filter((r) => r.total > 0);
  }, [results]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--color-fg)] mb-5">Sentiment by AI Platform</h3>
      <div className="space-y-5">
        {rows.map((row, i) => (
          <div key={row.model}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-fg)]">{MODEL_LABELS[row.model]}</span>
              <span className="text-xs text-[var(--color-fg-muted)]">{row.total} mention{row.total !== 1 ? "s" : ""}</span>
            </div>
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-[var(--color-surface-alt)]">
              {row.positive > 0 && (
                <motion.div
                  className="h-full"
                  style={{ width: `${row.positive}%`, background: "#96A283" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.positive}%` }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              {row.neutral > 0 && (
                <motion.div
                  className="h-full"
                  style={{ width: `${row.neutral}%`, background: "#C8C2B4" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.neutral}%` }}
                  transition={{ duration: 0.7, delay: i * 0.1 + 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              {row.negative > 0 && (
                <motion.div
                  className="h-full"
                  style={{ width: `${row.negative}%`, background: "#B54631" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.negative}%` }}
                  transition={{ duration: 0.7, delay: i * 0.1 + 0.1, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              {row.positive > 0  && <span className="text-xs text-[#566A47]">{row.positive}% positive</span>}
              {row.neutral > 0   && <span className="text-xs text-[var(--color-fg-muted)]">{row.neutral}% neutral</span>}
              {row.negative > 0  && <span className="text-xs text-[#8C3522]">{row.negative}% negative</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-5 pt-4 border-t border-[var(--color-border)]">
        {[
          { color: "#96A283", label: "Positive" },
          { color: "#C8C2B4", label: "Neutral" },
          { color: "#B54631", label: "Negative" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            <span className="text-xs text-[var(--color-fg-muted)]">{l.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
