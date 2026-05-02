"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { Intent } from "./types";
import { TAXONOMY_LABEL } from "./taxonomy";

const ease = [0.16, 1, 0.3, 1] as const;

interface DiagnosticBandProps {
  intents: Intent[];
  businessName: string;
}

interface TaxonomyStat {
  taxonomy: string;
  label: string;
  count: number;
  avgCoverage: number;
}

function summarize(intents: Intent[]): {
  weakest: TaxonomyStat | null;
  strongest: TaxonomyStat | null;
  weakestIntents: Intent[];
  strongestIntents: Intent[];
  untrackedCount: number;
  topUntracked: Intent | null;
  trackedHighCoverage: Intent | null;
} {
  if (intents.length === 0) {
    return {
      weakest: null,
      strongest: null,
      weakestIntents: [],
      strongestIntents: [],
      untrackedCount: 0,
      topUntracked: null,
      trackedHighCoverage: null,
    };
  }

  const byTax = new Map<string, { count: number; covSum: number; intents: Intent[] }>();
  for (const i of intents) {
    const prev = byTax.get(i.taxonomy) ?? { count: 0, covSum: 0, intents: [] };
    byTax.set(i.taxonomy, {
      count: prev.count + 1,
      covSum: prev.covSum + i.overallCoverage,
      intents: [...prev.intents, i],
    });
  }

  let weakest: TaxonomyStat | null = null;
  let strongest: TaxonomyStat | null = null;
  let weakestIntents: Intent[] = [];
  let strongestIntents: Intent[] = [];

  for (const [tax, v] of byTax.entries()) {
    const avg = Math.round(v.covSum / v.count);
    const label = TAXONOMY_LABEL[tax as keyof typeof TAXONOMY_LABEL] ?? tax;
    if (weakest === null || avg < weakest.avgCoverage) {
      weakest = { taxonomy: tax, label, count: v.count, avgCoverage: avg };
      weakestIntents = [...v.intents]
        .sort((a, b) => a.overallCoverage - b.overallCoverage)
        .slice(0, 3);
    }
    if (strongest === null || avg > strongest.avgCoverage) {
      strongest = { taxonomy: tax, label, count: v.count, avgCoverage: avg };
      strongestIntents = [...v.intents]
        .sort((a, b) => b.overallCoverage - a.overallCoverage)
        .slice(0, 3);
    }
  }

  const untracked = intents.filter((i) => !i.inTracker);
  const topUntracked =
    untracked.length > 0
      ? [...untracked].sort((a, b) => b.importance - a.importance)[0]
      : null;
  const untrackedCount = untracked.length;

  const tracked = intents.filter((i) => i.inTracker);
  const trackedHighCoverage =
    tracked.length > 0
      ? [...tracked].sort((a, b) => b.overallCoverage - a.overallCoverage)[0]
      : null;

  return {
    weakest,
    strongest,
    weakestIntents,
    strongestIntents,
    untrackedCount,
    topUntracked,
    trackedHighCoverage,
  };
}

