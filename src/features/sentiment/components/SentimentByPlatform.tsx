"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { AIOverview } from "@/components/atoms/AIOverview";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
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
  const { rows, insight } = useMemo(() => {
    const rows = MODELS.map((model) => {
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

    const withData = rows.filter((r) => r.total > 0);
    const best  = withData.length > 0 ? withData.reduce((a, b) => a.positive >= b.positive ? a : b) : null;
    const worst = withData.length > 1 ? withData.reduce((a, b) => a.positive <= b.positive ? a : b) : null;
    const insight = best && worst && best.model !== worst.model
      ? `Strongest on ${MODEL_LABELS[best.model]} (${best.positive}% positive) — weakest on ${MODEL_LABELS[worst.model]} (${worst.positive}%). Closing this gap is your biggest lever.`
      : best
      ? `${MODEL_LABELS[best.model]} gives you the most favorable mentions at ${best.positive}% positive.`
      : null;

    return { rows, insight };
  }, [results]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">Sentiment by AI Platform</h3>
        <HoverHint hint="How each AI platform rates your brand's tone when it mentions you. Positive means favorable language; negative means critical or dismissive.">
          <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
        </HoverHint>
      </div>
      {insight && <div className="mb-5"><AIOverview text={insight} size="sm" /></div>}
      <div className="space-y-5">
        {rows.map((row, i) => (
          <div key={row.model}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-fg)]">
                <EngineIcon id={row.model} size={13} />
                {MODEL_LABELS[row.model]}
              </span>
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
                  style={{ width: `${row.neutral}%`, background: "#A09890" }}
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
          { color: SURVEN_SEMANTIC.goodAlt, label: "Positive" },
          { color: SURVEN_SEMANTIC.neutral, label: "Neutral" },
          { color: SURVEN_SEMANTIC.bad,     label: "Negative" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            <span className="text-xs text-[var(--color-fg-muted)]">{l.label}</span>
          </div>
        ))}
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "Each row is one AI engine (ChatGPT, Claude, Gemini, Google AI). Engines with no mentions are hidden.",
          },
          {
            label: "Bar length",
            body: "Each colored band is the share of that engine's mentions in that tone. The full bar always equals 100%.",
          },
          {
            label: "Colors",
            body: "Sage = positive, gray = neutral, rust = negative. Sage-heavy engines are your strongest; rust-heavy engines need attention.",
          },
          {
            label: "Mention count",
            body: "The right-aligned number shows how many AI responses included your business on that engine. Low counts mean less reliable signal.",
          },
        ]}
      />
    </Card>
  );
}
