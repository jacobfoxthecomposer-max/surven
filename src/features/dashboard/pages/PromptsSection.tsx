"use client";

import { Fragment, useId, useMemo, useState } from "react";
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
} from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { COLORS } from "@/utils/constants";

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
  const strokeWidth = 7;

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

  return (
    <div className="flex flex-col items-center" style={{ width: 88 }}>
      <svg viewBox="0 0 100 56" width={72} height={40} aria-hidden>
        <defs>
          {/* Bounded gradient: spans only the visible portion of the arc.
              Start at the arc's leftmost point in the previous tier color,
              end at the progress endpoint in the current tier color. */}
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={startPt.x}
            y1={0}
            x2={Math.max(progressPt.x, startPt.x + 0.01)}
            y2={0}
          >
            <stop offset="0%" stopColor={tier.startColor} />
            <stop offset="100%" stopColor={tier.color} />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={trackPath}
          stroke="rgba(60,62,60,0.10)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {/* Progress */}
        {pct > 0 && (
          <path
            d={progressPath}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
      <div className="flex items-center gap-1 mt-0.5">
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

interface PromptResponse {
  engine: string;
  cited: boolean;
  excerpt: string;
}

interface PromptRow {
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

interface IntentCoverage {
  intent: string;
  promptCount: number;
  coveragePct: number;
  volumeMonthly: number; // sum of monthly searches across prompts in this intent
  avgPosition: number; // avg rank when cited
  coverageDelta: number; // pp change vs prior period (+ = improving)
  positiveSentimentPct: number; // % of mentions that read positive
}

interface CitationSource {
  source: string;
  pct: number;
  count: number;
}

interface SentimentByType {
  type: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

type InsightIconKey =
  | "crown"
  | "trend-up"
  | "check"
  | "target"
  | "trend-down"
  | "alert";

interface InsightItemData {
  iconKey: InsightIconKey;
  title: string;
  description: string;
  cta: { label: string; href: string };
}

interface PromptsData {
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
          intent: "Brand lookup",
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
          intent: "Brand lookup",
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
        { intent: "Brand lookup", promptCount: 4, coveragePct: 88, volumeMonthly: 12600, avgPosition: 1.2, coverageDelta: 6.0, positiveSentimentPct: 82 },
        { intent: "Comparison", promptCount: 3, coveragePct: 64, volumeMonthly: 2400, avgPosition: 1.8, coverageDelta: 3.0, positiveSentimentPct: 58 },
        { intent: "Informational", promptCount: 7, coveragePct: 41, volumeMonthly: 19100, avgPosition: 2.8, coverageDelta: 15.0, positiveSentimentPct: 41 },
        { intent: "Local", promptCount: 5, coveragePct: 56, volumeMonthly: 7800, avgPosition: 2.4, coverageDelta: 5.0, positiveSentimentPct: 64 },
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
        { type: "Brand lookup", positive: 82, neutral: 14, negative: 4, total: 28 },
        { type: "Comparison", positive: 58, neutral: 32, negative: 10, total: 19 },
        { type: "Local", positive: 64, neutral: 28, negative: 8, total: 22 },
        { type: "Informational", positive: 41, neutral: 49, negative: 10, total: 35 },
        { type: "Transactional", positive: 28, neutral: 51, negative: 21, total: 14 },
      ],
      pageSummary:
        "You're winning at brand & trust prompts (82% coverage) but losing transactional ones (28%) — that's where revenue actually lives. Three of your top-five money prompts are completely missing across all 5 AI engines. Closing the transactional gap is your single biggest lever this period.",
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
          title: "'morgan and morgan reviews' on all 5 engines",
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
  "Surven monitors real questions customers ask AI tools and tracks how often you appear, where you rank, and what AI says about you when it does.";

function HeroDescription() {
  return (
    <p
      className="text-[var(--color-fg-muted)]"
      style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 760 }}
    >
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

// ─── PAGE-LEVEL AI SUMMARY ─────────────────────────────────────────────────

function PageAISummary({ data }: { data: PromptsData }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-6"
      style={{
        borderLeft: `5px solid ${COLORS.primary}`,
        backgroundColor: TOK.primarySoftBg,
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Sparkles className="h-5 w-5 shrink-0" style={{ color: COLORS.primary }} />
        <p
          className="uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold"
          style={{ fontSize: 11, letterSpacing: "0.12em" }}
        >
          AI summary
        </p>
      </div>
      <p
        className="text-[var(--color-fg)] mb-4"
        style={{ fontSize: 15, lineHeight: 1.6 }}
      >
        {data.pageSummary}
      </p>
      <a
        href={data.pageSummaryCta.href}
        className="inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-80"
        style={{ fontSize: 13, color: COLORS.primaryHover }}
      >
        {data.pageSummaryCta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
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
          <span className="relative inline-flex items-center group">
            <Info
              className="h-3.5 w-3.5 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
              aria-label="More info"
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 translate-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--color-fg-secondary)] shadow-md"
              style={{ width: 260 }}
            >
              {hint}
              <span
                className="absolute left-1/2 top-full -translate-x-1/2 -mt-px"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "5px solid var(--color-border)",
                }}
              />
            </span>
          </span>
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
  return (
    <span className="relative inline-flex items-center group">
      <Info
        className="h-3.5 w-3.5 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
        aria-label="More info"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 translate-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--color-fg-secondary)] shadow-md"
        style={{ width: 260 }}
      >
        {hint}
      </span>
    </span>
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
        hint="Total prompts Surven is actively monitoring across all AI engines."
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

  if (isClean) {
    return (
      <div
        className="rounded-[var(--radius-lg)] p-5 flex items-start gap-3"
        style={{
          backgroundColor: TOK.greenBg,
          borderLeft: `4px solid ${TOK.greenBorderLeft}`,
        }}
      >
        <div
          className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.28)" }}
        >
          <CheckCircle2 className="h-5 w-5" style={{ color: TOK.greenFg }} />
        </div>
        <div className="flex-1">
          <p style={{ fontSize: 14, fontWeight: 600, color: TOK.greenFg, marginBottom: 2 }}>
            Every AI tool shows you first when customers search your business by name
          </p>
          <p className="text-[var(--color-fg-muted)]" style={{ fontSize: 12 }}>
            Searches by your business name come from people who already know you — your warmest leads. You're winning all of them. Strong foundation.
          </p>
        </div>
      </div>
    );
  }

  const failedEngines = data.brandedTopRankFailEngines
    .map((id) => ENGINES.find((e) => e.id === id)?.label)
    .filter(Boolean)
    .join(" · ");

  const title = isPartial
    ? `1 AI tool shows a competitor when customers search your business by name`
    : `Customers searching your business by name are seeing competitors first on ${failCount} of ${data.brandedTopRankTotal} AI tools`;

  const subline = isPartial
    ? `When someone types your business name into ${failedEngines}, it names a competitor before you. People searching by name already know your brand and want to find you — these are your warmest leads. Close this last gap before anything else.`
    : `When someone types your business name into ${failedEngines}, the AI mentions a competitor before you. People searching by name already know your business and want to find you — these are the warmest leads you'll ever get. Losing them here is the most expensive gap on your dashboard.`;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-5 flex items-start gap-3"
      style={{
        backgroundColor: TOK.amberBg,
        borderLeft: `4px solid ${TOK.amberBorderLeft}`,
      }}
    >
      <div
        className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: "rgba(201,123,69,0.28)" }}
      >
        <AlertTriangle className="h-5 w-5" style={{ color: TOK.amberFg }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: TOK.amberFg, marginBottom: 4 }}>
          {title}
        </p>
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 12.5, lineHeight: 1.55 }}
        >
          {subline}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
        {onSeeBranded && (
          <button
            type="button"
            onClick={onSeeBranded}
            className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{ fontSize: 13, color: TOK.amberFg, fontFamily: "var(--font-sans)" }}
          >
            See branded prompts
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
        <a
          href="/audit"
          className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
          style={{ fontSize: 13, color: TOK.amberFg }}
        >
          Fix with GEO Audit
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── CHUNK 2 ───────────────────────────────────────────────────────────────
// Prompts table (tabbed) + Coverage by Intent + Citation Sources + Sentiment.

// ─── PROMPTS TABLE ─────────────────────────────────────────────────────────

type PromptsTab = "all" | "branded" | "unbranded";


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

function PromptsTable({
  prompts,
  summary,
  tab,
  onTabChange,
}: {
  prompts: PromptRow[];
  summary: string;
  tab: PromptsTab;
  onTabChange: (t: PromptsTab) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const filtered = useMemo(() => {
    const base = tab === "all" ? prompts : prompts.filter((p) => p.type === tab);
    const sorted = [...base];
    sorted.sort((a, b) => {
      const cmp = comparePrompts(a, b, sort.column);
      return sort.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [tab, prompts, sort]);

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

  const rowBorder = "1.5px solid rgba(60,62,60,0.18)";

  return (
    <section
      id="prompts-table"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] scroll-mt-6"
    >
      <div className="grid grid-cols-3 items-center gap-3 px-6 py-5 border-b border-[var(--color-border)]">
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
            Prompts
          </h2>
          <InfoTooltip hint="Every prompt we run on your behalf, ranked by monthly search volume." />
        </div>
        <div className="justify-self-center inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-1 gap-1">
          {(["all", "branded", "unbranded"] as PromptsTab[]).map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.15, ease: EASE }}
              onClick={() => onTabChange(t)}
              className={
                "px-5 py-2 font-medium rounded-[var(--radius-md)] transition-colors capitalize " +
                (tab === t
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
              }
              style={{ fontSize: 19, fontFamily: "var(--font-sans)" }}
            >
              {t}
            </motion.button>
          ))}
        </div>
        <div className="justify-self-end">
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

      {/* Tab description — wrapped per §8 anti-pattern #10 (no orphan body copy) */}
      <div className="px-6 pt-5">
        <div
          className="rounded-[var(--radius-md)] border-l-2 px-4 py-3"
          style={{
            borderLeftColor: "var(--color-border)",
            backgroundColor: "rgba(150,162,131,0.06)",
          }}
        >
          <div className="space-y-1.5">
            <p style={{ fontSize: 14, lineHeight: 1.55 }}>
              <strong style={{ color: "var(--color-fg)", fontWeight: 700 }}>
                Branded
              </strong>
              <span className="text-[var(--color-fg-secondary)]">
                {" — Prompts that name your business directly. "}
              </span>
              <span style={{ color: TOK.loseText, fontWeight: 700 }}>
                Anything below 95% is a credibility leak.
              </span>
              <span style={{ color: "var(--color-fg)", fontWeight: 600 }}>
                {" AI can't be 100% consistent."}
              </span>
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.55 }}>
              <strong style={{ color: "var(--color-fg)", fontWeight: 700 }}>
                Unbranded
              </strong>
              <span className="text-[var(--color-fg-secondary)]">
                {" — Prompts that don't mention you. These reveal where you can steal share from competitors."}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* AI summary block */}
      <div className="px-6 pt-4">
        <div
          className="rounded-[var(--radius-lg)] p-5"
          style={{
            borderLeft: `5px solid ${COLORS.primary}`,
            backgroundColor: TOK.primarySoftBg,
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: COLORS.primary }} />
            <p
              className="uppercase tracking-wider text-[var(--color-fg-secondary)] font-semibold"
              style={{ fontSize: 11, letterSpacing: "0.12em" }}
            >
              AI summary
            </p>
          </div>
          <p
            className="text-[var(--color-fg)]"
            style={{ fontSize: 14, lineHeight: 1.55 }}
          >
            {summary}
          </p>
        </div>
      </div>

      <div className="px-6 py-4 overflow-x-auto">
        <table
          className="w-full"
          style={{ fontSize: 13, tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: 30 }} />
            <col />
            <col style={{ width: 100 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 240 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
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
                <SortableHeader label="Intent" column="intent" sort={sort} onSort={handleSort} onReset={handleResetSort} />
              </th>
              <th className="py-2 pr-4">
                <span className="inline-flex items-center gap-1">
                  <SortableHeader label="Coverage" column="coverage" sort={sort} onSort={handleSort} onReset={handleResetSort} />
                  <span className="relative inline-flex items-center group">
                    <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help" />
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--color-fg-secondary)] shadow-md font-normal"
                      style={{ width: 220 }}
                    >
                      % of AI engines mentioning you on this prompt + 30-day change.
                    </span>
                  </span>
                </span>
              </th>
              <th className="py-2 pr-4">
                <div className="flex justify-end">
                  <SortableHeader label="Position" column="position" sort={sort} onSort={handleSort} onReset={handleResetSort} />
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
            {filtered.map((p, idx) => {
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
                    style={{ borderBottom: rowBorder }}
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
                    <td className="py-2 pr-4">
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 19,
                          color: "var(--color-fg)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        "{p.text}"
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-baseline gap-1">
                        <span
                          className="tabular-nums"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 22,
                            fontWeight: 500,
                            color: "var(--color-fg)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {fmtVolume(p.volume)}
                        </span>
                        <span
                          className="text-[var(--color-fg-muted)]"
                          style={{ fontSize: 12.5 }}
                        >
                          /mo
                        </span>
                      </div>
                    </td>
                    <td
                      className="py-2 pr-4 text-[var(--color-fg-secondary)]"
                      style={{ fontSize: 15 }}
                    >
                      {p.intent}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="relative rounded-full bg-[var(--color-surface-alt)]"
                          style={{ width: 110, height: 7 }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              width: `${coveragePct}%`,
                              backgroundColor:
                                hits / totalEngines >= 0.6
                                  ? COLORS.primary
                                  : hits / totalEngines >= 0.4
                                  ? "#C97B45"
                                  : "#B54631",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 19,
                            fontWeight: 500,
                            color: "var(--color-fg)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {coveragePct}%
                        </span>
                        {p.coverageDelta !== undefined && p.coverageDelta !== 0 && (
                          <DeltaPill
                            deltaType={p.coverageDelta > 0 ? "increase" : "decrease"}
                            value={`${Math.abs(p.coverageDelta).toFixed(1)}%`}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {p.position === null ? (
                        <span
                          className="text-[var(--color-fg-muted)]"
                          style={{ fontSize: 18 }}
                        >
                          —
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 22,
                            color: "var(--color-fg)",
                            fontWeight: 500,
                          }}
                        >
                          #{p.position.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pl-4">
                      <div className="flex justify-end">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium"
                          style={{
                            fontSize: 13.5,
                            color: sent.color,
                            backgroundColor: sent.bg,
                          }}
                        >
                          <SentIcon className="h-4 w-4" />
                          {sent.label}
                        </span>
                      </div>
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
                        colSpan={7}
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
          </tbody>
        </table>
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "Each row is one prompt your business is being tracked against. Click the chevron to expand and see per-engine details.",
          },
          {
            label: "Columns",
            body: "Prompt + intent tag · monthly search volume · avg. position when cited · citation rate (sage = excellent, rust = poor) · sentiment dot · per-engine status.",
          },
          {
            label: "Citation rate",
            body: "Share of AI responses to that prompt that cite you. Above 60% is healthy; below 30% means the prompt is a gap to close.",
          },
          {
            label: "Engine dots",
            body: "Filled = engine cited you for that prompt. Empty = engine answered but didn't mention you. Use the engine chips at the top to filter.",
          },
        ]}
        tip="Click any column header to sort. The expand button reveals which exact engines cited you and which didn't, with the response excerpt."
      />
    </section>
  );
}

// ─── COVERAGE BY INTENT (DONUT + INTERACTIVE LIST) ─────────────────────────

const INTENT_COLORS: Record<string, string> = {
  "Brand lookup": "#7D8E6C", // sage
  Comparison: "#7A8FA6", // slate-blue
  Local: "#C9A845", // mustard
  Informational: "#9B6FA6", // plum
  Transactional: "#C97B45", // rust
};

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
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-5 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading
            text="Coverage by intent"
            info="How well you're cited across each user-intent category — brand lookups, comparisons, transactional queries, etc."
          />
          <span className="text-[var(--color-fg-muted)]" style={{ fontSize: 12 }}>
            {fmtVolume(totalVolume)} /mo · {total} prompts
          </span>
        </div>
      </div>

      <div
        className="rounded-[var(--radius-md)] border-l-2 px-4 py-3 mb-5"
        style={{
          borderLeftColor: "var(--color-border)",
          backgroundColor: "rgba(150,162,131,0.06)",
          maxWidth: 820,
        }}
      >
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.55 }}
        >
          {"Each row measures coverage "}
          <span style={{ fontStyle: "italic", fontWeight: 700, color: "var(--color-fg)" }}>
            within
          </span>
          {" its own category — what share of those prompts mention you. They don't add up to 100% because each is its own independent score, not a slice of the same pie."}
        </p>
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

      <ChartExplainer
        blocks={[
          {
            label: "Slices",
            body: "Each slice is one user-intent category — branded lookups, comparisons, transactional queries, etc.",
          },
          {
            label: "Slice size",
            body: "Proportional to how many prompts in your tracked set fall into that intent. Bigger slice = more prompts of that type.",
          },
          {
            label: "Coverage % (right side)",
            body: "Within that intent, the share of prompts where you're cited. Each row is its own independent score — they don't add up to 100%.",
          },
          {
            label: "Colors",
            body: "Visual differentiation between intent categories only. They don't indicate good or bad — sage isn't better than rust here.",
          },
        ]}
        tip="Hover any slice to focus the donut and see that intent's coverage, average position, and sentiment in the center."
      />

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

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-4 pb-3 border-b border-[var(--color-border)]">
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
              <div className="relative h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
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

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "Each row is a category of source AI engines pulled from when mentioning you — your own site, Wikipedia, Reddit, industry blogs, news, and other.",
          },
          {
            label: "Bar length",
            body: "Share of all citations from that source. Bars are scaled to the leading source so the top one fills the row.",
          },
          {
            label: "Numbers on the right",
            body: "First number is the percentage; second is the raw citation count. So '42% · 18' means 18 citations, which is 42% of the total.",
          },
          {
            label: "Colors",
            body: "Visual differentiation between source types only. Sage marks 'Your site' as the anchor — other colors don't indicate good or bad.",
          },
        ]}
        tip="Your own site should lead. If Wikipedia, Reddit, or industry blogs lead, you have a citation-source authority gap."
      />

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

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-4 pb-3 border-b border-[var(--color-border)]">
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
        {sorted.map((row) => (
          <div
            key={row.type}
            className="grid grid-cols-[140px_1fr_auto] items-center gap-3"
          >
            <span
              className="truncate"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--color-fg)",
                letterSpacing: "-0.01em",
              }}
              title={`${row.positive}% positive · ${row.neutral}% neutral · ${row.negative}% negative`}
            >
              {row.type}
            </span>
            <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-surface-alt)]">
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
        ))}
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "Each row is one prompt-intent type — branded, comparison, transactional, etc. Sorted by positive sentiment (best at top).",
          },
          {
            label: "Bar segments",
            body: "Each bar is split into positive / neutral / negative shares, always summing to 100% per intent. Sage = positive, gray = neutral, rust = negative.",
          },
          {
            label: "Mention count",
            body: "Right-aligned number is total AI mentions across all engines for that intent. Low counts mean less reliable sentiment signal.",
          },
          {
            label: "Colors",
            body: "Semantic — sage means favorable, rust means critical. A rust-heavy bar means AI engines are describing you negatively for that intent.",
          },
        ]}
        tip="Hover the row label for the exact positive/neutral/negative split."
      />

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

