"use client";

/**
 * Slim Sentiment + Share-of-voice cards for the dashboard hero's right
 * column. Same visual identity as their full-page counterparts (donut +
 * verdict pill + legend, no over-time chart) but vertically compressed
 * so two of them stack alongside the visibility chart card.
 *
 * Sentiment uses summarizeSentiment from heroSentence.ts (mirrors the
 * verdict logic on /sentiment); Share of voice uses the same ScannerData
 * the visibility chart consumes so deltas + leaderboard match what's
 * rendered to the left.
 */

import { useMemo } from "react";
import { HelpCircle } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { summarizeSentiment } from "@/features/dashboard/utils/heroSentence";
import type { ScanResult } from "@/types/database";

/* ── Sentiment slim card ───────────────────────────────────────────── */

interface SentimentSlimCardProps {
  results: ScanResult[];
}

export function SentimentSlimCard({ results }: SentimentSlimCardProps) {
  const summary = useMemo(() => summarizeSentiment(results), [results]);

  if (summary.total === 0) return null;

  const positivePct =
    summary.total > 0 ? Math.round((summary.positive / summary.total) * 100) : 0;
  const neutralPct =
    summary.total > 0 ? Math.round((summary.neutral / summary.total) * 100) : 0;
  const negativePct = Math.max(0, 100 - positivePct - neutralPct);

  const ringR = 44;
  const ringStroke = 11;
  const c = 2 * Math.PI * ringR;
  const positiveDash = (positivePct / 100) * c;
  const neutralDash = (neutralPct / 100) * c;
  const negativeDash = (negativePct / 100) * c;
  const positiveOffset = c / 4;
  const neutralOffset = positiveOffset - positiveDash;
  const negativeOffset = neutralOffset - neutralDash;

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-1.5">
          <SectionHeading
            text="Sentiment"
            info="Share of positive vs neutral vs negative AI mentions in the latest scan. Verdict pill flips to Concerning when negatives ≥ 20% (or outweigh positives)."
          />
        </div>
        <span
          className="inline-flex items-center font-semibold rounded-md px-2 py-0.5 whitespace-nowrap capitalize shrink-0"
          style={{
            fontSize: 11,
            color: summary.color,
            backgroundColor: `${summary.color}1F`,
          }}
          title={`Overall sentiment verdict: ${summary.verdict}.`}
        >
          {summary.verdict}
        </span>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={ringR}
              fill="none"
              stroke="var(--color-surface-alt)"
              strokeWidth={ringStroke}
            />
            <circle
              cx="60"
              cy="60"
              r={ringR}
              fill="none"
              stroke={SURVEN_SEMANTIC.good}
              strokeWidth={ringStroke}
              strokeDasharray={`${positiveDash} ${c - positiveDash}`}
              strokeDashoffset={positiveOffset}
              transform="rotate(-90 60 60) scale(1 -1) translate(0 -120)"
            />
            <circle
              cx="60"
              cy="60"
              r={ringR}
              fill="none"
              stroke={SURVEN_SEMANTIC.neutral}
              strokeWidth={ringStroke}
              strokeDasharray={`${neutralDash} ${c - neutralDash}`}
              strokeDashoffset={neutralOffset}
              transform="rotate(-90 60 60) scale(1 -1) translate(0 -120)"
            />
            <circle
              cx="60"
              cy="60"
              r={ringR}
              fill="none"
              stroke={SURVEN_SEMANTIC.bad}
              strokeWidth={ringStroke}
              strokeDasharray={`${negativeDash} ${c - negativeDash}`}
              strokeDashoffset={negativeOffset}
              transform="rotate(-90 60 60) scale(1 -1) translate(0 -120)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1,
                color: "var(--color-fg)",
              }}
              className="tabular-nums"
            >
              {positivePct}%
            </span>
            <span
              className="text-[var(--color-fg-muted)] uppercase tracking-wide mt-1"
              style={{ fontSize: 9, letterSpacing: "0.06em" }}
            >
              Positive
            </span>
          </div>
        </div>
      </div>

      <ul className="space-y-1 pt-2 border-t border-[var(--color-border)]">
        <SentimentRow
          color={SURVEN_SEMANTIC.good}
          label="positive"
          count={summary.positive}
          pct={positivePct}
        />
        <SentimentRow
          color={SURVEN_SEMANTIC.neutral}
          label="neutral"
          count={summary.neutral}
          pct={neutralPct}
        />
        <SentimentRow
          color={SURVEN_SEMANTIC.bad}
          label="negative"
          count={summary.negative}
          pct={negativePct}
        />
      </ul>
    </div>
  );
}

