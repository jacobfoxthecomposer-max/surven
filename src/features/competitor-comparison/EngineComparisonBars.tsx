"use client";

import { motion } from "framer-motion";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { AI_MODELS } from "@/utils/constants";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

interface EngineComparisonBarsProps {
  results: ScanResult[];
  competitors: string[];
}

function calcModelScore(
  results: ScanResult[],
  model: string,
  competitor?: string,
): number | null {
  const modelResults = results.filter((r) => r.model_name === model);
  if (modelResults.length === 0) return null;
  if (!competitor) {
    const hits = modelResults.filter((r) => r.business_mentioned).length;
    return Math.round((hits / modelResults.length) * 100);
  }
  const relevant = modelResults.filter(
    (r) => r.competitor_mentions && competitor in r.competitor_mentions,
  );
  if (relevant.length === 0) return null;
  const hits = relevant.filter((r) => r.competitor_mentions[competitor]).length;
  if (hits === 0) return null;
  return Math.round((hits / relevant.length) * 100);
}

export function EngineComparisonBars({
  results,
  competitors,
}: EngineComparisonBarsProps) {
  const bars = AI_MODELS.map((m) => {
    const yourScore = calcModelScore(results, m.id);
    const compScores = competitors
      .map((c) => calcModelScore(results, m.id, c))
      .filter((s): s is number => s !== null);
    const avgComp =
      compScores.length > 0
        ? Math.round(compScores.reduce((a, b) => a + b, 0) / compScores.length)
        : null;
    return { id: m.id, name: m.name, yourScore, avgCompScore: avgComp };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.12 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">
          Visibility by AI engine
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-4 rounded-full"
              style={{ backgroundColor: SURVEN_SEMANTIC.good }}
            />
            <span className="text-[11px] text-[var(--color-fg-muted)]">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-4 rounded-full"
              style={{ backgroundColor: "rgba(181,70,49,0.35)" }}
            />
            <span className="text-[11px] text-[var(--color-fg-muted)]">
              Competitor avg
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {bars.map((bar) => {
          const yourPct = bar.yourScore ?? 0;
          const compPct = bar.avgCompScore ?? 0;
          const delta = yourPct - compPct;
          return (
            <div key={bar.id} className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 w-28 shrink-0">
                <EngineIcon id={bar.id} size={13} />
                <span className="text-xs text-[var(--color-fg-secondary)] font-medium">
                  {bar.name}
                </span>
              </span>
              <div className="flex-1 relative h-4 flex items-center">
                <div className="w-full h-2 rounded-full bg-[var(--color-surface-alt)] relative overflow-visible">
                  {bar.avgCompScore !== null && (
                    <motion.div
                      className="absolute top-0 left-0 h-2 rounded-full"
                      style={{
                        backgroundColor: "rgba(181,70,49,0.35)",
                        width: `${compPct}%`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${compPct}%` }}
                      transition={{ duration: 0.7, ease }}
                    />
                  )}
                  <motion.div
                    className="absolute top-0 left-0 h-2 rounded-full"
                    style={{
                      backgroundColor: SURVEN_SEMANTIC.good,
                      width: `${yourPct}%`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${yourPct}%` }}
                    transition={{ duration: 0.7, ease, delay: 0.1 }}
                  />
                </div>
              </div>
              <span
                className="text-xs font-semibold tabular-nums shrink-0 w-14 text-right"
                style={{
                  color:
                    delta > 0
                      ? SURVEN_SEMANTIC.good
                      : delta < 0
                        ? SURVEN_SEMANTIC.bad
                        : SURVEN_SEMANTIC.neutral,
                }}
              >
                {delta > 0 ? "+" : ""}
                {delta}%
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