function InsightCard({ variant, tag, title, summary, items }: InsightCardProps) {
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

      {/* Sub-cards */}
      <motion.div
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true, margin: "-60px" }}
        transition={{ staggerChildren: 0.07, delayChildren: 0.08 }}
        className="flex-1 p-4 space-y-3"
      >
        {items.map((item, idx) => {
          const ItemIcon = INSIGHT_ICON[item.iconKey];
          return (
            <motion.div
              key={idx}
              variants={{
                initial: { opacity: 0 },
                whileInView: { opacity: 1 },
              }}
              transition={{ duration: 0.4, ease: EASE }}
              whileHover={{ y: -2 }}
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
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────

export function PromptsSection() {
  const data = usePromptsData();
  const [range, setRange] = useState<Range>("90d");
  const [enabledEngines, setEnabledEngines] = useState<Set<string>>(
    new Set(ENGINES.map((e) => e.id)),
  );
  const [activeTab, setActiveTab] = useState<PromptsTab>("all");

  function toggleEngine(id: string) {
    setEnabledEngines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showBrandedPrompts() {
    setActiveTab("branded");
    // Defer scroll until after the tab state has flushed and re-rendered
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
        <div className="space-y-3 min-w-0 flex-1">
          <HeroTitle data={data} />
          <HeroDescription />
          <div style={{ maxWidth: 760 }}>
            <CtaLink
              icon={Target}
              label="Fix the gaps with a GEO audit"
              href="/audit"
            />
          </div>
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

      {/* Stat strip */}
      <motion.div {...reveal}>
        <StatStrip data={data} />
      </motion.div>

      {/* Conditional branded callout */}
      <motion.div {...reveal}>
        <BrandedCallout data={data} onSeeBranded={showBrandedPrompts} />
      </motion.div>

      {/* Chunk 2 — Prompts table + Coverage by intent + Citation/Sentiment */}
      <motion.div {...reveal}>
        <PromptsTable
          prompts={data.prompts}
          summary={data.promptsTableSummary}
          tab={activeTab}
          onTabChange={setActiveTab}
        />
      </motion.div>

      <motion.div {...reveal}>
        <CoverageDonut items={data.intentCoverage} />
      </motion.div>

      <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CitationSourcesCard items={data.citationSources} />
        <SentimentByTypeCard items={data.sentimentByType} />
      </motion.div>

      {/* Chunk 3 — Insight cards: wins + concerns */}
      <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InsightCard
          variant="wins"
          tag="What's working"
          title="3 wins this period"
          summary="Patterns where you're outpacing the field — keep the pressure on."
          items={data.wins}
        />
        <InsightCard
          variant="concerns"
          tag="What to watch"
          title="3 leaks costing visibility"
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
    </div>
  );
}
