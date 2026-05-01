"use client";

import { motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { SURVEN_SEMANTIC, colorForValue, SURVEN_THRESHOLDS } from "@/utils/brandColors";
import { AI_MODELS } from "@/utils/constants";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

interface CompetitorHeroProps {
  businessName: string;
  score: number;
  avgCompetitorScore: number;
  competitorCount: number;
  outperforming: number;
  results: ScanResult[];
  competitors: string[];
  onExport: () => void;
}

interface EngineBar {
  id: string;
  name: string;
  yourScore: number | null;
  avgCompScore: number | null;
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

export function CompetitorHero({
  businessName,
  score,
  avgCompetitorScore,
  competitorCount,
  outperforming,
  results,
  competitors,
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

  const engineBars: EngineBar[] = AI_MODELS.map((m) => {
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

  const scoreColor = colorForValue(score, SURVEN_THRESHOLDS.categoryVisibility);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-6 items-start"
    >
      {/* Left zone — headline + verdict */}
      <div className="space-y-3 min-w-0">
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

        {/* Per-engine vs-bars */}
        {results.length > 0 && (
          <div className="pt-2 space-y-2">
            {engineBars.map((bar) => {
              const yourPct = bar.yourScore ?? 0;
              const compPct = bar.avgCompScore ?? 0;
              const delta = yourPct - compPct;
              return (
                <div key={bar.id} className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 w-24 shrink-0">
                    <EngineIcon id={bar.id} size={12} />
                    <span
                      className="text-[11px] text-[var(--color-fg-muted)]"
                      style={{ lineHeight: 1 }}
                    >
                      {bar.name}
                    </span>
                  </span>
                  <div className="flex-1 relative h-4 flex items-center">
                    {/* Track */}
                    <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-alt)] relative overflow-visible">
                      {/* Competitor bar */}
                      {bar.avgCompScore !== null && (
                        <motion.div
                          className="absolute top-0 left-0 h-1.5 rounded-full"
                          style={{
                            backgroundColor: "rgba(181,70,49,0.35)",
                            width: `${compPct}%`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${compPct}%` }}
                          transition={{ duration: 0.7, ease }}
                        />
                      )}
                      {/* Your bar */}
                      <motion.div
                        className="absolute top-0 left-0 h-1.5 rounded-full"
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
                    className="text-[11px] font-semibold tabular-nums shrink-0 w-12 text-right"
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
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-4 rounded-full"
                  style={{ backgroundColor: SURVEN_SEMANTIC.good }}
                />
                <span className="text-[10px] text-[var(--color-fg-muted)]">You</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-4 rounded-full"
                  style={{ backgroundColor: "rgba(181,70,49,0.35)" }}
                />
                <span className="text-[10px] text-[var(--color-fg-muted)]">
                  Competitor avg
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center zone — score vs avg */}
      {results.length > 0 && (
        <div className="flex flex-col items-center gap-1 px-6 border-x border-[var(--color-border)] shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] font-semibold">
            Your Score
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1,
              color: scoreColor,
            }}
          >
            {score}%
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="text-xs font-semibold tabular-nums"
              style={{
                color: gap >= 0 ? SURVEN_SEMANTIC.good : SURVEN_SEMANTIC.bad,
              }}
            >
              {gap >= 0 ? "+" : ""}
              {gap}%
            </span>
            <span className="text-xs text-[var(--color-fg-muted)]">vs avg</span>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[11px] text-[var(--color-fg-muted)]">
              Beating {outperforming}/{competitorCount}
            </span>
          </div>
        </div>
      )}

      {/* Right zone — action panel */}
      <div className="flex flex-col gap-2 shrink-0 min-w-[160px]">
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
