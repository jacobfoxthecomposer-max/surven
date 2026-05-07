"use client";

/**
 * Per-engine sentence card. Replaces the prior 4-tile grid.
 *
 * Each engine gets a single sentence ("ChatGPT mentions you in 12 of 50
 * answers — 24%.") with an icon, a delta, and a deep-link to /prompts
 * filtered by that engine. Sentence form beats tiles for non-technical
 * SMB owners who parse prose faster than aligned numbers — and still
 * gives the curious user every metric they'd find in the old grid.
 *
 * Distilled from competitive-analysis report: every category leader
 * ships KPI tiles; sentence-form per-engine is one of Surven's
 * differentiating moves.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Cpu, Info, ArrowRight } from "lucide-react";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { AIOverview } from "@/components/atoms/AIOverview";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";

const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface ModelBreakdownSectionProps {
  results: ScanResult[];
  /** Optional: previous-scan rates for delta computation. */
  previousResults?: ScanResult[] | null;
}

interface EngineRow {
  model: ModelName;
  mentioned: number;
  total: number;
  rate: number;
  prevRate: number | null;
  color: string;
}

function colorForRate(rate: number, hasData: boolean): string {
  if (!hasData) return SURVEN_SEMANTIC.neutral;
  if (rate >= 50) return SURVEN_SEMANTIC.good;
  if (rate >= 25) return SURVEN_SEMANTIC.mid;
  return SURVEN_SEMANTIC.bad;
}

export function ModelBreakdownSection({
  results,
  previousResults = null,
}: ModelBreakdownSectionProps) {
  const rows = useMemo<EngineRow[]>(() => {
    return MODELS.map((model) => {
      const subset = results.filter((r) => r.model_name === model);
      const mentioned = subset.filter((r) => r.business_mentioned).length;
      const total = subset.length;
      const rate = total > 0 ? Math.round((mentioned / total) * 100) : 0;

      let prevRate: number | null = null;
      if (previousResults) {
        const prevSubset = previousResults.filter((r) => r.model_name === model);
        const prevMentioned = prevSubset.filter((r) => r.business_mentioned).length;
        prevRate =
          prevSubset.length > 0
            ? Math.round((prevMentioned / prevSubset.length) * 100)
            : null;
      }

      return {
        model,
        mentioned,
        total,
        rate,
        prevRate,
        color: colorForRate(rate, total > 0),
      };
    });
  }, [results, previousResults]);

  const insight = useMemo(() => {
    const live = rows.filter((r) => r.total > 0);
    if (live.length === 0) return null;
    const best = [...live].sort((a, b) => b.rate - a.rate)[0];
    const worst = [...live].sort((a, b) => a.rate - b.rate)[0];
    if (best.model === worst.model) {
      return `${MODEL_LABELS[best.model]} mentions you in ${best.mentioned} of ${best.total} answers (${best.rate}%).`;
    }
    return `${MODEL_LABELS[best.model]} mentions you most (${best.rate}% of answers); ${MODEL_LABELS[worst.model]} is your weak link at ${worst.rate}%.`;
  }, [rows]);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <SectionHeading
            text="How each AI sees you"
            info="One sentence per engine. Each shows how often that AI named your business in the latest scan."
          />
        </div>
      </div>

      {insight && (
        <div className="mb-4">
          <AIOverview text={insight} size="sm" />
        </div>
      )}

      <ul className="space-y-2.5">
        {rows.map((row) => {
          const hasData = row.total > 0;
          const deltaType =
            row.prevRate == null
              ? null
              : row.rate > row.prevRate
                ? ("increase" as const)
                : row.rate < row.prevRate
                  ? ("decrease" as const)
                  : ("neutral" as const);
          const deltaValue =
            row.prevRate == null
              ? null
              : `${row.rate - row.prevRate > 0 ? "+" : ""}${row.rate - row.prevRate}%`;

          return (
            <li
              key={row.model}
              className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-alt)]/40 transition-colors"
            >
              <EngineIcon id={row.model} size={16} />
              <p
                className="text-[var(--color-fg)] flex-1 min-w-0"
                style={{ fontSize: 13.5, lineHeight: 1.45 }}
              >
                <span className="font-semibold">{MODEL_LABELS[row.model]}</span>{" "}
                {hasData ? (
                  <>
                    mentions you in{" "}
                    <span
                      className="tabular-nums font-semibold"
                      style={{ color: row.color }}
                    >
                      {row.mentioned} of {row.total}
                    </span>{" "}
                    answers
                    {row.total > 0 && (
                      <span
                        className="tabular-nums"
                        style={{ color: "var(--color-fg-muted)", fontSize: 12.5 }}
                      >
                        {" "}
                        — {row.rate}%
                      </span>
                    )}
                    .
                  </>
                ) : (
                  <span className="text-[var(--color-fg-muted)]">
                    has no scan data yet.
                  </span>
                )}
              </p>
              {deltaType && deltaValue && (
                <BadgeDelta
                  variant="solid"
                  deltaType={deltaType}
                  value={deltaValue}
                />
              )}
              {hasData && (
                <Link
                  href={`/prompts?engine=${row.model}`}
                  className="inline-flex items-center gap-1 font-semibold opacity-70 hover:opacity-100 hover:gap-1.5 transition-all shrink-0"
                  style={{ fontSize: 11.5, color: SURVEN_SEMANTIC.good }}
                >
                  View prompts
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
