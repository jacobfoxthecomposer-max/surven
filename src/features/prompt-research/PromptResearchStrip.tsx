"use client";

/**
 * Prompt Research stat strip — 3 visually-rich cards summarizing the
 * researched intent set. Mirrors the CleanStatCard outer chrome (cream
 * surface + border + padding + header row with icon/label/hint) but each
 * card carries a custom inline visual: a hero "quick win" prompt card,
 * mini per-engine bars, and a split donut for branded vs unbranded.
 *
 * Sources its data from the same intent set that feeds IntentsTable —
 * pass `intents` (after applying tracker overrides) and an `onTrack`
 * handler so the Quick Win card's CTA can flip a single intent into the
 * tracker without page nav.
 */

import { Target, EyeOff, Tag, HelpCircle, Sparkles, Plus } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import {
  INTENT_COLOR,
  INTENT_LABEL,
} from "@/features/prompt-research/taxonomy";
import type { Intent } from "@/features/prompt-research/types";

const SAGE = "#5E7250";
const SAGE_LIGHT = "#96A283";
const RUST = "#B54631";

interface Props {
  intents: Intent[];
  onTrack?: (intentId: string) => void;
}

export function PromptResearchStrip({ intents, onTrack }: Props) {
  // ── Card 1 — top untracked win (highest-coverage untracked) ────────
  const topUntracked = [...intents]
    .filter((i) => !i.inTracker && i.overallCoverage > 0)
    .sort((a, b) => b.overallCoverage - a.overallCoverage)[0];

  // ── Card 2 — blind spot (lowest-coverage untracked) ────────────────
  // Different *type* of suggested prompt than Quick Win: instead of the
  // easy claim, this is the urgent gap to close. Picks the untracked
  // prompt with the worst mention rate (can be 0%) and excludes the
  // topUntracked id so the two cards never collide on the same row.
  const blindSpot = [...intents]
    .filter((i) => !i.inTracker && i.id !== topUntracked?.id)
    .sort((a, b) => a.overallCoverage - b.overallCoverage)[0];

  // ── Card 3 — branded / unbranded split ─────────────────────────────
  const brandedCount = intents.filter((i) => i.taxonomy.startsWith("branded_")).length;
  const unbrandedCount = intents.length - brandedCount;
  const brandedPct = intents.length > 0 ? Math.round((brandedCount / intents.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* ─── Card 1: Top Untracked Win ───────────────────────────────── */}
      <CardShell
        icon={<Target className="h-4 w-4 text-[var(--color-fg-muted)]" />}
        label="Quick win to claim"
        hint="The prompt with the highest average mention rate across all 4 AI engines that you haven't added to your tracker yet. Adding it documents a search you're already winning."
        accent={SAGE}
      >
        {topUntracked ? (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  lineHeight: 1,
                  color: SAGE,
                }}
              >
                {topUntracked.overallCoverage}%
              </span>
              <span
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 11.5 }}
              >
                mention rate &middot; not yet tracked
              </span>
            </div>
            <p
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 11, lineHeight: 1.4 }}
            >
              Avg share of replies that name your brand across all 4 engines.
            </p>
            {/* Row preview — visually mirrors a single row in IntentsTable
                (checkbox tile + bold prompt + glowing variants pill + intent
                pill). The whole row is the action: click to track. */}
            <button
              type="button"
              onClick={() => onTrack?.(topUntracked.id)}
              disabled={!onTrack}
              title="Add this prompt to your tracker"
              aria-label={`Add "${topUntracked.canonical}" to your tracker`}
              className="group w-full text-left rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 transition-all hover:border-[#5E7250] hover:bg-[rgba(150,162,131,0.08)] disabled:cursor-default"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span
                  className="inline-flex items-center justify-center shrink-0 rounded-sm border bg-[var(--color-surface)] transition-all group-hover:border-[#5E7250] group-hover:bg-[#5E7250]"
                  style={{
                    width: 16,
                    height: 16,
                    marginTop: 1,
                    borderColor: "var(--color-border)",
                  }}
                  aria-hidden="true"
                >
                  <Plus
                    className="h-3 w-3 text-[var(--color-fg-muted)] transition-colors group-hover:text-white"
                    strokeWidth={2.5}
                  />
                </span>
                <span
                  className="text-[var(--color-fg)] font-semibold flex-1 min-w-0"
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={topUntracked.canonical}
                >
                  &ldquo;{topUntracked.canonical}&rdquo;
                </span>
              </div>
              <p
                className="text-[var(--color-fg-muted)] italic"
                style={{
                  fontSize: 11,
                  lineHeight: 1.45,
                  paddingLeft: 24,
                  marginTop: 6,
                }}
              >
                Highest coverage of any prompt you&rsquo;re not tracking yet —
                track it to document the win.
              </p>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3">
            <Sparkles className="h-4 w-4" style={{ color: SAGE }} />
            <p
              className="text-[var(--color-fg-secondary)]"
              style={{ fontSize: 12.5 }}
            >
              Everything researched is already tracked.
            </p>
          </div>
        )}
      </CardShell>

      {/* ─── Card 2: Blind spot to close ─────────────────────────────── */}
      {/* Different *type* of suggested prompt than Quick Win — same row
          shape and click-to-track action, but pulls the WORST untracked
          prompt instead of the best. Rust accent so the card reads as
          urgency, not opportunity. */}
      <CardShell
        icon={<EyeOff className="h-4 w-4 text-[var(--color-fg-muted)]" />}
        label="Blind spot to close"
        hint="The prompt with the lowest AI visibility that you haven't added to your tracker yet. Track it to start measuring a search where AI rarely (or never) names you."
        accent={RUST}
      >
        {blindSpot ? (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  lineHeight: 1,
                  color: RUST,
                }}
              >
                {blindSpot.overallCoverage}%
              </span>
              <span
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 11.5 }}
              >
                mention rate &middot; not yet tracked
              </span>
            </div>
            <p
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 11, lineHeight: 1.4 }}
            >
              Avg share of replies that name your brand across all 4 engines.
            </p>
            {/* Row preview — same shape as Quick Win, rust hover accent
                instead of sage. Click anywhere to add to tracker. */}
            <button
              type="button"
              onClick={() => onTrack?.(blindSpot.id)}
              disabled={!onTrack}
              title="Add this prompt to your tracker"
              aria-label={`Add "${blindSpot.canonical}" to your tracker`}
              className="group w-full text-left rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 transition-all hover:border-[#B54631] hover:bg-[rgba(181,70,49,0.06)] disabled:cursor-default"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span
                  className="inline-flex items-center justify-center shrink-0 rounded-sm border bg-[var(--color-surface)] transition-all group-hover:border-[#B54631] group-hover:bg-[#B54631]"
                  style={{
                    width: 16,
                    height: 16,
                    marginTop: 1,
                    borderColor: "var(--color-border)",
                  }}
                  aria-hidden="true"
                >
                  <Plus
                    className="h-3 w-3 text-[var(--color-fg-muted)] transition-colors group-hover:text-white"
                    strokeWidth={2.5}
                  />
                </span>
                <span
                  className="text-[var(--color-fg)] font-semibold flex-1 min-w-0"
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={blindSpot.canonical}
                >
                  &ldquo;{blindSpot.canonical}&rdquo;
                </span>
              </div>
              <p
                className="text-[var(--color-fg-muted)] italic"
                style={{
                  fontSize: 11,
                  lineHeight: 1.45,
                  paddingLeft: 24,
                  marginTop: 6,
                }}
              >
                Lowest visibility of any untracked prompt — track it to start
                closing the gap.
              </p>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3">
            <Sparkles className="h-4 w-4" style={{ color: SAGE }} />
            <p
              className="text-[var(--color-fg-secondary)]"
              style={{ fontSize: 12.5 }}
            >
              No blind spots — every researched prompt is either tracked or
              already winning.
            </p>
          </div>
        )}
      </CardShell>

      {/* ─── Card 3: Branded vs Unbranded ────────────────────────────── */}
      <CardShell
        icon={<Tag className="h-4 w-4 text-[var(--color-fg-muted)]" />}
        label="Branded vs unbranded"
        hint="Branded prompts include your name; unbranded are category questions. Too brand-heavy and you're missing discovery; too unbranded and you're guessing on credibility."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 mt-1">
            <BrandedDonut
              brandedPct={brandedPct}
              brandedColor={SAGE}
              unbrandedColor={SAGE_LIGHT}
            />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full shrink-0"
                  style={{ width: 8, height: 8, backgroundColor: SAGE }}
                />
                <span
                  className="tabular-nums"
                  style={{ fontSize: 13, fontWeight: 700, color: "var(--color-fg)" }}
                >
                  {brandedCount}
                </span>
                <span className="text-[var(--color-fg-secondary)]" style={{ fontSize: 11.5 }}>
                  branded
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full shrink-0"
                  style={{ width: 8, height: 8, backgroundColor: SAGE_LIGHT }}
                />
                <span
                  className="tabular-nums"
                  style={{ fontSize: 13, fontWeight: 700, color: "var(--color-fg)" }}
                >
                  {unbrandedCount}
                </span>
                <span className="text-[var(--color-fg-secondary)]" style={{ fontSize: 11.5 }}>
                  unbranded
                </span>
              </div>
            </div>
          </div>
          <p
            className="text-[var(--color-fg-muted)] italic"
            style={{ fontSize: 11.5, lineHeight: 1.4 }}
          >
            {brandedPct < 15
              ? "Heavy on unbranded — strong for discovery; sprinkle in branded checks for credibility."
              : brandedPct > 50
                ? "Brand-heavy — diversify with category prompts to capture new discovery."
                : "Healthy mix — defending the brand and reaching new searchers."}
          </p>
        </div>
      </CardShell>
    </div>
  );
}

