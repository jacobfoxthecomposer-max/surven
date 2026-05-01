"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import {
  SURVEN_SEMANTIC,
  colorForValue,
  categoricalColor,
  SURVEN_THRESHOLDS,
} from "@/utils/brandColors";
import { AI_MODELS } from "@/utils/constants";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

interface CompetitorRow {
  name: string;
  isYou: boolean;
  overallScore: number;
  gap: number; // vs you (positive = they're ahead)
  topEngine: { id: string; name: string; score: number } | null;
  modelScores: Record<string, number | null>;
  status: "ahead" | "behind" | "even";
}

interface CompetitorRowTableProps {
  results: ScanResult[];
  businessName: string;
  businessScore: number;
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

function MiniBar({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  return (
    <div className="w-20 h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
      <motion.div
        className="h-1.5 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(score, 100)}%` }}
        transition={{ duration: 0.6, ease }}
      />
    </div>
  );
}

function DrawerContent({
  row,
  businessScore,
}: {
  row: CompetitorRow;
  businessScore: number;
}) {
  return (
    <motion.div
      key="drawer"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-2 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {AI_MODELS.map((m) => {
            const score = row.modelScores[m.id];
            const yourScore = businessScore;
            const delta = score !== null ? score - yourScore : null;
            const color = colorForValue(
              score,
              SURVEN_THRESHOLDS.categoryVisibility,
            );
            return (
              <div
                key={m.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-surface)]"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <EngineIcon id={m.id} size={11} />
                  <span className="text-[11px] text-[var(--color-fg-muted)] font-medium">
                    {m.name}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: score !== null ? color : "var(--color-fg-muted)",
                  }}
                >
                  {score !== null ? `${score}%` : "—"}
                </p>
                {delta !== null && (
                  <BadgeDelta
                    variant="solid"
                    deltaType={
                      delta > 0
                        ? "decrease"
                        : delta < 0
                          ? "increase"
                          : "neutral"
                    }
                    value={`${Math.abs(delta)}%`}
                    className="mt-1.5 text-[10px]"
                  />
                )}
                {delta !== null && (
                  <p className="text-[10px] text-[var(--color-fg-muted)] mt-0.5">
                    {delta > 0
                      ? "ahead of you"
                      : delta < 0
                        ? "behind you"
                        : "even"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/prompts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors"
          >
            See where they rank
            <ArrowRight className="h-3 w-3" />
          </Link>
          <span className="text-[var(--color-border)]">·</span>
          <Link
            href="/citation-insights"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors"
          >
            Compare citations
            <ArrowRight className="h-3 w-3" />
          </Link>
          <span className="text-[var(--color-border)]">·</span>
          <Link
            href="/audit"
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: SURVEN_SEMANTIC.bad }}
          >
            Run GEO audit
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export function CompetitorRowTable({
  results,
  businessName,
  businessScore,
  competitors,
}: CompetitorRowTableProps) {
  const [openRow, setOpenRow] = useState<string | null>(null);

  const rows = useMemo<CompetitorRow[]>(() => {
    const modelIds = AI_MODELS.map((m) => m.id);

    const buildRow = (
      name: string,
      isYou: boolean,
      idx: number,
    ): CompetitorRow => {
      const modelScores: Record<string, number | null> = {};
      let totalScore = 0;
      let counted = 0;

      for (const mid of modelIds) {
        const s = isYou
          ? calcModelScore(results, mid)
          : calcModelScore(results, mid, name);
        modelScores[mid] = s;
        if (s !== null) {
          totalScore += s;
          counted++;
        }
      }

      const overallScore =
        counted > 0 ? Math.round(totalScore / counted) : 0;

      // Best engine for this entity
      let topEngine: CompetitorRow["topEngine"] = null;
      for (const m of AI_MODELS) {
        const s = modelScores[m.id];
        if (s !== null && (topEngine === null || s > topEngine.score)) {
          topEngine = { id: m.id, name: m.name, score: s };
        }
      }

      const gap = isYou ? 0 : overallScore - businessScore;
      const status: CompetitorRow["status"] =
        gap > 2 ? "ahead" : gap < -2 ? "behind" : "even";

      return {
        name,
        isYou,
        overallScore,
        gap,
        topEngine,
        modelScores,
        status,
      };
    };

    const youRow = buildRow(businessName, true, 0);
    const compRows = competitors.map((c, i) => buildRow(c, false, i + 1));
    compRows.sort((a, b) => b.overallScore - a.overallScore);

    return [youRow, ...compRows];
  }, [results, businessName, businessScore, competitors]);

  return (
    <section id="competitor-rows-section">
      <Card className="overflow-hidden">
        {/* Header */}
        <div
          className="-mx-5 -mt-5 px-5 py-4 mb-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                Competitor Rankings
              </h3>
              <HoverHint hint="Overall visibility score per competitor (average across all AI engines). Click any row to see a per-engine breakdown. Higher is better.">
                <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
              </HoverHint>
            </div>
            <Link
              href="/ai-visibility-tracker"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              Full tracker <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_80px_80px_100px_80px_24px] gap-2 px-1 mb-2">
          <span className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
            Competitor
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide text-center">
            Score
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide text-center">
            vs You
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
            Best engine
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide text-center">
            Status
          </span>
          <span />
        </div>

        <div className="space-y-1">
          {rows.map((row, i) => {
            const isOpen = openRow === row.name;
            const barColor = categoricalColor(i, row.isYou);
            const scoreColor = colorForValue(
              row.overallScore,
              SURVEN_THRESHOLDS.categoryVisibility,
            );

            return (
              <motion.div
                key={row.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className={`rounded-[var(--radius-md)] border transition-colors ${
                  row.isYou
                    ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                {/* Main row */}
                <button
                  type="button"
                  onClick={() =>
                    setOpenRow(isOpen ? null : row.name)
                  }
                  className="w-full grid grid-cols-[1fr_80px_80px_100px_80px_24px] gap-2 px-4 py-3 items-center text-left"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <MiniBar score={row.overallScore} color={barColor} />
                    <span
                      className={`text-sm truncate ${
                        row.isYou
                          ? "font-semibold text-[var(--color-fg)]"
                          : "text-[var(--color-fg-secondary)]"
                      }`}
                    >
                      {row.name}
                    </span>
                    {row.isYou && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                        style={{
                          backgroundColor: `${SURVEN_SEMANTIC.good}20`,
                          color: SURVEN_SEMANTIC.good,
                        }}
                      >
                        You
                      </span>
                    )}
                  </div>

                  {/* Score */}
                  <span
                    className="text-sm font-semibold tabular-nums text-center"
                    style={{ color: scoreColor }}
                  >
                    {row.overallScore}%
                  </span>

                  {/* vs You delta */}
                  <div className="flex justify-center">
                    {row.isYou ? (
                      <span className="text-[11px] text-[var(--color-fg-muted)]">
                        —
                      </span>
                    ) : (
                      <BadgeDelta
                        variant="solid"
                        deltaType={
                          row.gap > 0
                            ? "decrease"
                            : row.gap < 0
                              ? "increase"
                              : "neutral"
                        }
                        value={`${Math.abs(row.gap)}%`}
                        className="text-[10px]"
                      />
                    )}
                  </div>

                  {/* Best engine */}
                  <div className="flex items-center gap-1.5">
                    {row.topEngine ? (
                      <>
                        <EngineIcon id={row.topEngine.id} size={11} />
                        <span className="text-xs text-[var(--color-fg-muted)] truncate">
                          {row.topEngine.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--color-fg-muted)]">
                        —
                      </span>
                    )}
                  </div>

                  {/* Status pill */}
                  <div className="flex justify-center">
                    {row.isYou ? null : (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor:
                            row.status === "ahead"
                              ? `${SURVEN_SEMANTIC.bad}15`
                              : row.status === "behind"
                                ? `${SURVEN_SEMANTIC.good}15`
                                : `${SURVEN_SEMANTIC.neutral}15`,
                          color:
                            row.status === "ahead"
                              ? SURVEN_SEMANTIC.bad
                              : row.status === "behind"
                                ? SURVEN_SEMANTIC.good
                                : SURVEN_SEMANTIC.neutral,
                        }}
                      >
                        {row.status === "ahead"
                          ? "Ahead"
                          : row.status === "behind"
                            ? "Behind"
                            : "Even"}
                      </span>
                    )}
                  </div>

                  {/* Expand chevron */}
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease }}
                    className="flex items-center justify-center"
                  >
                    <ChevronDown className="h-4 w-4 text-[var(--color-fg-muted)]" />
                  </motion.div>
                </button>

                {/* Drawer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <DrawerContent row={row} businessScore={businessScore} />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <ChartExplainer
          blocks={[
            {
              label: "Score",
              body: "Average mention rate across all four AI engines — the share of prompts where the entity was named. Higher is better.",
            },
            {
              label: "vs You",
              body: "Difference between their overall score and yours. Green means you're ahead; rust means they're ahead.",
            },
            {
              label: "Best engine",
              body: "The single AI platform where that entity scores highest. Useful for spotting which engine a competitor dominates.",
            },
            {
              label: "Status",
              body: "Ahead (their score > yours by 2+ points), Behind (yours > theirs), or Even. Click any row to see per-engine details.",
            },
          ]}
          tip="Click a competitor row to expand per-engine scores and jump to relevant tools."
        />
      </Card>
    </section>
  );
}