export function PromptResearchDiagnosticBand({
  intents,
  businessName,
}: DiagnosticBandProps) {
  if (intents.length === 0) return null;

  const {
    weakest,
    strongest,
    weakestIntents,
    strongestIntents,
    untrackedCount,
    topUntracked,
    trackedHighCoverage,
  } = summarize(intents);

  if (!weakest && !strongest) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.15 }}
      className="grid grid-cols-1 gap-4 flex-1"
    >
      {/* What to watch */}
      {weakest && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3"
          style={{
            borderColor: `${SURVEN_SEMANTIC.bad}40`,
            backgroundColor: `${SURVEN_SEMANTIC.bad}08`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.bad}20` }}
            >
              <AlertTriangle
                className="h-3.5 w-3.5"
                style={{ color: SURVEN_SEMANTIC.bad }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              What to watch
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--color-fg)] leading-snug">
            Your weakest territory is{" "}
            <span className="font-semibold">{weakest.label}</span> at{" "}
            <span
              className="font-semibold"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              {weakest.avgCoverage}% coverage
            </span>{" "}
            across {weakest.count} researched intent
            {weakest.count === 1 ? "" : "s"}.
          </p>

          {weakestIntents.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: SURVEN_SEMANTIC.bad }}
              >
                Lowest-coverage intents
              </p>
              <ul className="space-y-1">
                {weakestIntents.map((it) => (
                  <li
                    key={it.id}
                    className="text-[11px] text-[var(--color-fg-secondary)] leading-snug"
                  >
                    <span className="text-[var(--color-fg)]">
                      &ldquo;{it.canonical}&rdquo;
                    </span>
                    <span className="text-[var(--color-fg-muted)]">
                      {" "}— {it.overallCoverage}% coverage,{" "}
                      {it.inTracker ? "tracked" : "not tracked"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topUntracked && untrackedCount > 0 && (
            <div
              className="rounded-[var(--radius-md)] px-2.5 py-1.5"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.bad}10` }}
            >
              <p className="text-[11px] text-[var(--color-fg-secondary)] leading-snug">
                <span
                  className="font-semibold"
                  style={{ color: SURVEN_SEMANTIC.bad }}
                >
                  Quick fix:
                </span>{" "}
                {untrackedCount} researched intent
                {untrackedCount === 1 ? "" : "s"} aren&apos;t in Tracker yet — top
                miss is{" "}
                <span className="font-semibold">
                  &ldquo;{topUntracked.canonical}&rdquo;
                </span>{" "}
                (importance {topUntracked.importance}).
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 mt-auto border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              {weakest.count} intent{weakest.count === 1 ? "" : "s"} ·{" "}
              {weakest.avgCoverage}% avg coverage
            </p>
            <Link
              href="/citation-insights"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              Citation Insights
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* What's working */}
      {strongest && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3 flex-1"
          style={{
            borderColor: `${SURVEN_SEMANTIC.good}40`,
            backgroundColor: `${SURVEN_SEMANTIC.good}08`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.good}20` }}
            >
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: SURVEN_SEMANTIC.good }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              What&apos;s working
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--color-fg)] leading-snug">
            <span className="font-semibold">{businessName}</span> is strongest on{" "}
            <span className="font-semibold">{strongest.label}</span> at{" "}
            <span
              className="font-semibold"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              {strongest.avgCoverage}% coverage
            </span>{" "}
            across {strongest.count} intent{strongest.count === 1 ? "" : "s"}.
          </p>

          {strongestIntents.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: SURVEN_SEMANTIC.good }}
              >
                Highest-coverage intents
              </p>
              <ul className="space-y-1">
                {strongestIntents.map((it) => (
                  <li
                    key={it.id}
                    className="text-[11px] text-[var(--color-fg-secondary)] leading-snug"
                  >
                    <span className="text-[var(--color-fg)]">
                      &ldquo;{it.canonical}&rdquo;
                    </span>
                    <span className="text-[var(--color-fg-muted)]">
                      {" "}— {it.overallCoverage}% coverage,{" "}
                      {it.inTracker ? "tracked" : "not tracked"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {trackedHighCoverage && (
            <div
              className="rounded-[var(--radius-md)] px-2.5 py-1.5"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.good}10` }}
            >
              <p className="text-[11px] text-[var(--color-fg-secondary)] leading-snug">
                <span
                  className="font-semibold"
                  style={{ color: SURVEN_SEMANTIC.good }}
                >
                  Source moat:
                </span>{" "}
                Your strongest tracked intent is{" "}
                <span className="font-semibold">
                  &ldquo;{trackedHighCoverage.canonical}&rdquo;
                </span>{" "}
                at {trackedHighCoverage.overallCoverage}%. Keep that page fresh.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 mt-auto border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              {strongest.count} intent{strongest.count === 1 ? "" : "s"} ·{" "}
              {strongest.avgCoverage}% avg coverage
            </p>
            <Link
              href="/ai-visibility-tracker"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              Open Tracker
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