/* ── Local helpers ──────────────────────────────────────────────────── */

function CardShell({
  icon,
  label,
  hint,
  accent,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col"
      style={{
        boxShadow: "var(--shadow-sm)",
        borderTop: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="inline-flex items-center justify-center rounded-md"
          style={{
            width: 28,
            height: 28,
            backgroundColor: "var(--color-surface-alt)",
          }}
        >
          {icon}
        </div>
        <span
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          {label}
        </span>
        <HoverHint hint={hint} placement="top" width={260}>
          <HelpCircle
            className="h-3.5 w-3.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
            aria-label="More info"
          />
        </HoverHint>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/**
 * Small split donut. Sage = branded, sage-light = unbranded. Uses two
 * SVG arcs derived from circumference math so it renders crisply at the
 * card's inline size (52×52) without needing Recharts.
 */
function BrandedDonut({
  brandedPct,
  brandedColor,
  unbrandedColor,
}: {
  brandedPct: number;
  brandedColor: string;
  unbrandedColor: string;
}) {
  const size = 56;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const brandedDash = (brandedPct / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="geometricPrecision"
      style={{ display: "block" }}
    >
      {/* Unbranded full ring underneath */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={unbrandedColor}
        strokeWidth={stroke}
      />
      {/* Branded arc on top */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={brandedColor}
        strokeWidth={stroke}
        strokeDasharray={`${brandedDash} ${c - brandedDash}`}
        strokeDashoffset={c / 4}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          fontWeight: 600,
          fill: "var(--color-fg)",
        }}
      >
        {brandedPct}%
      </text>
    </svg>
  );
}
