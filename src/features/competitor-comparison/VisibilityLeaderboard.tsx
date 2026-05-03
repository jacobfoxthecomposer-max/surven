"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Plus, Trophy } from "lucide-react";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COMPETITOR_PALETTE } from "@/utils/constants";
import type { Scan, ScanResult, UserProfile } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

const YOU_COLOR = "#96A283"; // sage primary — locked
const MAX_COMPETITORS = 5; // Premium cap. Leaderboard shows up to 6 rows total
                           // (you + 5 competitor slots, filled or empty CTA).

// Per-plan competitor cap. `admin` is treated as `premium` for leaderboard
// purposes — even unlimited-quota users only have 5 visible competitor slots.
const PLAN_LIMITS: Record<UserProfile["plan"], number> = {
  free: 0,
  plus: 1,
  premium: 5,
  admin: 5,
};

// Same deterministic name → palette index used in the filter chips so a
// competitor's color matches across the page.
function competitorColor(name: string): string {
  const hash = Math.abs(
    [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return COMPETITOR_PALETTE[hash % COMPETITOR_PALETTE.length];
}

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
  /**
   * Past scans for the same business. Used to compute YOUR 90-day delta.
   * Per-competitor history isn't persisted yet, so competitor pills show 0.0%.
   */
  history?: Scan[];
  /** Current user's plan — drives the empty-slot CTA copy + destination. */
  plan?: UserProfile["plan"];
  /**
   * UNFILTERED total competitor count (i.e. how many are actually saved on
   * the business, not how many are passed via `competitors` after the chip
   * filter). Drives empty-slot count.
   */
  totalCompetitorCount?: number;
}

interface Row {
  name: string;
  color: string;
  visibility: number; // 0-100
  mentioned: number;
  total: number;
  isYou: boolean;
}

export function VisibilityLeaderboard({
  results,
  businessName,
  competitors,
  history = [],
  plan = "free",
  totalCompetitorCount,
}: Props) {
  // YOUR 90-day delta: latest visibility_score minus the score from the scan
  // closest to (but no newer than) 90 days ago. Falls back to oldest scan if
  // history is shorter than 90 days. Returns 0 when there's nothing to compare.
  const your90dDelta = useMemo(() => {
    if (history.length < 2) return 0;
    const sorted = [...history].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const latest = sorted[0];
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const baseline =
      sorted.find((s) => new Date(s.created_at).getTime() <= cutoff) ??
      sorted[sorted.length - 1];
    if (baseline.id === latest.id) return 0;
    return Math.round((latest.visibility_score - baseline.visibility_score) * 10) / 10;
  }, [history]);
  const rows = useMemo<Row[]>(() => {
    const total = results.length;
    if (total === 0) return [];

    // Your row
    const yourMentioned = results.filter((r) => r.business_mentioned).length;
    const youRow: Row = {
      name: businessName,
      color: YOU_COLOR,
      visibility: Math.round((yourMentioned / total) * 100),
      mentioned: yourMentioned,
      total,
      isYou: true,
    };

    // Competitor rows — only counted across prompts where that competitor
    // was actually a candidate (i.e. appears in `competitor_mentions`).
    const compRows: Row[] = competitors.map((name) => {
      const candidate = results.filter(
        (r) => r.competitor_mentions && name in r.competitor_mentions,
      );
      const denom = candidate.length;
      const hits = candidate.filter((r) => r.competitor_mentions[name]).length;
      const visibility = denom > 0 ? Math.round((hits / denom) * 100) : 0;
      return {
        name,
        color: competitorColor(name),
        visibility,
        mentioned: hits,
        total: denom,
        isYou: false,
      };
    });

    return [youRow, ...compRows].sort((a, b) => b.visibility - a.visibility);
  }, [results, businessName, competitors]);

  // Average across competitors (excludes you) — used for the delta on your row.
  // Must run before any early return.
  const compAvg = useMemo(() => {
    const comps = rows.filter((r) => !r.isYou);
    if (comps.length === 0) return null;
    return Math.round(
      comps.reduce((s, r) => s + r.visibility, 0) / comps.length,
    );
  }, [rows]);

  if (rows.length === 0) return null;

  const yourRank = rows.findIndex((r) => r.isYou) + 1;
  const yourRow = rows.find((r) => r.isYou)!;
  const youDelta = compAvg == null ? null : yourRow.visibility - compAvg;

  // Empty-slot calculation. `totalCompetitorCount` reflects the unfiltered
  // count (so toggling a chip off doesn't suddenly turn that row into an
  // "Add competitor" slot — it just disappears). Empty slots fill out to a
  // total of 5 competitor rows (you + 5 = 6 visible rows).
  const actualCompetitors = totalCompetitorCount ?? competitors.length;
  const emptySlots = Math.max(0, MAX_COMPETITORS - actualCompetitors);
  const planLimit = PLAN_LIMITS[plan];
  const canAddMore = actualCompetitors < planLimit;
  const ctaHref = canAddMore ? "/settings" : "/settings/billing";
  const ctaLabel = canAddMore ? "Add competitor" : "Upgrade to add";
  const CtaIcon = canAddMore ? Plus : Crown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.12 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy
            className="h-4 w-4"
            style={{ color: "var(--color-primary)" }}
          />
          <SectionHeading
            text="Visibility leaderboard"
            info="Brands ranked by how often AI mentions them across every scanned prompt."
          />
        </div>
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13 }}
        >
          You&apos;re ranked{" "}
          <span
            className="font-semibold tabular-nums"
            style={{ color: "var(--color-primary)" }}
          >
            #{yourRank}
          </span>{" "}
          of {rows.length}
          {youDelta != null && (
            <>
              {" — "}
              <span className="inline-flex items-center align-middle">
                <BadgeDelta
                  deltaType={
                    youDelta > 0
                      ? "increase"
                      : youDelta < 0
                        ? "decrease"
                        : "neutral"
                  }
                  value={`${youDelta > 0 ? "+" : ""}${youDelta}%`}
                  variant="solid"
                />
              </span>{" "}
              vs. competitor avg
            </>
          )}
        </p>
      </div>

      <ol className="space-y-1">
        {rows.map((r, i) => {
          const rank = i + 1;
          return (
            <li
              key={r.name}
              className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-1.5 transition-colors"
              style={{
                background: r.isYou
                  ? "rgba(150,162,131,0.10)"
                  : "transparent",
                borderLeft: r.isYou
                  ? `2px solid ${YOU_COLOR}`
                  : "2px solid transparent",
              }}
            >
              <span
                className="tabular-nums shrink-0 text-[var(--color-fg-muted)]"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  width: 22,
                  textAlign: "right",
                }}
              >
                #{rank}
              </span>
              <span className="flex items-center gap-2 w-40 shrink-0 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: r.isYou ? 700 : 500,
                    color: r.isYou
                      ? "var(--color-fg)"
                      : "var(--color-fg-secondary)",
                  }}
                  title={r.name}
                >
                  {r.name}
                  {r.isYou && (
                    <span
                      className="ml-1.5 align-middle text-[10px] font-bold tracking-wider uppercase"
                      style={{ color: "var(--color-primary)" }}
                    >
                      YOU
                    </span>
                  )}
                </span>
              </span>
              <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: r.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${r.visibility}%` }}
                  transition={{ duration: 0.7, ease, delay: 0.05 * i }}
                />
              </div>
              <span
                className="tabular-nums shrink-0 text-right"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  width: 44,
                  color: "var(--color-fg)",
                }}
              >
                {r.visibility}%
              </span>
              {/* 90-day delta pill — yours is real, competitors show neutral
                  0.0% until per-competitor history is persisted. */}
              <span className="shrink-0">
                {(() => {
                  const d = r.isYou ? your90dDelta : 0;
                  const deltaType =
                    d > 0 ? "increase" : d < 0 ? "decrease" : "neutral";
                  const formatted = `${d > 0 ? "+" : ""}${d.toFixed(1)}%`;
                  return (
                    <BadgeDelta
                      deltaType={deltaType}
                      value={formatted}
                      variant="solid"
                      title={
                        r.isYou
                          ? `Your visibility change over the last 90 days`
                          : `90-day change for ${r.name} (per-competitor history not yet tracked)`
                      }
                    />
                  );
                })()}
              </span>
              <span
                className="tabular-nums shrink-0 text-right text-[var(--color-fg-muted)]"
                style={{ fontSize: 11, width: 64 }}
                title={`Mentioned in ${r.mentioned} of ${r.total} prompts`}
              >
                {r.mentioned}/{r.total}
              </span>
            </li>
          );
        })}

        {/* Empty competitor slots — pads the leaderboard out to 5 competitor
            rows (6 total with you). Click → /settings to add another, or
            /settings/billing to upgrade if the user is at their plan cap. */}
        {Array.from({ length: emptySlots }).map((_, i) => {
          const slotRank = rows.length + i + 1;
          return (
            <li key={`empty-${i}`} className="px-0">
              <a
                href={ctaHref}
                className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-1.5 border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 hover:bg-[var(--color-surface-alt)]/70 hover:border-[var(--color-primary)]/50 transition-colors"
                style={{ borderLeft: "2px solid transparent" }}
                title={
                  canAddMore
                    ? `Add competitor #${slotRank - 1} of ${MAX_COMPETITORS}`
                    : `${plan === "plus" ? "Plus" : "Free"} plan caps you at ${planLimit} competitor${planLimit === 1 ? "" : "s"} — upgrade to add more`
                }
              >
                <span
                  className="tabular-nums shrink-0 text-[var(--color-fg-muted)] opacity-50"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    width: 22,
                    textAlign: "right",
                  }}
                >
                  #{slotRank}
                </span>
                <span className="flex items-center gap-2 w-40 shrink-0 min-w-0">
                  <span
                    className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 border border-dashed group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/10 transition-colors"
                    style={{
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CtaIcon
                      className="h-3 w-3 text-[var(--color-fg-muted)] group-hover:text-[var(--color-primary)] transition-colors"
                    />
                  </span>
                  <span
                    className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-primary)] transition-colors"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  >
                    {ctaLabel}
                  </span>
                </span>
                <span className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)]/40 border border-dashed border-[var(--color-border)]/50" />
                <span
                  className="shrink-0 text-[var(--color-fg-muted)] inline-flex items-center gap-1 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all"
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  {canAddMore ? "Add" : "See plans"}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}
