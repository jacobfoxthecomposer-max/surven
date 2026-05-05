"use client";

/**
 * "Average rank when mentioned" leaderboard. Replaces the cloned
 * line-chart variant 2026-05-03 — same data sources + empty-slot pattern
 * as VisibilityLeaderboard, just ranked by AI-visibility instead of bar
 * fills. Six visible rows total (you + 5 competitor slots, filled or
 * Add/See-plans CTAs).
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Plus, Trophy } from "lucide-react";
import { AIOverview } from "@/components/atoms/AIOverview";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COMPETITOR_PALETTE } from "@/utils/constants";
import { PLAN_FEATURES } from "@/utils/plans";
import type { Scan, ScanResult, UserProfile } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

const YOU_COLOR = "#7D8E6C";
const MAX_COMPETITORS = PLAN_FEATURES.premium.maxCompetitors;

function competitorColor(name: string): string {
  const hash = Math.abs(
    [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return COMPETITOR_PALETTE[hash % COMPETITOR_PALETTE.length];
}

// Tier color for the per-row rank pill — sage at #1 (best) → rust at the
// last filled slot. `maxRank` is the count of FILLED rows so the gradient
// stretches across whatever competitor set the user actually has, instead
// of always assuming a 5-rank ramp.
function colorForRankTier(
  rank: number,
  maxRank: number,
): { bg: string; text: string; label: string } {
  const ratio =
    maxRank <= 1 ? 0 : (rank - 1) / Math.max(1, maxRank - 1);
  if (ratio <= 0.2)
    return {
      bg: "rgba(125,142,108,0.22)",
      text: "#5E7250",
      label: "Top tier",
    };
  if (ratio <= 0.4)
    return {
      bg: "rgba(150,162,131,0.20)",
      text: "#7D8E6C",
      label: "Strong",
    };
  if (ratio <= 0.6)
    return {
      bg: "rgba(184,160,48,0.20)",
      text: "#7E6B17",
      label: "Mid-pack",
    };
  if (ratio <= 0.8)
    return {
      bg: "rgba(201,123,69,0.20)",
      text: "#A06210",
      label: "Trailing",
    };
  return {
    bg: "rgba(181,70,49,0.20)",
    text: "#B54631",
    label: "Last place",
  };
}

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
  history?: Scan[];
  plan?: UserProfile["plan"];
  totalCompetitorCount?: number;
}

interface Row {
  name: string;
  color: string;
  visibility: number;
  isYou: boolean;
}

export function CompetitorRankChart({
  results,
  businessName,
  competitors,
  history = [],
  plan = "free",
  totalCompetitorCount,
}: Props) {
  const rows = useMemo<Row[]>(() => {
    const total = results.length;
    if (total === 0) return [];

    const yourMentioned = results.filter((r) => r.business_mentioned).length;
    const youRow: Row = {
      name: businessName,
      color: YOU_COLOR,
      visibility: total > 0 ? (yourMentioned / total) * 100 : 0,
      isYou: true,
    };

    const compRows: Row[] = competitors.map((name) => {
      const candidate = results.filter(
        (r) => r.competitor_mentions && name in r.competitor_mentions,
      );
      const denom = candidate.length;
      const hits = candidate.filter((r) => r.competitor_mentions[name]).length;
      const visibility = denom > 0 ? (hits / denom) * 100 : 0;
      return {
        name,
        color: competitorColor(name),
        visibility,
        isYou: false,
      };
    });

    return [youRow, ...compRows].sort((a, b) => b.visibility - a.visibility);
  }, [results, businessName, competitors]);

  // YOUR 90-day delta from real history.
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
    return (
      Math.round((latest.visibility_score - baseline.visibility_score) * 10) /
      10
    );
  }, [history]);

  if (rows.length === 0) return null;

  const yourRank = rows.findIndex((r) => r.isYou) + 1;
  const yourRow = rows.find((r) => r.isYou)!;
  const leader = rows[0];

  // AI summary — short, real-data-derived. Locked rule: never placeholder.
  const insight = (() => {
    if (yourRank === 1) {
      const next = rows[1];
      return next
        ? `Leading the pack at #1.0. ${next.name} is closest at #2.0 — keep building citations to hold the lead.`
        : `Leading the pack at #1.0 — the only brand AI is naming on your prompts.`;
    }
    const tier =
      yourRank === 2
        ? "Solid runner-up"
        : yourRank === 3
          ? "Solid mid-pack"
          : "Trailing position";
    return `${tier} at #${yourRank}.0. Push to close the gap on ${leader.name}.`;
  })();

  // YOUR delta pill in the top-right header corner.
  const youHeaderPill = (() => {
    const flat = Math.abs(your90dDelta) <= 0.04;
    const grew = your90dDelta > 0;
    return (
      <BadgeDelta
        variant="solid"
        deltaType={flat ? "neutral" : grew ? "increase" : "decrease"}
        value={`${grew ? "+" : ""}${your90dDelta.toFixed(1)}%`}
        title={
          flat
            ? "No change in your rank vs. the start of the range."
            : `${grew ? "Up" : "Down"} ${Math.abs(your90dDelta).toFixed(1)}% over the last 90 days.`
        }
      />
    );
  })();

  // Empty-slot calculation — mirrors VisibilityLeaderboard.
  const actualCompetitors = totalCompetitorCount ?? competitors.length;
  const emptySlots = Math.max(0, MAX_COMPETITORS - actualCompetitors);
  const planLimit = PLAN_FEATURES[plan].maxCompetitors;
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
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy
            className="h-4 w-4"
            style={{ color: "var(--color-primary)" }}
          />
          <SectionHeading
            text="Average rank when mentioned"
            info="Brands ranked by how often AI mentions them across every scanned prompt. Lower number = better."
          />
        </div>
        <div className="shrink-0">{youHeaderPill}</div>
      </div>

      <div className="mb-3">
        <AIOverview text={insight} size="sm" gradient />
      </div>

      <ol className="space-y-1">
        {rows.map((r, i) => {
          const rank = i + 1;
          const rowDelta = r.isYou ? your90dDelta : 0;
          const flat = Math.abs(rowDelta) <= 0.04;
          const grew = rowDelta > 0;
          const tier = colorForRankTier(rank, rows.length);
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
                className="tabular-nums shrink-0 text-[var(--color-fg)]"
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  width: 30,
                  textAlign: "right",
                }}
              >
                #{rank}.0
              </span>
              <span className="flex items-center gap-2 flex-1 min-w-0">
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
              {/* Color-coded average rank — sage at #1, rust at last place. */}
              <span
                className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 tabular-nums whitespace-nowrap"
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: tier.bg,
                  color: tier.text,
                }}
                title={`${tier.label} — rank #${rank}.0 of ${rows.length}`}
              >
                #{rank}.0
              </span>
              <span className="shrink-0">
                <BadgeDelta
                  variant="solid"
                  deltaType={
                    flat ? "neutral" : grew ? "increase" : "decrease"
                  }
                  value={`${rowDelta > 0 ? "+" : ""}${rowDelta.toFixed(1)}%`}
                  title={
                    r.isYou
                      ? `Your 90-day visibility change`
                      : `90-day change for ${r.name} (per-competitor history not yet tracked)`
                  }
                />
              </span>
            </li>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, i) => {
          const slotRank = rows.length + i + 1;
          return (
            <li key={`empty-${i}`}>
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
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    width: 30,
                    textAlign: "right",
                  }}
                >
                  #{slotRank}.0
                </span>
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 border border-dashed group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/10 transition-colors"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <CtaIcon className="h-3 w-3 text-[var(--color-fg-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                  </span>
                  <span
                    className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-primary)] transition-colors"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  >
                    {ctaLabel}
                  </span>
                </span>
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
