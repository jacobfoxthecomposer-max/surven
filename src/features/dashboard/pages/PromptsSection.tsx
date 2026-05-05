"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ListChecks,
  Tag,
  Search,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Crown,
  Info,
  Calendar,
  Smile,
  Meh,
  Frown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  X,
  HelpCircle,
  Plus,
} from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { PromptsByCluster } from "@/features/dashboard/pages/PromptsByCluster";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";
import { COLORS } from "@/utils/constants";
import {
  PROMPT_CATEGORIES,
  primaryIntent,
} from "@/utils/promptCategories";

/* ============================================================================
 * Prompts Tracker — Section
 * ----------------------------------------------------------------------------
 * Page composition for /prompts and /prompts-preview.
 *
 * CHUNK 1 (this build):
 *   1.  Tokens + mock data hook
 *   2.  Hero (sage-accent dynamic title + description) + NextScanCard
 *   3.  RangePills + EngineChips filter row
 *   4.  PageAISummary (sage-tinted gradient block)
 *   5.  StatStrip (4 icon-tile cards)
 *   6.  BrandedCallout (conditional warn/partial/clean)
 *
 * Chunks 2 + 3 land in follow-up commits.
 * ========================================================================== */

// ─── TOKENS ────────────────────────────────────────────────────────────────

const TOK = {
  growText: "#7D8E6C",
  loseText: "#B54631",
  amberFg: "#A06210",
  amberBg: "rgba(201,123,69,0.14)",
  amberBorderLeft: COLORS.warning,
  greenFg: "#4F6E45",
  greenBg: "rgba(150,162,131,0.16)",
  greenBorderLeft: COLORS.primary,
  iconTileBg: "rgba(150,162,131,0.16)",
  primarySoftBg: "rgba(150,162,131,0.12)",
} as const;

// ─── MOTION ────────────────────────────────────────────────────────────────
// Canonical reveal pattern (matches sentiment / dashboard / audit pages).
// Animate ONLY transform + opacity + filter — never width/height/top/left.

const EASE = [0.16, 1, 0.3, 1] as const;

// Deterministic per-(prompt, engine) "did the AI answer include a link?"
// boolean. Until real link data lands, derive a stable yes/no from the
// prompt id + engine name. If the engine didn't even mention you, it
// can't have linked you (returns false). If it mentioned you, the link
// presence is a deterministic 70% positive coin so most cited engines
// also link, but some mention-without-link gaps show up.
function linkHit(promptId: string, engine: string, mentioned: boolean): boolean {
  if (!mentioned) return false;
  const seed = `${promptId}|link|${engine}`;
  const h = Math.abs(
    [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return (h % 1000) / 1000 < 0.7;
}

const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, ease: EASE },
} as const;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: EASE },
} as const;

// ─── INTENT COLOR SYSTEM ───────────────────────────────────────────────────
// Aligned to the universal 6-category taxonomy in `utils/promptCategories.ts`
// so the Coverage by Intent donut, the prompts table cell pills, the Intent
// filter dropdown, and the highlights table cells all draw from the same
// label set as the rest of the product (cluster dominance, sentiment by
// type, etc.). Legacy labels mapped: Brand lookup -> Branded, Comparison ->
// Comparative, Transactional -> Use-case (problem-framed). Mock data still
// uses the old labels — this map normalizes both for backwards-compat.

const INTENT_COLORS: Record<string, string> = {
  Informational: "#9B7EC8",
  Local: "#5BAF92",
  Comparison: "#C97B45",
  "Use-case": "#B8A030",
  Transactional: "#6BA3F5",
};

// Tint + readable text color for an intent chip.
function intentChip(intent: string): { fg: string; bg: string; border: string } {
  const base = INTENT_COLORS[intent] ?? "#666";
  return {
    fg: base,
    bg: `${base}1F`, // ~12% alpha
    border: `${base}55`, // ~33% alpha
  };
}

// Subtle accent palettes for stat cards — used to differentiate sibling cards
// like Branded vs Unbranded without straying from the cream/sage system.
const ACCENT_SAGE = { tile: "rgba(150,162,131,0.20)", icon: "#5E7250", border: "rgba(150,162,131,0.55)" };
const ACCENT_SLATE = { tile: "rgba(122,143,166,0.18)", icon: "#5C7185", border: "rgba(122,143,166,0.55)" };
const ACCENT_NEUTRAL = { tile: "rgba(150,162,131,0.14)", icon: COLORS.primaryHover, border: "transparent" };
type Accent = typeof ACCENT_SAGE;

// ─── DELTA PILL (2× the size of the base BadgeDelta atom) ─────────────────

function DeltaPill({
  deltaType,
  value,
}: {
  deltaType: "increase" | "decrease" | "neutral";
  value: string;
}) {
  const Icon =
    deltaType === "increase" ? ArrowUp : deltaType === "decrease" ? ArrowDown : ArrowRight;
  const colors =
    deltaType === "neutral"
      ? { color: "var(--color-fg-muted)", backgroundColor: "var(--color-surface-alt)" }
      : {
          color: deltaType === "increase" ? "#7D8E6C" : "#B54631",
          backgroundColor:
            deltaType === "increase" ? "rgba(150,162,131,0.18)" : "rgba(181,70,49,0.12)",
        };
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold tabular-nums whitespace-nowrap rounded-md"
      style={{ fontSize: 12, padding: "3px 9px", ...colors }}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {value}
    </span>
  );
}

// ─── CTA LINK ──────────────────────────────────────────────────────────────
// Matches the "Upgrade to track more prompts" amber-link format exactly:
// contextual icon + bold amber label + ArrowRight + group-hover translate-x.
// Use anywhere a card needs a directive call-to-action pointing the user at
// the corresponding optimization or detail page.

function CtaLink({
  icon: Icon,
  label,
  href,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`group flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <Icon
          className="h-3.5 w-3.5 shrink-0 mt-0.5"
          style={{ color: "#C97B45" }}
        />
        <span
          className="leading-snug"
          style={{ fontSize: 13, color: TOK.amberFg, fontWeight: 600 }}
        >
          {label}
        </span>
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
        style={{ color: "#C97B45" }}
      />
    </a>
  );
}

// ─── VISIBILITY GAUGE ──────────────────────────────────────────────────────
// Small semi-circle gauge with rust→amber→sage gradient track. Used in the
// Branded / Unbranded ledger rows. Word labels and label colors are driven by
// type-specific thresholds — branded is much steeper because anything below
// 100% on a branded query is a credibility leak.

function VisibilityGauge({
  pct,
  type,
}: {
  pct: number;
  type: "branded" | "unbranded" | "citation" | "position";
}) {
  const gradientId = useId();

  // Tier → word + end color (current tier) + start color (previous tier).
  // The gradient runs from startColor at the beginning of the visible arc to
  // color at the progress endpoint, so the rightmost visible color always
  // matches the tier label.
  const tier = (() => {
    if (type === "branded") {
      // <70 actively harmful · 70–85 concerning · 85–95 caution · 95+ healthy
      if (pct < 70)
        return {
          word: "Critical",
          color: TOK.loseText,
          startColor: TOK.loseText,
        };
      if (pct < 85)
        return {
          word: "Concerning",
          color: "#C44536",
          startColor: TOK.loseText,
        };
      if (pct < 95)
        return {
          word: "Caution",
          color: TOK.amberFg,
          startColor: "#C44536",
        };
      return { word: "Healthy", color: "#5E7250", startColor: TOK.amberFg };
    }
    if (type === "citation") {
      // Industry-avg link citation rate is ~30–45%.
      // <20 below industry · 20–45 industry avg · 45+ above industry
      if (pct < 20)
        return { word: "Low", color: TOK.loseText, startColor: TOK.loseText };
      if (pct < 45)
        return { word: "Fair", color: TOK.amberFg, startColor: TOK.loseText };
      return { word: "Strong", color: "#5E7250", startColor: TOK.amberFg };
    }
    if (type === "position") {
      // Position pct is derived from rank: pos 1 = 100, pos 5+ = 0.
      // <40 (rank 4+): trailing · 40–75 (rank 2.25–4): mid-pack · 75+: top tier
      if (pct < 40)
        return {
          word: "Trailing",
          color: TOK.loseText,
          startColor: TOK.loseText,
        };
      if (pct < 75)
        return {
          word: "Mid-pack",
          color: TOK.amberFg,
          startColor: TOK.loseText,
        };
      return { word: "Top tier", color: "#5E7250", startColor: TOK.amberFg };
    }
    // Unbranded: <30 poor · 30–60 fair · 60+ great
    if (pct < 30)
      return { word: "Poor", color: TOK.loseText, startColor: TOK.loseText };
    if (pct < 60)
      return { word: "Fair", color: TOK.amberFg, startColor: TOK.loseText };
    return { word: "Great", color: "#5E7250", startColor: TOK.amberFg };
  })();

  // Arc geometry — top-half semicircle, opening at the bottom.
  const cx = 50;
  const cy = 46;
  const r = 36;
  const strokeWidth = 9;

  function point(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  const startAngle = 180;
  const endAngle = 0;
  const progressAngle =
    startAngle - (Math.max(0, Math.min(100, pct)) / 100) * 180;
  const startPt = point(startAngle);
  const endPt = point(endAngle);
  const progressPt = point(progressAngle);

  const trackPath = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 1 ${endPt.x} ${endPt.y}`;
  const progressPath = `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 1 ${progressPt.x} ${progressPt.y}`;

  // Suppress unused-var on gradientId — kept for future hover/focus states.
  void gradientId;

  return (
    <div className="flex flex-col items-center" style={{ width: 88 }}>
      <svg viewBox="0 0 100 56" width={80} height={44} aria-hidden>
        {/* Track — soft cream ring matching the brand sentiment donut */}
        <path
          d={trackPath}
          stroke="rgba(60,62,60,0.10)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {/* Progress — animated draw-in on mount, mirrors the brand sentiment
            donut's mount sweep. pathLength: 0 → 1 over ~1s. */}
        {pct > 0 && (
          <motion.path
            d={progressPath}
            stroke={tier.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 },
              opacity: { duration: 0.2, ease: "linear" },
            }}
          />
        )}
      </svg>
      <div className="flex items-center gap-1 -mt-0.5">
        <span
          className="uppercase tabular-nums"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: tier.color,
            fontFamily: "var(--font-sans)",
            whiteSpace: "nowrap",
          }}
        >
          {tier.word}
        </span>
        <GaugeHelp type={type} />
      </div>
    </div>
  );
}

// ─── GAUGE HELP TOOLTIP ────────────────────────────────────────────────────
// Per-type tier explanations shown on hover of a small HelpCircle icon next
// to the gauge word label. Same visual pattern across all gauge types.

interface GaugeTier {
  range: string;
  word: string;
  description: string;
  color: string;
}

const GAUGE_TOOLTIPS: Record<
  "branded" | "unbranded" | "citation" | "position",
  { title: string; tiers: GaugeTier[]; rangeMinWidth: number }
> = {
  branded: {
    title: "How branded visibility is scored",
    rangeMinWidth: 56,
    tiers: [
      {
        range: "< 70%",
        word: "Actively harmful",
        description:
          "Majority of high-intent asks return nothing or a competitor.",
        color: TOK.loseText,
      },
      {
        range: "70–85%",
        word: "Concerning",
        description:
          "Meaningful drop-off at the exact moment of peak intent.",
        color: "#C44536",
      },
      {
        range: "85–95%",
        word: "Yellow flag",
        description:
          "Mostly there but gaps exist — stale data, thin coverage, or inconsistent entity signals.",
        color: TOK.amberFg,
      },
      {
        range: "95–100%",
        word: "Healthy",
        description: "Expected variance; AI can't be 100% consistent.",
        color: "#5E7250",
      },
    ],
  },
  unbranded: {
    title: "How unbranded visibility is scored",
    rangeMinWidth: 56,
    tiers: [
      {
        range: "< 30%",
        word: "Poor",
        description:
          "Competitors own most category searches; you're rarely surfaced.",
        color: TOK.loseText,
      },
      {
        range: "30–60%",
        word: "Fair",
        description:
          "You appear on a meaningful share of category prompts but not consistently.",
        color: TOK.amberFg,
      },
      {
        range: "60–100%",
        word: "Great",
        description:
          "Strong category presence — you're showing up on most unbranded prompts.",
        color: "#5E7250",
      },
    ],
  },
  citation: {
    title: "How link citation rate is scored",
    rangeMinWidth: 56,
    tiers: [
      {
        range: "< 20%",
        word: "Low",
        description:
          "Most mentions don't link to you, so AI traffic isn't reaching your site.",
        color: TOK.loseText,
      },
      {
        range: "20–45%",
        word: "Fair",
        description:
          "Around industry average; many mentions link back but plenty don't.",
        color: TOK.amberFg,
      },
      {
        range: "45–100%",
        word: "Strong",
        description:
          "Most mentions include a clickable link — AI traffic is reaching you.",
        color: "#5E7250",
      },
    ],
  },
  position: {
    title: "How average position is scored",
    rangeMinWidth: 64,
    tiers: [
      {
        range: "Rank 4+",
        word: "Trailing",
        description:
          "Named near the bottom of the list when AI mentions multiple competitors.",
        color: TOK.loseText,
      },
      {
        range: "Rank 2.25–4",
        word: "Mid-pack",
        description:
          "Mentioned alongside competitors, but not as a top recommendation.",
        color: TOK.amberFg,
      },
      {
        range: "Rank 1–2.25",
        word: "Top tier",
        description:
          "AI lists you first or near-first when naming options in your category.",
        color: "#5E7250",
      },
    ],
  },
};

