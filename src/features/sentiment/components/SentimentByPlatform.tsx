"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Info, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
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
  const { rows, best, worst } = useMemo(() => {
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

    const sorted = [...rows].sort((a, b) => b.positive - a.positive);
    const best = sorted[0] ?? null;
    const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;

    return { rows, best, worst };
  }, [results]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h3
            style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}
          >
            Sentiment by AI engine
          </h3>
          <HoverHint hint="Each engine's mentions broken down by tone. Positive means favorable framing; negative means critical or dismissive language.">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>
        {best && worst && best.model !== worst.model && (
          <span className="text-xs text-[var(--color-fg-muted)]">
            <span className="font-semibold" style={{ color: SURVEN_SEMANTIC.good }}>{MODEL_LABELS[best.model]}</span>
            {" leads · "}
            <span className="font-semibold" style={{ color: SURVEN_SEMANTIC.bad }}>{MODEL_LABELS[worst.model]}</span>
            {" trails"}
          </span>
        )}
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {rows.map((row, i) => {
          const positiveColor = row.positive >= 70 ? SURVEN_SEMANTIC.good : row.positive >= 40 ? SURVEN_SEMANTIC.mid : SURVEN_SEMANTIC.bad;
          return (
            <div key={row.model} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              {/* Engine */}
              <div className="flex items-center gap-2 shrink-0" style={{ minWidth: 130 }}>
                <EngineIcon id={row.model} size={14} />
                <span className="text-sm font-medium text-[var(--color-fg)]">{MODEL_LABELS[row.model]}</span>
              </div>

              {/* Stacked mini-bar */}
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full overflow-hidden flex bg-[var(--color-border)]">
                  {row.positive > 0 && (
                    <motion.div
                      className="h-full"
                      style={{ background: SURVEN_SEMANTIC.goodAlt }}
                      initial={{ width: 0 }}
                      animate={{ width: `${row.positive}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {row.neutral > 0 && (
                    <motion.div
                      className="h-full"
                      style={{ background: SURVEN_SEMANTIC.neutral }}
                      initial={{ width: 0 }}
                      animate={{ width: `${row.neutral}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 + 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {row.negative > 0 && (
                    <motion.div
                      className="h-full"
                      style={{ background: SURVEN_SEMANTIC.bad }}
                      initial={{ width: 0 }}
                      animate={{ width: `${row.negative}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 + 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--color-fg-muted)]">
                  {row.positive > 0 && <span><span style={{ color: SURVEN_SEMANTIC.good, fontWeight: 600 }}>{row.positive}%</span> pos</span>}
                  {row.neutral > 0 && <span>{row.neutral}% neu</span>}
                  {row.negative > 0 && <span><span style={{ color: SURVEN_SEMANTIC.bad, fontWeight: 600 }}>{row.negative}%</span> neg</span>}
                  <span className="ml-auto">{row.total} mention{row.total !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Headline % */}
              <div className="shrink-0 text-right" style={{ minWidth: 64 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: positiveColor,
                  }}
                >
                  {row.positive}%
                </span>
              </div>

              {/* Drill-in link */}
              <Link
                href="/prompts"
                className="shrink-0 flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: SURVEN_SEMANTIC.good, minWidth: 90, justifyContent: "flex-end" }}
              >
                <span>Audit</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "Each row is one AI engine. Engines with no mentions are hidden.",
          },
          {
            label: "Bar",
            body: "The stacked bar splits each engine's mentions by tone. Sage = positive, gray = neutral, rust = negative. The full bar always equals 100%.",
          },
          {
            label: "Headline %",
            body: "The big number on the right is the positive rate — your headline metric per engine. Above 70% is healthy; below 40% is concerning.",
          },
          {
            label: "Audit link",
            body: "Click Audit on any row to open that engine's prompts and see exactly which queries are driving the score.",
          },
        ]}
      />
    </Card>
  );
}