function SentimentRow({
  color,
  label,
  count,
  pct,
}: {
  color: string;
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="rounded-full shrink-0"
        style={{ width: 7, height: 7, backgroundColor: color }}
      />
      <span
        className="tabular-nums text-[var(--color-fg)] font-semibold"
        style={{ fontSize: 12 }}
      >
        {count}
      </span>
      <span className="text-[var(--color-fg-secondary)]" style={{ fontSize: 11.5 }}>
        {label}
      </span>
      <span
        className="ml-auto tabular-nums text-[var(--color-fg-muted)]"
        style={{ fontSize: 11 }}
      >
        {pct}%
      </span>
    </li>
  );
}

/* ── Share of voice slim card ──────────────────────────────────────── */

interface SovBrand {
  id: string;
  name: string;
  isYou: boolean;
  color: string;
  current: number;
  delta: number;
}

interface ShareOfVoiceSlimCardProps {
  brands: SovBrand[];
  /** Period-over-period delta for YOUR share, used in the header pill. */
  youDelta: number;
  /** Optional explicit YOU share override (otherwise derived from brands). */
  youShare?: number;
}

export function ShareOfVoiceSlimCard({
  brands,
  youDelta,
  youShare,
}: ShareOfVoiceSlimCardProps) {
  const total = brands.reduce((s, b) => s + Math.max(0, b.current), 0) || 1;
  const sorted = useMemo(
    () => [...brands].sort((a, b) => b.current - a.current),
    [brands],
  );
  const youStat = sorted.find((b) => b.isYou);
  const youSharePct =
    youShare ?? (youStat ? Math.round((youStat.current / total) * 1000) / 10 : 0);

  const flat = Math.abs(youDelta) <= 0.04;
  const grew = youDelta > 0;

  const size = 110;
  const r = 40;
  const stroke = 13;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const arcs = sorted.map((b) => {
    const pct = (Math.max(0, b.current) / total) * 100;
    const dash = (pct / 100) * c;
    const offset = c / 4 - acc;
    acc += dash;
    return { brand: b, dash, offset };
  });

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[var(--color-border)]">
        <SectionHeading
          text="Share of voice"
          info="Your share of every brand mention across the prompts we tracked. Higher = AI names you more often than competitors."
        />
        <BadgeDelta
          variant="solid"
          deltaType={flat ? "neutral" : grew ? "increase" : "decrease"}
          value={`${grew ? "+" : ""}${youDelta.toFixed(2)}%`}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--color-surface-alt)"
              strokeWidth={stroke}
            />
            {arcs.map(({ brand, dash, offset }) => (
              <circle
                key={brand.id}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={brand.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1,
                color: "var(--color-fg)",
              }}
            >
              {Math.round(youSharePct)}%
            </span>
            <span
              className="uppercase tracking-wide text-[var(--color-fg-muted)] mt-0.5"
              style={{ fontSize: 9, letterSpacing: "0.06em" }}
            >
              You
            </span>
          </div>
        </div>

        <ul className="flex-1 min-w-0 space-y-1">
          {sorted.slice(0, 6).map((b) => {
            const pct = (Math.max(0, b.current) / total) * 100;
            const bDelta = b.delta;
            const bFlat = Math.abs(bDelta) <= 0.04;
            const bGrew = bDelta > 0;
            return (
              <li key={b.id} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="rounded-full shrink-0"
                  style={{ width: 6, height: 6, backgroundColor: b.color }}
                />
                <span
                  className={
                    "truncate " +
                    (b.isYou
                      ? "font-semibold text-[var(--color-fg)]"
                      : "text-[var(--color-fg-secondary)]")
                  }
                  style={{ fontSize: 11.5 }}
                  title={b.name}
                >
                  {b.name}
                </span>
                <span
                  className="tabular-nums shrink-0 text-[var(--color-fg)] font-semibold ml-auto"
                  style={{ fontSize: 11 }}
                >
                  {pct.toFixed(1)}%
                </span>
                <span className="shrink-0">
                  <BadgeDelta
                    variant="solid"
                    deltaType={bFlat ? "neutral" : bGrew ? "increase" : "decrease"}
                    value={`${bGrew ? "+" : ""}${bDelta.toFixed(1)}%`}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