function GaugeHelp({
  type,
}: {
  type: "branded" | "unbranded" | "citation" | "position";
}) {
  const config = GAUGE_TOOLTIPS[type];
  return (
    <span className="relative inline-flex items-center group">
      <HelpCircle
        className="cursor-help"
        style={{
          height: 11,
          width: 11,
          color: "rgba(60,62,60,0.50)",
        }}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute z-50 bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-md text-left"
        style={{ width: 290 }}
      >
        <p
          className="uppercase tracking-wider font-semibold text-[var(--color-fg-secondary)] mb-2"
          style={{ fontSize: 10, letterSpacing: "0.10em" }}
        >
          {config.title}
        </p>
        <ul
          className="space-y-1.5"
          style={{ fontSize: 11.5, lineHeight: 1.45 }}
        >
          {config.tiers.map((tier) => (
            <li key={tier.range} className="flex gap-2">
              <span
                className="font-bold whitespace-nowrap shrink-0"
                style={{ color: tier.color, minWidth: config.rangeMinWidth }}
              >
                {tier.range}
              </span>
              <span className="text-[var(--color-fg-secondary)]">
                <strong className="text-[var(--color-fg)]">{tier.word}.</strong>{" "}
                {tier.description}
              </span>
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}

// ─── ENGINES ───────────────────────────────────────────────────────────────

// Engine list mirrors `MODELS` in src/services/mockScanEngine.ts and the
// ModelName union in src/types/database.ts so the page stays compatible
// with the main scan pipeline.
const ENGINES = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "google_ai", label: "Google AI" },
] as const;

// ─── DATA HOOK ─────────────────────────────────────────────────────────────

export interface PromptResponse {
  engine: string;
  cited: boolean;
  excerpt: string;
}

export interface PromptRow {
  id: string;
  text: string;
  type: "branded" | "unbranded";
  intent: string;
  volume: number; // monthly searches
  engineHits: Record<string, boolean>;
  coverageDelta?: number; // percentage point change vs prior period
  position: number | null; // null = not cited
  sentiment: number; // -1 to 1
  responses: PromptResponse[];
}

export interface IntentCoverage {
  intent: string;
  promptCount: number;
  coveragePct: number;
  volumeMonthly: number; // sum of monthly searches across prompts in this intent
  avgPosition: number; // avg rank when cited
  coverageDelta: number; // pp change vs prior period (+ = improving)
  positiveSentimentPct: number; // % of mentions that read positive
}

export interface CitationSource {
  source: string;
  pct: number;
  count: number;
}

export interface SentimentByType {
  type: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export type InsightIconKey =
  | "crown"
  | "trend-up"
  | "check"
  | "target"
  | "trend-down"
  | "alert";

export interface InsightItemData {
  iconKey: InsightIconKey;
  title: string;
  description: string;
  cta: { label: string; href: string };
}

export interface PromptsData {
  trendWord: string;
  trendDirection: "up" | "down" | "flat";

  promptsTracked: number;
  promptsTrackedDelta: number;
  promptsLanding: number;
  brandedVisibility: number;
  brandedVisibilityDelta: number;
  brandedHits: number;
  brandedTotal: number;
  unbrandedVisibility: number;
  unbrandedVisibilityDelta: number;
  unbrandedHits: number;
  unbrandedTotal: number;
  linkCitationRate: number;
  linkCitationDelta: number;
  linkCitationMentions: number;
  avgPositionWhenCited: number;
  avgPositionDelta: number;
  avgPositionCompetitors: number;

  brandedTopRankCount: number;
  brandedTopRankTotal: number;
  brandedTopRankFailEngines: string[];
  brandedEngineHits: Record<string, boolean>;
  unbrandedEngineHits: Record<string, boolean>;

  prompts: PromptRow[];
  intentCoverage: IntentCoverage[];
  citationSources: CitationSource[];
  sentimentByType: SentimentByType[];

  pageSummary: string;
  pageSummaryGood: string;
  pageSummaryFix: string;
  pageSummaryCta: { label: string; href: string };
  promptsTableSummary: string;
  wins: InsightItemData[];
  concerns: InsightItemData[];

  nextScanDate: Date;
  nextScanDays: number;
  nextScanPromptCount: number;
}

function usePromptsData(): PromptsData {
  return useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7;
    const nextScan = new Date(now);
    nextScan.setDate(now.getDate() + daysUntilMonday);
    nextScan.setHours(9, 0, 0, 0);

    return {
      trendWord: "improving",
      trendDirection: "up",
      promptsTracked: 24,
      promptsTrackedDelta: 3,
      promptsLanding: 13,
      brandedVisibility: 75,
      brandedVisibilityDelta: 6,
      brandedHits: 6,
      brandedTotal: 8,
      unbrandedVisibility: 44,
      unbrandedVisibilityDelta: -3,
      unbrandedHits: 7,
      unbrandedTotal: 16,
      linkCitationRate: 41,
      linkCitationDelta: 5,
      linkCitationMentions: 87,
      avgPositionWhenCited: 2.4,
      avgPositionDelta: -0.3,
      avgPositionCompetitors: 5,
      brandedTopRankCount: 2,
      brandedTopRankTotal: 4,
      brandedTopRankFailEngines: ["chatgpt", "google_ai"],
      brandedEngineHits: {
        chatgpt: true,
        claude: true,
        gemini: true,
        google_ai: false,
      },
      unbrandedEngineHits: {
        chatgpt: true,
        claude: false,
        gemini: true,
        google_ai: false,
      },

      prompts: [
        {
          id: "p1",
          text: "morgan and morgan reviews",
          type: "branded",
          intent: "Comparison",
          volume: 8400,
          engineHits: { google_ai: true, chatgpt: true, claude: true, gemini: true },
          coverageDelta: 12,
          position: 1.0,
          sentiment: 0.84,
          responses: [
            { engine: "google_ai", cited: true, excerpt: "Morgan & Morgan has over 1M Google reviews averaging 4.7 stars, making them one of the most reviewed personal injury firms in the country." },
            { engine: "chatgpt", cited: true, excerpt: "Reviews of Morgan & Morgan are largely positive — clients cite aggressive advocacy and the firm's 'For The People' approach, with some criticism around case communication." },
            { engine: "claude", cited: true, excerpt: "Morgan & Morgan reviews are generally strong, with high marks on Avvo, Yelp, and the BBB. The firm has settled over $20B for clients." },
            { engine: "gemini", cited: true, excerpt: "Reviews show Morgan & Morgan is highly rated for personal injury cases, with consistent praise for settlements and accessibility." },
          ],
        },
        {
          id: "p2",
          text: "is morgan and morgan a good lawyer",
          type: "branded",
          intent: "Comparison",
          volume: 2300,
          engineHits: { google_ai: false, chatgpt: true, claude: true, gemini: true },
          coverageDelta: 8,
          position: 1.4,
          sentiment: 0.62,
          responses: [
            { engine: "google_ai", cited: false, excerpt: "Top-rated personal injury firms include Cellino Law, The Barnes Firm, and Friedman & Simon." },
            { engine: "chatgpt", cited: true, excerpt: "Yes, Morgan & Morgan is widely considered one of the largest and most reputable personal injury firms in the U.S." },
            { engine: "claude", cited: true, excerpt: "Morgan & Morgan is regarded as a leading personal injury law firm with national reach and a strong settlement record." },
            { engine: "gemini", cited: true, excerpt: "Morgan & Morgan is generally a strong choice for personal injury cases, with thousands of attorneys and contingency-based fees." },
          ],
        },
        {
          id: "p3",
          text: "morgan and morgan office locations",
          type: "branded",
          intent: "Local",
          volume: 1900,
          engineHits: { google_ai: true, chatgpt: true, claude: true, gemini: true },
          coverageDelta: 0,
          position: 1.2,
          sentiment: 0.55,
          responses: [
            { engine: "google_ai", cited: true, excerpt: "Morgan & Morgan has 100+ offices across the U.S., including major cities in Florida, New York, Georgia, and Texas." },
            { engine: "chatgpt", cited: true, excerpt: "Morgan & Morgan offices span all 50 states with locations in Orlando (HQ), New York, Atlanta, Tampa, and many more." },
            { engine: "claude", cited: true, excerpt: "Morgan & Morgan operates in 50 states with over 100 office locations. Headquarters in Orlando, FL." },
            { engine: "gemini", cited: true, excerpt: "Morgan & Morgan has offices nationwide — over 100 locations spanning major metros across the U.S." },
          ],
        },
        {
          id: "p4",
          text: "best personal injury lawyer in connecticut",
          type: "unbranded",
          intent: "Local",
          volume: 4200,
          engineHits: { google_ai: false, chatgpt: true, claude: false, gemini: true },
          coverageDelta: 5,
          position: 3.2,
          sentiment: 0.41,
          responses: [
            { engine: "google_ai", cited: false, excerpt: "Top Connecticut personal injury lawyers: Cellino Law, Berkowitz and Hanna, The Reardon Law Firm." },
            { engine: "chatgpt", cited: true, excerpt: "Top personal injury lawyers in Connecticut include Cellino Law, Berkowitz Hanna, and Morgan & Morgan's CT office." },
            { engine: "claude", cited: false, excerpt: "Connecticut's leading personal injury firms: Cellino Law, Stratton Faxon, Reardon Law Firm." },
            { engine: "gemini", cited: true, excerpt: "Best personal injury lawyers in Connecticut feature Morgan & Morgan, Cellino Law, and Stratton Faxon based on settlement records." },
          ],
        },
        {
          id: "p5",
          text: "how to find a lawyer for a car accident",
          type: "unbranded",
          intent: "Informational",
          volume: 6700,
          engineHits: { google_ai: false, chatgpt: true, claude: true, gemini: false },
          coverageDelta: 15,
          position: 2.8,
          sentiment: 0.32,
          responses: [
            { engine: "google_ai", cited: false, excerpt: "Steps to find a car accident lawyer: check Avvo ratings, ask for referrals, schedule consultations. Top firms include Cellino Law." },
            { engine: "chatgpt", cited: true, excerpt: "To find a car accident lawyer, check directories like Avvo and Martindale-Hubbell. Morgan & Morgan offers free consultations nationwide." },
            { engine: "claude", cited: true, excerpt: "Finding a car accident lawyer: 1) Use lawyer directories. 2) Look for personal injury specialization. 3) Schedule free consultations — firms like Morgan & Morgan offer them." },
            { engine: "gemini", cited: false, excerpt: "How to find a car accident attorney: check state bar referral services, read reviews, and interview multiple firms before hiring." },
          ],
        },
        {
          id: "p6",
          text: "personal injury lawyer cost",
          type: "unbranded",
          intent: "Transactional",
          volume: 5500,
          engineHits: { google_ai: false, chatgpt: false, claude: false, gemini: true },
          coverageDelta: -5,
          position: 4.1,
          sentiment: 0.08,
          responses: [
            { engine: "google_ai", cited: false, excerpt: "Personal injury lawyer fees typically run 33% of settlement on contingency. Top firms: Cellino Law, The Barnes Firm." },
            { engine: "chatgpt", cited: false, excerpt: "Most personal injury attorneys work on contingency — typically 33–40% of recovery — with no upfront cost." },
            { engine: "claude", cited: false, excerpt: "Personal injury lawyers usually charge contingency fees of 33–40% of settlement, with no fee if no recovery." },
            { engine: "gemini", cited: true, excerpt: "Personal injury lawyer cost is typically contingency-based (33%). Morgan & Morgan and similar firms offer free consultations to discuss fees." },
          ],
        },
        {
          id: "p7",
          text: "morgan and morgan vs cellino law",
          type: "unbranded",
          intent: "Comparison",
          volume: 880,
          engineHits: { google_ai: true, chatgpt: true, claude: true, gemini: true },
          coverageDelta: 3,
          position: 1.8,
          sentiment: 0.45,
          responses: [
            { engine: "google_ai", cited: true, excerpt: "Morgan & Morgan vs Cellino Law: Morgan & Morgan is national (50 states, 100+ offices); Cellino Law operates primarily in NY/CT." },
            { engine: "chatgpt", cited: true, excerpt: "Morgan & Morgan and Cellino Law differ in scale — Morgan & Morgan operates nationally while Cellino Law focuses on the Northeast." },
            { engine: "claude", cited: true, excerpt: "Comparison: Morgan & Morgan is the largest U.S. PI firm with national presence; Cellino Law is a regional firm strong in NY/CT." },
            { engine: "gemini", cited: true, excerpt: "Morgan & Morgan vs Cellino Law: M&M has national reach and larger settlements; Cellino has deeper Northeast roots." },
          ],
        },
        {
          id: "p8",
          text: "what to do after a slip and fall",
          type: "unbranded",
          intent: "Informational",
          volume: 12400,
          engineHits: { google_ai: false, chatgpt: false, claude: false, gemini: false },
          coverageDelta: 0,
          position: null,
          sentiment: 0,
          responses: [
            { engine: "google_ai", cited: false, excerpt: "Slip and fall steps: seek medical attention, document the scene, get witness info. Top firms include Cellino Law and The Barnes Firm." },
            { engine: "chatgpt", cited: false, excerpt: "After a slip and fall: 1) Get medical care, 2) Report the incident, 3) Document evidence. Consult a personal injury attorney like Cellino Law." },
            { engine: "claude", cited: false, excerpt: "What to do after a slip and fall: 1. Seek immediate medical attention. 2. Report to property owner. 3. Photograph the area. 4. Contact a lawyer such as Friedman & Simon." },
            { engine: "gemini", cited: false, excerpt: "Steps after a slip and fall accident: medical care first, then document and report. Many firms specialize in this — Cellino, Barnes, etc." },
          ],
        },
      ],

      intentCoverage: [
        { intent: "Informational", promptCount: 7, coveragePct: 41, volumeMonthly: 19100, avgPosition: 2.8, coverageDelta: 15.0, positiveSentimentPct: 41 },
        { intent: "Local", promptCount: 5, coveragePct: 56, volumeMonthly: 7800, avgPosition: 2.4, coverageDelta: 5.0, positiveSentimentPct: 64 },
        { intent: "Comparison", promptCount: 7, coveragePct: 74, volumeMonthly: 15000, avgPosition: 1.4, coverageDelta: 4.0, positiveSentimentPct: 72 },
        { intent: "Use-case", promptCount: 4, coveragePct: 52, volumeMonthly: 8400, avgPosition: 2.1, coverageDelta: 7.0, positiveSentimentPct: 55 },
        { intent: "Transactional", promptCount: 5, coveragePct: 28, volumeMonthly: 5500, avgPosition: 4.1, coverageDelta: -5.0, positiveSentimentPct: 28 },
      ],

      citationSources: [
        { source: "Your site", pct: 38, count: 33 },
        { source: "Wikipedia", pct: 22, count: 19 },
        { source: "Reddit", pct: 14, count: 12 },
        { source: "Industry blogs", pct: 12, count: 10 },
        { source: "News articles", pct: 9, count: 8 },
        { source: "Other", pct: 5, count: 5 },
      ],

      sentimentByType: [
        { type: "Use-case", positive: 82, neutral: 14, negative: 4, total: 28 },
        { type: "Comparison", positive: 58, neutral: 32, negative: 10, total: 19 },
        { type: "Local", positive: 64, neutral: 28, negative: 8, total: 22 },
        { type: "Informational", positive: 41, neutral: 49, negative: 10, total: 35 },
        { type: "Transactional", positive: 28, neutral: 51, negative: 21, total: 14 },
      ],
      pageSummary:
        "You're winning at brand & trust prompts (82% coverage) but losing transactional ones (28%) — that's where revenue actually lives. Three of your top-five money prompts are completely missing across all 4 AI engines. Closing the transactional gap is your single biggest lever this period.",
      pageSummaryGood:
        "You're winning at brand & trust prompts (82% coverage),",
      pageSummaryFix:
        "but losing transactional ones (28%) — three of your top-five money prompts are completely missing across all 4 AI engines. Closing the transactional gap is your single biggest lever this period.",
      pageSummaryCta: { label: "Fix transactional gaps", href: "/audit" },
      promptsTableSummary:
        "Your highest-volume prompt — 'what to do after a slip and fall' (12.4K/mo) — has zero engine coverage; competitors own that answer outright. Branded queries are dominating (88% avg), but unbranded informational and transactional prompts (5.5K–6.7K/mo) are leaking across 3+ engines. Capture those answer-capsule formats first.",
      wins: [
        {
          iconKey: "crown",
          title: "Branded queries are home turf",
          description:
            "88% coverage on brand-name searches with #1.2 average position. People searching for you are finding you on every major engine.",
          cta: { label: "See branded prompts", href: "/audit" },
        },
        {
          iconKey: "trend-up",
          title: "Informational coverage jumped +15.0%",
          description:
            "Largest gain across all intents this period — your answer-capsule investment is working. Keep doubling down on FAQ-shaped content.",
          cta: { label: "View informational prompts", href: "/prompts" },
        },
        {
          iconKey: "check",
          title: "'morgan and morgan reviews' on all 4 engines",
          description:
            "Your top branded prompt (8.4K/mo) is hitting 100% coverage with positive sentiment everywhere. Review pages are doing real work.",
          cta: { label: "Inspect prompt", href: "/prompts" },
        },
      ],
      concerns: [
        {
          iconKey: "target",
          title: "12.4K/mo prompt with zero coverage",
          description:
            "'what to do after a slip and fall' has 0% engine coverage. Highest-volume question in your category and competitors own the answer outright.",
          cta: { label: "Fix in audit", href: "/audit" },
        },
        {
          iconKey: "trend-down",
          title: "Transactional declining (-5.0%)",
          description:
            "5 transactional prompts at 28% coverage and dropping. This is where revenue lives — hardest gap to leave open another period.",
          cta: { label: "View transactional", href: "/prompts" },
        },
        {
          iconKey: "alert",
          title: "Google AI is your weakest engine",
          description:
            "Missing on 5 of 8 tracked prompts. Google AI Overviews are the highest-trafficked surface — every prompt missing here is volume losing.",
          cta: { label: "Engine breakdown", href: "/competitor-comparison" },
        },
      ],
      nextScanDate: nextScan,
      nextScanDays: daysUntilMonday,
      nextScanPromptCount: 24,
    };
  }, []);
}

// ─── HERO ──────────────────────────────────────────────────────────────────

function HeroTitle({ data }: { data: PromptsData }) {
  const accentColor = data.trendDirection === "down" ? TOK.loseText : TOK.growText;
  return (
    <h2
      className="text-[var(--color-fg)] leading-tight"
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 60,
        fontWeight: 500,
        letterSpacing: "-0.01em",
      }}
    >
      Your prompt coverage is{" "}
      <span style={{ color: accentColor, fontStyle: "italic", fontWeight: 500 }}>
        {data.trendWord}
      </span>
      .
    </h2>
  );
}

const HERO_DESCRIPTION =
  "Each tracked prompt is a real customer question being asked of AI engines right now. Watching them weekly tells you which intents you're winning, which you're losing, and where one fix could move dozens of answers at once.";

function HeroDescription() {
  return (
    <p
      className="text-[var(--color-fg-muted)] mt-2"
      style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}
    >
      <strong className="text-[var(--color-fg)] font-semibold">Why is this important?</strong>{" "}
      {HERO_DESCRIPTION}
    </p>
  );
}

// ─── RANGE PILLS ───────────────────────────────────────────────────────────

const RANGES = ["14d", "30d", "90d", "YTD", "All"] as const;
type Range = (typeof RANGES)[number] | "custom";

const RANGE_HINTS: Record<(typeof RANGES)[number], string> = {
  "14d": "Compare data from the last 14 days.",
  "30d": "Compare data from the last 30 days.",
  "90d": "Compare data from the last 90 days.",
  YTD: "Compare data from January 1 to today.",
  All: "Show all historical data.",
};

function RangePills({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="relative inline-flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1">
        {RANGES.map((r) => {
          const active = r === value;
          return (
            <HoverHint key={r} hint={RANGE_HINTS[r]}>
              <motion.button
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.15, ease: EASE }}
                onClick={() => onChange(r)}
                className={
                  "px-3.5 py-2 font-medium rounded-[var(--radius-sm)] transition-colors " +
                  (active
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                }
                style={{ fontSize: 14 }}
              >
                {r}
              </motion.button>
            </HoverHint>
          );
        })}
      </div>

      <HoverHint hint="Pick your own start and end dates.">
        <motion.button
          whileTap={{ scale: 0.94 }}
          transition={{ duration: 0.15, ease: EASE }}
          onClick={() => onChange("custom")}
          className={
            "inline-flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-[var(--radius-md)] border transition-colors " +
            (value === "custom"
              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
              : "bg-[var(--color-surface)] text-[var(--color-fg-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]")
          }
          style={{ fontSize: 14 }}
        >
          <Calendar className="h-4 w-4" />
          Custom
        </motion.button>
      </HoverHint>
    </div>
  );
}

// ─── ENGINE CHIPS ──────────────────────────────────────────────────────────

