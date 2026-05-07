"use client";

/**
 * Dashboard KPI strip — 3 equal-height cards summarizing the latest scan.
 *
 * Surfaces the category-standard quartet (visibility / share of voice /
 * sentiment) but trimmed to 3 cards (avg position lives in the trend chart
 * card). Each card follows the locked KPI anatomy from
 * `surven-cofounder-guide.md` §"Step 4": icon tile + uppercase label + Cormorant
 * value + BadgeDelta + 1-line subline. Section headings are inside the
 * cards via the implicit border around the card body.
 */

import { Eye, Users, MessageSquare, Info } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult } from "@/types/database";
import { summarizeSentiment, topMentionedCompetitor } from "@/features/dashboard/utils/heroSentence";

interface DashboardKpiStripProps {
  results: ScanResult[];
  competitors: { name: string }[];
  /** Optional — if provided, deltas render against the previous scan. */
  previousResults?: ScanResult[] | null;
}

interface CardProps {
  label: string;
  hint: string;
  Icon: typeof Eye;
  iconColor: string;
  iconBg: string;
  primary: React.ReactNode;
  delta?: { value: string; type: "increase" | "decrease" | "neutral" } | null;
  sub: string;
}

function KpiCard({ label, hint, Icon, iconColor, iconBg, primary, delta, sub }: CardProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col"
      style={{ minHeight: 140 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="inline-flex items-center justify-center rounded-md shrink-0"
          style={{ width: 28, height: 28, backgroundColor: iconBg }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <span
          className="text-[var(--color-fg-muted)] uppercase"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}
        >
          {label}
        </span>
        <HoverHint hint={hint} placement="top" width={240}>
          <Info
            className="h-3.5 w-3.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)] cursor-help opacity-60 transition-colors"
            aria-label="More info"
          />
        </HoverHint>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap mt-1">
        {primary}
        {delta && (
          <BadgeDelta variant="solid" deltaType={delta.type} value={delta.value} />
        )}
      </div>

      <p
        className="text-[var(--color-fg-muted)] mt-auto pt-2"
        style={{ fontSize: 11.5, lineHeight: 1.4 }}
      >
        {sub}
      </p>
    </div>
  );
}

function deltaFromRates(current: number, previous: number | null) {
  if (previous == null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (Math.abs(diff) < 0.5) return { value: "0%", type: "neutral" as const };
  return {
    value: `${diff > 0 ? "+" : ""}${diff}%`,
    type: diff > 0 ? ("increase" as const) : ("decrease" as const),
  };
}

export function DashboardKpiStrip({
  results,
  competitors,
  previousResults = null,
}: DashboardKpiStripProps) {
  // ── Card 1: Visibility ───────────────────────────────────────────────
  const total = results.length;
  const mentioned = results.filter((r) => r.business_mentioned).length;
  const rate = total > 0 ? Math.round((mentioned / total) * 100) : 0;

  const prevTotal = previousResults?.length ?? 0;
  const prevMentioned = previousResults?.filter((r) => r.business_mentioned).length ?? 0;
  const prevRate = prevTotal > 0 ? Math.round((prevMentioned / prevTotal) * 100) : null;

  const visibilityDelta = deltaFromRates(rate, prevRate);

  // ── Card 2: Share of Voice (you vs top competitor) ──────────────────
  const topCompetitor = topMentionedCompetitor(results, competitors);
  const totalCompetitorMentions = competitors.reduce((sum, c) => {
    let count = 0;
    for (const r of results) {
      if (r.competitor_mentions?.[c.name]) count++;
    }
    return sum + count;
  }, 0);
  const sovTotal = mentioned + totalCompetitorMentions;
  const youSov = sovTotal > 0 ? Math.round((mentioned / sovTotal) * 100) : 0;

  // ── Card 3: Sentiment ───────────────────────────────────────────────
  const sentiment = summarizeSentiment(results);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="Visibility"
        hint="Share of AI answers — across ChatGPT, Claude, Gemini, Google AI — that name your business."
        Icon={Eye}
        iconColor={SURVEN_SEMANTIC.good}
        iconBg={`${SURVEN_SEMANTIC.good}1A`}
        primary={
          <span
            className="font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              lineHeight: 1,
              color: "var(--color-fg)",
            }}
          >
            {rate}%
          </span>
        }
        delta={visibilityDelta}
        sub={
          total > 0
            ? `Named in ${mentioned} of ${total} AI answers`
            : "Run a scan to measure visibility"
        }
      />

      <KpiCard
        label="Share of voice"
        hint="Your mentions as a share of you + your tracked competitors. 50%+ means you dominate the conversation."
        Icon={Users}
        iconColor={SURVEN_SEMANTIC.good}
        iconBg={`${SURVEN_SEMANTIC.good}1A`}
        primary={
          <span
            className="font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              lineHeight: 1,
              color: "var(--color-fg)",
            }}
          >
            {youSov}%
          </span>
        }
        delta={null}
        sub={
          topCompetitor
            ? `${topCompetitor.name} leads competitors with ${topCompetitor.count} mentions`
            : competitors.length === 0
              ? "Add competitors to compare"
              : "No competitor mentions yet"
        }
      />

      <KpiCard
        label="Sentiment"
        hint="When AI describes you, the dominant tone. Strong = mostly positive; Concerning = negatives outweigh positives."
        Icon={MessageSquare}
        iconColor={sentiment.color}
        iconBg={`${sentiment.color}1A`}
        primary={
          <span
            className="font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              lineHeight: 1,
              color: sentiment.color,
              fontStyle: "italic",
            }}
          >
            {sentiment.verdict}
          </span>
        }
        delta={null}
        sub={
          sentiment.total > 0
            ? `Across ${sentiment.total} mention${sentiment.total === 1 ? "" : "s"} · ${sentiment.positive} positive, ${sentiment.negative} negative`
            : "No sentiment data yet"
        }
      />
    </div>
  );
}