function EngineChips({
  enabled,
  onToggle,
}: {
  enabled: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[var(--color-fg-muted)] mr-1" style={{ fontSize: 15 }}>
        AI engines:
      </span>
      {ENGINES.map((e) => {
        const active = enabled.has(e.id);
        return (
          <HoverHint key={e.id} hint={`${active ? "Hide" : "Show"} ${e.label} data on this page.`}>
            <motion.button
              whileTap={{ scale: 0.93 }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15, ease: EASE }}
              onClick={() => onToggle(e.id)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[var(--radius-full)] border transition-all"
              style={{
                fontSize: 14,
                backgroundColor: active ? "rgba(150,162,131,0.16)" : "transparent",
                color: active ? "#5E7250" : "var(--color-fg-muted)",
                borderColor: active ? "rgba(150,162,131,0.45)" : "var(--color-border)",
                fontWeight: active ? 500 : 400,
              }}
            >
              <EngineIcon id={e.id} size={14} />
              {e.label}
            </motion.button>
          </HoverHint>
        );
      })}
    </div>
  );
}

// ─── STAT CARDS ────────────────────────────────────────────────────────────

type DeltaSpec =
  | { direction: "up" | "down" | "flat"; percent: number; period?: string }
  | { direction: "up" | "down" | "flat"; customValue: string };

interface StatCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  hint: string;
  value: string;
  subline?: string;
  delta?: DeltaSpec;
  link?: { label: string; href: string };
  upgradeLink?: { label: string; href: string };
  accent?: Accent;
  featured?: boolean;
  engineHits?: Record<string, boolean>;
  /** When provided, renders the value centered with a smaller ratio below it. */
  centerStat?: { value: number; total: number; label: string };
  /** Small footnote shown under the centerStat ratio (e.g. scan cadence). */
  scanCadence?: string;
  /** Tier comparison block — current plan limit vs upgrade plan limit. */
  tierComparison?: {
    currentPlan: { name: string; limit: number };
    upgradePlan: { name: string; limit: number };
  };
}

function StatCard({
  icon: Icon,
  label,
  hint,
  value,
  subline,
  delta,
  link,
  upgradeLink,
  accent,
  featured,
  engineHits,
  centerStat,
  scanCadence,
  tierComparison,
}: StatCardProps) {
  const a = accent ?? ACCENT_NEUTRAL;
  const deltaType =
    delta?.direction === "up"
      ? "increase"
      : delta?.direction === "down"
      ? "decrease"
      : "neutral";
  const deltaText = delta
    ? "customValue" in delta
      ? delta.customValue
      : `${Math.abs(delta.percent).toFixed(1)}%${delta.period ? ` ${delta.period}` : ""}`
    : "";

  // Featured = Prompts Tracked. Bigger fonts + sage tinted background so it
  // reads as the anchor of the strip; non-featured cards are skinnier.
  const sizes = featured
    ? {
        padding: "p-3",
        headerMB: "mb-2",
        tileBox: "h-8 w-8",
        tileIcon: "h-4 w-4",
        labelSize: 28,
        valueSize: 88,
        sublineSize: 13,
        linkPt: "pt-2",
      }
    : {
        padding: "p-2.5",
        headerMB: "mb-0.5",
        tileBox: "h-5 w-5",
        tileIcon: "h-2.5 w-2.5",
        labelSize: 20,
        valueSize: 44,
        sublineSize: 11,
        linkPt: "pt-1",
      };

  const featuredBg = "rgba(150,162,131,0.12)";
  const featuredBorder = "rgba(150,162,131,0.55)";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={`rounded-[var(--radius-lg)] border ${sizes.padding} flex flex-col h-full`}
      style={{
        backgroundColor: featured ? featuredBg : "var(--color-surface)",
        borderColor: featured
          ? featuredBorder
          : a.border === "transparent"
          ? "var(--color-border)"
          : a.border,
        borderLeftWidth: featured ? 4 : a.border === "transparent" ? 1 : 4,
      }}
    >
      <div className={`flex items-center gap-2 ${sizes.headerMB}`}>
        <div
          className={`${sizes.tileBox} rounded-[var(--radius-md)] flex items-center justify-center shrink-0`}
          style={{ backgroundColor: featured ? "rgba(150,162,131,0.28)" : a.tile }}
        >
          <Icon className={sizes.tileIcon} style={{ color: featured ? "#5E7250" : a.icon }} />
        </div>
        <div className="flex items-center gap-1.5">
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: sizes.labelSize,
              fontWeight: 500,
              color: "var(--color-fg)",
              letterSpacing: "-0.01em",
            }}
          >
            {label}
          </p>
          <HoverHint hint={hint}>
            <Info
              className="h-3.5 w-3.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
              aria-label="More info"
            />
          </HoverHint>
        </div>
      </div>
      {centerStat ? (
        <div className="flex flex-col items-center flex-1 py-2 w-full">
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: sizes.valueSize,
              fontWeight: 600,
              color: "var(--color-fg)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--color-fg)",
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {centerStat.value}
            </span>
            <span
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              /
            </span>
            <span
              className="tabular-nums text-[var(--color-fg-muted)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {centerStat.total}
            </span>
            <span
              className="text-[var(--color-fg-muted)] ml-1"
              style={{ fontSize: 12 }}
            >
              {centerStat.label}
            </span>
          </div>
          {scanCadence && (
            <div className="flex items-center gap-1 mt-2">
              <Calendar
                className="h-3 w-3"
                style={{ color: "var(--color-fg-muted)" }}
              />
              <span
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 11 }}
              >
                {scanCadence}
              </span>
            </div>
          )}
          {tierComparison && (
            <div className="mt-auto pt-3 w-full space-y-1.5">
              {/* Current plan — sage highlight */}
              <div
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5"
                style={{
                  backgroundColor: "rgba(150,162,131,0.14)",
                  borderLeft: "2px solid #7D8E6C",
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "#5E7250" }}
                  />
                  <span
                    className="truncate"
                    style={{ fontSize: 12, color: "#5E7250", fontWeight: 600 }}
                  >
                    {tierComparison.currentPlan.name}
                  </span>
                  <span
                    className="uppercase shrink-0"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      color: "#5E7250",
                      fontWeight: 700,
                      opacity: 0.7,
                    }}
                  >
                    Current
                  </span>
                </div>
                <span
                  className="tabular-nums shrink-0"
                  style={{
                    fontSize: 12,
                    color: "var(--color-fg)",
                    fontWeight: 700,
                  }}
                >
                  {tierComparison.currentPlan.limit} prompts
                </span>
              </div>

              {/* Upgrade plan — muted, amber accent */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Crown
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "#C97B45", opacity: 0.55 }}
                  />
                  <span
                    className="truncate text-[var(--color-fg-muted)]"
                    style={{ fontSize: 12, fontWeight: 500 }}
                  >
                    {tierComparison.upgradePlan.name}
                  </span>
                </div>
                <span
                  className="tabular-nums text-[var(--color-fg-muted)] shrink-0"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {tierComparison.upgradePlan.limit} prompts
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 2 }}>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: sizes.valueSize,
                fontWeight: 600,
                color: "var(--color-fg)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {value}
            </p>
            {delta && <DeltaPill deltaType={deltaType} value={deltaText} />}
          </div>
          {subline && (
            <p className="text-[var(--color-fg-muted)]" style={{ fontSize: sizes.sublineSize }}>
              {subline}
            </p>
          )}
        </>
      )}
      {link && (
        <a
          href={link.href}
          className={`inline-flex items-center gap-1 mt-auto ${sizes.linkPt} font-medium hover:underline`}
          style={{ fontSize: 12.5, color: COLORS.primaryHover }}
        >
          {link.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      )}
      {upgradeLink && (
        <a
          href={upgradeLink.href}
          className={`group mt-auto ${sizes.linkPt} flex items-center justify-between gap-3`}
        >
          <div className="flex items-start gap-1.5 min-w-0">
            <Crown className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#C97B45" }} />
            <span
              className="leading-snug"
              style={{ fontSize: 13, color: TOK.amberFg, fontWeight: 600 }}
            >
              {upgradeLink.label}
            </span>
          </div>
          <ArrowRight
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: "#C97B45" }}
          />
        </a>
      )}
    </motion.div>
  );
}

// ─── LEDGER (right side of strip) ──────────────────────────────────────────

interface LedgerRowSpec {
  label: string;
  hint: string;
  subline: string;
  value: string;
  delta: DeltaSpec;
  link: { label: string; href: string };
  accentColor?: string;
  /** When set, renders a small visibility gauge before the value. */
  gaugeType?: "branded" | "unbranded" | "citation" | "position";
  /** Numeric percent for the gauge (0-100). For position, pass the derived score. */
  gaugePct?: number;
}

function InfoTooltip({ hint }: { hint: string }) {
  // Delegates to the portal-based HoverHint atom so the tooltip escapes
  // any ancestor `overflow-hidden` clipping context (e.g., the prompts
  // table card) and renders on top of everything else.
  return (
    <HoverHint hint={hint}>
      <Info
        className="h-3.5 w-3.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
        aria-label="More info"
      />
    </HoverHint>
  );
}

function PromptsLedger({ rows }: { rows: LedgerRowSpec[] }) {
  return (
    <motion.div
      initial="initial"
      whileInView="whileInView"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ staggerChildren: 0.06, delayChildren: 0.05 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full"
    >
      {rows.map((row, i) => {
        const deltaType =
          row.delta.direction === "up"
            ? "increase"
            : row.delta.direction === "down"
            ? "decrease"
            : "neutral";
        const deltaText =
          "customValue" in row.delta
            ? row.delta.customValue
            : `${Math.abs(row.delta.percent).toFixed(1)}%`;
        return (
          <motion.div
            key={row.label}
            variants={{
              initial: { opacity: 0 },
              whileInView: { opacity: 1 },
            }}
            transition={{ duration: 0.4, ease: EASE }}
            className={
              "grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-5 flex-1 " +
              (i > 0 ? "border-t border-[var(--color-border)]" : "")
            }
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              backgroundColor: row.accentColor ? `${row.accentColor}14` : undefined,
            }}
          >
            {/* Label + subline + info */}
            <div className="min-w-0 py-2">
              <div className="flex items-center gap-1.5">
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 500,
                    color: "var(--color-fg)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                  }}
                >
                  {row.label}
                </h3>
                <InfoTooltip hint={row.hint} />
              </div>
              <p
                className="text-[var(--color-fg-muted)] mt-0.5"
                style={{ fontSize: 12 }}
              >
                {row.subline}
              </p>
            </div>

            {/* Value (with optional gauge before it) */}
            <div className="flex items-center gap-3 justify-end">
              {row.gaugeType !== undefined && row.gaugePct !== undefined && (
                <VisibilityGauge pct={row.gaugePct} type={row.gaugeType} />
              )}
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 40,
                  fontWeight: 600,
                  color: "var(--color-fg)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  minWidth: 80,
                  textAlign: "right",
                }}
              >
                {row.value}
              </span>
            </div>

            {/* Delta */}
            <DeltaPill deltaType={deltaType} value={deltaText} />

            {/* Link */}
            <a
              href={row.link.href}
              className="group inline-flex items-center gap-1 font-medium hover:underline whitespace-nowrap"
              style={{ fontSize: 12.5, color: COLORS.primaryHover }}
            >
              {row.link.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── CLEAN STAT STRIP ──────────────────────────────────────────────────────
// Brand-sentiment-style 4-card strip — minimal, equal weight, no gauges.
// Each card: icon tile + label + info icon + Cormorant value + delta + sub.

interface CleanStatCardSpec {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  hint: string;
  value: string;
  sub: string;
  delta?: { direction: "up" | "down" | "flat"; pct: number; suffix?: string };
  /** When set, renders a half-circle gauge to the right of the content. */
  gauge?: { type: "branded" | "unbranded" | "citation" | "position"; pct: number };
  /** Bigger value type — used by the Prompts Tracked anchor card. */
  featured?: boolean;
  /** Plan-tier comparison rendered to the right of the content. */
  planTier?: {
    currentPlan: string;
    currentPrompts: number;
    upgradePlan: string;
    upgradePrompts: number;
    href: string;
  };
  /** Applies the same sage row tint used on branded prompt rows. */
  branded?: boolean;
}

function CleanStatStrip({ data }: { data: PromptsData }) {
  const cards: CleanStatCardSpec[] = [
    {
      icon: ListChecks,
      label: "Prompts Tracked",
      hint: "Total prompts Surven monitors across all AI engines. Scanned every Monday.",
      value: data.promptsTracked.toString(),
      sub: `${data.promptsLanding} of ${data.promptsTracked} prompts cited at least once`,
      featured: true,
      planTier: {
        currentPlan: "Plus",
        currentPrompts: 100,
        upgradePlan: "Premium",
        upgradePrompts: 300,
        href: "/pricing",
      },
    },
    {
      icon: Tag,
      label: "Branded Visibility",
      hint: "How often you appear when someone searches for your business by name.",
      value: `${data.brandedVisibility}%`,
      sub: `${data.brandedHits} of ${data.brandedTotal} branded prompts`,
      delta: {
        direction:
          data.brandedVisibilityDelta > 0
            ? "up"
            : data.brandedVisibilityDelta < 0
            ? "down"
            : "flat",
        pct: data.brandedVisibilityDelta,
      },
      gauge: { type: "branded", pct: data.brandedVisibility },
      branded: true,
    },
    {
      icon: Search,
      label: "Unbranded Visibility",
      hint: "How often you appear in category searches where your name isn't mentioned.",
      value: `${data.unbrandedVisibility}%`,
      sub: `${data.unbrandedHits} of ${data.unbrandedTotal} unbranded prompts`,
      delta: {
        direction:
          data.unbrandedVisibilityDelta > 0
            ? "up"
            : data.unbrandedVisibilityDelta < 0
            ? "down"
            : "flat",
        pct: data.unbrandedVisibilityDelta,
      },
      gauge: { type: "unbranded", pct: data.unbrandedVisibility },
    },
    {
      icon: Link2,
      label: "Link Citation Rate",
      hint: "Percentage of your AI mentions that include a direct clickable URL.",
      value: `${data.linkCitationRate}%`,
      sub: `Of ${data.linkCitationMentions} AI mentions`,
      delta: {
        direction:
          data.linkCitationDelta > 0
            ? "up"
            : data.linkCitationDelta < 0
            ? "down"
            : "flat",
        pct: data.linkCitationDelta,
      },
      gauge: { type: "citation", pct: data.linkCitationRate },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const deltaType =
          c.delta == null
            ? null
            : c.delta.direction === "up"
            ? "increase"
            : c.delta.direction === "down"
            ? "decrease"
            : "neutral";
        return (
          <Card key={c.label} className="flex flex-col p-5" style={c.branded ? { backgroundColor: "rgba(140,165,118,0.13)" } : undefined}>
            <div className="flex items-start gap-3 flex-1">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(150,162,131,0.16)" }}
              >
                <Icon className="h-5 w-5" style={{ color: "#5E7250" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <p
                    className="text-[var(--color-fg-muted)]"
                    style={{ fontSize: 12 }}
                  >
                    {c.label}
                  </p>
                  <HoverHint hint={c.hint} placement="top">
                    <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                  </HoverHint>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: c.featured ? 48 : 34,
                      fontWeight: 600,
                      lineHeight: 1.05,
                      color: "var(--color-fg)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {c.value}
                  </p>
                  {deltaType && c.delta && c.delta.direction !== "flat" && (
                    <BadgeDelta
                      deltaType={deltaType}
                      value={`${c.delta.pct > 0 ? "+" : ""}${c.delta.pct.toFixed(
                        1,
                      )}%`}
                      variant="solid"
                    />
                  )}
                </div>
                <p
                  className="text-[var(--color-fg-muted)] mt-0.5"
                  style={{ fontSize: 12, lineHeight: 1.4 }}
                >
                  {c.sub}
                </p>
              </div>
              {c.gauge && (
                <div className="shrink-0 self-center">
                  <VisibilityGauge type={c.gauge.type} pct={c.gauge.pct} />
                </div>
              )}
            </div>

            {c.planTier && (
              <div
                className="mt-4 rounded-md border px-3 py-2 flex items-center justify-between gap-2 flex-wrap"
                style={{
                  borderColor: "rgba(150,162,131,0.35)",
                  backgroundColor: "rgba(150,162,131,0.06)",
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: TOK.greenFg }}
                    />
                    <span
                      className="uppercase tabular-nums whitespace-nowrap"
                      style={{
                        fontSize: 11.5,
                        letterSpacing: "0.04em",
                        fontWeight: 700,
                        color: TOK.greenFg,
                      }}
                    >
                      {c.planTier.currentPlan} · {c.planTier.currentPrompts}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Crown
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "#C97B45" }}
                    />
                    <span
                      className="uppercase tabular-nums whitespace-nowrap"
                      style={{
                        fontSize: 11.5,
                        letterSpacing: "0.04em",
                        fontWeight: 700,
                        color: "var(--color-fg-secondary)",
                      }}
                    >
                      {c.planTier.upgradePlan} · {c.planTier.upgradePrompts}
                    </span>
                  </div>
                </div>
                <a
                  href={c.planTier.href}
                  className="group inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
                  style={{
                    fontSize: 12,
                    color: TOK.amberFg,
                  }}
                >
                  Upgrade
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function StatStrip({ data }: { data: PromptsData }) {
  const rows: LedgerRowSpec[] = [
    {
      label: "Branded Visibility",
      hint: "How often you appear when someone searches for your business by name.",
      subline: `${data.brandedHits} of ${data.brandedTotal} prompts`,
      value: `${data.brandedVisibility}%`,
      delta: {
        direction:
          data.brandedVisibilityDelta > 0
            ? "up"
            : data.brandedVisibilityDelta < 0
            ? "down"
            : "flat",
        percent: data.brandedVisibilityDelta,
      },
      link: { label: "Audit", href: "/audit" },
      accentColor: "#7D8E6C",
      gaugeType: "branded",
      gaugePct: data.brandedVisibility,
    },
    {
      label: "Unbranded Visibility",
      hint: "How often you appear in category searches where your name isn't mentioned.",
      subline: `${data.unbrandedHits} of ${data.unbrandedTotal} prompts`,
      value: `${data.unbrandedVisibility}%`,
      delta: {
        direction:
          data.unbrandedVisibilityDelta > 0
            ? "up"
            : data.unbrandedVisibilityDelta < 0
            ? "down"
            : "flat",
        percent: data.unbrandedVisibilityDelta,
      },
      link: { label: "Audit", href: "/audit" },
      accentColor: "#C97B45",
      gaugeType: "unbranded",
      gaugePct: data.unbrandedVisibility,
    },
    {
      label: "Link Citation Rate",
      hint: "Percentage of your mentions that include a direct clickable URL.",
      subline: `Of ${data.linkCitationMentions} AI mentions`,
      value: `${data.linkCitationRate}%`,
      delta: {
        direction:
          data.linkCitationDelta > 0
            ? "up"
            : data.linkCitationDelta < 0
            ? "down"
            : "flat",
        percent: data.linkCitationDelta,
      },
      link: { label: "Citation Insights", href: "/citation-insights" },
      gaugeType: "citation",
      gaugePct: data.linkCitationRate,
    },
    {
      label: "Avg Position When Cited",
      hint: "When AI mentions you, your average rank versus the competitors also named in the same response.",
      subline: `Of ${data.avgPositionCompetitors} competitors typically cited`,
      value: `#${data.avgPositionWhenCited.toFixed(1)}`,
      delta: {
        direction:
          data.avgPositionDelta < 0
            ? "up"
            : data.avgPositionDelta > 0
            ? "down"
            : "flat",
        customValue: `${Math.abs(data.avgPositionDelta).toFixed(1)} spots`,
      },
      link: { label: "Competitors", href: "/competitor-comparison" },
      gaugeType: "position",
      // Convert rank → 0-100 score: pos 1 = 100, pos 5+ = 0 (linear, 20pts per rank)
      gaugePct: Math.max(
        0,
        Math.min(100, 100 - (data.avgPositionWhenCited - 1) * 20),
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5 items-stretch">
      <StatCard
        icon={ListChecks}
        label="Prompts Tracked"
        hint="Total prompts Surven runs against every AI engine on your behalf. More tracked prompts = wider visibility coverage. 50+ is healthy for a single brand."
        value={data.promptsTracked.toString()}
        centerStat={{
          value: data.promptsLanding,
          total: data.promptsTracked,
          label: "landing",
        }}
        scanCadence="Scanned every Monday"
        tierComparison={{
          currentPlan: { name: "Plus plan", limit: 100 },
          upgradePlan: { name: "Premium plan", limit: 300 },
        }}
        upgradeLink={{ label: "Upgrade to track more prompts", href: "/pricing" }}
        featured
      />
      <PromptsLedger rows={rows} />
    </div>
  );
}

// ─── BRANDED CALLOUT (conditional) ─────────────────────────────────────────

function BrandedCallout({
  data,
  onSeeBranded,
}: {
  data: PromptsData;
  onSeeBranded?: () => void;
}) {
  const failCount = data.brandedTopRankTotal - data.brandedTopRankCount;
  const isClean = failCount === 0;
  const isPartial = failCount === 1;

  if (isClean) return null;

  const failedEngines = data.brandedTopRankFailEngines
    .map((id) => ENGINES.find((e) => e.id === id)?.label)
    .filter(Boolean)
    .join(" · ");

  const title = isPartial
    ? "1 AI tool shows a competitor when customers search your business by name"
    : `Customers see competitors first on ${failCount} of ${data.brandedTopRankTotal} AI tools when searching your name`;

  return (
    <div className="flex items-start gap-2.5 flex-wrap">
      <AlertTriangle
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: TOK.amberFg, marginTop: 2 }}
      />
      <p
        className="flex-1 min-w-0"
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: TOK.amberFg,
          fontFamily: "var(--font-sans)",
        }}
      >
        <span style={{ fontWeight: 600 }}>{title}</span>{" "}
        <span
          className="text-[var(--color-fg-muted)]"
          style={{ fontWeight: 400 }}
        >
          on {failedEngines}.
        </span>
      </p>
      <div className="flex items-center gap-4 shrink-0">
        {onSeeBranded && (
          <button
            type="button"
            onClick={onSeeBranded}
            className="inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{
              fontSize: 12,
              color: TOK.amberFg,
              fontFamily: "var(--font-sans)",
            }}
          >
            See branded
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
        <a
          href="/audit"
          className="inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
          style={{
            fontSize: 12,
            color: TOK.amberFg,
            fontFamily: "var(--font-sans)",
          }}
        >
          Fix with GEO Audit
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ─── CHUNK 2 ───────────────────────────────────────────────────────────────
// Prompts table (tabbed) + Coverage by Intent + Citation Sources + Sentiment.

// ─── PROMPTS TABLE ─────────────────────────────────────────────────────────

type PromptsFilter = "branded" | "unbranded" | "cited" | "uncited";
// Kept for the "All" reset button — not a filter itself, just a signal.
type PromptsTab = "all" | PromptsFilter;

const PROMPTS_TAB_HINTS: Record<PromptsTab, string> = {
  all: "Clear all filters — show every prompt we track.",
  branded: "Searches that include your business name — credibility checks.",
  unbranded: "Category searches without your name — discovery opportunities.",
  cited: "Prompts where at least one AI engine mentioned you.",
  uncited: "Prompts where no engine cited you — visibility leaks to fix.",
};

// Each axis is OR within itself, AND across axes. Selecting both branded
// + unbranded is identical to no type filter (same logic for cited/uncited).
const TYPE_FILTERS: PromptsFilter[] = ["branded", "unbranded"];
const STATUS_FILTERS: PromptsFilter[] = ["cited", "uncited"];


function sentimentBucket(s: number): "pos" | "neu" | "neg" {
  if (s >= 0.35) return "pos";
  if (s <= -0.15) return "neg";
  return "neu";
}

const SENTIMENT_STYLE: Record<"pos" | "neu" | "neg", { color: string; bg: string; Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  pos: { color: "#5E7250", bg: "rgba(150,162,131,0.20)", Icon: Smile, label: "Positive" },
  neu: { color: "var(--color-fg-muted)", bg: "var(--color-surface-alt)", Icon: Meh, label: "Neutral" },
  neg: { color: TOK.loseText, bg: "rgba(181,70,49,0.14)", Icon: Frown, label: "Negative" },
};

// ─── SORT ──────────────────────────────────────────────────────────────────
// 3-state click cycle on a column: desc → asc → reset to default (volume desc).
// Reset button surfaces in the header row whenever sort isn't at default.

type SortColumn =
  | "volume"
  | "intent"
  | "coverage"
  | "position"
  | "sentiment";
type SortDirection = "desc" | "asc";
interface SortState {
  column: SortColumn;
  direction: SortDirection;
}
const DEFAULT_SORT: SortState = { column: "volume", direction: "desc" };

function comparePrompts(a: PromptRow, b: PromptRow, column: SortColumn): number {
  switch (column) {
    case "volume":
      return a.volume - b.volume;
    case "intent":
      return a.intent.localeCompare(b.intent);
    case "coverage": {
      const aCov =
        Object.values(a.engineHits).filter(Boolean).length /
        Object.keys(a.engineHits).length;
      const bCov =
        Object.values(b.engineHits).filter(Boolean).length /
        Object.keys(b.engineHits).length;
      return aCov - bCov;
    }
    case "position": {
      // null = uncited; treat as worst (Infinity). Keeps "best first" intuitive on asc.
      const aPos = a.position ?? Infinity;
      const bPos = b.position ?? Infinity;
      return aPos - bPos;
    }
    case "sentiment":
      return a.sentiment - b.sentiment;
  }
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  const idle = "rgba(60,62,60,0.28)";
  const on = COLORS.primaryHover;
  return (
    <span
      className="inline-flex flex-col"
      style={{ marginLeft: 5, lineHeight: 0.5 }}
      aria-hidden
    >
      <ChevronUp
        style={{
          height: 10,
          width: 10,
          color: active && direction === "asc" ? on : idle,
          transition: "color 150ms ease",
        }}
      />
      <ChevronDown
        style={{
          height: 10,
          width: 10,
          marginTop: -3,
          color: active && direction === "desc" ? on : idle,
          transition: "color 150ms ease",
        }}
      />
    </span>
  );
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
  onReset,
}: {
  label: string;
  column: SortColumn;
  sort: SortState;
  onSort: (col: SortColumn) => void;
  onReset: () => void;
}) {
  const active = sort.column === column;
  const isDefault =
    sort.column === DEFAULT_SORT.column &&
    sort.direction === DEFAULT_SORT.direction;
  return (
    <span
      className="inline-flex items-center"
      aria-sort={
        active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center font-semibold uppercase text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
        <SortIndicator active={active} direction={sort.direction} />
      </button>
      {active && !isDefault && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] transition-all"
          style={{
            height: 16,
            width: 16,
            marginLeft: 4,
            opacity: 0.55,
          }}
          title={`Reset sort (back to ${DEFAULT_SORT.column}, highest first)`}
          aria-label="Reset sort"
        >
          <X style={{ height: 11, width: 11 }} />
        </button>
      )}
    </span>
  );
}

function fmtVolume(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

// ─── INTENT FILTER DROPDOWN ────────────────────────────────────────────────
// Replaces the sortable up/down arrows on the Intent column header — sort
// makes no sense across many discrete intent buckets, but multi-select
// filtering does.

function IntentFilterHeader({
  allIntents,
  selected,
  onApply,
}: {
  allIntents: string[];
  selected: Set<string>;
  onApply: (next: Set<string>) => void;
}) {
  // Branded lives in its own column now — strip the legacy "Brand lookup"
  // label from this dropdown so users don't filter twice.
  const visibleIntents = useMemo(
    () => allIntents.filter((i) => i !== "Brand lookup"),
    [allIntents],
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(selected);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Sync draft from committed state every time we open the dropdown.
  useEffect(() => {
    if (open) setDraft(new Set(selected));
  }, [open, selected]);

  // Recompute popover position when opening / on resize / scroll.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 6, left: rect.left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Click-outside to dismiss without applying.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !popoverRef.current?.contains(t)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const isFiltered =
    selected.size > 0 && selected.size < visibleIntents.length;

  function toggle(intent: string) {
    setDraft((prev) => {
      // Smart "filter to only this" behavior: if every intent is currently
      // selected (the default state), clicking a single row should narrow
      // to ONLY that intent — matches how spreadsheet/Notion filters work
      // and avoids the foot-gun where unchecking one shows the OTHER four.
      if (prev.size === visibleIntents.length) {
        return new Set([intent]);
      }
      const next = new Set(prev);
      if (next.has(intent)) next.delete(intent);
      else next.add(intent);
      // If they unchecked the last remaining intent, treat as a reset
      // (otherwise apply would silently re-select all and confuse them).
      if (next.size === 0) return new Set(visibleIntents);
      return next;
    });
  }

  function apply() {
    onApply(new Set(draft));
    setOpen(false);
  }

  function selectAll() {
    setDraft(new Set(visibleIntents));
  }

  function clearAll() {
    setDraft(new Set());
  }

  return (
    <div className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 group"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <span
          className="font-semibold uppercase text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}
        >
          Intent
        </span>
        {isFiltered && (
          <span
            className="inline-flex items-center justify-center rounded-full tabular-nums"
            style={{
              minWidth: 16,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              backgroundColor: COLORS.primary,
              color: "white",
              padding: "0 4px",
            }}
          >
            {selected.size}
          </span>
        )}
        <ChevronDown
          className={
            "h-3 w-3 text-[var(--color-fg-muted)] transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && mounted && pos &&
        createPortal(
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="rounded-md shadow-lg overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: 200,
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
              <span
                className="font-semibold uppercase text-[var(--color-fg-muted)]"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                Filter by intent
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                  style={{ fontSize: 11 }}
                >
                  All
                </button>
                <span className="text-[var(--color-border)]">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                  style={{ fontSize: 11 }}
                >
                  None
                </button>
              </div>
            </div>

            <div className="py-1.5">
              {visibleIntents.map((intent) => {
              const checked = draft.has(intent);
              const c = intentChip(intent);
              return (
                <label
                  key={intent}
                  className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(intent)}
                    className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span
                    className="inline-block rounded-full shrink-0"
                    style={{
                      width: 9,
                      height: 9,
                      backgroundColor: c.fg,
                    }}
                  />
                  <span
                    className="flex-1"
                    style={{
                      fontSize: 13,
                      color: "var(--color-fg)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {intent}
                  </span>
                </label>
              );
            })}
          </div>

            <div className="px-3 py-2 border-t border-[var(--color-border)] flex justify-end">
              <motion.button
                type="button"
                onClick={apply}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15, ease: EASE }}
                className="rounded-[var(--radius-sm)] font-semibold transition-colors"
                style={{
                  fontSize: 12,
                  padding: "5px 14px",
                  backgroundColor: COLORS.primary,
                  color: "white",
                }}
              >
                Apply
              </motion.button>
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}

// Brand-only filter dropdown for the Branded column header. Same portal +
// fixed-positioning pattern as IntentFilterHeader so it can't be clipped
// by the prompts-table card. Drives the existing onToggleFilter handler
// so it stays in sync with the All/Branded/Unbranded chip cluster at the
// top of the box.
function BrandFilterHeader({
  selectedFilters,
  onToggleFilter,
}: {
  selectedFilters: Set<PromptsFilter>;
  onToggleFilter: (f: PromptsFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 6, left: rect.left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  // Branded/Unbranded toggling matches the existing chip cluster: when
  // BOTH chips are off, it's equivalent to "no filter on type" — so
  // selecting both = no filter, selecting one = filter to just that.
  const brandedSel = selectedFilters.has("branded");
  const unbrandedSel = selectedFilters.has("unbranded");
  const isFiltered =
    (brandedSel && !unbrandedSel) || (!brandedSel && unbrandedSel);

  return (
    <div className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 group"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <span
          className="font-semibold uppercase text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}
        >
          Branded
        </span>
        <HoverHint hint="Prompts that mention your business name. Tracks how AI describes you when someone asks about your brand directly.">
          <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-70" />
        </HoverHint>
        {isFiltered && (
          <span
            className="inline-flex items-center justify-center rounded-full tabular-nums"
            style={{
              minWidth: 16,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              backgroundColor: COLORS.primary,
              color: "white",
              padding: "0 4px",
            }}
          >
            1
          </span>
        )}
        <ChevronDown
          className={
            "h-3 w-3 text-[var(--color-fg-muted)] transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && mounted && pos &&
        createPortal(
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="rounded-md shadow-lg overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: 200,
            }}
          >
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <span
                className="font-semibold uppercase text-[var(--color-fg-muted)]"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                Filter by brand status
              </span>
            </div>

            <div className="py-1.5">
              {(
                [
                  { id: "branded" as const, label: "Branded prompts", color: "#7D8E6C" },
                  { id: "unbranded" as const, label: "Unbranded prompts", color: "#6BA3F5" },
                ]
              ).map((opt) => {
                const checked = selectedFilters.has(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleFilter(opt.id)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
                    />
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 9, height: 9, backgroundColor: opt.color }}
                    />
                    <span
                      className="flex-1"
                      style={{
                        fontSize: 13,
                        color: "var(--color-fg)",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}

// Cited / not-cited filter dropdown for the Cited column header. Mirrors
// BrandFilterHeader: portal-mounted, drives the existing onToggleFilter
// handler (which already understands "cited" / "uncited"), and shows a
// 1 badge when one of the two is selected exclusively.
function CitedFilterHeader({
  selectedFilters,
  onToggleFilter,
}: {
  selectedFilters: Set<PromptsFilter>;
  onToggleFilter: (f: PromptsFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 6, left: rect.left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const citedSel = selectedFilters.has("cited");
  const uncitedSel = selectedFilters.has("uncited");
  const isFiltered = (citedSel && !uncitedSel) || (!citedSel && uncitedSel);

  return (
    <div className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 group"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <span
          className="font-semibold uppercase text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}
        >
          Cited
        </span>
        <HoverHint hint="Which AI engines linked to your site in their answer.">
          <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-70" />
        </HoverHint>
        {isFiltered && (
          <span
            className="inline-flex items-center justify-center rounded-full tabular-nums"
            style={{
              minWidth: 16,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              backgroundColor: COLORS.primary,
              color: "white",
              padding: "0 4px",
            }}
          >
            1
          </span>
        )}
        <ChevronDown
          className={
            "h-3 w-3 text-[var(--color-fg-muted)] transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && mounted && pos &&
        createPortal(
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="rounded-md shadow-lg overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: 200,
            }}
          >
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <span
                className="font-semibold uppercase text-[var(--color-fg-muted)]"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                Filter by citation
              </span>
            </div>
            <div className="py-1.5">
              {(
                [
                  { id: "cited" as const, label: "Cited", color: "#7D8E6C" },
                  { id: "uncited" as const, label: "Not cited", color: "#B54631" },
                ]
              ).map((opt) => {
                const checked = selectedFilters.has(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleFilter(opt.id)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
                    />
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 9, height: 9, backgroundColor: opt.color }}
                    />
                    <span
                      className="flex-1"
                      style={{
                        fontSize: 13,
                        color: "var(--color-fg)",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}

function PromptsTable({
  prompts,
  summary,
  selectedFilters,
  onToggleFilter,
  onClearFilters,
  data,
  onSeeBranded,
}: {
  prompts: PromptRow[];
  summary: string;
  selectedFilters: Set<PromptsFilter>;
  onToggleFilter: (f: PromptsFilter) => void;
  onClearFilters: () => void;
  data: PromptsData;
  onSeeBranded?: () => void;
}) {
  const { activeBusiness } = useActiveBusiness();
  // Faded teaser prompt rendered in the Add prompts row at the bottom.
  // Pulled from the active business's industry + city so it reads as a
  // realistic next-prompt suggestion. Falls back to a generic template
  // when no business is loaded (e.g. local dev with the auth bypass).
  const teaserPrompt = useMemo(() => {
    const industry = activeBusiness?.industry?.toLowerCase() ?? "service";
    const city = activeBusiness?.city ?? "your city";
    const samples = [
      `Best ${industry} in ${city} for new clients`,
      `Most affordable ${industry} near ${city}`,
      `Top-rated ${industry} in ${city} open this weekend`,
      `Who do locals recommend for ${industry} in ${city}?`,
    ];
    // Stable per-render: pick by business id hash so the same business
    // always sees the same teaser (until they change businesses).
    const seed = activeBusiness?.id ?? "fallback";
    const h = Math.abs(
      [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0),
    );
    return samples[h % samples.length];
  }, [activeBusiness?.id, activeBusiness?.industry, activeBusiness?.city]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState<number | "all">(20);
  // Two-mode view: the existing data-dense table, OR the
  // industry-specific themes view (PromptsByCluster). Hash-aware so that
  // deep-links from the cluster card on /competitor-comparison
  // (`#cluster-personal-injury` etc.) auto-flip into themes mode.
  const [viewMode, setViewMode] = useState<"list" | "themes">("list");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (
        h === "themes" ||
        h === "prompts-by-cluster" ||
        h.startsWith("cluster-")
      ) {
        setViewMode("themes");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // If the page was opened with #prompts-table (e.g. from Prompt Dominance
  // CTAs), scroll it to the vertical center of the viewport. Otherwise — for
  // a normal sidebar click with no hash — default to the top of the page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "prompts-table") {
      const t = setTimeout(() => {
        document
          .getElementById("prompts-table")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return () => clearTimeout(t);
    }
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  // Canonical intent list — fixed order matching the product taxonomy.
  // Using a static list (not derived from prompts) so all 5 intents always
  // appear in the filter dropdown, even when some have zero matching prompts.
  const allIntents = useMemo(
    () => Object.keys(INTENT_COLORS),
    [],
  );

  // Selected intents for filtering. If the URL has ?intent=X on mount,
  // pre-select just that intent so the table lands filtered to that intent.
  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("intent");
      if (param) return new Set([param]);
    }
    return new Set(allIntents);
  });

  // Re-sync if the underlying intent set changes (e.g., new prompts arrive).
  useEffect(() => {
    setSelectedIntents((prev) => {
      const next = new Set<string>();
      for (const i of allIntents) {
        if (prev.size === 0 || prev.has(i)) next.add(i);
      }
      // prev was explicitly filtered to an intent not in current prompts — preserve it
      // so the table shows empty state instead of silently showing all prompts.
      if (next.size === 0) return prev.size > 0 ? prev : new Set(allIntents);
      return next;
    });
  }, [allIntents]);

  const filtered = useMemo(() => {
    // Type axis: branded XOR unbranded. If both or neither, no filter applied.
    const wantBranded = selectedFilters.has("branded");
    const wantUnbranded = selectedFilters.has("unbranded");
    const typeActive = wantBranded !== wantUnbranded;
    // Status axis: cited XOR uncited. If both or neither, no filter applied.
    const wantCited = selectedFilters.has("cited");
    const wantUncited = selectedFilters.has("uncited");
    const statusActive = wantCited !== wantUncited;

    const base = prompts.filter((p) => {
      if (typeActive) {
        if (wantBranded && p.type !== "branded") return false;
        if (wantUnbranded && p.type !== "unbranded") return false;
      }
      if (statusActive) {
        // "Cited" axis is now link presence — at least one engine
        // included a link in its answer (matches the Cited column dots).
        const engineIds = ["chatgpt", "claude", "gemini", "google_ai"] as const;
        const linked = engineIds.some((e) =>
          linkHit(p.id, e, !!p.engineHits[e]),
        );
        if (wantCited && !linked) return false;
        if (wantUncited && linked) return false;
      }
      return true;
    });
    // Filter on the SAME source the Intent column displays (primaryIntent
    // from prompt text), not the legacy p.intent label from mock data.
    // Otherwise a row tagged "Informational" in the data can render as
    // "Local" in the column (because the column re-classifies from text)
    // and confuse the user about why the filter "didn't work".
    const labelFor = (p: PromptRow) => PROMPT_CATEGORIES[primaryIntent(p.text)].label;
    const intentFiltered = selectedIntents.size === allIntents.length
      ? base
      : base.filter((p) => selectedIntents.has(labelFor(p)));
    const sorted = [...intentFiltered];
    sorted.sort((a, b) => {
      const cmp = comparePrompts(a, b, sort.column);
      return sort.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [selectedFilters, prompts, sort, selectedIntents, allIntents.length]);

  function toggleRow(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSort(column: SortColumn) {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: "desc" };
      if (prev.direction === "desc") return { column, direction: "asc" };
      // Third click on the active column → reset to default
      return DEFAULT_SORT;
    });
  }

  function handleResetSort() {
    setSort(DEFAULT_SORT);
  }

  const isDefaultSort =
    sort.column === DEFAULT_SORT.column &&
    sort.direction === DEFAULT_SORT.direction;

  const visible = pageSize === "all" ? filtered : filtered.slice(0, pageSize);
  const truncated = pageSize !== "all" && filtered.length > visible.length;

  const rowBorder = "1.5px solid rgba(60,62,60,0.18)";

  return (
    <section
      id="prompts-table"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] scroll-mt-6"
    >
      <div className="grid grid-cols-3 items-center gap-3 px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 44,
                fontWeight: 500,
                color: "var(--color-fg)",
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              Tracked Prompts
            </h2>
            <InfoTooltip hint="Every prompt we run on your behalf, ranked by monthly search volume." />
          </div>

          {/* General ↔ Personalized view toggle. Pinned next to the title so
              the user reads "Tracked Prompts · General | Personalized" as
              one cluster. Personalized pill has a subtle sage glow to hint
              "this is the AI-personalized view." */}
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-1 gap-1">
            <HoverHint hint="Data-dense list of every prompt with engine hit map and sentiment.">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={
                  "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] transition-colors capitalize whitespace-nowrap " +
                  (viewMode === "list"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                }
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                General
              </button>
            </HoverHint>
            <HoverHint hint="Personalized themes — prompts grouped by industry-specific topics. Powers the cluster gap analysis on Competitor Comparison.">
              <button
                type="button"
                onClick={() => setViewMode("themes")}
                aria-pressed={viewMode === "themes"}
                className={
                  "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] capitalize whitespace-nowrap transition-all " +
                  (viewMode === "themes" ? "text-white" : "")
                }
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  // Always render the multi-stop sage→gold→amber gradient so
                  // the pill ALWAYS reads as a "smart / AI-powered" tab.
                  // When inactive the gradient sits at low alpha behind the
                  // text; when active it goes full and the outer glow intensifies.
                  background:
                    viewMode === "themes"
                      ? "linear-gradient(135deg, #96A283 0%, #B8A030 55%, #C97B45 100%)"
                      : "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(184,160,48,0.18) 55%, rgba(201,123,69,0.18) 100%)",
                  color:
                    viewMode === "themes" ? "#fff" : "#5E7250",
                  boxShadow:
                    viewMode === "themes"
                      ? "0 0 22px -2px rgba(150,162,131,0.85), 0 0 8px rgba(184,160,48,0.55), 0 0 0 1px rgba(150,162,131,0.45) inset"
                      : "0 0 12px -2px rgba(150,162,131,0.45), 0 0 0 1px rgba(150,162,131,0.35) inset",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== "themes") {
                    e.currentTarget.style.boxShadow =
                      "0 0 18px -2px rgba(150,162,131,0.75), 0 0 0 1px rgba(150,162,131,0.55) inset";
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== "themes") {
                    e.currentTarget.style.boxShadow =
                      "0 0 12px -2px rgba(150,162,131,0.45), 0 0 0 1px rgba(150,162,131,0.35) inset";
                  }
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    background:
                      viewMode === "themes"
                        ? "#fff"
                        : "linear-gradient(135deg, #96A283, #C97B45)",
                    boxShadow:
                      viewMode === "themes"
                        ? "0 0 8px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.5)"
                        : "0 0 8px rgba(150,162,131,0.85)",
                  }}
                  aria-hidden
                />
                Personalized
              </button>
            </HoverHint>
          </div>
        </div>
        <div className="justify-self-center inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-1 gap-1">
          <HoverHint hint={PROMPTS_TAB_HINTS.all}>
            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.15, ease: EASE }}
              onClick={onClearFilters}
              className={
                "px-3 py-1 rounded-[var(--radius-md)] transition-colors capitalize whitespace-nowrap " +
                (selectedFilters.size === 0
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
              }
              style={{ fontSize: 18, fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.01em" }}
            >
              All
            </motion.button>
          </HoverHint>
          <span
            aria-hidden
            className="self-stretch w-px mx-0.5"
            style={{ backgroundColor: "var(--color-border)" }}
          />
          {TYPE_FILTERS.map((f) => {
            const active = selectedFilters.has(f);
            return (
              <HoverHint key={f} hint={PROMPTS_TAB_HINTS[f]}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  onClick={() => onToggleFilter(f)}
                  aria-pressed={active}
                  className={
                    "px-3 py-1 rounded-[var(--radius-md)] transition-colors capitalize border whitespace-nowrap " +
                    (active
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "text-[var(--color-fg-secondary)] border-transparent hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{ fontSize: 18, fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.01em" }}
                >
                  {f}
                </motion.button>
              </HoverHint>
            );
          })}
          <span
            aria-hidden
            className="self-stretch w-px mx-0.5"
            style={{ backgroundColor: "var(--color-border)" }}
          />
          {STATUS_FILTERS.map((f) => {
            const active = selectedFilters.has(f);
            return (
              <HoverHint key={f} hint={PROMPTS_TAB_HINTS[f]}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  onClick={() => onToggleFilter(f)}
                  aria-pressed={active}
                  className={
                    "px-3 py-1 rounded-[var(--radius-md)] transition-colors capitalize border whitespace-nowrap " +
                    (active
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "text-[var(--color-fg-secondary)] border-transparent hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{ fontSize: 18, fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.01em" }}
                >
                  {f === "uncited" ? "Not cited" : f}
                </motion.button>
              </HoverHint>
            );
          })}
        </div>
        <div className="justify-self-end inline-flex items-center gap-2">
          {!isDefaultSort && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={handleResetSort}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] transition-all"
              style={{
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
              }}
              title="Reset to default sort (Volume, highest first)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset sort
            </motion.button>
          )}
        </div>
      </div>

      {viewMode === "themes" ? (
        <div className="px-6 py-5">
          <PromptsByCluster selectedFilters={selectedFilters} />
        </div>
      ) : (
        <>
      {/* Branded warning (minimalist text). The sage-boxed AI summary that
          previously sat under it was removed per the page-wide AI-overview
          cleanup (2026-05-05). */}
      <div className="px-6 pt-4 pb-1 space-y-3">
        <BrandedCallout data={data} onSeeBranded={onSeeBranded} />
      </div>

      <div
        className="px-6 py-4 overflow-y-auto overflow-x-auto"
        style={{ maxHeight: 760 }}
      >
        <table
          className="w-full"
          style={{ fontSize: 13, tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: 30 }} />
            <col />
            <col style={{ width: 100 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 240 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead
            className="sticky top-0 z-10"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <tr
              style={{
                borderBottom: "2px solid rgba(60,62,60,0.22)",
              }}
            >
              <th className="py-2 pr-2 w-6"></th>
              <th className="py-2 pr-4">
                <span
                  className="inline-flex items-center font-semibold uppercase text-[var(--color-fg-muted)]"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Prompt
                </span>
              </th>
              <th className="py-2 pr-4">
                <SortableHeader label="Volume" column="volume" sort={sort} onSort={handleSort} onReset={handleResetSort} />
              </th>
              <th className="py-2 pr-4">
                <span
                  className="inline-flex items-center gap-1 font-semibold uppercase text-[var(--color-fg-muted)]"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Status
                  <HoverHint hint="Which AI engines mentioned your business in their answer.">
                    <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-70" />
                  </HoverHint>
                </span>
              </th>
              <th className="py-2 pr-4">
                <CitedFilterHeader
                  selectedFilters={selectedFilters}
                  onToggleFilter={onToggleFilter}
                />
              </th>
              <th className="py-2 pr-4">
                <BrandFilterHeader
                  selectedFilters={selectedFilters}
                  onToggleFilter={onToggleFilter}
                />
              </th>
              <th className="py-2 pr-4">
                <IntentFilterHeader
                  allIntents={allIntents}
                  selected={selectedIntents}
                  onApply={(next) => {
                    // If the user unselected everything, treat that as "all"
                    // so the table doesn't go empty (better UX than blank).
                    setSelectedIntents(next.size === 0 ? new Set(allIntents) : next);
                  }}
                />
              </th>
              <th className="py-2 pr-4">
                <div className="flex justify-end">
                  <SortableHeader label="Avg Rank" column="position" sort={sort} onSort={handleSort} onReset={handleResetSort} />
                </div>
              </th>
              <th className="py-2 pl-4">
                <div className="flex justify-end">
                  <SortableHeader label="Sentiment" column="sentiment" sort={sort} onSort={handleSort} onReset={handleResetSort} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, idx) => {
              const hits = Object.values(p.engineHits).filter(Boolean).length;
              const totalEngines = Object.keys(p.engineHits).length;
              const coveragePct = Math.round((hits / totalEngines) * 100);
              const bucket = sentimentBucket(p.sentiment);
              const sent = SENTIMENT_STYLE[bucket];
              const SentIcon = sent.Icon;
              const isOpen = !!expanded[p.id];

              return (
                <Fragment key={p.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.3,
                      ease: EASE,
                      delay: Math.min(idx * 0.02, 0.25),
                    }}
                    onClick={() => toggleRow(p.id)}
                    className="cursor-pointer hover:bg-[var(--color-surface-alt)]/40 transition-colors"
                    style={{
                      borderBottom: rowBorder,
                      // Branded distinction now lives in the dedicated
                      // Brand column; rows render with no special tint.
                      background: "transparent",
                    }}
                    aria-expanded={isOpen}
                  >
                    <td className="py-2 pr-2 align-middle">
                      <ChevronDown
                        className={
                          "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200 " +
                          (isOpen ? "rotate-180" : "")
                        }
                      />
                    </td>
                    {/* Prompt text — Inter 13, matches Personalized table */}
                    <td className="py-2.5 px-5">
                      <p
                        className="text-[var(--color-fg)] leading-snug"
                        style={{ fontSize: 13 }}
                      >
                        &ldquo;{p.text}&rdquo;
                      </p>
                    </td>
                    {/* Volume — tabular Inter 12 */}
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className="tabular-nums text-[var(--color-fg-secondary)]"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        {p.volume.toLocaleString()}
                      </span>
                    </td>
                    {/* Status — per-engine dot row. One small dot per AI
                        model (ChatGPT / Claude / Gemini / Google AI). Sage
                        if that engine cited the brand, faded if not. If
                        ZERO engines cited, the whole group goes rust on a
                        red-tinted pill so it reads as urgent. */}
                    <td className="py-2.5 px-4">
                      {(() => {
                        const engineIds = [
                          "chatgpt",
                          "claude",
                          "gemini",
                          "google_ai",
                        ] as const;
                        const hits = engineIds.map((e) => !!p.engineHits[e]);
                        const cited = hits.filter(Boolean).length;
                        const allMissed = cited === 0;
                        const lowCoverage = cited === 1;
                        const tone = allMissed
                          ? "rust"
                          : lowCoverage
                            ? "amber"
                            : "ok";
                        const TONE = {
                          rust: {
                            bg: "rgba(181,70,49,0.10)",
                            border: "transparent",
                            dot: "#B54631",
                            text: "#B54631",
                          },
                          amber: {
                            bg: "rgba(201,123,69,0.10)",
                            border: "transparent",
                            dotMissed: "rgba(107,109,107,0.3)",
                            text: "#A06210",
                          },
                        } as const;
                        return (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
                            style={{
                              backgroundColor:
                                tone === "rust"
                                  ? TONE.rust.bg
                                  : tone === "amber"
                                    ? TONE.amber.bg
                                    : "transparent",
                              border:
                                tone === "rust"
                                  ? `1px solid ${TONE.rust.border}`
                                  : tone === "amber"
                                    ? `1px solid ${TONE.amber.border}`
                                    : "1px solid transparent",
                            }}
                            title={
                              allMissed
                                ? "Zero AI engines cited you on this prompt — visibility leak"
                                : lowCoverage
                                  ? "Only 1 of 4 AI engines cited you — weak coverage"
                                  : `Cited by ${cited} of 4 AI engines`
                            }
                          >
                            {engineIds.map((e, i) => (
                              <span
                                key={e}
                                className="rounded-full"
                                style={{
                                  width: 7,
                                  height: 7,
                                  backgroundColor: allMissed
                                    ? "#B54631"
                                    : hits[i]
                                      ? "#7D8E6C"
                                      : "rgba(107,109,107,0.3)",
                                }}
                              />
                            ))}
                            {(allMissed || lowCoverage) && (
                              <span
                                className="uppercase tracking-wider"
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: allMissed
                                    ? TONE.rust.text
                                    : TONE.amber.text,
                                  letterSpacing: "0.08em",
                                  marginLeft: 2,
                                }}
                              >
                                {cited}/4
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    {/* Cited — same visual treatment as Status (4-dot pill),
                        but semantics are "did this engine include a LINK in
                        its answer?" rather than "did it mention you?". An
                        engine can mention you without linking — that's a
                        weaker citation. Synthesized deterministically from
                        prompt id + engine until real link data lands. */}
                    <td className="py-2.5 px-4">
                      {(() => {
                        const engineIds = [
                          "chatgpt",
                          "claude",
                          "gemini",
                          "google_ai",
                        ] as const;
                        const links = engineIds.map((e) =>
                          linkHit(p.id, e, !!p.engineHits[e]),
                        );
                        const linked = links.filter(Boolean).length;
                        const allMissed = linked === 0;
                        const lowCoverage = linked === 1;
                        return (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: allMissed
                                ? "rgba(181,70,49,0.10)"
                                : lowCoverage
                                  ? "rgba(201,123,69,0.10)"
                                  : "transparent",
                              border: "1px solid transparent",
                            }}
                            title={
                              allMissed
                                ? "Zero AI engines linked to you in their answer"
                                : lowCoverage
                                  ? "Only 1 of 4 AI engines linked to you"
                                  : `Linked by ${linked} of 4 AI engines`
                            }
                          >
                            {engineIds.map((e, i) => (
                              <span
                                key={e}
                                className="rounded-full"
                                style={{
                                  width: 7,
                                  height: 7,
                                  backgroundColor: allMissed
                                    ? "#B54631"
                                    : links[i]
                                      ? "#7D8E6C"
                                      : "rgba(107,109,107,0.3)",
                                }}
                              />
                            ))}
                            {(allMissed || lowCoverage) && (
                              <span
                                className="uppercase tracking-wider"
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: allMissed ? "#B54631" : "#A06210",
                                  letterSpacing: "0.08em",
                                  marginLeft: 2,
                                }}
                              >
                                {linked}/4
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    {/* Brand — own column. Compact sage pill if branded,
                        em-dash otherwise. Driven by p.type which the
                        existing data model already tracks. */}
                    <td className="py-2.5 px-4 text-center">
                      {p.type === "branded" ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: "#7D8E6C",
                            backgroundColor: "#7D8E6C1F",
                          }}
                          title="Prompt includes your brand name directly."
                        >
                          <span
                            className="rounded-full shrink-0"
                            style={{
                              width: 4,
                              height: 4,
                              backgroundColor: "#7D8E6C",
                            }}
                          />
                          Branded
                        </span>
                      ) : (
                        <span
                          className="text-[var(--color-fg-muted)]"
                          style={{ fontSize: 12 }}
                        >
                          —
                        </span>
                      )}
                    </td>
                    {/* Intent — single primary intent pill (branded lives
                        in its own column now). */}
                    <td className="py-2.5 px-4 text-center">
                      {(() => {
                        const id = primaryIntent(p.text);
                        const cat = PROMPT_CATEGORIES[id];
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: cat.color,
                              backgroundColor: `${cat.color}1F`,
                            }}
                            title={cat.description}
                          >
                            <span
                              className="rounded-full shrink-0"
                              style={{
                                width: 5,
                                height: 5,
                                backgroundColor: cat.color,
                              }}
                            />
                            {cat.label}
                          </span>
                        );
                      })()}
                    </td>
                    {/* Position — color-coded by tier (sage at #1, rust
                        at last). Lower rank = better. */}
                    <td className="py-2.5 px-4 text-right">
                      {p.position === null ? (
                        <span
                          className="text-[var(--color-fg-muted)]"
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            fontSize: 12,
                          }}
                        >
                          —
                        </span>
                      ) : (
                        (() => {
                          const r = p.position;
                          const color =
                            r <= 1.5
                              ? "#5E7250"
                              : r <= 2.5
                                ? "#7D8E6C"
                                : r <= 3.5
                                  ? "#7E6B17"
                                  : r <= 4.5
                                    ? "#A06210"
                                    : "#B54631";
                          return (
                            <span
                              className="inline-flex items-center justify-center tabular-nums rounded-md"
                              style={{
                                fontFamily: "ui-monospace, monospace",
                                fontSize: 12,
                                fontWeight: 700,
                                color,
                                backgroundColor: `${color}1F`,
                                padding: "2px 8px",
                                minWidth: 44,
                              }}
                              title="Avg rank when mentioned — lower is better"
                            >
                              #{r.toFixed(1)}
                            </span>
                          );
                        })()
                      )}
                    </td>
                    {/* Sentiment — compact pill, no icon */}
                    <td className="py-2.5 px-5 text-right">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: sent.color,
                          backgroundColor: sent.bg,
                        }}
                      >
                        {sent.label}
                      </span>
                    </td>
                  </motion.tr>
                  {isOpen && (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      style={{ borderBottom: rowBorder }}
                    >
                      <td
                        colSpan={9}
                        className="px-4 py-5"
                        style={{ backgroundColor: "rgba(150,162,131,0.06)" }}
                      >
                        <p
                          className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-3"
                          style={{ fontSize: 11, letterSpacing: "0.12em" }}
                        >
                          What AI said
                        </p>
                        <motion.div
                          initial="initial"
                          animate="animate"
                          transition={{ staggerChildren: 0.04, delayChildren: 0.05 }}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
                        >
                          {ENGINES.map((e) => {
                            const r = p.responses.find((x) => x.engine === e.id);
                            const cited = p.engineHits[e.id];
                            return (
                              <motion.div
                                key={e.id}
                                variants={{
                                  initial: { opacity: 0 },
                                  animate: { opacity: 1 },
                                }}
                                transition={{ duration: 0.3, ease: EASE }}
                                whileHover={{ y: -2 }}
                                className="rounded-md border bg-[var(--color-surface)] p-3 flex flex-col"
                                style={{
                                  borderColor: cited
                                    ? "rgba(150,162,131,0.45)"
                                    : "var(--color-border)",
                                  borderLeftWidth: 3,
                                  borderLeftColor: cited ? "#7D8E6C" : "rgba(181,70,49,0.4)",
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <EngineIcon id={e.id} size={14} />
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "var(--color-fg)",
                                      }}
                                    >
                                      {e.label}
                                    </span>
                                  </div>
                                  <span
                                    className="uppercase tabular-nums"
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      letterSpacing: "0.08em",
                                      color: cited ? "#5E7250" : TOK.loseText,
                                    }}
                                  >
                                    {cited ? "Cited" : "Missing"}
                                  </span>
                                </div>
                                <p
                                  className="text-[var(--color-fg-secondary)]"
                                  style={{ fontSize: 12, lineHeight: 1.5 }}
                                >
                                  {r?.excerpt ?? "No response captured."}
                                </p>
                                {!cited && (
                                  <a
                                    href="/audit"
                                    className="group inline-flex items-center gap-1 mt-auto pt-2 font-semibold transition-opacity hover:opacity-80"
                                    style={{
                                      fontSize: 11,
                                      color: TOK.amberFg,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Diagnose in GEO Audit
                                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                  </a>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </td>
                    </motion.tr>
                  )}
                </Fragment>
              );
            })}
            {/* Bottom CTA row — designed as a "ghost" preview of what
                the user's NEXT tracked prompt could look like. Plus icon
                + faded sample query on the left (italic, ~40% opacity),
                Add prompts label on the right. Whole row is the link to
                /prompt-research. */}
            <tr>
              <td colSpan={9} className="p-0">
                <motion.a
                  href="/prompt-research"
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-[var(--color-surface-alt)]/60 group"
                  style={{
                    fontFamily: "var(--font-sans)",
                    borderTop: "1px dashed var(--color-border)",
                  }}
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="inline-flex items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-110"
                      style={{
                        width: 22,
                        height: 22,
                        backgroundColor: "rgba(150,162,131,0.18)",
                        color: COLORS.primaryHover,
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    <span
                      className="truncate italic"
                      style={{
                        fontSize: 13,
                        color: "var(--color-fg-muted)",
                        opacity: 0.7,
                      }}
                    >
                      &ldquo;{teaserPrompt}&rdquo;
                    </span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 shrink-0 uppercase tracking-wider transition-colors group-hover:text-[var(--color-primary)]"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: COLORS.primaryHover,
                    }}
                  >
                    Add prompts
                  </span>
                </motion.a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer — row count + page-size selector */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[var(--color-border)] flex-wrap">
        <p
          className="text-[var(--color-fg-muted)]"
          style={{ fontSize: 12.5, fontFamily: "var(--font-sans)" }}
        >
          Showing{" "}
          <span style={{ color: "var(--color-fg)", fontWeight: 600 }}>
            {visible.length}
          </span>{" "}
          of{" "}
          <span style={{ color: "var(--color-fg)", fontWeight: 600 }}>
            {filtered.length}
          </span>{" "}
          prompts
          {truncated && (
            <span className="text-[var(--color-fg-muted)]">
              {" "}
              · scroll or expand below
            </span>
          )}
        </p>
        <div className="inline-flex items-center gap-2">
          <span
            className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
            style={{ fontSize: 11, letterSpacing: "0.08em", fontFamily: "var(--font-sans)" }}
          >
            Show
          </span>
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5 gap-0.5">
            {([20, 50, 100, "all"] as const).map((opt) => {
              const active = pageSize === opt;
              const label = opt === "all" ? "All" : String(opt);
              return (
                <motion.button
                  key={String(opt)}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  onClick={() => setPageSize(opt)}
                  aria-pressed={active}
                  className={
                    "px-3 py-1 rounded-[var(--radius-sm)] transition-colors " +
                    (active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{
                    fontSize: 12.5,
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
        </>
      )}

    </section>
  );
}

// ─── AI SUMMARY STRIP ──────────────────────────────────────────────────────
// Compact two-line callout used at the top of mid-page cards. Surfaces one
// thing that's working + one thing to fix. Fix row gets a soft red tint per
// the rule: "color the area for improvement slightly red."

function AISummaryStrip({
  good,
  fix,
  className = "",
}: {
  good: React.ReactNode;
  fix: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] px-4 py-3 ${className}`}
      style={{
        borderLeft: `3px solid ${COLORS.primary}`,
        backgroundColor: TOK.primarySoftBg,
      }}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <Sparkles
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: COLORS.primary }}
        />
        <p
          className="uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold"
          style={{ fontSize: 11, letterSpacing: "0.12em" }}
        >
          AI summary
        </p>
      </div>
      <p
        className="text-[var(--color-fg)]"
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: "var(--font-sans)",
        }}
      >
        {good} <span style={{ color: TOK.loseText }}>{fix}</span>
      </p>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = endAngle - startAngle;
  const adj = sweep >= 360 ? 359.999 : sweep;
  const adjustedEnd = startAngle + adj;
  const so = polarToCartesian(cx, cy, outerR, adjustedEnd);
  const eo = polarToCartesian(cx, cy, outerR, startAngle);
  const si = polarToCartesian(cx, cy, innerR, adjustedEnd);
  const ei = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = adj <= 180 ? 0 : 1;
  return [
    "M", so.x, so.y,
    "A", outerR, outerR, 0, largeArc, 0, eo.x, eo.y,
    "L", ei.x, ei.y,
    "A", innerR, innerR, 0, largeArc, 1, si.x, si.y,
    "Z",
  ].join(" ");
}

function CoverageDonut({ items }: { items: IntentCoverage[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = items.reduce((sum, i) => sum + i.promptCount, 0);
  const totalVolume = items.reduce((sum, i) => sum + i.volumeMonthly, 0);

  let cum = 0;
  const slices = items.map((item) => {
    const angle = (item.promptCount / total) * 360;
    const slice = {
      ...item,
      startAngle: cum,
      endAngle: cum + angle,
      midAngle: cum + angle / 2,
      color: INTENT_COLORS[item.intent] ?? "#888",
    };
    cum += angle;
    return slice;
  });

  const cx = 140;
  const cy = 140;
  const innerR = 78;
  const outerR = 115;

  const hoveredSlice = slices.find((s) => s.intent === hovered);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-5 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading
            text="Coverage by intent"
            info="How well you're cited across each user-intent category — informational, local, comparison, use-case, and transactional queries."
          />
          <span className="text-[var(--color-fg-muted)]" style={{ fontSize: 12 }}>
            {fmtVolume(totalVolume)} /mo · {total} prompts
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-6 items-center">
        {/* Donut */}
        <div className="flex justify-center">
          <svg viewBox="0 0 280 280" width={280} height={280}>
            {slices.map((s) => {
              const isHovered = hovered === s.intent;
              const isDimmed = hovered !== null && !isHovered;
              const offset = polarToCartesian(0, 0, isHovered ? 8 : 0, s.midAngle);
              return (
                <path
                  key={s.intent}
                  d={describeArc(cx, cy, innerR, outerR, s.startAngle, s.endAngle)}
                  fill={s.color}
                  onMouseEnter={() => setHovered(s.intent)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: "pointer",
                    opacity: isDimmed ? 0.32 : 1,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    transition: "opacity 180ms ease, transform 180ms ease",
                  }}
                />
              );
            })}
            {hoveredSlice ? (
              <>
                <text
                  x={cx}
                  y={cy - 32}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    fill: hoveredSlice.color,
                    letterSpacing: "0.1em",
                  }}
                >
                  {hoveredSlice.intent.toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={cy + 6}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 44,
                    fontWeight: 600,
                    fill: "var(--color-fg)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {hoveredSlice.coveragePct}%
                </text>
                <text
                  x={cx}
                  y={cy + 26}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  covered · #{hoveredSlice.avgPosition.toFixed(1)} avg
                </text>
                <text
                  x={cx}
                  y={cy + 42}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  {fmtVolume(hoveredSlice.volumeMonthly)}/mo · {hoveredSlice.positiveSentimentPct}% pos
                </text>
              </>
            ) : (
              <>
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 50,
                    fontWeight: 600,
                    fill: "var(--color-fg)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {total}
                </text>
                <text
                  x={cx}
                  y={cy + 18}
                  textAnchor="middle"
                  style={{
                    fontSize: 11,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  prompts tracked
                </text>
                <text
                  x={cx}
                  y={cy + 34}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  {fmtVolume(totalVolume)}/mo searches
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Interactive list */}
        <div className="space-y-1.5">
          {slices.map((s) => {
            const isHovered = hovered === s.intent;
            const isDimmed = hovered !== null && !isHovered;
            const deltaType =
              s.coverageDelta > 0
                ? "increase"
                : s.coverageDelta < 0
                ? "decrease"
                : "neutral";
            return (
              <div
                key={s.intent}
                onMouseEnter={() => setHovered(s.intent)}
                onMouseLeave={() => setHovered(null)}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer transition-all"
                style={{
                  backgroundColor: isHovered ? "rgba(0,0,0,0.04)" : "transparent",
                  opacity: isDimmed ? 0.4 : 1,
                }}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <div className="min-w-0">
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      color: "var(--color-fg)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s.intent}
                  </p>
                  <p
                    className="text-[var(--color-fg-muted)] mt-0.5"
                    style={{ fontSize: 11 }}
                  >
                    {s.promptCount} prompts · {fmtVolume(s.volumeMonthly)}/mo · #{s.avgPosition.toFixed(1)} avg · {s.positiveSentimentPct}% pos
                  </p>
                </div>
                <span
                  className="tabular-nums text-right"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                    letterSpacing: "-0.02em",
                    minWidth: 60,
                  }}
                >
                  {s.coveragePct}%
                </span>
                {s.coverageDelta !== 0 ? (
                  <DeltaPill
                    deltaType={deltaType}
                    value={`${Math.abs(s.coverageDelta).toFixed(1)}%`}
                  />
                ) : (
                  <span style={{ minWidth: 64 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
        <CtaLink
          icon={Target}
          label="Audit your weakest intents to win them back"
          href="/audit"
        />
      </div>
    </section>
  );
}

// ─── PROMPT HIGHLIGHTS (BEST PERFORMING + FLAGGED) ─────────────────────────

interface HighlightItem {
  prompt: PromptRow;
  /** Short uppercase reason chip — e.g., "Branded miss". */
  reasonTag: string;
  /** One-line caption explaining why the engine surfaced this prompt. */
  reasonCaption: string;
}

/**
 * Derive the three best-performing and three flagged prompts from the full
 * prompts array. Each gets a short tag + caption telling the user why the
 * engine selected it. Selection is rule-based — we walk a priority list and
 * skip duplicates so the same prompt never lands in both columns.
 */
function derivePromptHighlights(prompts: PromptRow[]): {
  best: HighlightItem[];
  flagged: HighlightItem[];
} {
  const coverage = (p: PromptRow) => {
    const total = Object.keys(p.engineHits).length;
    const hits = Object.values(p.engineHits).filter(Boolean).length;
    return total === 0 ? 0 : hits / total;
  };

  const used = new Set<string>();
  const take = <T extends { prompt: PromptRow }>(list: T[], limit: number) => {
    const out: T[] = [];
    for (const item of list) {
      if (used.has(item.prompt.id)) continue;
      out.push(item);
      used.add(item.prompt.id);
      if (out.length >= limit) break;
    }
    return out;
  };

  // ── Flagged candidates (priority order) ───────────────────────────────
  // 1. Branded prompt with any engine missing — your own brand should be
  //    everywhere; even one miss is a credibility leak.
  const brandedMisses: HighlightItem[] = prompts
    .filter((p) => p.type === "branded" && coverage(p) < 1)
    .sort((a, b) => coverage(a) - coverage(b))
    .map((p) => ({
      prompt: p,
      reasonTag: "Branded miss",
      reasonCaption:
        "Your own brand query — every engine should mention you, but at least one didn't.",
    }));

  // 2. High-volume prompt with low coverage — biggest traffic loss.
  const highVolumeMisses: HighlightItem[] = prompts
    .filter((p) => p.volume >= 4000 && coverage(p) <= 0.5)
    .sort((a, b) => b.volume - a.volume)
    .map((p) => ({
      prompt: p,
      reasonTag: "High-volume miss",
      reasonCaption: `${p.volume.toLocaleString()} searches/month and you're cited in ${Math.round(
        coverage(p) * 100,
      )}% of engines — major traffic leak.`,
    }));

  // 3. Negative or weak sentiment when cited.
  const weakSentiment: HighlightItem[] = prompts
    .filter((p) => p.sentiment <= 0.25 && coverage(p) > 0)
    .sort((a, b) => a.sentiment - b.sentiment)
    .map((p) => ({
      prompt: p,
      reasonTag: "Weak sentiment",
      reasonCaption:
        "AI mentions you but the framing is neutral or critical — coverage without conviction.",
    }));

  // 4. Worst average rank when cited.
  const poorRank: HighlightItem[] = prompts
    .filter((p) => p.position !== null && p.position >= 3)
    .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
    .map((p) => ({
      prompt: p,
      reasonTag: "Low rank",
      reasonCaption: `When AI does mention you, you average #${p.position?.toFixed(
        1,
      )} — competitors are getting top placement.`,
    }));

  const flagged = [
    ...take(brandedMisses, 1),
    ...take(highVolumeMisses, 1),
    ...take(weakSentiment, 1),
    ...take(poorRank, 1),
  ].slice(0, 3);

  // ── Best-performing candidates (priority order) ──────────────────────
  // 1. 100% engine coverage AND #1 rank — the gold standard.
  const perfect: HighlightItem[] = prompts
    .filter((p) => coverage(p) >= 1 && (p.position ?? 99) <= 1.5)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((p) => ({
      prompt: p,
      reasonTag: "Top tier",
      reasonCaption:
        "Cited by every engine and ranked #1 — you own this prompt outright.",
    }));

  // 2. 100% coverage on a high-volume prompt — even if not #1.
  const fullCoverHighVol: HighlightItem[] = prompts
    .filter((p) => coverage(p) >= 1 && p.volume >= 1500)
    .sort((a, b) => b.volume - a.volume)
    .map((p) => ({
      prompt: p,
      reasonTag: "Full coverage",
      reasonCaption: `Cited by all 4 engines on a ${p.volume.toLocaleString()} searches/month query — strong distribution.`,
    }));

  // 3. Strong rank (#1) with decent coverage — wins against competitors.
  const topRanked: HighlightItem[] = prompts
    .filter((p) => p.position !== null && p.position <= 1.5 && coverage(p) >= 0.5)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((p) => ({
      prompt: p,
      reasonTag: "Ranked #1",
      reasonCaption: `Average rank ${p.position?.toFixed(
        1,
      )} when cited — you're the named answer, not the runner-up.`,
    }));

  const best = [
    ...take(perfect, 1),
    ...take(fullCoverHighVol, 1),
    ...take(topRanked, 1),
  ].slice(0, 3);

  return { best, flagged };
}

/**
 * Mini prompts-table mirroring the main PromptsTable structure: same columns
 * (Prompt, Volume, Intent, Coverage, Position, Sentiment) and the same
 * expand-row "What AI said" engine grid. Used twice — once for best-performing
 * picks, once for flagged picks. Each row gets a small reason chip + caption
 * showing why the engine selected it.
 */
function HighlightsTable({
  title,
  info,
  variant,
  items,
  emptyText,
  footerCta,
}: {
  title: string;
  info: string;
  variant: "best" | "flagged";
  items: HighlightItem[];
  emptyText: string;
  footerCta: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    href: string;
  };
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const PAGE_OPTIONS = [3, 10, "all"] as const;
  type PageOption = (typeof PAGE_OPTIONS)[number];
  const [pageSize, setPageSize] = useState<PageOption>(3);
  const visibleItems =
    pageSize === "all" ? items : items.slice(0, pageSize as number);

  const palette =
    variant === "best"
      ? {
          tagBg: "rgba(150,162,131,0.18)",
          tagFg: "#5E7250",
          tagBorder: "rgba(150,162,131,0.45)",
        }
      : {
          tagBg: "rgba(201,123,69,0.16)",
          tagFg: TOK.amberFg,
          tagBorder: "rgba(201,123,69,0.4)",
        };

  const rowBorder = "1.5px solid rgba(60,62,60,0.18)";

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full">
      {/* Header — mirrors PromptsTable header style */}
      <div className="flex items-center px-5 py-4 border-b border-[var(--color-border)]">
        <SectionHeading text={title} info={info} />
      </div>

      {/* Table — no horizontal scroll. Cells, dots and pills are sized
          to fit a 50/50 grid layout without overflow. */}
      <div className="px-2 py-2 flex-1">
        {items.length === 0 ? (
          <p
            className="text-[var(--color-fg-muted)] py-6 text-center"
            style={{ fontSize: 13 }}
          >
            {emptyText}
          </p>
        ) : (
          <table
            className="w-full"
            style={{ fontSize: 12, tableLayout: "fixed" }}
          >
            {/* Strict per-column widths so the table can never overflow the
                50/50 grid card. Prompt absorbs leftover space; data cols
                get just enough room for their compacted contents. */}
            <colgroup>
              <col style={{ width: 18 }} />
              <col />
              <col style={{ width: 50 }} />
              <col style={{ width: 56 }} />
              <col style={{ width: 56 }} />
              <col style={{ width: 64 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 50 }} />
              <col style={{ width: 64 }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(60,62,60,0.22)" }}>
                <th className="w-4" />
                {(
                  [
                    { label: "Prompt", align: "left" as const },
                    { label: "Vol", align: "right" as const },
                    { label: "Status", align: "center" as const },
                    { label: "Cited", align: "center" as const },
                    { label: "Brand", align: "center" as const },
                    { label: "Intent", align: "center" as const },
                    { label: "Rank", align: "right" as const },
                    { label: "Sent", align: "right" as const },
                  ]
                ).map(({ label, align }) => (
                  <th
                    key={label}
                    className={
                      "py-2 px-1 uppercase tracking-wider text-[var(--color-fg-muted)] " +
                      (align === "right"
                        ? "text-right"
                        : align === "center"
                          ? "text-center"
                          : "text-left")
                    }
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, idx) => {
                const p = item.prompt;
                const hits = Object.values(p.engineHits).filter(Boolean).length;
                const totalEngines = Object.keys(p.engineHits).length;
                const coveragePct = Math.round((hits / totalEngines) * 100);
                const bucket = sentimentBucket(p.sentiment);
                const sent = SENTIMENT_STYLE[bucket];
                const SentIcon = sent.Icon;
                const isOpen = !!expanded[p.id];

                return (
                  <Fragment key={p.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.3,
                        ease: EASE,
                        delay: Math.min(idx * 0.04, 0.2),
                      }}
                      onClick={() => toggleRow(p.id)}
                      className="cursor-pointer hover:bg-[var(--color-surface-alt)]/40 transition-colors"
                      style={{ borderBottom: rowBorder }}
                      aria-expanded={isOpen}
                    >
                      <td className="py-2 pl-2 pr-0.5 align-middle">
                        <ChevronDown
                          className={
                            "h-3.5 w-3.5 text-[var(--color-fg-muted)] transition-transform duration-200 " +
                            (isOpen ? "rotate-180" : "")
                          }
                        />
                      </td>
                      <td className="py-2 pl-1 pr-2 align-middle">
                        {/* Reason chip stacked ABOVE the prompt so the
                            prompt column doesn't have to share its width
                            with the chip — gives the quoted text full
                            row width and prevents overflow. */}
                        <span
                          className="inline-flex items-center px-1.5 py-px rounded-full font-semibold uppercase whitespace-nowrap mb-1"
                          style={{
                            fontSize: 8.5,
                            letterSpacing: "0.06em",
                            backgroundColor: palette.tagBg,
                            color: palette.tagFg,
                            border: `1px solid ${palette.tagBorder}`,
                          }}
                        >
                          {item.reasonTag}
                        </span>
                        <p
                          className="text-[var(--color-fg)] leading-snug truncate"
                          style={{ fontSize: 12 }}
                        >
                          &ldquo;{p.text}&rdquo;
                        </p>
                      </td>
                      <td className="py-2 px-1 text-right align-middle">
                        <span
                          className="tabular-nums text-[var(--color-fg-secondary)]"
                          style={{ fontSize: 11, fontWeight: 600 }}
                        >
                          {p.volume.toLocaleString()}
                        </span>
                      </td>
                      {/* Status — per-engine dot row (mention). Compacted. */}
                      <td className="py-2 px-1 align-middle">
                        {(() => {
                          const engineIds = [
                            "chatgpt",
                            "claude",
                            "gemini",
                            "google_ai",
                          ] as const;
                          const hitsArr = engineIds.map(
                            (e) => !!p.engineHits[e],
                          );
                          const cited = hitsArr.filter(Boolean).length;
                          const allMissed = cited === 0;
                          const lowCoverage = cited === 1;
                          return (
                            <div
                              className="inline-flex items-center gap-1 px-1 py-0.5 rounded-full"
                              style={{
                                backgroundColor: allMissed
                                  ? "rgba(181,70,49,0.10)"
                                  : lowCoverage
                                    ? "rgba(201,123,69,0.10)"
                                    : "transparent",
                              }}
                            >
                              {engineIds.map((e, i) => (
                                <span
                                  key={e}
                                  className="rounded-full"
                                  style={{
                                    width: 5,
                                    height: 5,
                                    backgroundColor: allMissed
                                      ? "#B54631"
                                      : hitsArr[i]
                                        ? "#7D8E6C"
                                        : "rgba(107,109,107,0.3)",
                                  }}
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      {/* Cited — per-engine link presence. */}
                      <td className="py-2 px-1 align-middle">
                        {(() => {
                          const engineIds = [
                            "chatgpt",
                            "claude",
                            "gemini",
                            "google_ai",
                          ] as const;
                          const links = engineIds.map((e) =>
                            linkHit(p.id, e, !!p.engineHits[e]),
                          );
                          const linked = links.filter(Boolean).length;
                          const allMissed = linked === 0;
                          const lowCoverage = linked === 1;
                          return (
                            <div
                              className="inline-flex items-center gap-1 px-1 py-0.5 rounded-full"
                              style={{
                                backgroundColor: allMissed
                                  ? "rgba(181,70,49,0.10)"
                                  : lowCoverage
                                    ? "rgba(201,123,69,0.10)"
                                    : "transparent",
                              }}
                            >
                              {engineIds.map((e, i) => (
                                <span
                                  key={e}
                                  className="rounded-full"
                                  style={{
                                    width: 5,
                                    height: 5,
                                    backgroundColor: allMissed
                                      ? "#B54631"
                                      : links[i]
                                        ? "#7D8E6C"
                                        : "rgba(107,109,107,0.3)",
                                  }}
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      {/* Branded — single sage dot if branded, em-dash
                          otherwise. The narrowest possible representation
                          to keep the column at 56px. */}
                      <td className="py-2 px-1 text-center align-middle">
                        {p.type === "branded" ? (
                          <span
                            className="inline-block rounded-full"
                            style={{
                              width: 8,
                              height: 8,
                              backgroundColor: "#7D8E6C",
                            }}
                            title="Branded prompt"
                          />
                        ) : (
                          <span
                            className="text-[var(--color-fg-muted)]"
                            style={{ fontSize: 11 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      {/* Intent — pill compacted: smaller font, tighter padding. */}
                      <td className="py-2 px-1 text-center align-middle">
                        {(() => {
                          const intentId = primaryIntent(p.text);
                          const cat = PROMPT_CATEGORIES[intentId];
                          return (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px whitespace-nowrap"
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: cat.color,
                                backgroundColor: `${cat.color}1F`,
                                maxWidth: "100%",
                              }}
                              title={cat.description}
                            >
                              <span
                                className="rounded-full shrink-0"
                                style={{
                                  width: 4,
                                  height: 4,
                                  backgroundColor: cat.color,
                                }}
                              />
                              <span className="truncate">{cat.label}</span>
                            </span>
                          );
                        })()}
                      </td>
                      {/* Avg Rank — compacted color-coded pill. */}
                      <td className="py-2 px-1 text-right align-middle">
                        {p.position === null ? (
                          <span
                            className="text-[var(--color-fg-muted)]"
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontSize: 11,
                            }}
                          >
                            —
                          </span>
                        ) : (
                          (() => {
                            const r = p.position;
                            const color =
                              r <= 1.5
                                ? "#5E7250"
                                : r <= 2.5
                                  ? "#7D8E6C"
                                  : r <= 3.5
                                    ? "#7E6B17"
                                    : r <= 4.5
                                      ? "#A06210"
                                      : "#B54631";
                            return (
                              <span
                                className="inline-flex items-center justify-center tabular-nums rounded-md"
                                style={{
                                  fontFamily: "ui-monospace, monospace",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color,
                                  backgroundColor: `${color}1F`,
                                  padding: "1px 5px",
                                  minWidth: 36,
                                }}
                              >
                                #{r.toFixed(1)}
                              </span>
                            );
                          })()
                        )}
                      </td>
                      {/* Sentiment — abbreviated pill (Pos/Neu/Neg) so the
                          column fits in 64px without overflow. */}
                      <td className="py-2 px-1 text-right align-middle">
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-px"
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: sent.color,
                            backgroundColor: sent.bg,
                          }}
                          title={sent.label}
                        >
                          {sent.label.slice(0, 3)}
                        </span>
                      </td>
                    </motion.tr>

                    {isOpen && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        style={{ borderBottom: rowBorder }}
                      >
                        <td
                          colSpan={9}
                          className="px-4 py-4"
                          style={{ backgroundColor: "rgba(150,162,131,0.06)" }}
                        >
                          {/* Why it was selected */}
                          <p
                            className="text-[var(--color-fg-secondary)] mb-3"
                            style={{ fontSize: 12.5, lineHeight: 1.5 }}
                          >
                            <span
                              className="uppercase font-semibold mr-1.5"
                              style={{
                                fontSize: 10,
                                letterSpacing: "0.1em",
                                color: palette.tagFg,
                              }}
                            >
                              Why this is {variant === "best" ? "winning" : "flagged"}:
                            </span>
                            {item.reasonCaption}
                          </p>

                          <p
                            className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-2"
                            style={{ fontSize: 10.5, letterSpacing: "0.12em" }}
                          >
                            What AI said
                          </p>
                          <motion.div
                            initial="initial"
                            animate="animate"
                            transition={{
                              staggerChildren: 0.04,
                              delayChildren: 0.05,
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
                          >
                            {ENGINES.map((e) => {
                              const r = p.responses.find((x) => x.engine === e.id);
                              const cited = p.engineHits[e.id];
                              return (
                                <motion.div
                                  key={e.id}
                                  variants={{
                                    initial: { opacity: 0 },
                                    animate: { opacity: 1 },
                                  }}
                                  transition={{ duration: 0.3, ease: EASE }}
                                  whileHover={{ y: -2 }}
                                  className="rounded-md border bg-[var(--color-surface)] p-2.5 flex flex-col"
                                  style={{
                                    borderColor: cited
                                      ? "rgba(150,162,131,0.45)"
                                      : "var(--color-border)",
                                    borderLeftWidth: 3,
                                    borderLeftColor: cited
                                      ? "#7D8E6C"
                                      : "rgba(181,70,49,0.4)",
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <EngineIcon id={e.id} size={12} />
                                      <span
                                        style={{
                                          fontSize: 11.5,
                                          fontWeight: 600,
                                          color: "var(--color-fg)",
                                        }}
                                      >
                                        {e.label}
                                      </span>
                                    </div>
                                    <span
                                      className="uppercase tabular-nums"
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: "0.08em",
                                        color: cited ? "#5E7250" : TOK.loseText,
                                      }}
                                    >
                                      {cited ? "Cited" : "Missing"}
                                    </span>
                                  </div>
                                  <p
                                    className="text-[var(--color-fg-secondary)]"
                                    style={{ fontSize: 11.5, lineHeight: 1.45 }}
                                  >
                                    {r?.excerpt ?? "No response captured."}
                                  </p>
                                  {!cited && (
                                    <a
                                      href="/audit"
                                      className="group inline-flex items-center gap-1 mt-auto pt-1.5 font-semibold transition-opacity hover:opacity-80"
                                      style={{
                                        fontSize: 10.5,
                                        color: TOK.amberFg,
                                        fontWeight: 600,
                                      }}
                                    >
                                      Diagnose in GEO Audit
                                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                    </a>
                                  )}
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer — CTA on left, SHOW cluster on right */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--color-border)]">
        <CtaLink
          icon={footerCta.icon}
          label={footerCta.label}
          href={footerCta.href}
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.08em", fontFamily: "var(--font-sans)" }}
          >
            Show
          </span>
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5 gap-0.5">
            {PAGE_OPTIONS.map((opt) => {
              const active = pageSize === opt;
              const label = opt === "all" ? "All" : String(opt);
              return (
                <button
                  key={opt}
                  onClick={() => setPageSize(opt)}
                  className={
                    "px-2.5 py-0.5 rounded transition-colors font-medium " +
                    (active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{ fontSize: 12, fontFamily: "var(--font-sans)", cursor: active ? "default" : "pointer" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function BestPerformingPromptsCard({ items }: { items: HighlightItem[] }) {
  return (
    <HighlightsTable
      title="Best performing prompts"
      info="Where you're winning right now — full engine coverage, top rank, or both."
      variant="best"
      items={items}
      emptyText="No prompts hit the win threshold this period."
      footerCta={{
        icon: CheckCircle2,
        label: "Replicate these patterns on weaker prompts",
        href: "/audit",
      }}
    />
  );
}

function FlaggedPromptsCard({ items }: { items: HighlightItem[] }) {
  return (
    <HighlightsTable
      title="Flagged prompts"
      info="Prompts that need attention — branded misses, high-volume gaps, weak sentiment, or low rank."
      variant="flagged"
      items={items}
      emptyText="No prompts crossed the flag thresholds this period."
      footerCta={{
        icon: AlertTriangle,
        label: "Diagnose these gaps in a GEO audit",
        href: "/audit",
      }}
    />
  );
}

// ─── CITATION SOURCES ──────────────────────────────────────────────────────

const CITATION_SOURCE_COLORS: Record<string, string> = {
  "Your site": "#7D8E6C", // sage growth — the "you" color
  Wikipedia: "#5C6770", // slate dark — encyclopedic
  Reddit: "#C44536", // red — Reddit-flavored, palette-compatible
  "Industry blogs": "#C9A845", // mustard — editorial
  "News articles": "#7A8FA6", // slate blue — news
  Other: "rgba(60,62,60,0.40)", // muted gray
};

function CitationSourcesCard({ items }: { items: CitationSource[] }) {
  const max = Math.max(...items.map((i) => i.pct));
  const sorted = [...items].sort((a, b) => b.pct - a.pct);
  const top = sorted[0];
  // Lowest non-trivial source is the gap to close.
  const fixSource = sorted[sorted.length - 1];

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-3 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading
            text="Citation sources"
            info="Where AI pulls the content it uses to mention you. Your own site should lead."
          />
          <a
            href="/citation-insights"
            className="inline-flex items-center gap-1 font-medium hover:underline whitespace-nowrap"
            style={{ fontSize: 12.5, color: COLORS.primaryHover }}
          >
            Citation Insights
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {sorted.map((s) => {
          const widthPct = (s.pct / max) * 100;
          return (
            <div key={s.source} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
              <span
                className="truncate"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  color: "var(--color-fg)",
                  letterSpacing: "-0.01em",
                }}
              >
                {s.source}
              </span>
              <div className="relative h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor:
                      CITATION_SOURCE_COLORS[s.source] ?? COLORS.primary,
                  }}
                />
              </div>
              <span
                className="tabular-nums text-[var(--color-fg-secondary)]"
                style={{ fontSize: 13, fontWeight: 600, minWidth: 56, textAlign: "right" }}
              >
                {s.pct}% · {s.count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
        <CtaLink
          icon={Link2}
          label="Strengthen your citations with content fixes"
          href="/audit"
        />
      </div>
    </section>
  );
}

// ─── SENTIMENT BY PROMPT TYPE ──────────────────────────────────────────────

function SentimentByTypeCard({ items }: { items: SentimentByType[] }) {
  const sorted = [...items].sort((a, b) => b.positive - a.positive);
  const best = sorted[0];
  // Worst = highest negative% (or fall back to lowest positive%).
  const fixCandidate =
    [...items].sort((a, b) => b.negative - a.negative)[0] ??
    sorted[sorted.length - 1];

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-3 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading
            text="Sentiment by prompt type"
            info="How AI describes you across different intent categories — positive, neutral, negative."
          />
          <a
            href="/sentiment"
            className="inline-flex items-center gap-1 font-medium hover:underline whitespace-nowrap"
            style={{ fontSize: 12.5, color: COLORS.primaryHover }}
          >
            Brand Sentiment
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {sorted.map((row) => {
          const intentColor = INTENT_COLORS[row.type] ?? "#888";
          return (
          <div
            key={row.type}
            className="grid grid-cols-[140px_1fr_auto] items-center gap-3"
          >
            <span
              className="inline-flex items-center gap-1 rounded-full whitespace-nowrap"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: intentColor,
                backgroundColor: `${intentColor}1F`,
                padding: "3px 8px 3px 6px",
                maxWidth: "100%",
              }}
              title={`${row.positive}% positive · ${row.neutral}% neutral · ${row.negative}% negative`}
            >
              <span
                className="rounded-full shrink-0"
                style={{ width: 5, height: 5, backgroundColor: intentColor }}
              />
              <span className="truncate">{row.type}</span>
            </span>
            <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-border)]">
              <div
                style={{
                  width: `${row.positive}%`,
                  backgroundColor: COLORS.primary,
                }}
                title={`Positive ${row.positive}%`}
              />
              <div
                style={{
                  width: `${row.neutral}%`,
                  backgroundColor: "rgba(60,62,60,0.18)",
                }}
                title={`Neutral ${row.neutral}%`}
              />
              <div
                style={{
                  width: `${row.negative}%`,
                  backgroundColor: "rgba(181,70,49,0.65)",
                }}
                title={`Negative ${row.negative}%`}
              />
            </div>
            <span
              className="tabular-nums text-[var(--color-fg-secondary)]"
              style={{ fontSize: 13, fontWeight: 600, minWidth: 56, textAlign: "right" }}
            >
              {row.total} mentions
            </span>
          </div>
        ); })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
        <CtaLink
          icon={Smile}
          label="Improve negative sentiment with rewrites"
          href="/audit"
        />
      </div>
    </section>
  );
}

// ─── CHUNK 3 — INSIGHT CARDS (gradient header + sub-cards + accent CTA) ───

const INSIGHT_ICON: Record<
  InsightIconKey,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  crown: Crown,
  "trend-up": TrendingUp,
  check: CheckCircle2,
  target: Target,
  "trend-down": TrendingDown,
  alert: AlertTriangle,
};

interface InsightCardProps {
  variant: "wins" | "concerns";
  tag: string;
  title: string;
  summary: string;
  items: InsightItemData[];
}

const INSIGHT_PAGE_SIZE = 3;

function InsightNavArrow({
  dir,
  onClick,
  disabled,
}: {
  dir: "up" | "down";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  const wrapperPad = dir === "up" ? "pt-2 pb-1" : "pt-1 pb-2";
  return (
    <div className={`flex justify-center ${wrapperPad}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={dir === "up" ? "Show previous" : "Show next"}
        className={
          "rounded-full p-1 transition-colors " +
          (disabled
            ? "text-[var(--color-border)] cursor-default"
            : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] cursor-pointer")
        }
      >
        <Icon className="h-5 w-5" />
      </button>
    </div>
  );
}

function InsightCard({ variant, tag, title, summary, items }: InsightCardProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / INSIGHT_PAGE_SIZE));
  const visibleItems = items.slice(
    page * INSIGHT_PAGE_SIZE,
    page * INSIGHT_PAGE_SIZE + INSIGHT_PAGE_SIZE,
  );

  const palette =
    variant === "wins"
      ? {
          accent: COLORS.primary,
          accentText: TOK.greenFg,
          gradient:
            "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.04) 100%)",
          tileBg: "rgba(150,162,131,0.20)",
          HeaderIcon: Sparkles,
        }
      : {
          accent: "#C97B45",
          accentText: TOK.amberFg,
          gradient:
            "linear-gradient(135deg, rgba(199,123,69,0.20) 0%, rgba(199,123,69,0.03) 100%)",
          tileBg: "rgba(199,123,69,0.18)",
          HeaderIcon: AlertTriangle,
        };
  const HeaderIcon = palette.HeaderIcon;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full overflow-hidden">
      {/* Gradient header */}
      <div
        className="p-5"
        style={{
          background: palette.gradient,
          borderLeft: `4px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <HeaderIcon className="h-4 w-4 shrink-0" style={{ color: palette.accent }} />
          <p
            className="uppercase font-semibold"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: palette.accentText }}
          >
            {tag}
          </p>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 500,
            color: "var(--color-fg)",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h3>
        <p
          className="mt-1.5 text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {summary}
        </p>
      </div>

      {/* Sub-cards with up/down arrow paging */}
      <div className="flex-1 flex flex-col px-4 pb-2">
        <InsightNavArrow
          dir="up"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        />

        <motion.div
          key={page}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="space-y-3"
        >
          {visibleItems.map((item, idx) => {
            const ItemIcon = INSIGHT_ICON[item.iconKey];
            return (
              <div
                key={idx}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex items-start gap-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors"
              >
                <div
                  className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: palette.tileBg }}
                >
                  <ItemIcon className="h-4 w-4" style={{ color: palette.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      fontWeight: 500,
                      color: "var(--color-fg)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[var(--color-fg-muted)] mt-1"
                    style={{ fontSize: 12.5, lineHeight: 1.5 }}
                  >
                    {item.description}
                  </p>
                  <a
                    href={item.cta.href}
                    className="group inline-flex items-center gap-1 mt-2 font-semibold transition-opacity hover:opacity-80"
                    style={{ fontSize: 12.5, color: palette.accentText }}
                  >
                    {item.cta.label}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </motion.div>

        <InsightNavArrow
          dir="down"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        />
      </div>
    </section>
  );
}

// ─── FILTER PIPELINE ───────────────────────────────────────────────────────
// Recomputes hits, coverage, deltas, and per-engine breakdowns from the base
// dataset given the current range pill + engine chip selection. Mock data, but
// the shape mirrors what the live /api/scan response will produce.

const RANGE_DELTA_FACTOR: Record<Range, number> = {
  "14d": 0.4,
  "30d": 0.7,
  "90d": 1,
  YTD: 1.5,
  All: 2.2,
  custom: 1,
};

function applyFilters(
  base: PromptsData,
  range: Range,
  engines: Set<string>,
): PromptsData {
  const allEngines = ENGINES.map((e) => e.id);
  const enabled = engines.size === 0 ? new Set(allEngines) : engines;
  const allEnginesActive = enabled.size === allEngines.length;
  const factor = RANGE_DELTA_FACTOR[range] ?? 1;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  // Filter prompts: each prompt's engineHits/responses are restricted to
  // enabled engines; position becomes null if no enabled engine cited it.
  const prompts: PromptRow[] = base.prompts.map((p) => {
    const engineHits: Record<string, boolean> = {};
    for (const id of allEngines) {
      engineHits[id] = enabled.has(id) ? !!p.engineHits[id] : false;
    }
    const responses = p.responses.filter((r) => enabled.has(r.engine));
    const anyHit = Object.values(engineHits).some(Boolean);
    return {
      ...p,
      engineHits,
      responses,
      position: anyHit ? p.position : null,
    };
  });

  // Recompute branded / unbranded hit counts from the filtered prompt set.
  const branded = prompts.filter((p) => p.type === "branded");
  const unbranded = prompts.filter((p) => p.type === "unbranded");
  const brandedHits = branded.filter((p) => p.position != null).length;
  const unbrandedHits = unbranded.filter((p) => p.position != null).length;
  const brandedTotal = branded.length;
  const unbrandedTotal = unbranded.length;
  const brandedVisibility = brandedTotal === 0 ? 0 : Math.round((brandedHits / brandedTotal) * 100);
  const unbrandedVisibility = unbrandedTotal === 0 ? 0 : Math.round((unbrandedHits / unbrandedTotal) * 100);

  // Per-engine OR across prompts of each type — true if any prompt got a hit
  // in that engine. Engines toggled off render as misses everywhere.
  const brandedEngineHits: Record<string, boolean> = {};
  const unbrandedEngineHits: Record<string, boolean> = {};
  for (const id of allEngines) {
    brandedEngineHits[id] = enabled.has(id) && branded.some((p) => p.engineHits[id]);
    unbrandedEngineHits[id] = enabled.has(id) && unbranded.some((p) => p.engineHits[id]);
  }
  const brandedTopRankFailEngines = ENGINES
    .filter((e) => enabled.has(e.id) && !brandedEngineHits[e.id])
    .map((e) => e.label);

  // Citation mentions are bounded by enabled engines.
  const engineRatio = allEnginesActive ? 1 : enabled.size / allEngines.length;
  const linkCitationMentions = Math.round(base.linkCitationMentions * engineRatio);

  return {
    ...base,
    prompts,
    brandedHits,
    brandedTotal,
    brandedVisibility,
    unbrandedHits,
    unbrandedTotal,
    unbrandedVisibility,
    brandedEngineHits,
    unbrandedEngineHits,
    brandedTopRankCount: brandedHits,
    brandedTopRankTotal: brandedTotal,
    brandedTopRankFailEngines,
    linkCitationMentions,
    // Range only affects comparison-period deltas, not absolute values.
    brandedVisibilityDelta: round1(base.brandedVisibilityDelta * factor),
    unbrandedVisibilityDelta: round1(base.unbrandedVisibilityDelta * factor),
    linkCitationDelta: round1(base.linkCitationDelta * factor),
    avgPositionDelta: round1(base.avgPositionDelta * factor),
    promptsTrackedDelta: Math.round(base.promptsTrackedDelta * factor),
  };
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────

export function PromptsSection({ data: dataOverride }: { data?: PromptsData } = {}) {
  const fallbackData = usePromptsData();
  const baseData = dataOverride ?? fallbackData;
  const [range, setRange] = useState<Range>("90d");
  const [enabledEngines, setEnabledEngines] = useState<Set<string>>(
    new Set(ENGINES.map((e) => e.id)),
  );
  const [selectedFilters, setSelectedFilters] = useState<Set<PromptsFilter>>(
    () => new Set(),
  );

  const data = useMemo(
    () => applyFilters(baseData, range, enabledEngines),
    [baseData, range, enabledEngines],
  );
  const highlights = useMemo(
    () => derivePromptHighlights(data.prompts),
    [data.prompts],
  );

  function toggleEngine(id: string) {
    setEnabledEngines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Never let the user turn off every engine — keep at least one selected.
      if (next.size === 0) return prev;
      return next;
    });
  }

  function toggleFilter(f: PromptsFilter) {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  function clearFilters() {
    setSelectedFilters(new Set());
  }

  function showBrandedPrompts() {
    setSelectedFilters(new Set<PromptsFilter>(["branded"]));
    // Defer scroll until after state has flushed and re-rendered
    setTimeout(() => {
      document
        .getElementById("prompts-table")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="space-y-5">
      {/* Hero — title + description on left, NextScanCard on right */}
      <motion.div
        {...fadeUp}
        className="flex items-start justify-between gap-6"
      >
        <div className="space-y-2 min-w-0 flex-1">
          <HeroTitle data={data} />
          <HeroDescription />
        </div>
        <div className="shrink-0 mt-1">
          <NextScanCard
            days={data.nextScanDays}
            date={data.nextScanDate}
            promptCount={data.nextScanPromptCount}
          />
        </div>
      </motion.div>

      {/* Filter row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
        className="flex flex-wrap items-center gap-3"
      >
        <RangePills value={range} onChange={setRange} />
        <EngineChips enabled={enabledEngines} onToggle={toggleEngine} />
      </motion.div>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)]" />

      {/* Stat strip — clean 4-card grid (brand-sentiment style) */}
      <motion.div {...reveal}>
        <CleanStatStrip data={data} />
      </motion.div>

      {/* Chunk 2 — Prompts table (with branded callout inside) + Coverage by intent + Citation/Sentiment */}
      <motion.div {...reveal}>
        <PromptsTable
          prompts={data.prompts}
          summary={data.promptsTableSummary}
          selectedFilters={selectedFilters}
          onToggleFilter={toggleFilter}
          onClearFilters={clearFilters}
          data={data}
          onSeeBranded={showBrandedPrompts}
        />
      </motion.div>

      {/* Best-performing + Flagged prompts (50/50) */}
      <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BestPerformingPromptsCard items={highlights.best} />
        <FlaggedPromptsCard items={highlights.flagged} />
      </motion.div>

      <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-stretch">
        <CoverageDonut items={data.intentCoverage} />
        <SentimentByTypeCard items={data.sentimentByType} />
      </motion.div>

      {/* Chunk 3 — Insight cards: wins + concerns */}
      <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InsightCard
          variant="wins"
          tag="What's working"
          title={`${data.wins.length} ${data.wins.length === 1 ? "win" : "wins"} this period`}
          summary="Patterns where you're outpacing the field — keep the pressure on."
          items={data.wins}
        />
        <InsightCard
          variant="concerns"
          tag="What to watch"
          title={`${data.concerns.length} ${data.concerns.length === 1 ? "leak" : "leaks"} costing visibility`}
          summary="Highest-leverage fixes — these are where coverage is bleeding."
          items={data.concerns}
        />
      </motion.div>

      {/* Final page-level CTA — directs to optimization */}
      <motion.div
        {...reveal}
        className="rounded-[var(--radius-lg)] p-5"
        style={{
          borderLeft: `5px solid ${COLORS.primary}`,
          backgroundColor: TOK.primarySoftBg,
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p
              className="uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold mb-1"
              style={{ fontSize: 11, letterSpacing: "0.12em" }}
            >
              Ready to fix the gaps?
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--color-fg)",
                letterSpacing: "-0.01em",
              }}
            >
              Run a full GEO audit and we'll write the fixes for you.
            </p>
          </div>
          <CtaLink
            icon={Target}
            label="Start GEO audit"
            href="/audit"
            className="shrink-0"
          />
        </div>
      </motion.div>

      <BetaFeedbackFooter />
    </div>
  );
}
