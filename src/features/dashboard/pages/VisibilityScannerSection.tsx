"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";
import { TimeRangeDropdown, type TimeRangeKey } from "@/components/atoms/TimeRangeDropdown";
import { GapPlaybookModal, type GapPlaybook } from "@/components/molecules/GapPlaybookModal";
import { Card } from "@/components/atoms/Card";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { VisibilityScoreGauge, type VisibilityStats } from "@/components/atoms/VisibilityScoreGauge";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { HoverHint } from "@/components/atoms/HoverHint";
import {
  Sparkles,
  ArrowUp,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Target,
  Calendar,
  ArrowRight,
  Trophy,
  TrendingUp,
  Layers,
  MessageSquare,
  Crown,
} from "lucide-react";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { COLORS, ANIMATION } from "@/utils/constants";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import {
  VisibilityScannerChart,
  type VisibilityBrand,
  type EndLabelStyle,
  type FocusMode,
} from "@/components/organisms/VisibilityScannerChart";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ============================================================================
 * AI Visibility Scanner — Section
 * ----------------------------------------------------------------------------
 * Page composition for /visibility-preview and the auth-gated /dashboard.
 * Renders the entire AI visibility experience as a single Section component.
 *
 * TABLE OF CONTENTS (top → bottom):
 *   1.  Treatment config           — typography + chart-stroke knobs (A/B/C)
 *   2.  Color tokens (TOK)         — sage/rust palette for charts/cards
 *   3.  Mock data                  — synthetic brand series + dates
 *   4.  Range presets              — 14d/30d/90d/All/YTD/custom
 *   5.  Engines constant           — ChatGPT, Claude, Gemini, Google AI
 *   6.  Data hook (useScannerData) — derives stats from brands × dates × enabled engines
 *   7.  AI Overview                — shared insight component + build*Insight helpers
 *                                    (gauge, chart, distribution; rank-series builders sit
 *                                    further down with PositionStat)
 *   8.  Custom date popover        — controlled by RangePills' "Custom" button
 *   9.  Range pills + Engine chips — top-of-section filters
 *   10. Engine coverage bar        — single-row two-tone bar with floating ±delta
 *   11. Hero parts                 — title, description, NextScanCard
 *   12. WhatsNextCard              — top-3 actions card
 *   13. DistributionByLLMCard      — uses #10 + AI overview + insights
 *   14. Average Position section   — PositionStat type, build*Insight, AIOverview helpers,
 *                                    PositionChart (Recharts wrapper with crosshair tooltip),
 *                                    PositionBrandRow, RankSeriesCard
 *   15. Share of Voice section     — SOVPie (donut) + ShareOfVoiceCard
 *   16. CompetitorsBlock           — assembles Distribution + Avg Position + SoV
 *   17. NarrativeFeed              — 3-col What worked / Watch / Do next
 *   18. VariantBody                — full layout composition
 *   19. Main wrapper export        — VisibilityScannerSection (the only export)
 *
 * Style lock-ins (don't change without Joey's ask):
 *  • Cream/sage palette only (no emerald/red, no Tremor tokens, no @remixicon)
 *  • Cormorant Garamond display + Inter sans
 *  • Section headings INSIDE each card with a bottom-border separator
 *  • All deltas formatted as `+X.X%` / `-X.X%` (never `pp`)
 *  • Tooltip default-LEFT, flip-RIGHT near the chart's left edge
 *  • Y-axis 5pt buffer auto-fit on the main + SoV charts
 *  • Only YOU's line glows; competitors are flat lines
 *  • End-of-line label format: `% first then name` (visibility) or `#X.X You` (position)
 *  • No interactive zoom/pan, no Recharts Brush
 * ========================================================================== */

// ─── TREATMENT CONFIG ───────────────────────────────────────────────────────

type TabStyle = "subtle" | "standard" | "bold";

interface Treatment {
  // Typography
  heroSize: number;
  coverageBigSize: number;
  competitorScoreSize: number;
  tabLabelSize: number;
  bodyBumpPx: number;
  // Chart
  chartHeight: number;
  strokeYou: number;
  strokeHovered: number;
  strokeDefault: number;
  tooltipFontSize: number;
  gridStroke: string;
  gridOpacity: number;
  /** Permanent glow blur for YOU's line. */
  youGlowBlur: number;
  /** End-of-line label style. */
  endLabelStyle: EndLabelStyle;
  /** Right-side gutter reserved for end labels (px). */
  endLabelGutter: number;
  /** Y-axis auto-fit padding (units above/below data range). 0 = exact fit. */
  yPadding: number;
  // Tabs
  tabStyle: TabStyle;
}

// V3 / Balanced baseline — held constant. y-axis padding stays at 5pt
// (Joey's pick). Three new variants vary on the end-of-line label size.
const SHARED_BASE = {
  heroSize: 60,
  coverageBigSize: 68,
  competitorScoreSize: 25,
  tabLabelSize: 14,
  bodyBumpPx: 2,
  chartHeight: 460,
  strokeYou: 2.3,
  strokeHovered: 3.75,
  strokeDefault: 1,
  tooltipFontSize: 10,
  gridStroke: "rgba(60,62,60,0.35)",
  gridOpacity: 1,
  tabStyle: "bold" as TabStyle,
  youGlowBlur: 2,
  yPadding: 5,
} as const;

// V1 — Compact label: percentage only ("67.3%"), short pill
const TREATMENT_COMPACT_LABEL: Treatment = {
  ...SHARED_BASE,
  endLabelStyle: "value",
  endLabelGutter: 80,
};

// V2 — Standard label: percentage + name ("67.3%  ProPlumber Austin")
export const TREATMENT_STANDARD_LABEL: Treatment = {
  ...SHARED_BASE,
  endLabelStyle: "name-value",
  endLabelGutter: 150,
};

// V3 — Large label: bigger pill, bigger text
const TREATMENT_LARGE_LABEL: Treatment = {
  ...SHARED_BASE,
  endLabelStyle: "name-value-large",
  endLabelGutter: 180,
};

// ─── COLOR TOKENS ───────────────────────────────────────────────────────────

const TOK = {
  growBase: "rgba(125,142,108,0.42)",
  growDiff: "#7D8E6C",
  growGlow: "0 0 6px rgba(125,142,108,0.55), 0 0 12px rgba(125,142,108,0.25)",
  growText: "#7D8E6C",
  loseBase: "#C8C2B4",
  loseBorder: "#B54631",
  loseText: "#B54631",
  trackBg: "rgba(200,194,180,0.4)",
};

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

export interface MockBrand extends VisibilityBrand {
  domain: string;
  mentions: number;
}

export function genLine(base: number, trend: number, noise: number, n: number, seedMul = 1) {
  const pts: number[] = [];
  let v = base;
  let seed = Math.round(base * 1000 * seedMul);
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };
  for (let i = 0; i < n; i++) {
    v = Math.max(5, Math.min(98, v + trend + (rng() - 0.5) * noise));
    pts.push(Math.round(v * 10) / 10);
  }
  return pts;
}

export const MOCK_N = 90;

// Full-color competitor palette, all visually distinct from each other AND
// from the sage primary (You). c4 is a teal that reads separate from sage.
export const MOCK_BRANDS: MockBrand[] = [
  { id: "you", name: "Your Business",      domain: "acme-plumbing.com",     color: COLORS.primary,     isYou: true,  mentions: 3181, data: genLine(45, 0.18, 2.6, MOCK_N, 1) },
  { id: "c1",  name: "ProPlumber Austin",  domain: "proplumber-austin.com", color: "#C97B45",          isYou: false, mentions: 2769, data: genLine(63, 0.10, 2.4, MOCK_N, 2) },
  { id: "c2",  name: "FastFix Plumbing",   domain: "fastfix-plumbing.com",  color: "#B8A030",          isYou: false, mentions: 2454, data: genLine(38, 0.07, 2.8, MOCK_N, 3) },
  { id: "c3",  name: "Austin Pros",        domain: "austinpros.com",        color: "#6BA3F5",          isYou: false, mentions: 1684, data: genLine(28, 0.04, 2.0, MOCK_N, 4) },
  { id: "c4",  name: "LeakMasters",        domain: "leakmasters.com",       color: "#5BAF92",          isYou: false, mentions: 1420, data: genLine(34, 0.06, 2.2, MOCK_N, 5) },
  { id: "c5",  name: "RapidFlow",          domain: "rapidflow.com",         color: "#B54631",          isYou: false, mentions: 1188, data: genLine(22, 0.05, 2.4, MOCK_N, 6) },
];

export function buildDates(n: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}
export const MOCK_DATES = buildDates(MOCK_N);

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtDateUpper = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

// ─── RANGE PRESETS ──────────────────────────────────────────────────────────

type RangeKey = "14d" | "30d" | "90d" | "all" | "ytd" | "custom";

const RANGE_PRESETS: {
  key: Exclude<RangeKey, "custom">;
  label: string;
  hint: string;
}[] = [
  { key: "14d", label: "14d", hint: "Show data from the last 14 days." },
  { key: "30d", label: "30d", hint: "Show data from the last 30 days." },
  { key: "90d", label: "90d", hint: "Show data from the last 90 days." },
  { key: "ytd", label: "YTD", hint: "Show data from January 1st of the current year through today." },
  { key: "all", label: "All", hint: "Show every day of data we've collected for your business." },
];

function computeRangeN(
  key: RangeKey,
  customStart: Date | null,
  customEnd: Date | null
): number {
  if (key === "custom" && customStart && customEnd) {
    const diff = Math.floor((customEnd.getTime() - customStart.getTime()) / 86400000) + 1;
    return Math.max(2, Math.min(MOCK_N, diff));
  }
  if (key === "ytd") {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    return Math.min(days, MOCK_N);
  }
  if (key === "all") return MOCK_N;
  const map: Record<string, number> = { "14d": 14, "30d": 30, "90d": 90 };
  return map[key] ?? MOCK_N;
}

// ─── ENGINES ────────────────────────────────────────────────────────────────

const ENGINES = [
  { id: "chatgpt",    label: "ChatGPT",     scale: 0.88 },
  { id: "claude",     label: "Claude",      scale: 0.76 },
  { id: "gemini",     label: "Gemini",      scale: 0.72 },
  { id: "google_ai",  label: "Google AI",   scale: 0.72 },
] as const;

// ─── DATA HOOK ──────────────────────────────────────────────────────────────

export function useScannerData(
  brands: MockBrand[],
  dates: Date[],
  rangeN: number,
  enabledEngineIds: Set<string>
) {
  const sliced = useMemo(() => {
    const start = Math.max(0, dates.length - rangeN);
    return {
      dates: dates.slice(start),
      brands: brands.map((b) => ({ ...b, data: b.data.slice(start) })),
    };
  }, [brands, dates, rangeN]);

  const engineScale = useMemo(() => {
    const enabled = ENGINES.filter((e) => enabledEngineIds.has(e.id));
    if (!enabled.length) return 0.2;
    return enabled.reduce((s, e) => s + e.scale, 0) / enabled.length;
  }, [enabledEngineIds]);

  const scaled = useMemo(
    () =>
      sliced.brands.map((b) => ({
        ...b,
        data: b.data.map((v) =>
          Math.max(0, Math.min(100, Math.round(v * (0.55 + engineScale * 0.45) * 10) / 10))
        ),
      })),
    [sliced.brands, engineScale]
  );

  const dateRange = sliced.dates;
  const you = scaled.find((b) => b.isYou);
  const youLatest = you?.data[you.data.length - 1] ?? 0;
  const youFirst = you?.data[0] ?? 0;
  const youToday = youLatest;
  const youDelta = Math.round((youLatest - youFirst) * 10) / 10;

  const totalLatest = scaled.reduce((s, b) => s + (b.data[b.data.length - 1] ?? 0), 0);
  const sharePct = totalLatest > 0 ? Math.round((youLatest / totalLatest) * 1000) / 10 : 0;
  const totalMentions = scaled.reduce((s, b) => s + b.mentions, 0);
  const youMentions = you?.mentions ?? 0;

  const ranked = [...scaled].sort(
    (a, b) => (b.data[b.data.length - 1] ?? 0) - (a.data[a.data.length - 1] ?? 0)
  );
  const youRank = ranked.findIndex((b) => b.isYou) + 1;

  const brandDelta = (b: MockBrand & { data: number[] }) => {
    const first = b.data[0] ?? 0;
    const last = b.data[b.data.length - 1] ?? 0;
    return Math.round((last - first) * 10) / 10;
  };

  const compareDate = dateRange[0] ?? new Date();
  const todayDate = dateRange[dateRange.length - 1] ?? new Date();
  const trendWord =
    youDelta > 2 ? "climbing" : youDelta > 0 ? "holding steady" : youDelta > -2 ? "slipping a bit" : "losing ground";

  const engineCoverage = ENGINES.map((e) => {
    const today = Math.round(youLatest * e.scale * 10) / 10;
    const prev = Math.round(youFirst * e.scale * 10) / 10;
    return { ...e, today, prev, delta: Math.round((today - prev) * 10) / 10 };
  }).sort((a, b) => b.today - a.today);

  return {
    rangeN,
    dates: dateRange,
    scaledBrands: scaled,
    you,
    youLatest,
    youFirst,
    youToday,
    youDelta,
    sharePct,
    totalMentions,
    youMentions,
    ranked,
    youRank,
    brandDelta,
    compareDate,
    todayDate,
    trendWord,
    engineCoverage,
  };
}
type ScannerData = ReturnType<typeof useScannerData>;

// ─── AI OVERVIEW ────────────────────────────────────────────────────────────
// Reusable insight component shown under each card heading. Three visual
// styles (V1 sage callout / V2 italic Cormorant / V3 compact line). Insight
// text is data-derived via build*Insight helpers below — except the
// position- and SoV-specific builders, which live with their `PositionStat`
// type in the rank-series section.

type AIOverviewVariant = "V1" | "V2" | "V3";

function AIOverview({
  text,
  variant,
  size = "md",
}: {
  text: string;
  variant: AIOverviewVariant | undefined;
  size?: "sm" | "md";
}) {
  if (!variant) return null;
  if (variant === "V1") {
    const padX = size === "sm" ? 12 : 18;
    const padY = size === "sm" ? 8 : 14;
    const fs = size === "sm" ? 12 : 14;
    const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    return (
      <div
        className="rounded-[var(--radius-lg)] border-l-4"
        style={{
          borderLeftColor: COLORS.primary,
          backgroundColor: "rgba(150,162,131,0.10)",
          padding: `${padY}px ${padX}px`,
        }}
      >
        <div className="flex items-start gap-2.5">
          <HoverHint hint="AI summary of what this card's data means for your business.">
            <Sparkles
              className={`shrink-0 ${iconSize}`}
              style={{ color: COLORS.primary, marginTop: 1 }}
            />
          </HoverHint>
          <p
            className="text-[var(--color-fg)]"
            style={{ fontSize: fs, lineHeight: 1.5, fontWeight: 500 }}
          >
            {text}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "V2") {
    const fs = size === "sm" ? 13 : 15;
    return (
      <p
        className="italic text-[var(--color-fg-secondary)]"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: fs,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    );
  }

  // V3 — compact sparkle line
  const fs = size === "sm" ? 11 : 12;
  return (
    <div className="flex items-center gap-1.5">
      <HoverHint hint="AI summary of what this card's data means for your business.">
        <Sparkles
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: COLORS.primary }}
        />
      </HoverHint>
      <p
        className="text-[var(--color-fg-secondary)]"
        style={{ fontSize: fs, lineHeight: 1.4 }}
      >
        {text}
      </p>
    </div>
  );
}

function buildGaugeInsight(data: ScannerData): string {
  const tierWord =
    data.youToday >= 86
      ? "excellent"
      : data.youToday >= 61
      ? "strong"
      : data.youToday >= 31
      ? "fair"
      : "low";
  const trend =
    data.youDelta > 0.5
      ? `up ${data.youDelta.toFixed(1)}%`
      : data.youDelta < -0.5
      ? `down ${Math.abs(data.youDelta).toFixed(1)}%`
      : "holding steady";
  return `${data.youToday.toFixed(1)}% visibility — ${tierWord} territory, ${trend} this period.`;
}

export function buildChartInsight(data: ScannerData): string {
  const leader = data.ranked[0];
  const youCurrent = data.youToday;
  if (leader.isYou) {
    const second = data.ranked[1];
    const secondScore = second?.data[second.data.length - 1] ?? 0;
    return `You're leading at ${youCurrent.toFixed(1)}% — ${second?.name ?? "runner-up"} at ${secondScore.toFixed(1)}%.`;
  }
  const leaderScore = leader.data[leader.data.length - 1] ?? 0;
  const gap = leaderScore - youCurrent;
  return `${leader.name} leads at ${leaderScore.toFixed(1)}%; you're #${data.youRank} at ${youCurrent.toFixed(1)}% — ${gap.toFixed(1)}% gap to close.`;
}

function buildDistributionInsight(data: ScannerData): string {
  const sorted = [...data.engineCoverage].sort((a, b) => b.today - a.today);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  return `Strongest on ${strongest.label} (${strongest.today.toFixed(1)}%) — weakest on ${weakest.label} (${weakest.today.toFixed(1)}%). Closing this gap is your biggest lever.`;
}

// ─── CUSTOM DATE POPOVER ────────────────────────────────────────────────────

function CustomDatePopover({
  open,
  onClose,
  initialStart,
  initialEnd,
  minDate,
  maxDate,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initialStart: Date;
  initialEnd: Date;
  minDate: Date;
  maxDate: Date;
  onApply: (start: Date, end: Date) => void;
}) {
  const [start, setStart] = useState(toIsoDate(initialStart));
  const [end, setEnd] = useState(toIsoDate(initialEnd));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStart(toIsoDate(initialStart));
    setEnd(toIsoDate(initialEnd));
  }, [open, initialStart, initialEnd]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleApply = () => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
    onApply(s <= e ? s : e, s <= e ? e : s);
    onClose();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ANIMATION.micro, ease: ANIMATION.easeOut }}
      className="absolute top-full left-0 mt-2 z-50 w-80 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]"
    >
      <p className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-3">
        Custom Range
      </p>
      <div className="space-y-3 mb-4">
        <label className="block">
          <span className="block text-xs text-[var(--color-fg-secondary)] mb-1">Start date</span>
          <input
            type="date"
            value={start}
            min={toIsoDate(minDate)}
            max={toIsoDate(maxDate)}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-[var(--color-fg-secondary)] mb-1">End date</span>
          <input
            type="date"
            value={end}
            min={toIsoDate(minDate)}
            max={toIsoDate(maxDate)}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
        >
          Apply
        </button>
      </div>
    </motion.div>
  );
}

// ─── RANGE PILLS (with Custom + YTD) ────────────────────────────────────────

function RangePills({
  value,
  onChange,
  onCustomApply,
  customStart,
  customEnd,
  treatment,
  minDate,
  maxDate,
}: {
  value: RangeKey;
  onChange: (k: RangeKey) => void;
  onCustomApply: (start: Date, end: Date) => void;
  customStart: Date;
  customEnd: Date;
  treatment: Treatment;
  minDate: Date;
  maxDate: Date;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const fontSize = 12 + treatment.bodyBumpPx;

  return (
    <div className="relative inline-flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1">
        {RANGE_PRESETS.map((r) => (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            className={
              "px-3.5 py-2 font-medium rounded-[var(--radius-sm)] transition-colors " +
              (value === r.key
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
            }
            style={{ fontSize }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <HoverHint hint="Pick your own start and end dates.">
        <button
          onClick={() => setPopoverOpen((o) => !o)}
          className={
            "inline-flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-[var(--radius-md)] border transition-colors " +
            (value === "custom"
              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
              : "bg-[var(--color-surface)] text-[var(--color-fg-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]")
          }
          style={{ fontSize }}
        >
          <Calendar className="h-4 w-4" />
          {value === "custom" ? `${fmtDate(customStart)} – ${fmtDate(customEnd)}` : "Custom"}
        </button>
      </HoverHint>

      <CustomDatePopover
        open={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        initialStart={customStart}
        initialEnd={customEnd}
        minDate={minDate}
        maxDate={maxDate}
        onApply={onCustomApply}
      />
    </div>
  );
}

// ─── ENGINE CHIPS ───────────────────────────────────────────────────────────

type ChipSize = "sm" | "md" | "lg";

const CHIP_SIZE_STYLES: Record<ChipSize, { px: string; py: string; fontSize: number; iconSize: number; gap: string }> = {
  sm: { px: "px-2.5", py: "py-1",   fontSize: 11, iconSize: 11, gap: "gap-1.5" },
  md: { px: "px-3",   py: "py-1.5", fontSize: 12, iconSize: 13, gap: "gap-1.5" },
  lg: { px: "px-4",   py: "py-2",   fontSize: 13, iconSize: 15, gap: "gap-2"   },
};

function EngineChips({
  enabledIds,
  onToggle,
  treatment,
  chipSize = "md",
}: {
  enabledIds: Set<string>;
  onToggle: (id: string) => void;
  treatment: Treatment;
  chipSize?: ChipSize;
}) {
  const labelFontSize = CHIP_SIZE_STYLES[chipSize].fontSize + treatment.bodyBumpPx;
  const { px, py, iconSize, gap } = CHIP_SIZE_STYLES[chipSize];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[var(--color-fg-muted)] mr-1" style={{ fontSize: labelFontSize }}>
        AI engines:
      </span>
      {ENGINES.map((e) => {
        const active = enabledIds.has(e.id);
        return (
          <HoverHint
            key={e.id}
            hint={`${active ? "Hide" : "Show"} ${e.label} data in the dashboard.`}
          >
            <button
              onClick={() => onToggle(e.id)}
              className={
                `inline-flex items-center ${gap} ${px} ${py} rounded-[var(--radius-full)] border transition-colors ` +
                (active
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-transparent text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-fg-secondary)]")
              }
              style={{ fontSize: labelFontSize }}
            >
              <EngineIcon id={e.id} size={iconSize} />
              {e.label}
            </button>
          </HoverHint>
        );
      })}
    </div>
  );
}

// ─── ENGINE COVERAGE BAR ────────────────────────────────────────────────────

type EngineBarVariant = "minimal" | "with-stats" | "inline";
type EngineBarDensity = "tight" | "mini" | "dense";

function EngineCoverageBar({
  id,
  label,
  today,
  prev,
  delta,
  treatment,
  variant = "with-stats",
  density = "tight",
}: {
  id: string;
  label: string;
  today: number;
  prev: number;
  delta: number;
  treatment: Treatment;
  variant?: EngineBarVariant;
  density?: EngineBarDensity;
}) {
  const grew = delta >= 0;
  const minVal = Math.min(today, prev);
  const maxVal = Math.max(today, prev);

  const baseWPct = minVal;
  const diffWPct = maxVal - minVal;
  const diffStartPct = baseWPct;
  const diffMidPct = diffStartPct + diffWPct / 2;

  const dims = {
    tight: { padY: "10px 0 6px", barH: 9, labelSize: 12 + treatment.bodyBumpPx, floatSize: 10 + treatment.bodyBumpPx, mb: "mb-1.5", floatTop: "-top-4" },
    mini: { padY: "14px 0 4px", barH: 7, labelSize: 11 + treatment.bodyBumpPx, floatSize: 9 + treatment.bodyBumpPx, mb: "mb-1", floatTop: "-top-5" },
    // Dense (used by the AI Visibility Tracker "Visibility by AI tool"
    // card): squared-off bar ends, slightly thicker bar, larger floating
    // delta text with more headroom above the bar so it doesn't crowd.
    dense: { padY: "20px 0 4px", barH: 11, labelSize: 12, floatSize: 11, mb: "", floatTop: "-top-5" },
  }[density];

  const showStats = variant !== "minimal";
  const showFloating = variant !== "inline";

  if (density === "dense") {
    return (
      <div style={{ padding: dims.padY }} className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 text-[var(--color-fg-secondary)] shrink-0"
          style={{ fontSize: dims.labelSize, fontWeight: 500, width: 86 }}
        >
          <EngineIcon id={id} size={dims.labelSize} />
          {label}
        </span>
        <div
          className="flex-1 relative"
          style={{ height: dims.barH, backgroundColor: TOK.trackBg, borderRadius: 0 }}
        >
          {showFloating && Math.abs(delta) > 0.05 && (
            <span
              className={`absolute ${dims.floatTop} font-semibold tabular-nums`}
              style={{
                left: `${diffMidPct}%`,
                transform: "translateX(-50%)",
                color: grew ? TOK.growText : TOK.loseText,
                fontFamily: "ui-monospace, monospace",
                fontSize: dims.floatSize,
              }}
            >
              {grew ? "+" : "-"}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          <div
            className="absolute top-0 left-0"
            style={{
              height: dims.barH,
              width: `${baseWPct}%`,
              backgroundColor: grew ? TOK.growBase : TOK.loseBase,
            }}
          />
          {grew ? (
            <div
              className="absolute top-0"
              style={{
                height: dims.barH,
                left: `${diffStartPct}%`,
                width: `${diffWPct}%`,
                backgroundColor: TOK.growDiff,
                boxShadow: TOK.growGlow,
              }}
            />
          ) : (
            <div
              className="absolute top-0"
              style={{
                height: dims.barH,
                left: `${diffStartPct}%`,
                width: `${diffWPct}%`,
                backgroundColor: "transparent",
                border: `1px dashed ${TOK.loseBorder}`,
                boxSizing: "border-box",
              }}
            />
          )}
        </div>
        {showStats && (
          <span
            className="tabular-nums font-semibold shrink-0"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: dims.labelSize,
              color: "var(--color-fg)",
              width: 50,
              textAlign: "right",
            }}
          >
            {today.toFixed(1)}%
          </span>
        )}
        {variant === "with-stats" && Math.abs(delta) > 0.05 && (
          <HoverHint
            hint={`${grew ? "Up" : "Down"} ${Math.abs(delta).toFixed(1)}% vs. the start of the range.`}
          >
            <BadgeDelta
              variant="solid"
              deltaType={grew ? "increase" : "decrease"}
              value={`${Math.abs(delta).toFixed(1)}%`}
            />
          </HoverHint>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: dims.padY }}>
      <div className={`flex items-center justify-between ${dims.mb} gap-3`}>
        <span
          className="inline-flex items-center gap-1.5 text-[var(--color-fg-secondary)]"
          style={{ fontSize: dims.labelSize, fontWeight: 500 }}
        >
          <EngineIcon id={id} size={dims.labelSize} />
          {label}
        </span>
        {showStats && (
          <div className="flex items-center gap-2">
            <HoverHint
              hint={`Share of ${label} answers that mention you.`}
            >
              <span
                className="tabular-nums font-semibold"
                style={{
                  fontFamily: "ui-monospace, monospace",
                  color: "var(--color-fg)",
                  fontSize: dims.labelSize,
                }}
              >
                {today.toFixed(1)}%
              </span>
            </HoverHint>
            {variant === "with-stats" && Math.abs(delta) > 0.05 && (
              <BadgeDelta
                variant="solid"
                deltaType={grew ? "increase" : "decrease"}
                value={`${Math.abs(delta).toFixed(1)}%`}
              />
            )}
          </div>
        )}
      </div>
      <div
        className="relative w-full"
        style={{ height: dims.barH, backgroundColor: TOK.trackBg, borderRadius: 999 }}
      >
        {showFloating && Math.abs(delta) > 0.05 && (
          <span
            className={`absolute ${dims.floatTop} font-semibold tabular-nums`}
            style={{
              left: `${diffMidPct}%`,
              transform: "translateX(-50%)",
              color: grew ? TOK.growText : TOK.loseText,
              fontFamily: "ui-monospace, monospace",
              fontSize: dims.floatSize,
            }}
          >
            {grew ? "+" : "-"}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        <div
          className="absolute top-0 left-0 rounded-l-full"
          style={{
            height: dims.barH,
            width: `${baseWPct}%`,
            backgroundColor: grew ? TOK.growBase : TOK.loseBase,
          }}
        />
        {grew ? (
          <div
            className="absolute top-0 rounded-r-full"
            style={{
              height: dims.barH,
              left: `${diffStartPct}%`,
              width: `${diffWPct}%`,
              backgroundColor: TOK.growDiff,
              boxShadow: TOK.growGlow,
            }}
          />
        ) : (
          <div
            className="absolute top-0 rounded-r-full"
            style={{
              height: dims.barH,
              left: `${diffStartPct}%`,
              width: `${diffWPct}%`,
              backgroundColor: "transparent",
              border: `1px dashed ${TOK.loseBorder}`,
              boxSizing: "border-box",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── HERO PARTS (title + description) ──────────────────────────────────────

function HeroTitle({ data }: { data: ScannerData; treatment: Treatment }) {
  return (
    <h1
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(36px, 4.6vw, 60px)",
        fontWeight: 600,
        lineHeight: 1.12,
        letterSpacing: "-0.01em",
        color: "var(--color-fg)",
      }}
    >
      Your AI visibility is{" "}
      <span
        style={{
          color: data.youDelta >= 0 ? TOK.growText : TOK.loseText,
          fontStyle: "italic",
        }}
      >
        {data.trendWord}
      </span>
      .
    </h1>
  );
}

const HERO_DESCRIPTION =
  "AI visibility tracks how often ChatGPT, Claude, Gemini, and Google AI name your business when answering customer questions. Each scan shows your mention rate per engine, how it's trending over time, and where you stand against your competitors.";

const NEXT_SCAN_PROMPT_COUNT = 248;

function HeroDescription({ text }: { text: string }) {
  return (
    <p className="text-[var(--color-fg-muted)] mt-2" style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}>
      <strong className="text-[var(--color-fg)] font-semibold">Why is this important?</strong>{" "}
      {text}
    </p>
  );
}

// ─── DISTRIBUTION BY AI TOOL CARD ───────────────────────────────────────────

function DistributionByLLMCard({
  data,
  treatment,
  barVariant = "with-stats",
  density = "tight",
  aiOverviewVariant,
}: {
  data: ScannerData;
  treatment: Treatment;
  barVariant?: EngineBarVariant;
  density?: EngineBarDensity;
  aiOverviewVariant?: AIOverviewVariant;
}) {
  const cardPad = density === "dense" ? "p-4" : density === "mini" ? "p-4" : "p-5";
  // One-word health pill for the whole card. Average visibility across all
  // tracked engines + average per-engine delta drives the wording.
  const avgVisibility =
    data.engineCoverage.length > 0
      ? data.engineCoverage.reduce((s, e) => s + e.today, 0) /
        data.engineCoverage.length
      : 0;
  const avgEngineDelta =
    data.engineCoverage.length > 0
      ? data.engineCoverage.reduce((s, e) => s + e.delta, 0) /
        data.engineCoverage.length
      : 0;
  const visibilityVerdict = verdictForVisibility(avgVisibility, avgEngineDelta);
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] w-full min-w-0 flex flex-col ${cardPad}`}>
      <div className="mb-2 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading
          text="Visibility by AI tool"
          info="How often each AI tool mentions your business in answers."
        />
        <div className="shrink-0">
          <VerdictPill
            word={visibilityVerdict.word}
            tone={visibilityVerdict.tone}
            hint={visibilityVerdict.hint}
          />
        </div>
      </div>
      {aiOverviewVariant && (
        <div className="mb-3">
          <AIOverview
            text={buildDistributionInsight(data)}
            variant={aiOverviewVariant}
            size="sm"
          />
        </div>
      )}
      <div>
        {data.engineCoverage.map((e) => (
          <EngineCoverageBar
            key={e.id}
            id={e.id}
            label={e.label}
            today={e.today}
            prev={e.prev}
            delta={e.delta}
            treatment={treatment}
            variant={barVariant}
            density={density}
          />
        ))}
      </div>
    </div>
  );
}

// ─── AVERAGE POSITION (recommendation rank when named) ──────────────────────

type PositionStat = {
  brand: ScannerData["ranked"][number];
  current: number;
  delta: number;
  series: number[];
};

export function buildPositionStats(data: ScannerData): PositionStat[] {
  const T = data.dates.length;
  const seriesById: Record<string, number[]> = {};
  for (const b of data.ranked) seriesById[b.id] = [];

  // Smooth-rank scale (in visibility-percentage points). Two brands within
  // ±SCALE of each other contribute fractional weight to each other's rank
  // instead of a hard 0/1 step — that's what keeps the chart line smooth
  // through near-tie crossover periods. Larger SCALE = smoother lines.
  const SCALE = 4.5;
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  for (let t = 0; t < T; t++) {
    for (const b of data.ranked) {
      const vB = b.data[t] ?? 0;
      // rank = 1 + Σ over other brands of soft-step(v_C > v_B). When two
      // brands are far apart the soft step ≈ 1 or 0 (matches integer
      // rank); when they're close it ≈ 0.5, producing a continuous rank
      // somewhere between the two integer positions.
      let rank = 1;
      for (const c of data.ranked) {
        if (c.id === b.id) continue;
        const vC = c.data[t] ?? 0;
        rank += sigmoid((vC - vB) / SCALE);
      }
      seriesById[b.id].push(rank);
    }
  }

  // Delta = first vs last point of the SLICED series so the pill matches
  // the chart's visual start-to-end change for the selected time range.
  // For rank, a positive delta means the rank number went UP (worse).
  return data.ranked.map((b) => {
    const series = seriesById[b.id];
    const first = series[0] ?? 0;
    const last = series[series.length - 1] ?? 0;
    const current = last;
    const delta = last - first;
    return { brand: b, current, delta, series };
  });
}

export function buildSOVStats(data: ScannerData): PositionStat[] {
  const T = data.dates.length;
  const seriesById: Record<string, number[]> = {};
  for (const b of data.ranked) seriesById[b.id] = [];

  for (let t = 0; t < T; t++) {
    const sum = data.ranked.reduce((s, b) => s + (b.data[t] ?? 0), 0);
    for (const b of data.ranked) {
      const sov = sum > 0 ? ((b.data[t] ?? 0) / sum) * 100 : 0;
      seriesById[b.id].push(sov);
    }
  }

  // Delta = last point − first point of the SLICED series, mirroring the
  // chart's visible change for the active time range.
  return data.ranked.map((b) => {
    const series = seriesById[b.id];
    const first = series[0] ?? 0;
    const last = series[series.length - 1] ?? 0;
    const current = last;
    const delta = last - first;
    return { brand: b, current, delta, series };
  });
}

export function buildSOVInsight(stats: PositionStat[]): string {
  const you = stats.find((s) => s.brand.isYou);
  if (!you) return "";
  const sortedByShare = [...stats].sort((a, b) => b.current - a.current);
  const leader = sortedByShare[0];

  if (you.delta > 0.5) {
    return `Your share of voice climbed to ${you.current.toFixed(1)}%. You're capturing more mention real estate this period.`;
  }
  if (you.delta < -0.5) {
    return `Your share of voice slipped to ${you.current.toFixed(1)}%. Push fresh content to reclaim mention share.`;
  }
  if (leader.brand.isYou) {
    return `You hold the largest share of voice at ${you.current.toFixed(1)}%. Defend the lead with steady drops.`;
  }
  return `You hold ${you.current.toFixed(1)}% of voice. ${leader.brand.name} leads at ${leader.current.toFixed(1)}% — close the gap with focused content.`;
}

export function buildPositionInsight(stats: PositionStat[]): string {
  const you = stats.find((s) => s.brand.isYou);
  if (!you) return "";
  const competitors = stats.filter((s) => !s.brand.isYou);
  const ahead = competitors.filter((s) => s.current < you.current);
  const behind = competitors.filter((s) => s.current >= you.current);

  if (you.delta > 0.4) {
    return `You climbed from #${(you.current + you.delta).toFixed(1)} to #${you.current.toFixed(1)} on average. Keep the momentum — you're closing on ${ahead[0]?.brand.name ?? "the leaders"}.`;
  }
  if (you.delta < -0.4) {
    return `Your average position slipped to #${you.current.toFixed(1)}. ${behind[0]?.brand.name ?? "Competitors"} are catching up — refresh top pages this week.`;
  }
  if (ahead.length === 0) {
    return `You're the top recommendation at #${you.current.toFixed(1)}. Hold the lead with steady content drops.`;
  }
  return `Solid mid-pack position at #${you.current.toFixed(1)}. Push to close the gap on ${ahead.map((a) => a.brand.name).slice(0, 2).join(" and ")}.`;
}

// ─── Position chart (Recharts wrapper + crosshair tooltip + end-label dot) ──

function buildPositionChartData(
  data: ScannerData,
  stats: PositionStat[],
): Record<string, string | number>[] {
  return data.dates.map((d, i) => {
    const point: Record<string, string | number> = { date: fmtDate(d) };
    for (const s of stats) point[s.brand.id] = s.series[i];
    return point;
  });
}

function PositionEndLabelDot({
  cx,
  cy,
  index,
  brand,
  totalPoints,
  value,
  delta,
  mode,
  youLabelOverride,
  hideEndLabelDelta = false,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  brand: PositionStat["brand"];
  totalPoints: number;
  value: number;
  delta?: number;
  mode: RankSeriesMode;
  /** When provided, replaces the default "valueStr  You" label. Pass "You" to
   *  drop the rank value entirely. */
  youLabelOverride?: string;
  /** Hide the dual-pill delta (the small ±N% pill next to the YOU label). */
  hideEndLabelDelta?: boolean;
}) {
  if (cx == null || cy == null) return null;
  if (index !== totalPoints - 1) return <g />;

  if (!brand.isYou) {
    return <circle cx={cx} cy={cy} r={3} fill={brand.color} opacity={0.55} />;
  }

  const valueStr =
    mode === "position" ? `#${value.toFixed(1)}` : `${value.toFixed(1)}%`;
  const text = youLabelOverride ?? `${valueStr}  You`;
  const charW = 6;
  const padX = 8;
  const W = Math.max(60, text.length * charW + padX * 2);
  const H = 18;
  const fontSize = 10;
  const labelX = cx + 8;

  // For position mode: positive delta = improvement (lower rank #).
  // For share-of-voice: positive delta = gained share. Both are "good" when > 0.
  // Always show the dual pill on the YOU line so the user can see their growth at a glance.
  const showDelta =
    !hideEndLabelDelta &&
    delta != null &&
    (brand.isYou || Math.abs(delta) > 0.04);
  const flat = (delta ?? 0) === 0 || Math.abs(delta ?? 0) < 0.05;
  const grew = (delta ?? 0) > 0;
  const deltaSign = flat ? "" : grew ? "+" : "−";
  const deltaStr =
    mode === "position"
      ? `${deltaSign}${Math.abs(delta ?? 0).toFixed(1)}`
      : `${deltaSign}${Math.abs(delta ?? 0).toFixed(1)}%`;
  const deltaColor = flat ? "#9a9a9a" : grew ? "#6a9e6a" : "#c06060";
  const dPadX = 7;
  const dW = Math.max(34, deltaStr.length * 6 + dPadX * 2);
  const dX = labelX + W + 5;

  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={4} fill={brand.color} stroke="#fff" strokeWidth={1.5} />
      <rect x={labelX} y={cy - H / 2} width={W} height={H} rx={H / 2} fill={brand.color} opacity={0.95} />
      <text
        x={labelX + padX}
        y={cy + 3.5}
        fill="#ffffff"
        fontSize={fontSize}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {text}
      </text>
      {showDelta && (
        <>
          <rect
            x={dX}
            y={cy - H / 2}
            width={dW}
            height={H}
            rx={H / 2}
            fill={deltaColor}
            opacity={0.9}
          />
          <text
            x={dX + dPadX}
            y={cy + 3.5}
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {deltaStr}
          </text>
        </>
      )}
    </g>
  );
}

type RankSeriesMode = "position" | "share-of-voice";

interface PositionTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

function formatRankValue(v: number, mode: RankSeriesMode): string {
  // Show 2-decimal precision in the chart tooltip so the per-day rank
  // (which is a continuous fractional value) reads accurately. Whole-number
  // formatting was hiding the actual ranking gradient between brands.
  if (mode === "position") return `#${v.toFixed(2)}`;
  return `${v.toFixed(1)}%`;
}

function formatRankValueDetailed(v: number, mode: RankSeriesMode): string {
  if (mode === "position") return v.toFixed(2);
  return `${v.toFixed(1)}%`;
}

function PositionCrosshairCursor(props: {
  points?: { x: number; y: number }[];
  top?: number;
  height?: number;
  left?: number;
  width?: number;
}) {
  const { points, top = 0, height = 0, left = 0, width = 0 } = props;
  if (!points || !points[0]) return null;
  const x = points[0].x;
  const yPoint = points[0].y;
  const right = left + width;
  const bottom = top + height;
  return (
    <g style={{ pointerEvents: "none" }}>
      <line
        x1={x}
        y1={top}
        x2={x}
        y2={bottom}
        stroke={COLORS.fgMuted}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <line
        x1={left}
        y1={yPoint}
        x2={right}
        y2={yPoint}
        stroke={COLORS.fgMuted}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.55}
      />
    </g>
  );
}

function PositionTooltip({
  active,
  payload,
  label,
  coordinate,
  stats,
  mode,
}: {
  active?: boolean;
  payload?: PositionTooltipPayloadItem[];
  label?: string;
  coordinate?: { x: number; y: number };
  stats: PositionStat[];
  mode: RankSeriesMode;
}) {
  if (!active || !payload || !payload.length) return null;

  const brandById = new Map(stats.map((s) => [s.brand.id, s.brand]));
  const seen = new Set<string>();
  const rows = payload
    .filter((p) => {
      const key = String(p.dataKey ?? p.name ?? "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => {
      const id = String(p.dataKey ?? "");
      const brand = brandById.get(id);
      if (!brand) return null;
      return { brand, value: Number(p.value ?? 0) };
    })
    .filter((r): r is { brand: PositionStat["brand"]; value: number } => r !== null)
    .sort((a, b) =>
      mode === "position" ? a.value - b.value : b.value - a.value,
    );

  const W = 180;
  const margin = 14;
  // Tooltip ALWAYS places to the left of the cursor — overrides the prior
  // "default-LEFT, flip-RIGHT near left edge" locked behavior. When the
  // chart sits in a narrow column (e.g. the half-width slot on
  // /competitor-comparison) the cursor was constantly inside the
  // flip-RIGHT threshold, parking the tooltip over the chart instead of
  // off it. Pinning to LEFT keeps the tooltip out of the data path.
  void coordinate;
  const transform = `translateX(calc(-100% - ${margin}px))`;

  return (
    <div
      style={{
        transform,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 4,
        padding: "5px 8px",
        boxShadow: "var(--shadow-sm)",
        width: W,
        fontSize: 10,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: COLORS.fgMuted,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {rows.map((r) => (
        <div
          key={r.brand.id}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "1.5px 0" }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: r.brand.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              flex: 1,
              color: COLORS.fg,
              fontWeight: r.brand.isYou ? 600 : 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {r.brand.isYou ? "You" : r.brand.name}
          </span>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontWeight: 600,
              color: COLORS.fg,
            }}
          >
            {formatRankValue(r.value, mode)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PositionChart({
  data,
  stats,
  mode,
  height = 240,
  rightMargin = 110,
  hoveredBrandId = null,
  youLabelOverride,
  hideEndLabelDelta = false,
}: {
  data: ScannerData;
  stats: PositionStat[];
  mode: RankSeriesMode;
  height?: number;
  rightMargin?: number;
  hoveredBrandId?: string | null;
  youLabelOverride?: string;
  hideEndLabelDelta?: boolean;
}) {
  const chartData = useMemo(() => buildPositionChartData(data, stats), [data, stats]);

  const tickEvery = chartData.length <= 14 ? 2 : chartData.length <= 30 ? 5 : 14;
  const xTicks = chartData
    .map((_, i) =>
      i % tickEvery === 0 || i === chartData.length - 1 ? (chartData[i].date as string) : null,
    )
    .filter((v): v is string => v !== null);

  const filterFor = (s: PositionStat) =>
    s.brand.isYou
      ? `drop-shadow(0 0 1px ${s.brand.color}) drop-shadow(0 0 1.6px ${s.brand.color})`
      : undefined;

  const sovDomain = useMemo<[number, number]>(() => {
    if (mode !== "share-of-voice") return [0, 100];
    let lo = 100;
    let hi = 0;
    for (const s of stats) {
      for (const v of s.series) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const buffer = 5;
    const min = Math.max(0, Math.floor((lo - buffer) / 5) * 5);
    const max = Math.min(100, Math.ceil((hi + buffer) / 5) * 5);
    return [min, max];
  }, [mode, stats]);

  const yAxisProps =
    mode === "position"
      ? {
          reversed: true,
          // Always show the full 1–5 rank window so the line doesn't visually
          // re-zoom when only the top 2-3 brands are populated. With ≥5
          // brands the domain extends to fit all of them.
          domain: [1, Math.max(5, stats.length)] as [number, number],
          ticks: Array.from(
            { length: Math.max(5, stats.length) },
            (_, i) => i + 1,
          ),
          allowDecimals: false,
          tickFormatter: (v: number) => `#${v}`,
          width: 36,
        }
      : {
          reversed: false,
          domain: sovDomain,
          tickFormatter: (v: number) => `${v}%`,
          width: 40,
          allowDecimals: false,
        };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 12, right: rightMargin, bottom: 4, left: -8 }}>
        <CartesianGrid
          strokeDasharray="3 4"
          stroke="rgba(107,109,107,0.45)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          ticks={xTicks}
          tick={{ fill: COLORS.fgMuted, fontSize: 11 }}
          axisLine={{ stroke: COLORS.border }}
          tickLine={false}
        />
        <YAxis
          {...yAxisProps}
          tick={{ fill: COLORS.fgMuted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={<PositionCrosshairCursor />}
          offset={0}
          allowEscapeViewBox={{ x: true }}
          content={(props) => (
            <PositionTooltip
              active={props.active as boolean}
              payload={props.payload as unknown as PositionTooltipPayloadItem[]}
              label={props.label as string}
              coordinate={props.coordinate as { x: number; y: number }}
              stats={stats}
              mode={mode}
            />
          )}
        />
        {stats.map((s) => {
          const isHovered = hoveredBrandId === s.brand.id;
          const isDimmed = hoveredBrandId != null && !isHovered;
          const baseOpacity = s.brand.isYou ? 1 : 0.4;
          const lineOpacity = isHovered ? 1 : isDimmed ? 0.08 : baseOpacity;
          const lineWidth = isHovered ? 1.75 : s.brand.isYou ? 1.5 : 0.625;
          return (
          <Line
            key={s.brand.id}
            type="linear"
            dataKey={s.brand.id}
            stroke={s.brand.color}
            strokeWidth={lineWidth}
            strokeOpacity={lineOpacity}
            style={{ filter: filterFor(s) }}
            dot={(props) => (
              <PositionEndLabelDot
                {...(props as { cx?: number; cy?: number; index?: number })}
                brand={s.brand}
                totalPoints={chartData.length}
                value={s.current}
                delta={s.delta}
                mode={mode}
                youLabelOverride={youLabelOverride}
                hideEndLabelDelta={hideEndLabelDelta}
              />
            )}
            activeDot={{ r: s.brand.isYou ? 5 : 3, fill: s.brand.color, stroke: "#fff", strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Brand row + RankSeriesCard (insight + list + chart) ───────────────────

function PositionBrandRow({
  stat,
  mode,
  onHover,
  isDimmed,
  showDelta = true,
  showRankValue = true,
}: {
  stat: PositionStat;
  mode: RankSeriesMode;
  onHover?: (id: string | null) => void;
  isDimmed?: boolean;
  showDelta?: boolean;
  showRankValue?: boolean;
}) {
  // Polarity is mode-dependent — mirrors RankDeltaPill so the per-row
  // pill agrees with the header pill on what counts as "good".
  //   • position mode: rank delta < 0 = rank number went down = improved → green ↑
  //   • share-of-voice mode: delta > 0 = gained share = improved → green ↑
  const improved =
    mode === "position" ? stat.delta < 0 : stat.delta > 0;
  // `grew` describes which way the underlying number actually moved
  // (used for the "Up X positions" / "Down X%" hint copy).
  const grew = stat.delta > 0;
  return (
    <div
      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded transition-opacity duration-200"
      style={{
        backgroundColor: stat.brand.isYou
          ? "rgba(150,162,131,0.12)"
          : undefined,
        opacity: isDimmed ? 0.4 : 1,
        cursor: onHover ? "pointer" : undefined,
      }}
      onMouseEnter={() => onHover?.(stat.brand.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <span
        className="shrink-0"
        style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: stat.brand.color }}
      />
      <span
        className="flex-1 text-[var(--color-fg)] truncate"
        style={{ fontSize: 13, fontWeight: stat.brand.isYou ? 600 : 400 }}
      >
        {stat.brand.isYou ? "You" : stat.brand.name}
      </span>
      {showRankValue && (
        <HoverHint
          hint={
            mode === "position"
              ? "Average rank when mentioned. Lower is better — 1.00 = listed first."
              : "Share of all brand mentions in AI answers."
          }
        >
          <span
            className="tabular-nums shrink-0"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            {formatRankValueDetailed(stat.current, mode)}
          </span>
        </HoverHint>
      )}
      {showDelta &&
        (() => {
          const flat = Math.abs(stat.delta) <= 0.04;
          const valueStr =
            mode === "position"
              ? Math.abs(stat.delta).toFixed(2)
              : `${Math.abs(stat.delta).toFixed(1)}%`;
          const hint = flat
            ? "No change vs. the start of the range."
            : mode === "position"
              ? `${grew ? "Up" : "Down"} ${Math.abs(stat.delta).toFixed(2)} positions vs. the start of the range.`
              : `${grew ? "Up" : "Down"} ${Math.abs(stat.delta).toFixed(1)}% vs. the start of the range.`;
          return (
            <HoverHint hint={hint}>
              <BadgeDelta
                variant="solid"
                deltaType={flat ? "neutral" : improved ? "increase" : "decrease"}
                value={valueStr}
              />
            </HoverHint>
          );
        })()}
    </div>
  );
}

type RankCardDensity = "comfortable" | "tight" | "mini" | "dense";

// Maps engine visibility % → a plausible rank value (1.0 = best, ~5.0 = bottom).
// Steeper mapping so leader (~65%) ≈ #1 and laggard (~30%) ≈ #4.5 — gives
// visually distinct rows. Used to derive per-engine rank from existing scan
// data without a separate field.
function rankFromVisibility(pct: number): number {
  return Math.max(1, Math.min(5, 1 + ((65 - pct) / 35) * 3.5));
}

// Color stops by rank — sage at #1 (best), warming through yellow → orange as
// the rank gets worse.
function colorForRank(rank: number): string {
  if (rank <= 1.5) return "#7D8E6C"; // deep sage
  if (rank <= 2.5) return "#96A283"; // sage primary
  if (rank <= 3.5) return "#B8A030"; // yellow
  if (rank <= 4.5) return "#C97B45"; // warning orange
  return "#B54631"; // rust
}

interface RankRowProps {
  id: string;
  label: string;
  rank: number;
  prevRank: number;
}

function EngineRankRow({ id, label, rank, prevRank }: RankRowProps) {
  const delta = prevRank - rank;
  const grew = delta > 0;
  const accent = colorForRank(rank);

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "6px 12px",
        background: `linear-gradient(90deg, ${accent}14 0%, transparent 100%)`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        marginBottom: 2,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 text-[var(--color-fg)] flex-1"
        style={{ fontSize: 13, fontWeight: 500 }}
      >
        <EngineIcon id={id} size={13} />
        {label}
      </span>
      <HoverHint hint={`Your average rank in ${label} answers. Lower is better.`}>
        <span
          className="tabular-nums font-bold shrink-0"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: "-0.02em",
            color: accent,
            cursor: "help",
            lineHeight: 1,
          }}
        >
          #{rank.toFixed(1)}
        </span>
      </HoverHint>
      {Math.abs(delta) > 0.04 && (
        <HoverHint
          hint={`${grew ? "Up" : "Down"} ${Math.abs(delta).toFixed(2)} positions in ${label} vs. the start of the range.`}
        >
          <BadgeDelta
            variant="solid"
            deltaType={grew ? "increase" : "decrease"}
            value={Math.abs(delta).toFixed(2)}
          />
        </HoverHint>
      )}
    </div>
  );
}

export function RankSeriesCard({
  title,
  titleInfo,
  data,
  stats,
  insight,
  mode,
  layout,
  density = "comfortable",
  listWidthPx,
  chartHeightPx,
  aiOverviewVariant,
  showDelta = true,
  showRankValue = true,
  headerRight,
  youLabelOverride,
  hideEndLabelDelta = false,
  variant = "full",
  hoveredBrandId: hoveredBrandIdProp,
  onHoverBrand,
}: {
  title: string;
  titleInfo?: string;
  data: ScannerData;
  stats: PositionStat[];
  insight: string;
  mode: RankSeriesMode;
  layout: "list-left" | "list-top";
  density?: RankCardDensity;
  listWidthPx?: number;
  chartHeightPx?: number;
  aiOverviewVariant?: AIOverviewVariant;
  showDelta?: boolean;
  showRankValue?: boolean;
  headerRight?: React.ReactNode;
  /** Override the YOU end-of-line label (default: "valueStr  You"). Pass
   *  "You" to drop the rank value pill on the chart canvas. */
  youLabelOverride?: string;
  /** Hide the dual-pill delta floating next to the YOU end label. */
  hideEndLabelDelta?: boolean;
  /** "full" (default) renders list + chart; "list-only" hides the chart;
   *  "chart-only" hides the list. Used to split this card across two
   *  side-by-side boxes in the AI Visibility Tracker hero. */
  variant?: "full" | "list-only" | "chart-only";
  /** Externally controlled hover state. When provided, hover-dim updates
   *  bubble up through `onHoverBrand` so a sibling card (e.g. the chart
   *  half of a split RankSeriesCard) can mirror the highlight. */
  hoveredBrandId?: string | null;
  onHoverBrand?: (id: string | null) => void;
}) {
  const sorted = useMemo(
    () =>
      [...stats]
        .sort((a, b) => (mode === "position" ? a.current - b.current : b.current - a.current))
        .slice(0, 5),
    [stats, mode],
  );

  const [internalHover, setInternalHover] = useState<string | null>(null);
  // Use the controlled prop when provided so a sibling card (e.g. the
  // chart half of a split RankSeriesCard) can mirror this hover state.
  const hoveredBrandId =
    hoveredBrandIdProp !== undefined ? hoveredBrandIdProp : internalHover;
  const setHoveredBrandId = (id: string | null) => {
    if (onHoverBrand) onHoverBrand(id);
    else setInternalHover(id);
  };

  const dims = {
    comfortable: { chartH: layout === "list-top" ? 200 : 240, pad: "p-5", spacing: "space-y-4", showInsight: true, showList: true, listSpacing: "space-y-1" },
    tight: { chartH: layout === "list-top" ? 150 : 160, pad: "p-4", spacing: "space-y-3", showInsight: true, showList: true, listSpacing: "space-y-0" },
    mini: { chartH: layout === "list-top" ? 130 : 140, pad: "p-4", spacing: "space-y-2", showInsight: true, showList: true, listSpacing: "space-y-0" },
    dense: { chartH: layout === "list-top" ? 120 : 130, pad: "p-3", spacing: "space-y-2", showInsight: false, showList: false, listSpacing: "" },
  }[density];

  const effectiveChartH = chartHeightPx ?? dims.chartH;
  const w = listWidthPx ?? 200;
  const gridColsClass =
    w === 120 ? "lg:grid-cols-[120px_minmax(0,1fr)]" :
    w === 140 ? "lg:grid-cols-[140px_minmax(0,1fr)]" :
    w === 160 ? "lg:grid-cols-[160px_minmax(0,1fr)]" :
    w === 180 ? "lg:grid-cols-[180px_minmax(0,1fr)]" :
    w === 220 ? "lg:grid-cols-[220px_minmax(0,1fr)]" :
    w === 240 ? "lg:grid-cols-[240px_minmax(0,1fr)]" :
    w === 260 ? "lg:grid-cols-[260px_minmax(0,1fr)]" :
    "lg:grid-cols-[200px_minmax(0,1fr)]";

  const chart = (
    <PositionChart
      data={data}
      stats={stats}
      mode={mode}
      height={effectiveChartH}
      rightMargin={140}
      hoveredBrandId={hoveredBrandId}
      youLabelOverride={youLabelOverride}
      hideEndLabelDelta={hideEndLabelDelta}
    />
  );

  const list = (
    <div className={dims.listSpacing}>
      {sorted.map((s) => (
        <PositionBrandRow
          key={s.brand.id}
          stat={s}
          mode={mode}
          onHover={setHoveredBrandId}
          isDimmed={hoveredBrandId != null && hoveredBrandId !== s.brand.id}
          showDelta={showDelta}
          showRankValue={showRankValue}
        />
      ))}
    </div>
  );

  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] w-full min-w-0 flex flex-col ${dims.pad} ${dims.spacing}`}>
      <div className="mb-1 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading text={title} info={titleInfo} />
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {dims.showInsight && aiOverviewVariant && (
        <AIOverview text={insight} variant={aiOverviewVariant} size="sm" />
      )}
      {variant === "list-only" ? (
        list
      ) : variant === "chart-only" ? (
        chart
      ) : !dims.showList ? (
        chart
      ) : layout === "list-left" ? (
        <div className={`grid grid-cols-1 ${gridColsClass} gap-4 items-center`}>
          {list}
          {chart}
        </div>
      ) : (
        <div className={dims.spacing}>
          {list}
          {chart}
        </div>
      )}
    </div>
  );
}

// ─── ONE-WORD VERDICT PILL + HEALTH HEURISTICS ─────────────────────────────
// Lightweight summary chip used in the top-right header of the Visibility
// by AI tool + Average rank per AI model cards. Each takes a single tone
// + word + hover hint computed from the card's underlying metric mix.

type VerdictTone = "good" | "fair" | "warn" | "bad";

const VERDICT_TONE_STYLE: Record<
  VerdictTone,
  { color: string; bg: string }
> = {
  good: { color: "#5E7250", bg: "rgba(150,162,131,0.22)" },
  fair: { color: "#7E6B17", bg: "rgba(184,160,48,0.20)" },
  warn: { color: "#A35F32", bg: "rgba(201,123,69,0.22)" },
  bad: { color: "#B54631", bg: "rgba(181,70,49,0.18)" },
};

function VerdictPill({
  word,
  tone,
  hint,
}: {
  word: string;
  tone: VerdictTone;
  hint: string;
}) {
  const style = VERDICT_TONE_STYLE[tone];
  return (
    <HoverHint hint={hint}>
      <span
        className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap cursor-help"
        style={{ color: style.color, backgroundColor: style.bg }}
      >
        {word}
      </span>
    </HoverHint>
  );
}

// Visibility verdict: averages the per-engine % across all engines plus
// the average period-over-period engine delta. Wording leans toward the
// trend when the snapshot itself is mid-band.
function verdictForVisibility(
  avgPct: number,
  avgDelta: number,
): { word: string; tone: VerdictTone; hint: string } {
  const trend =
    avgDelta > 5
      ? "Trending up sharply"
      : avgDelta > 1
        ? "Trending up"
        : avgDelta < -5
          ? "Trending down sharply"
          : avgDelta < -1
            ? "Trending down"
            : "Holding flat";
  if (avgPct >= 70)
    return {
      word: "Excellent",
      tone: "good",
      hint: `${avgPct.toFixed(1)}% average visibility across tracked engines. ${trend} vs. the start of the range.`,
    };
  if (avgPct >= 55)
    return {
      word: "Strong",
      tone: "good",
      hint: `${avgPct.toFixed(1)}% average visibility across tracked engines. ${trend} vs. the start of the range.`,
    };
  if (avgPct >= 35)
    return {
      word: avgDelta > 1 ? "Improving" : "Mixed",
      tone: avgDelta > 1 ? "good" : "fair",
      hint: `${avgPct.toFixed(1)}% average visibility across tracked engines. ${trend} vs. the start of the range.`,
    };
  if (avgPct >= 20)
    return {
      word: "Weak",
      tone: "warn",
      hint: `${avgPct.toFixed(1)}% average visibility across tracked engines — below the strong threshold. ${trend} vs. the start of the range.`,
    };
  return {
    word: "Critical",
    tone: "bad",
    hint: `${avgPct.toFixed(1)}% average visibility across tracked engines. ${trend} vs. the start of the range.`,
  };
}

// Rank verdict: lower is better. Uses the average per-engine rank plus
// the average rank delta (negative = improved = rank dropped numerically).
function verdictForRank(
  avgRank: number,
  avgRankDelta: number,
): { word: string; tone: VerdictTone; hint: string } {
  const trend =
    avgRankDelta < -0.3
      ? "Improving"
      : avgRankDelta > 0.3
        ? "Slipping"
        : "Holding steady";
  if (avgRank <= 1.5)
    return {
      word: "Dominant",
      tone: "good",
      hint: `Average rank of #${avgRank.toFixed(2)} across tracked engines — you're typically named first. ${trend} vs. the start of the range.`,
    };
  if (avgRank <= 2.5)
    return {
      word: "Strong",
      tone: "good",
      hint: `Average rank of #${avgRank.toFixed(2)} across tracked engines. ${trend} vs. the start of the range.`,
    };
  if (avgRank <= 3.5)
    return {
      word: avgRankDelta < 0 ? "Climbing" : "Mid-pack",
      tone: avgRankDelta < 0 ? "good" : "fair",
      hint: `Average rank of #${avgRank.toFixed(2)} across tracked engines. ${trend} vs. the start of the range.`,
    };
  if (avgRank <= 4.5)
    return {
      word: "Trailing",
      tone: "warn",
      hint: `Average rank of #${avgRank.toFixed(2)} across tracked engines — competitors are named ahead of you. ${trend} vs. the start of the range.`,
    };
  return {
    word: "Far behind",
    tone: "bad",
    hint: `Average rank of #${avgRank.toFixed(2)} across tracked engines. ${trend} vs. the start of the range.`,
  };
}

// ─── ENGINE RANK CARD (per-AI-model rank breakdown) ────────────────────────

function EngineRankCard({
  data,
  aiOverviewVariant,
}: {
  data: ScannerData;
  aiOverviewVariant?: AIOverviewVariant;
}) {
  const insight = useMemo(() => {
    const sorted = [...data.engineCoverage].sort(
      (a, b) => rankFromVisibility(a.today) - rankFromVisibility(b.today)
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    return `Best rank in ${best.label} (#${rankFromVisibility(best.today).toFixed(1)}); weakest in ${worst.label} (#${rankFromVisibility(worst.today).toFixed(1)}).`;
  }, [data.engineCoverage]);

  const rows = useMemo(
    () =>
      data.engineCoverage
        .map((e) => ({
          id: e.id,
          label: e.label,
          rank: rankFromVisibility(e.today),
          prevRank: rankFromVisibility(e.prev),
        }))
        .sort((a, b) => a.rank - b.rank),
    [data.engineCoverage]
  );

  const avgRank =
    rows.length > 0 ? rows.reduce((s, r) => s + r.rank, 0) / rows.length : 0;
  const avgRankDelta =
    rows.length > 0
      ? rows.reduce((s, r) => s + (r.rank - r.prevRank), 0) / rows.length
      : 0;
  const rankVerdict = verdictForRank(avgRank, avgRankDelta);
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 w-full min-w-0 flex flex-col">
      <div className="mb-2 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading
          text="Average rank when mentioned per AI model"
          info="Your typical position when each AI tool mentions you. Lower is better."
        />
        <div className="shrink-0">
          <VerdictPill
            word={rankVerdict.word}
            tone={rankVerdict.tone}
            hint={rankVerdict.hint}
          />
        </div>
      </div>
      {aiOverviewVariant && (
        <div className="mb-3">
          <AIOverview text={insight} variant={aiOverviewVariant} size="sm" />
        </div>
      )}
      <div>
        {rows.map((r) => (
          <EngineRankRow key={r.id} {...r} />
        ))}
      </div>
    </div>
  );
}

// ─── SHARE OF VOICE — pie + list + chart ────────────────────────────────────

type SOVPieMode = "pie" | "donut-center" | "donut-highlight";

function SOVPie({
  stats,
  size = 150,
  mode,
  hoveredBrandId,
  onHover,
}: {
  stats: PositionStat[];
  size?: number;
  mode: SOVPieMode;
  hoveredBrandId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const total = stats.reduce((s, x) => s + x.current, 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const baseOuterR = size / 2 - 6;
  const hoverBoost = 5;
  const donut = mode !== "pie";
  const innerR = donut ? baseOuterR * 0.6 : 0;
  const youCurrent = stats.find((s) => s.brand.isYou)?.current ?? 0;

  let cumulative = 0;
  const paths: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  stats.forEach((s) => {
    const fraction = s.current / total;
    if (fraction <= 0) return;
    const startAngle = (cumulative - 0.25) * 2 * Math.PI;
    const endAngle = (cumulative + fraction - 0.25) * 2 * Math.PI;
    cumulative += fraction;

    const isHovered = hoveredBrandId === s.brand.id;
    const isDimmed = hoveredBrandId != null && !isHovered;
    const outerR = isHovered ? baseOuterR + hoverBoost : baseOuterR;

    const ox1 = cx + outerR * Math.cos(startAngle);
    const oy1 = cy + outerR * Math.sin(startAngle);
    const ox2 = cx + outerR * Math.cos(endAngle);
    const oy2 = cy + outerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;

    const d = donut
      ? `M ${ix1} ${iy1} L ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
      : `M ${cx} ${cy} L ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} Z`;

    const isYou = s.brand.isYou;
    const highlight = mode === "donut-highlight" && isYou;
    paths.push(
      <path
        key={s.brand.id}
        d={d}
        fill={s.brand.color}
        fillOpacity={isDimmed ? 0.25 : 1}
        stroke={highlight ? "#1A1C1A" : "var(--color-surface)"}
        strokeWidth={highlight ? 2.5 : 1.5}
        style={{
          cursor: onHover ? "pointer" : undefined,
          transition: "all 200ms ease-out",
        }}
        onMouseEnter={() => onHover?.(s.brand.id)}
        onMouseLeave={() => onHover?.(null)}
      />,
    );

    // Slice percentage label — only when slice is wide enough to fit text.
    if (fraction >= 0.05) {
      const midAngle = (startAngle + endAngle) / 2;
      const labelR = donut ? (innerR + outerR) / 2 : outerR * 0.62;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      labels.push(
        <text
          key={`${s.brand.id}-pct`}
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.round(size * 0.058)}
          fontWeight={700}
          fill="#1A1C1A"
          style={{ pointerEvents: "none", opacity: isDimmed ? 0.5 : 1 }}
        >
          {`${(fraction * 100).toFixed(0)}%`}
        </text>,
      );
    }
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
      {paths}
      {labels}
      {mode === "donut-center" && (
        <>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: Math.round(size * 0.18),
              fontWeight: 600,
              fill: "var(--color-fg)",
              letterSpacing: "-0.02em",
            }}
          >
            {youCurrent.toFixed(0)}%
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            style={{
              fontSize: 10,
              fontWeight: 600,
              fill: "var(--color-fg-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            You
          </text>
        </>
      )}
    </svg>
  );
}

export function ShareOfVoiceCard({
  data,
  stats,
  insight,
  pieMode,
  aiOverviewVariant,
  showChart = true,
  variant = "full",
  title = "Share of voice over time",
  headerRight,
  hoveredBrandId: hoveredBrandIdProp,
  onHoverBrand,
}: {
  data: ScannerData;
  stats: PositionStat[];
  insight: string;
  pieMode: SOVPieMode;
  aiOverviewVariant?: AIOverviewVariant;
  /** Externally controlled hover state — shared between split SoV cards
   *  so hovering a brand in the stats half dims its line in the chart
   *  half (and vice versa). */
  hoveredBrandId?: string | null;
  onHoverBrand?: (id: string | null) => void;
  /** Hide the right-side line chart and let the donut + list fill width.
   *  Used on /competitor-comparison where SOV sits in a narrow slot. */
  showChart?: boolean;
  /** "full" (default) renders donut + list + chart. "stats-only" hides
   *  the chart so just the donut + list show. "chart-only" hides the
   *  donut + list. Used by the AI Visibility Tracker hero to split SoV
   *  across two side-by-side cards. */
  variant?: "full" | "stats-only" | "chart-only";
  /** Override the section title. */
  title?: string;
  /** Top-right slot in the card header (e.g. a delta pill). */
  headerRight?: React.ReactNode;
}) {
  const sorted = useMemo(
    () => [...stats].sort((a, b) => b.current - a.current),
    [stats],
  );

  const [internalSovHover, setInternalSovHover] = useState<string | null>(null);
  const hoveredBrandId =
    hoveredBrandIdProp !== undefined ? hoveredBrandIdProp : internalSovHover;
  const setHoveredBrandId = (id: string | null) => {
    if (onHoverBrand) onHoverBrand(id);
    else setInternalSovHover(id);
  };

  // Layout split: when the chart is shown, use the original 3-col template.
  // When the chart is hidden (cluster-comparison page slot), restructure to
  // a vertical flex card so the donut + list grow to fill available height.
  if (!showChart) {
    // YOUR share-of-voice delta pill — corner header.
    const youStat = sorted.find((s) => s.brand.isYou);
    const yDelta = youStat?.delta ?? 0;
    const flat = Math.abs(yDelta) <= 0.04;
    const grew = yDelta > 0;

    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full min-w-0">
        <div className="mb-1 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
          <SectionHeading
            text="Share of voice"
            info="Your share of all brand mentions in AI answers."
          />
          <div className="shrink-0">
            <BadgeDelta
              variant="solid"
              deltaType={flat ? "neutral" : grew ? "increase" : "decrease"}
              value={`${grew ? "+" : ""}${yDelta.toFixed(1)}%`}
              title={
                flat
                  ? "No change in your share over the last 90 days."
                  : `${grew ? "Up" : "Down"} ${Math.abs(yDelta).toFixed(1)}% over the last 90 days.`
              }
            />
          </div>
        </div>
        {aiOverviewVariant && (
          <div className="mt-3 mb-4">
            <AIOverview text={insight} variant={aiOverviewVariant} size="sm" />
          </div>
        )}

        {/* Donut centered + larger so it absorbs vertical space. */}
        <div className="flex justify-center my-2">
          <SOVPie
            stats={sorted}
            size={200}
            mode={pieMode}
            hoveredBrandId={hoveredBrandId}
            onHover={setHoveredBrandId}
          />
        </div>

        {/* Brand list with horizontal share bars — fills the remaining
            height with `flex-1`, distributes rows evenly via space-y. */}
        <ol className="mt-4 flex-1 flex flex-col justify-between gap-1.5">
          {sorted.map((s) => {
            const flat = Math.abs(s.delta) <= 0.04;
            const grew = s.delta > 0;
            const deltaColor = flat
              ? "var(--color-fg-muted)"
              : grew
                ? "#5E7250"
                : "#B54631";
            return (
              <li
                key={s.brand.id}
                className="flex items-center gap-2 px-1.5 py-1 rounded-[var(--radius-sm)] transition-colors"
                style={{
                  background: s.brand.isYou
                    ? "rgba(150,162,131,0.10)"
                    : "transparent",
                  borderLeft: s.brand.isYou
                    ? `2px solid #7D8E6C`
                    : "2px solid transparent",
                  opacity:
                    hoveredBrandId != null && hoveredBrandId !== s.brand.id
                      ? 0.4
                      : 1,
                }}
                onMouseEnter={() => setHoveredBrandId(s.brand.id)}
                onMouseLeave={() => setHoveredBrandId(null)}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.brand.color }}
                />
                <span
                  className="truncate flex-1 min-w-0"
                  style={{
                    fontSize: 12,
                    fontWeight: s.brand.isYou ? 700 : 500,
                    color: s.brand.isYou
                      ? "var(--color-fg)"
                      : "var(--color-fg-secondary)",
                  }}
                  title={s.brand.name}
                >
                  {s.brand.isYou ? "You" : s.brand.name}
                </span>
                <div className="w-16 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, s.current)}%`,
                      backgroundColor: s.brand.color,
                    }}
                  />
                </div>
                <span
                  className="tabular-nums shrink-0 text-right"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    width: 44,
                    color: s.brand.isYou
                      ? "var(--color-fg)"
                      : "var(--color-fg-secondary)",
                  }}
                >
                  {s.current.toFixed(1)}%
                </span>
                <span
                  className="tabular-nums shrink-0 text-right"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    width: 40,
                    color: deltaColor,
                  }}
                  title={
                    flat
                      ? "No change vs. start of range"
                      : `${grew ? "Up" : "Down"} ${Math.abs(s.delta).toFixed(1)}% vs. start of range`
                  }
                >
                  {flat
                    ? "—"
                    : `${grew ? "+" : "−"}${Math.abs(s.delta).toFixed(1)}%`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  // Default 3-zone layout (donut + list + chart). Used by the AI Visibility
  // Tracker page. The `variant` prop lets the AI Visibility Tracker hero
  // split this card across two side-by-side boxes if it wants.
  const donut = (
    <div className="flex justify-center">
      <SOVPie
        stats={sorted}
        size={120}
        mode={pieMode}
        hoveredBrandId={hoveredBrandId}
        onHover={setHoveredBrandId}
      />
    </div>
  );
  const list = (
    <div className="space-y-0">
      {sorted.map((s) => (
        <PositionBrandRow
          key={s.brand.id}
          stat={s}
          mode="share-of-voice"
          onHover={setHoveredBrandId}
          isDimmed={hoveredBrandId != null && hoveredBrandId !== s.brand.id}
        />
      ))}
    </div>
  );
  const chart = (
    <PositionChart
      data={data}
      stats={stats}
      mode="share-of-voice"
      height={170}
      rightMargin={140}
      hoveredBrandId={hoveredBrandId}
    />
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 w-full min-w-0 flex flex-col">
      <div className="mb-1 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading
          text={title}
          info="Your share of all brand mentions in AI answers over time."
        />
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {aiOverviewVariant && (
        <AIOverview text={insight} variant={aiOverviewVariant} size="sm" />
      )}
      {variant === "stats-only" ? (
        <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-5 items-center flex-1">
          {donut}
          {list}
        </div>
      ) : variant === "chart-only" ? (
        <div className="flex-1">{chart}</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[140px_220px_minmax(0,1fr)] gap-5 items-center">
          {donut}
          {list}
          {chart}
        </div>
      )}
    </div>
  );
}

// ─── Per-card top-right delta pill for the rank + SoV split cards ──────────
// Renders a single BadgeDelta whose ARROW + COLOR + SIGN all line up with
// the SEMANTIC outcome ("did this get better or worse?"), not the raw
// numerical direction.
//   • Share of voice — higher = better, so positive raw delta → green ↑.
//   • Rank — LOWER = better, so positive raw delta (rank number went UP)
//     reads as a decline → red ↓; negative raw delta (rank improved) →
//     green ↑.
// Sign of the displayed value follows the arrow direction (a green ↑ pill
// shows a +X value, a red ↓ pill shows a −X value) so the three cues
// never disagree.

export function RankDeltaPill({
  stats,
  mode,
}: {
  stats: PositionStat[];
  mode: "position" | "share-of-voice";
}) {
  const you = stats.find((s) => s.brand.isYou);
  if (!you) return null;
  const raw = you.delta;
  const flat = Math.abs(raw) <= 0.04;

  // "Improved" = the change is good for the user.
  const improved =
    mode === "position"
      ? raw < 0 // rank went down numerically (better)
      : raw > 0; // share went up (better)

  const deltaType: "increase" | "decrease" | "neutral" = flat
    ? "neutral"
    : improved
      ? "increase"
      : "decrease";

  const magnitude = Math.abs(raw);
  const unit = mode === "share-of-voice" ? "%" : "";
  // Value sign follows the arrow direction so green ↑ shows +X and
  // red ↓ shows −X consistently.
  const valueStr = flat
    ? `0${unit}`
    : `${improved ? "+" : "−"}${magnitude.toFixed(2)}${unit}`;
  const directionWord = mode === "position"
    ? improved
      ? "Improved"
      : "Declined"
    : improved
      ? "Up"
      : "Down";
  const title = flat
    ? "No change over the selected range."
    : mode === "position"
      ? `${directionWord} ${magnitude.toFixed(2)} positions over the selected range (lower rank = better).`
      : `${directionWord} ${magnitude.toFixed(2)}% over the selected range.`;

  return (
    <BadgeDelta
      variant="solid"
      deltaType={deltaType}
      value={valueStr}
      title={title}
    />
  );
}

// ─── COMPETITORS BLOCK — Distribution + Avg Position + SoV (assembled row) ──

function CompetitorsBlock({
  data,
  treatment,
  aiOverviewVariant,
}: {
  data: ScannerData;
  treatment: Treatment;
  aiOverviewVariant: AIOverviewVariant | undefined;
}) {
  const positionStats = useMemo(() => buildPositionStats(data), [data]);
  const sovStats = useMemo(() => buildSOVStats(data), [data]);
  const positionInsight = useMemo(
    () => buildPositionInsight(positionStats),
    [positionStats],
  );
  const sovInsight = useMemo(() => buildSOVInsight(sovStats), [sovStats]);

  // Shared hover state for the rank + SoV split cards. Lifting it here
  // means hovering a brand in the list half dims the matching line in the
  // chart half (and vice versa) — the highlight stays correlated even
  // though the two halves now live in separate cards.
  const [rankHover, setRankHover] = useState<string | null>(null);
  const [sovHover, setSovHover] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Row 1 — Visibility by AI tool (60%) + Average rank per AI model
          (40%), side-by-side. items-stretch keeps both card heights locked. */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
        <div className="xl:col-span-3 min-w-0 flex">
          <DistributionByLLMCard
            data={data}
            treatment={treatment}
            barVariant="with-stats"
            density="dense"
            aiOverviewVariant={aiOverviewVariant}
          />
        </div>
        <div className="xl:col-span-2 min-w-0 flex">
          <EngineRankCard data={data} aiOverviewVariant={aiOverviewVariant} />
        </div>
      </div>

      {/* Row 2 — Average rank when mentioned, split into list (40%) and
          chart (60%) cards. Each gets its own delta pill. */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">
        <div className="xl:col-span-1 min-w-0 flex">
          <RankSeriesCard
            title="Average rank when mentioned"
            titleInfo="Your typical position when AI tools mention you. Lower is better."
            data={data}
            stats={positionStats}
            insight={positionInsight}
            mode="position"
            layout="list-left"
            density="mini"
            aiOverviewVariant={aiOverviewVariant}
            variant="list-only"
            headerRight={<RankDeltaPill stats={positionStats} mode="position" />}
            hoveredBrandId={rankHover}
            onHoverBrand={setRankHover}
          />
        </div>
        <div className="xl:col-span-3 min-w-0 flex">
          <RankSeriesCard
            title="Average rank over time"
            titleInfo="How your average rank has trended over the period. Lower is better."
            data={data}
            stats={positionStats}
            insight={positionInsight}
            mode="position"
            layout="list-left"
            density="mini"
            chartHeightPx={160}
            aiOverviewVariant={aiOverviewVariant}
            variant="chart-only"
            headerRight={<RankDeltaPill stats={positionStats} mode="position" />}
            hoveredBrandId={rankHover}
            onHoverBrand={setRankHover}
          />
        </div>
      </div>

      {/* Row 3 — Share of voice split into stats card (40%) + chart card
          (60%). Same delta pill in each top-right. */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">
        <div className="xl:col-span-1 min-w-0 flex">
          <ShareOfVoiceCard
            data={data}
            stats={sovStats}
            insight={sovInsight}
            pieMode="donut-center"
            aiOverviewVariant={aiOverviewVariant}
            variant="stats-only"
            title="Share of voice"
            headerRight={<RankDeltaPill stats={sovStats} mode="share-of-voice" />}
            hoveredBrandId={sovHover}
            onHoverBrand={setSovHover}
          />
        </div>
        <div className="xl:col-span-3 min-w-0 flex">
          <ShareOfVoiceCard
            data={data}
            stats={sovStats}
            insight={sovInsight}
            pieMode="donut-center"
            aiOverviewVariant={aiOverviewVariant}
            variant="chart-only"
            title="Share of voice over time"
            headerRight={<RankDeltaPill stats={sovStats} mode="share-of-voice" />}
            hoveredBrandId={sovHover}
            onHoverBrand={setSovHover}
          />
        </div>
      </div>
    </div>
  );
}

// ─── COMPETITOR RANK + SoV BLOCK ────────────────────────────────────────────
// The bottom two rows of `CompetitorsBlock` extracted as a reusable block:
// (Row A) Average rank when mentioned + Average rank over time
// (Row B) Share of voice + Share of voice over time
// Hover state is shared between each row's two halves so highlighting in
// the list dims the matching line in the chart and vice versa — same
// behavior as the AI Visibility Tracker version.

export function CompetitorRankAndSoVBlock({
  data,
  aiOverviewVariant,
}: {
  data: ScannerData;
  aiOverviewVariant?: AIOverviewVariant;
}) {
  const positionStats = useMemo(() => buildPositionStats(data), [data]);
  const sovStats = useMemo(() => buildSOVStats(data), [data]);
  const positionInsight = useMemo(
    () => buildPositionInsight(positionStats),
    [positionStats],
  );
  const sovInsight = useMemo(() => buildSOVInsight(sovStats), [sovStats]);
  const [rankHover, setRankHover] = useState<string | null>(null);
  const [sovHover, setSovHover] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">
        <div className="xl:col-span-1 min-w-0 flex">
          <RankSeriesCard
            title="Average rank when mentioned"
            titleInfo="Your typical position when AI tools mention you. Lower is better."
            data={data}
            stats={positionStats}
            insight={positionInsight}
            mode="position"
            layout="list-left"
            density="mini"
            aiOverviewVariant={aiOverviewVariant}
            variant="list-only"
            headerRight={<RankDeltaPill stats={positionStats} mode="position" />}
            hoveredBrandId={rankHover}
            onHoverBrand={setRankHover}
          />
        </div>
        <div className="xl:col-span-3 min-w-0 flex">
          <RankSeriesCard
            title="Average rank over time"
            titleInfo="How your average rank has trended over the period. Lower is better."
            data={data}
            stats={positionStats}
            insight={positionInsight}
            mode="position"
            layout="list-left"
            density="mini"
            chartHeightPx={160}
            aiOverviewVariant={aiOverviewVariant}
            variant="chart-only"
            headerRight={<RankDeltaPill stats={positionStats} mode="position" />}
            hoveredBrandId={rankHover}
            onHoverBrand={setRankHover}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-stretch">
        <div className="xl:col-span-1 min-w-0 flex">
          <ShareOfVoiceCard
            data={data}
            stats={sovStats}
            insight={sovInsight}
            pieMode="donut-center"
            aiOverviewVariant={aiOverviewVariant}
            variant="stats-only"
            title="Share of voice"
            headerRight={<RankDeltaPill stats={sovStats} mode="share-of-voice" />}
            hoveredBrandId={sovHover}
            onHoverBrand={setSovHover}
          />
        </div>
        <div className="xl:col-span-3 min-w-0 flex">
          <ShareOfVoiceCard
            data={data}
            stats={sovStats}
            insight={sovInsight}
            pieMode="donut-center"
            aiOverviewVariant={aiOverviewVariant}
            variant="chart-only"
            title="Share of voice over time"
            headerRight={<RankDeltaPill stats={sovStats} mode="share-of-voice" />}
            hoveredBrandId={sovHover}
            onHoverBrand={setSovHover}
          />
        </div>
      </div>
    </div>
  );
}

// ─── NARRATIVE FEED ─────────────────────────────────────────────────────────

function NarrativeFeed({ data }: { data: ScannerData; treatment: Treatment }) {
  const topEngine = data.engineCoverage[0];
  const weakEngine = data.engineCoverage[data.engineCoverage.length - 1];

  // Items now follow the SentimentDiagnostic pattern: title (the action /
  // headline) + body (the supporting context / metric). All values are
  // derived from the same ScannerData feeding the rest of the page so the
  // box stays in sync with the active time-range / engine filter; all
  // links point at real, mounted dashboard routes (no 404s).
  type Item = { title: string; body: string; cta: string; href: string };

  // Items now follow the SentimentDiagnostic pattern. Each candidate is
  // gated by a real condition — only genuine wins / genuine concerns get
  // pushed, so the boxes can show 0-3 items. Capped at 3 so the card
  // height stays bounded.
  const leader = data.ranked[0];
  const leaderScore = leader?.data[leader.data.length - 1] ?? 0;
  const sortedEngines = [...data.engineCoverage].sort(
    (a, b) => b.today - a.today,
  );
  const youAreLeader = leader?.isYou ?? false;
  const gap = leaderScore - data.youLatest;
  const weakest = sortedEngines[sortedEngines.length - 1];

  // ── WINS — only push genuine wins ──
  const worked: Item[] = [];
  // Strong top engine (≥ 50% mention rate qualifies as a real win).
  if (topEngine.today >= 50) {
    worked.push({
      title: `${topEngine.label} is naming you ${topEngine.today.toFixed(1)}% of the time`,
      body: `Strongest tracked engine — every customer asking it about your category is hearing your name in the answer. Keep feeding the content patterns it's already rewarding.`,
      cta: "See engine breakdown",
      href: "/competitor-comparison",
    });
  }
  // Period-over-period visibility growth (≥ 1% counts).
  if (data.youDelta >= 1) {
    worked.push({
      title: `Visibility climbed +${data.youDelta.toFixed(1)}% over the period`,
      body: `Across the last ${data.rangeN} days you moved from ${data.youFirst.toFixed(1)}% to ${data.youLatest.toFixed(1)}% mention rate — momentum is on your side, double down on the optimizations driving it.`,
      cta: "Review citation sources",
      href: "/citation-insights",
    });
  }
  // Weakest engine actually improved this period.
  if (weakest.delta > 1) {
    worked.push({
      title: `Closing ground on ${weakest.label}`,
      body: `Your weakest engine ticked up ${weakest.delta.toFixed(1)}% this period — the schema and citation work is starting to register where you needed it most.`,
      cta: "Run a follow-up audit",
      href: "/site-audit",
    });
  }
  // You hold the #1 leaderboard slot.
  if (youAreLeader) {
    worked.push({
      title: `Leading the field at ${data.youLatest.toFixed(1)}%`,
      body: `You're the top-named brand across tracked engines — defend the lead by keeping fresh content flowing on the prompts your closest rival is starting to creep up on.`,
      cta: "Open competitor comparison",
      href: "/competitor-comparison",
    });
  }
  // Cap at 3.
  worked.splice(3);

  // ── WATCH — only push genuine concerns ──
  const watch: Item[] = [];
  // Weak engine below the "weak" threshold of 50%.
  if (weakEngine.today < 50) {
    watch.push({
      title: `${weakEngine.label} is your weakest engine at ${weakEngine.today.toFixed(1)}%`,
      body: `You're only named in roughly ${Math.round(weakEngine.today)}% of its answers — every customer routed to ${weakEngine.label} is a missed shot at recommendation. Crawlability + schema fixes here move the needle fastest.`,
      cta: "Optimize",
      href: "/site-audit",
    });
  }
  // Competitor lead of 3% or more.
  if (!youAreLeader && leader && gap >= 3) {
    watch.push({
      title: `${leader.name} is leading at ${leaderScore.toFixed(1)}%`,
      body: `Your top competitor sits ${gap.toFixed(1)}% ahead of you — a gap that compounds every week without targeted publishing on the prompts they're winning.`,
      cta: "Open competitor comparison",
      href: "/competitor-comparison",
    });
  }
  // Period-over-period decline.
  if (data.youDelta <= -1) {
    watch.push({
      title: `Coverage slipped ${Math.abs(data.youDelta).toFixed(1)}% this period`,
      body: `Visibility moved from ${data.youFirst.toFixed(1)}% to ${data.youLatest.toFixed(1)}% over the last ${data.rangeN} days — watch the slope, not the snapshot. A crawlability check often catches the silent regressions first.`,
      cta: "Run crawlability audit",
      href: "/crawlability-audit",
    });
  }
  // Multiple engines below the 50% bar.
  const failingEngines = sortedEngines.filter((e) => e.today < 50);
  if (failingEngines.length >= 2) {
    watch.push({
      title: `${failingEngines.length} engines below 50% mention rate`,
      body: `${failingEngines.map((e) => e.label).join(", ")} are all citing you in fewer than half of their answers — a structural readability issue often hits multiple engines at once.`,
      cta: "Optimize",
      href: "/site-audit",
    });
  }
  watch.splice(3);

  const winsTitle =
    worked.length === 0
      ? "No new wins this period"
      : `${worked.length} win${worked.length === 1 ? "" : "s"} this period`;
  const watchTitle =
    watch.length === 0
      ? "Nothing flagged — you're clean"
      : `${watch.length} thing${watch.length === 1 ? "" : "s"} to watch`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <NarrativeInsightCard
        variant="wins"
        tag="What worked"
        title={winsTitle}
        summary={
          worked.length === 0
            ? "No wins crossed our threshold this period — keep publishing and watch the next scan for momentum."
            : "Optimizations that moved the needle — keep the pressure on the patterns AI is already rewarding."
        }
        items={worked}
        emptyMessage="Nothing here yet — your next scan will surface the patterns that started compounding."
      />
      <NarrativeInsightCard
        variant="concerns"
        tag="What to watch"
        title={watchTitle}
        summary={
          watch.length === 0
            ? "No engines under-citing you, no competitor pulling away, no period-over-period slip — visibility is healthy across the board."
            : "Highest-leverage gaps — these are where AI is naming competitors instead of you."
        }
        items={watch}
        emptyMessage="All clear — defend this position by keeping content fresh on the prompts where rivals could creep up."
      />
    </div>
  );
}

// Mirrors the InsightCard pattern used on the Tracked Prompts page
// (gradient header strip + colored borderLeft + sub-cards with icon
// tile). Wins variant uses the sage palette; concerns uses the warm
// orange/amber. Visually identical to PromptsSection's InsightCard.
function NarrativeInsightCard({
  variant,
  tag,
  title,
  summary,
  items,
  emptyMessage,
}: {
  variant: "wins" | "concerns";
  tag: string;
  title: string;
  summary: string;
  items: { title: string; body: string; cta: string; href: string }[];
  /** Shown inside the body when `items` is empty. */
  emptyMessage?: string;
}) {
  const palette =
    variant === "wins"
      ? {
          accent: "#96A283",
          accentText: "#5E7250",
          gradient:
            "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.04) 100%)",
          tileBg: "rgba(150,162,131,0.20)",
          HeaderIcon: Sparkles,
        }
      : {
          accent: "#C97B45",
          accentText: "#A35F32",
          gradient:
            "linear-gradient(135deg, rgba(199,123,69,0.20) 0%, rgba(199,123,69,0.03) 100%)",
          tileBg: "rgba(199,123,69,0.18)",
          HeaderIcon: AlertTriangle,
        };
  const HeaderIcon = palette.HeaderIcon;
  const ItemIcon = variant === "wins" ? CheckCircle2 : AlertCircle;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full overflow-hidden">
      <div
        className="p-5"
        style={{
          background: palette.gradient,
          borderLeft: `4px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <HeaderIcon
            className="h-4 w-4 shrink-0"
            style={{ color: palette.accent }}
          />
          <p
            className="uppercase font-semibold"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: palette.accentText,
            }}
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

      <div className="flex-1 flex flex-col p-4 gap-3">
        {items.length === 0 && emptyMessage && (
          <div
            className="flex-1 flex items-center justify-center text-center px-4 py-6"
            style={{ color: "var(--color-fg-muted)" }}
          >
            <div className="flex flex-col items-center gap-3 max-w-[320px]">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: palette.tileBg }}
              >
                <HeaderIcon
                  className="h-5 w-5"
                  style={{ color: palette.accent }}
                />
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55 }}>{emptyMessage}</p>
            </div>
          </div>
        )}
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex items-start gap-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors"
          >
            <div
              className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{ backgroundColor: palette.tileBg }}
            >
              <ItemIcon
                className="h-4 w-4"
                style={{ color: palette.accent }}
              />
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
                {item.body}
              </p>
              <a
                href={item.href}
                className="group inline-flex items-center gap-1 mt-2 font-semibold transition-opacity hover:opacity-80"
                style={{ fontSize: 12.5, color: palette.accentText }}
              >
                {item.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CHART CARD (with Focus/Full toggle) ────────────────────────────────────

export function ChartCard({
  data,
  treatment,
  aiOverviewVariant,
  enabledBrandIds,
  title = "Your AI visibility over time",
  titleInfo = "Daily mention rate across all tracked AI tools. Higher = more visibility.",
  defaultMode = "focus",
  chartHeight = 460,
  showInsight = true,
  showModeToggle = true,
  showOptimizationMarkers = true,
  delta,
}: {
  data: ScannerData;
  treatment: Treatment;
  aiOverviewVariant?: AIOverviewVariant;
  enabledBrandIds: Set<string>;
  title?: string;
  titleInfo?: string;
  defaultMode?: "focus" | "full";
  chartHeight?: number;
  showInsight?: boolean;
  showModeToggle?: boolean;
  /** When false, drops the inline optimization-event dots on the YOU line. */
  showOptimizationMarkers?: boolean;
  /** Period-over-period delta pill in the top-right header. */
  delta?: number;
}) {
  const [mode, setMode] = useState<"focus" | "full">(defaultMode);
  const focusMode: FocusMode = mode === "full" ? "full" : "tight";

  return (
    <Card className="p-4 min-w-0 w-full flex flex-col">
      <div className="mb-3 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading text={title} info={titleInfo} />
          {delta != null && (
            <div className="shrink-0">
              <BadgeDelta
                variant="solid"
                deltaType={
                  Math.abs(delta) <= 0.04
                    ? "neutral"
                    : delta > 0
                      ? "increase"
                      : "decrease"
                }
                value={`${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
                title={
                  Math.abs(delta) <= 0.04
                    ? "No change over the selected range."
                    : `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta).toFixed(1)}% over the selected range.`
                }
              />
            </div>
          )}
        </div>
        {showInsight && aiOverviewVariant && (
          <div className="mt-2 mb-2">
            <AIOverview
              text={buildChartInsight(data)}
              variant={aiOverviewVariant}
              size="sm"
            />
          </div>
        )}
        {showModeToggle && (
          <div className="mt-2 inline-flex rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setMode("focus")}
              className={
                "px-3 py-0.5 text-[13px] font-medium transition-colors " +
                (mode === "focus"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)]")
              }
            >
              Focus view
            </button>
            <button
              onClick={() => setMode("full")}
              className={
                "px-3 py-0.5 text-[13px] font-medium transition-colors border-l border-[var(--color-border)] " +
                (mode === "full"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)]")
              }
            >
              Full view
            </button>
          </div>
        )}
      </div>
      {/* Re-mount on range or focus change so the clip-path reveal replays.
          The clip-path inset goes from "everything to the right hidden" to
          "fully visible", producing a left-to-right wipe on every range
          switch (14d / 30d / 90d / YTD / All / Custom). */}
      <motion.div
        key={`${focusMode}-${data.rangeN}`}
        initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0.6 }}
        animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "clip-path" }}
      >
        <VisibilityScannerChart
          brands={data.scaledBrands}
          dates={data.dates}
          enabledIds={enabledBrandIds}
          yPadding={treatment.yPadding}
          strokeYou={treatment.strokeYou}
          strokeHovered={treatment.strokeHovered}
          strokeDefault={treatment.strokeDefault}
          youGlowBlur={treatment.youGlowBlur}
          tooltipFontSize={treatment.tooltipFontSize}
          gridStroke={treatment.gridStroke}
          gridOpacity={treatment.gridOpacity}
          endLabelStyle={treatment.endLabelStyle}
          endLabelGutter={treatment.endLabelGutter}
          lineType="linear"
          height={chartHeight}
          focusMode={focusMode}
          optimizationMarkers={
            showOptimizationMarkers
              ? [
                  {
                    dateIndex: Math.round(data.dates.length * 0.18),
                    label: "FAQ schema added to top service pages",
                  },
                  {
                    dateIndex: Math.round(data.dates.length * 0.4),
                    label: "Reddit & BBB listings published",
                  },
                  {
                    dateIndex: Math.round(data.dates.length * 0.62),
                    label: "Page intros rewritten on 5 weakest pages",
                  },
                  {
                    dateIndex: Math.round(data.dates.length * 0.82),
                    label: "Pillar page deployed",
                  },
                ]
              : []
          }
        />
      </motion.div>
    </Card>
  );
}

// ─── AI SUMMARY GENERATOR (top-of-page glowing button + typewriter reveal) ──

function buildAISummaryText(data: ScannerData): string {
  const youCurr = data.youToday;
  const leader = data.ranked[0];
  const leaderScore = leader.data[leader.data.length - 1] ?? 0;

  const sortedEng = [...data.engineCoverage].sort((a, b) => b.today - a.today);
  const best = sortedEng[0];
  const worst = sortedEng[sortedEng.length - 1];

  const sovStats = buildSOVStats(data);
  const youSov = sovStats.find((s) => s.brand.isYou);
  const sovDelta = youSov?.delta ?? 0;

  // Sandwich structure: GOOD → BAD → GOOD. Strongest engine + leadership
  // framing first, then the weakest engine / behind-leader gap, then a
  // forward-looking positive (share-of-voice trend or defensive note).
  // Tight, data-first sandwich (good → bad → good). Each sentence
  // leads with a number; advisory framing is stripped.
  const s1 = `${best.label} cites you ${best.today.toFixed(1)}% — your strongest engine.`;

  const s2 = leader.isYou
    ? `${worst.label} sits at ${worst.today.toFixed(1)}% — widest gap, fastest lever.`
    : `${leader.name} leads at ${leaderScore.toFixed(1)}%, ${(leaderScore - youCurr).toFixed(1)}% ahead. ${worst.label} (${worst.today.toFixed(1)}%) is where the gap concentrates.`;

  const s3 =
    sovDelta > 0.5
      ? `Share of voice up ${sovDelta.toFixed(1)}% this period — momentum is yours.`
      : leader.isYou
        ? `You hold #1 at ${youCurr.toFixed(1)}% overall — defend it.`
        : sovDelta >= -0.5
          ? `Share of voice steady — one fix on ${worst.label} moves the curve.`
          : `${best.label} at ${best.today.toFixed(1)}% proves the playbook — repeat it on weaker pages.`;

  return `${s1} ${s2} ${s3}`;
}

function buildAISummaryCTA(data: ScannerData): { label: string; href: string } {
  const sortedEng = [...data.engineCoverage].sort((a, b) => b.today - a.today);
  const worst = sortedEng[sortedEng.length - 1];
  const leader = data.ranked[0];
  const youCurr = data.youToday;
  const leaderScore = leader.data[leader.data.length - 1] ?? 0;
  const gap = leader.isYou ? 0 : leaderScore - youCurr;

  // Biggest fixable gap = the weakest engine (always actionable via site audit).
  // If you're trailing the leader by a sizeable gap, frame the CTA as closing it.
  const label =
    !leader.isYou && gap > 8
      ? `Optimize to start closing the gap on ${worst.label}`
      : `Optimize to fix ${worst.label}`;

  return { label, href: "/site-audit" };
}


// ─── PROMPT HIT RATE CARD ──────────────────────────────────────────────────
// Right column of the hero. Mirrors the "What needs attention" slot in the
// Brand Sentiment hero — same Card chrome, same sizing, single headline
// stat at the top, supporting chips below.

const HIT_RATE_ACCENTS = {
  sage: "#96A283",
  yellow: "#B8A030",
  orange: "#C97B45",
  rust: "#B54631",
  deep: "#7D8E6C",
};

// ─── GAPS TO FILL CARD ────────────────────────────────────────────────────
// Right column of the AI Visibility Tracker hero. Surfaces up to 3 of the
// most important fixable gaps from the live ScannerData, each with a
// short body + CTA link to the page that addresses it. Same outer
// dimensions as PromptHitRateCard so swapping it doesn't disturb the
// 3-zone hero grid.

export function GapsToFillCard({ data }: { data: ScannerData }) {
  type Gap = {
    title: string;
    body: string;
    cta: string;
    icon: typeof Target;
    playbook: GapPlaybook;
  };
  const sorted = [...data.engineCoverage].sort((a, b) => b.today - a.today);
  const weakest = sorted[sorted.length - 1];
  const failing = sorted.filter((e) => e.today < 50);
  const leader = data.ranked[0];
  const leaderScore = leader?.data[leader.data.length - 1] ?? 0;
  const youAreLeader = leader?.isYou ?? false;
  const gap = leaderScore - data.youLatest;

  const candidates: Gap[] = [];
  if (weakest && weakest.today < 60) {
    candidates.push({
      title: `${weakest.label} citing you ${weakest.today.toFixed(0)}%`,
      body: `Your weakest engine. Schema + crawlability fixes here move the needle fastest.`,
      cta: "Optimize",
      icon: Target,
      playbook: {
        title: `Fix ${weakest.label} — your weakest engine at ${weakest.today.toFixed(1)}%`,
        body: `${weakest.label} only names you in ~${Math.round(weakest.today)}% of its answers. The gap usually comes down to two structural fixes:\n\n• Schema — ${weakest.label} parses Schema.org markup strictly. Add FAQ, Article, and LocalBusiness JSON-LD on every service page and validate at validator.schema.org.\n\n• Crawlability — ${weakest.label}'s crawler is conservative about JavaScript. Confirm your top pages serve the headline + primary content in HTML and that robots.txt allows its user agent.\n\nRun the Site Audit for the exact failing checks ranked by recoverable points.`,
        managedPlansCopy: `handle the schema deployments, crawlability fixes, and revalidation cycles for you.`,
      },
    });
  }
  if (!youAreLeader && leader && gap >= 3) {
    candidates.push({
      title: `${leader.name} ${gap.toFixed(1)}% ahead of you`,
      body: `Top competitor is widening their lead. Close it on the prompts they're winning.`,
      cta: "Open competitor view",
      icon: Trophy,
      playbook: {
        title: `${leader.name} is leading by ${gap.toFixed(1)}% — close the gap`,
        body: `${leader.name} sits at ${leaderScore.toFixed(1)}% vs. your ${data.youLatest.toFixed(1)}%. The gap usually concentrates in a small cluster of high-volume prompts they've covered deeper.\n\nFix path:\n\n• Identify the 3-5 prompts where ${leader.name} owns the answer (Competitor Comparison view).\n\n• Ship a longer, more authoritative piece on each — direct quotes the AI can lift verbatim, original data, explicit comparisons.`,
        managedPlansCopy: `research the prompts they're winning, draft the comparison content, and ship it on your site.`,
      },
    });
  }
  if (data.youDelta <= -1) {
    candidates.push({
      title: `Coverage slipped ${Math.abs(data.youDelta).toFixed(1)}% this period`,
      body: `Visibility regression — a crawlability check usually catches the silent culprits first.`,
      cta: "Run crawlability audit",
      icon: AlertCircle,
      playbook: {
        title: `Coverage slipped ${Math.abs(data.youDelta).toFixed(1)}% — find the culprit`,
        body: `Visibility moved from ${data.youFirst.toFixed(1)}% to ${data.youLatest.toFixed(1)}% over the last ${data.rangeN} days. Drops this size usually trace to one of three causes:\n\n• A recent code/content change broke schema, sitemap, or canonical URLs on a high-traffic page.\n\n• A robots.txt or meta-robots directive is now blocking AI crawlers.\n\n• A third-party citation source dropped you (directory delisting, Wikipedia edit, etc.).\n\nCrawlability Audit catches the first two in one scan. Citation Insights shows referrer drops for the third.`,
        managedPlansCopy: `monitor for these regressions automatically and patch them within 24 hours.`,
      },
    });
  }
  if (failing.length >= 2) {
    candidates.push({
      title: `${failing.length} engines under 50%`,
      body: `${failing.map((e) => e.label).join(", ")} all under-cite you. Often a single readability fix.`,
      cta: "Optimize",
      icon: Layers,
      playbook: {
        title: `${failing.length} engines under 50% — likely a structural issue`,
        body: `${failing.map((e) => e.label).join(", ")} all under-cite you. When multiple engines fail at once it's almost always a structural readability issue on your site, not engine-specific behavior. Top culprits:\n\n• Long jargon-heavy paragraphs — AI lifts standalone 15-25 word sentences. Tighten your key claims.\n\n• Missing or incomplete FAQ schema. Engines lean heavily on Q&A markup.\n\n• No author / byline signals. Claude and Google AI weight named-author content more heavily.\n\nRun the Site Audit — ranks all 25 checks by recoverable points.`,
        managedPlansCopy: `rewrite the cited pages, deploy the missing schema, and add author signals across your site.`,
      },
    });
  }
  // Cap at 3 — only genuine data-driven gaps. If nothing fires, the
  // empty-state below shows a friendly "all clear" message instead of
  // padding the card with filler suggestions.
  const gaps = candidates.slice(0, 3);
  const [activePlaybook, setActivePlaybook] = useState<GapPlaybook | null>(
    null,
  );

  // Rust-red accent for the whole card so the user reads it as urgent.
  const RUST = HIT_RATE_ACCENTS.rust; // "#B54631"
  const RUST_BG = "rgba(181,70,49,0.12)";
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full w-full min-w-0"
      style={{ borderTop: `4px solid ${RUST}` }}
    >
      {/* Red banner strip — gradient fade so it reads as a highlight, not
          a hard bar. Anchored to the top of the card. Top corners
          rounded inline so we don't need overflow:hidden on the parent
          (which was clipping the SectionHeading info popover). */}
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2"
        style={{
          background: `linear-gradient(135deg, rgba(181,70,49,0.18) 0%, rgba(181,70,49,0.04) 100%)`,
          borderTopLeftRadius: "calc(var(--radius-lg) - 4px)",
          borderTopRightRadius: "calc(var(--radius-lg) - 4px)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle
            className="h-4 w-4 shrink-0"
            style={{ color: RUST }}
          />
          <SectionHeading
            text="Gaps to fill"
            info="The highest-leverage fixes pulled from this scan — each links to the tool that addresses it."
          />
        </div>
        <div className="shrink-0">
          <span
            className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
            style={{ color: RUST, backgroundColor: RUST_BG }}
          >
            {gaps.length} {gaps.length === 1 ? "gap" : "gaps"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 p-5">
        {gaps.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4 py-6">
            <div className="flex flex-col items-center gap-3 max-w-[240px]">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(150,162,131,0.20)",
                }}
              >
                <CheckCircle2
                  className="h-5 w-5"
                  style={{ color: "#5E7250" }}
                />
              </div>
              <p
                className="font-semibold"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.3,
                  color: "var(--color-fg)",
                }}
              >
                No gaps to fill — you're clean
              </p>
              <p
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 12, lineHeight: 1.5 }}
              >
                No engines under-citing you, no competitor pulling away, no
                period-over-period slip. Defend this position by keeping
                content fresh on the prompts where rivals could creep up.
              </p>
            </div>
          </div>
        ) : (
          gaps.map((g, i) => {
            const Icon = g.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActivePlaybook(g.playbook)}
                className="text-left rounded-[var(--radius-md)] border border-[var(--color-border)] p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors hover:border-[rgba(181,70,49,0.45)]"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: RUST_BG }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: RUST }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[var(--color-fg)] font-semibold"
                    style={{ fontSize: 12.5, lineHeight: 1.25 }}
                  >
                    {g.title}
                  </p>
                  <p
                    className="text-[var(--color-fg-secondary)] mt-0.5"
                    style={{ fontSize: 11.5, lineHeight: 1.4 }}
                  >
                    {g.body}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 mt-1 shrink-0"
                  style={{ color: RUST }}
                />
              </button>
            );
          })
        )}
        {gaps.length > 0 && (
          <p
            className="text-[var(--color-fg-secondary)] text-center mt-1 italic font-semibold"
            style={{ fontSize: 12.5, lineHeight: 1.4 }}
          >
            Click any row to see how to fix it
          </p>
        )}
      </div>
      <GapPlaybookModal
        open={activePlaybook != null}
        onClose={() => setActivePlaybook(null)}
        playbook={activePlaybook}
      />
    </div>
  );
}

// ─── WINS TO WIDEN CARD ───────────────────────────────────────────────────
// Sage-themed mirror of GapsToFillCard. Same outer chrome, same row
// layout, same playbook-modal click-through — only the palette and the
// content swap (positive wins vs. competitors instead of fixable gaps).
// Used on Competitor Comparison underneath the Gaps-to-fill card so the
// page reads as "what's broken" + "what's working" stacked.

export function WinsToWidenCard({ data }: { data: ScannerData }) {
  type Win = {
    title: string;
    body: string;
    icon: typeof Trophy;
    playbook: GapPlaybook;
  };
  const sorted = [...data.engineCoverage].sort((a, b) => b.today - a.today);
  const strongest = sorted[0];
  const strong = sorted.filter((e) => e.today >= 70);
  const leader = data.ranked[0];
  const leaderScore = leader?.data[leader.data.length - 1] ?? 0;
  const youAreLeader = leader?.isYou ?? false;
  const runnerUp = data.ranked.find((b) => !b.isYou);
  const runnerUpScore = runnerUp?.data[runnerUp.data.length - 1] ?? 0;
  const lead = youAreLeader ? data.youLatest - runnerUpScore : 0;

  const candidates: Win[] = [];

  // 1. Strongest engine — your best citation channel.
  if (strongest && strongest.today >= 60) {
    candidates.push({
      title: `${strongest.label} citing you ${strongest.today.toFixed(0)}%`,
      body: `Your strongest channel — keep momentum with fresh content on the prompts already winning.`,
      icon: Trophy,
      playbook: {
        title: `${strongest.label} is your strongest engine at ${strongest.today.toFixed(1)}%`,
        body: `${strongest.label} cites you in roughly ${Math.round(strongest.today)}% of its answers — the highest of any engine in this scan. The way to widen that lead:\n\n• Audit which pages are doing the heavy lifting. Match their structure (schema density, FAQ blocks, opening sentence framing) on your weaker pages.\n\n• Publish one new piece a month on the same template — answer-shaped, schema-rich, freshness signals on the date metadata.\n\n• Watch for any drop on this engine — leadership erodes faster than it builds.`,
        actionCta: null,
        managedPlansCopy: `replicate the winning page template across your weaker pages so this lead compounds.`,
      },
    });
  }

  // 2. You're leading the field overall.
  if (youAreLeader && lead >= 3) {
    candidates.push({
      title: `You're ${lead.toFixed(1)}% ahead of ${runnerUp?.name ?? "the runner-up"}`,
      body: `You hold the top spot across this scan. Defend it on the prompts they're closest on.`,
      icon: Trophy,
      playbook: {
        title: `You're leading by ${lead.toFixed(1)}% over ${runnerUp?.name ?? "the runner-up"}`,
        body: `You sit at ${data.youLatest.toFixed(1)}% vs. ${runnerUp?.name ?? "the runner-up"} at ${runnerUpScore.toFixed(1)}%. To widen the lead and stay defensive:\n\n• Identify the 3-5 prompts where the gap is narrowest (Competitor Comparison view) — those are where they could overtake you fastest.\n\n• Refresh your top-cited pages every 30-60 days so freshness signals stay current.\n\n• Watch any prompt where you slip even 5%; visibility gaps compound when left unaddressed.`,
        actionCta: null,
        managedPlansCopy: `monitor for narrowing gaps and refresh your highest-traffic pages on a fixed cadence.`,
      },
    });
  }

  // 3. Coverage trending up over the period.
  if (data.youDelta >= 1) {
    candidates.push({
      title: `Coverage climbed ${data.youDelta.toFixed(1)}% this period`,
      body: `Visibility is trending up — whatever you shipped is working. Double down on it.`,
      icon: TrendingUp,
      playbook: {
        title: `Coverage climbed ${data.youDelta.toFixed(1)}% — keep the momentum`,
        body: `Visibility moved from ${data.youFirst.toFixed(1)}% to ${data.youLatest.toFixed(1)}% over the last ${data.rangeN} days. Climbs this size usually trace to one of three things you did right:\n\n• A content push or schema rollout that landed in the indexes.\n\n• A new citation source (directory, editorial, Reddit) started appearing in answers.\n\n• A page rewrite improved how AI quotes you.\n\nLook at the optimization markers on the chart above — the inflection point tells you which lever moved the needle. Repeat that lever on the next batch of weak pages.`,
        actionCta: null,
        managedPlansCopy: `replicate the winning lever across the rest of your pages so the climb continues into next period.`,
      },
    });
  }

  // 4. Multiple engines above 70% — strong cross-engine coverage.
  if (strong.length >= 2) {
    candidates.push({
      title: `${strong.length} engines above 70%`,
      body: `${strong.map((e) => e.label).join(", ")} all cite you frequently — strong cross-engine coverage.`,
      icon: CheckCircle2,
      playbook: {
        title: `${strong.length} engines above 70% — your visibility is broad-based`,
        body: `${strong.map((e) => e.label).join(", ")} all cite you in 70%+ of their answers. Cross-engine wins are durable because they reflect structural fundamentals (schema, freshness, citation density) — not engine-specific tricks.\n\nTo widen the gap further:\n\n• Bring the laggard engines up to the same level — they share the same underlying signals.\n\n• Publish on the topics where competitors are weakest across multiple engines simultaneously.\n\n• Document what's working in your content templates so new pages launch already-optimized.`,
        actionCta: null,
        managedPlansCopy: `audit which structural signals are driving the cross-engine wins and bring laggards up to the same standard.`,
      },
    });
  }

  // Cap at 3 — if nothing fires, the empty state below shows a friendly
  // "no clear wins yet" prompt instead of padding the card with filler.
  const wins = candidates.slice(0, 3);
  const [activePlaybook, setActivePlaybook] = useState<GapPlaybook | null>(
    null,
  );

  // Sage palette throughout — mirrors the rust treatment of GapsToFillCard.
  const SAGE = "#5E7250";
  const SAGE_BG = "rgba(150,162,131,0.18)";
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full w-full min-w-0"
      style={{ borderTop: `4px solid ${SAGE}` }}
    >
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2"
        style={{
          background: `linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.04) 100%)`,
          borderTopLeftRadius: "calc(var(--radius-lg) - 4px)",
          borderTopRightRadius: "calc(var(--radius-lg) - 4px)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Trophy
            className="h-4 w-4 shrink-0"
            style={{ color: SAGE }}
          />
          <SectionHeading
            text="Where you're leading"
            info="Wins from this scan to defend or widen — the engines, prompts, and trends working in your favor against the tracked competitors."
          />
        </div>
        <div className="shrink-0">
          <span
            className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
            style={{ color: SAGE, backgroundColor: SAGE_BG }}
          >
            {wins.length} {wins.length === 1 ? "win" : "wins"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 p-5">
        {wins.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4 py-6">
            <div className="flex flex-col items-center gap-3 max-w-[240px]">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: SAGE_BG }}
              >
                <Sparkles className="h-5 w-5" style={{ color: SAGE }} />
              </div>
              <p
                className="font-semibold"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.3,
                  color: "var(--color-fg)",
                }}
              >
                No clear wins yet
              </p>
              <p
                className="text-[var(--color-fg-muted)]"
                style={{ fontSize: 12, lineHeight: 1.5 }}
              >
                You're middle-of-the-pack across this scan. Pick one weak engine
                in the panel above and ship a single fix — wins compound from there.
              </p>
            </div>
          </div>
        ) : (
          wins.map((w, i) => {
            const Icon = w.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActivePlaybook(w.playbook)}
                className="text-left rounded-[var(--radius-md)] border border-[var(--color-border)] p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors hover:border-[rgba(150,162,131,0.55)]"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: SAGE_BG }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: SAGE }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[var(--color-fg)] font-semibold"
                    style={{ fontSize: 12.5, lineHeight: 1.25 }}
                  >
                    {w.title}
                  </p>
                  <p
                    className="text-[var(--color-fg-secondary)] mt-0.5"
                    style={{ fontSize: 11.5, lineHeight: 1.4 }}
                  >
                    {w.body}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 mt-1 shrink-0"
                  style={{ color: SAGE }}
                />
              </button>
            );
          })
        )}
      </div>
      <GapPlaybookModal
        open={activePlaybook != null}
        onClose={() => setActivePlaybook(null)}
        playbook={activePlaybook}
      />
    </div>
  );
}

function PromptHitRateCard({ stats }: { stats: VisibilityStats }) {
  const grew = stats.delta >= 0;
  const flat = Math.abs(stats.delta) <= 0.04;
  const pct = Math.round(
    (stats.promptsHit / Math.max(1, stats.promptsTotal)) * 100,
  );
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full w-full min-w-0">
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading
          text="Prompt hit rate"
          info="Customer-style prompts where AI tools named your business in the most recent scan."
        />
        <div className="shrink-0">
          <BadgeDelta
            variant="solid"
            deltaType={flat ? "neutral" : grew ? "increase" : "decrease"}
            value={`${grew ? "+" : ""}${stats.delta.toFixed(1)}%`}
            title={
              flat
                ? "No change in your prompt hit rate over the selected range."
                : `${grew ? "Up" : "Down"} ${Math.abs(stats.delta).toFixed(1)}% over the selected range.`
            }
          />
        </div>
      </div>

      {/* Centered stat block — flex-1 absorbs all extra vertical space so
          the stat sits in the visual middle of the card, exactly like the
          donut in Brand Sentiment's left "Sentiment" card. */}
      <div className="flex-1 flex flex-col justify-center">
        <div
          className="rounded-[var(--radius-md)] p-4 border-l-4"
          style={{
            borderLeftColor: HIT_RATE_ACCENTS.sage,
            background: `linear-gradient(135deg, ${HIT_RATE_ACCENTS.sage}1F 0%, ${HIT_RATE_ACCENTS.yellow}10 100%)`,
          }}
        >
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span
              className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
              style={{ fontSize: 10, letterSpacing: "0.1em" }}
            >
              This scan
            </span>
            <span
              className="tabular-nums font-bold rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5"
              style={{
                fontSize: 10,
                color: "#fff",
                backgroundColor: grew ? HIT_RATE_ACCENTS.sage : HIT_RATE_ACCENTS.rust,
              }}
            >
              {grew ? "↑" : "↓"} {Math.abs(stats.delta).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 40,
                fontWeight: 700,
                color: "var(--color-fg)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {stats.promptsHit}
            </span>
            <span style={{ fontSize: 18, color: "var(--color-fg-muted)", fontWeight: 500 }}>
              /{stats.promptsTotal}
            </span>
            <span
              className="ml-auto tabular-nums"
              style={{ fontSize: 13, color: "var(--color-fg-muted)" }}
            >
              {pct}%
            </span>
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-1 font-semibold hover:gap-1.5 hover:underline transition-all mt-2"
            style={{ fontSize: 11, color: HIT_RATE_ACCENTS.orange }}
          >
            <Crown className="h-3 w-3" />
            Upgrade to track more prompts
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Chips footer — pinned to bottom by the centered flex-1 above */}
      <div className="grid grid-cols-2 gap-2 pt-3">
        <PromptHitChip
          color={HIT_RATE_ACCENTS.yellow}
          icon={Trophy}
          label={`${stats.bestEngine.label} ${stats.bestEngine.pct.toFixed(0)}%`}
        />
        <PromptHitChip
          color={HIT_RATE_ACCENTS.orange}
          icon={Target}
          label={`#${stats.avgRank.toFixed(1)} rank`}
        />
        <PromptHitChip
          color={HIT_RATE_ACCENTS.sage}
          icon={Layers}
          label={`${stats.coverageEngines}/${stats.totalEngines} engines`}
        />
        <PromptHitChip
          color={HIT_RATE_ACCENTS.deep}
          icon={MessageSquare}
          label={`${stats.mentions.toLocaleString()} mentions`}
        />
      </div>
    </div>
  );
}

function PromptHitChip({
  color,
  icon: Icon,
  label,
}: {
  color: string;
  icon: typeof Trophy;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 w-full justify-center"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        backgroundColor: `${color}1A`,
        border: `1px solid ${color}33`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

// ─── VARIANT BODY ───────────────────────────────────────────────────────────

interface VariantBodyProps {
  data: ScannerData;
  treatment: Treatment;
  range: RangeKey;
  onRangeChange: (k: RangeKey) => void;
  customStart: Date;
  customEnd: Date;
  onCustomApply: (start: Date, end: Date) => void;
  enabledBrandIds: Set<string>;
  enabledEngineIds: Set<string>;
  toggleEngine: (id: string) => void;
  minDate: Date;
  maxDate: Date;
  aiOverviewVariant: AIOverviewVariant | undefined;
}

function VariantBody({
  data,
  treatment,
  range,
  onRangeChange,
  customStart,
  customEnd,
  onCustomApply,
  enabledBrandIds,
  enabledEngineIds,
  toggleEngine,
  minDate,
  maxDate,
  aiOverviewVariant,
}: VariantBodyProps) {
  return (
    <div className="space-y-5">
      <AISummaryGenerator
        getSummary={() => buildAISummaryText(data)}
        getCTA={() => buildAISummaryCTA(data)}
      />
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <HeroTitle data={data} treatment={treatment} />
          <HeroDescription text={HERO_DESCRIPTION} />
        </div>
        <div className="shrink-0 mt-1">
          <NextScanCard />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TimeRangeDropdown
          value={range as TimeRangeKey}
          customFrom={customStart.toISOString().slice(0, 10)}
          customTo={customEnd.toISOString().slice(0, 10)}
          onChange={(key, fromISO, toISO) => {
            if (key === "custom" && fromISO && toISO) {
              onCustomApply(
                new Date(fromISO + "T00:00:00"),
                new Date(toISO + "T00:00:00"),
              );
            } else {
              onRangeChange(key as RangeKey);
            }
          }}
        />
        <EngineChips enabledIds={enabledEngineIds} onToggle={toggleEngine} treatment={treatment} chipSize="lg" />
      </div>

      {/* 3-zone hero grid (3/6/3 cols) — mirrors the Brand Sentiment hero
          structure exactly: col-span lives on the immediate grid child so
          the framework can compute column tracks correctly. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-2 min-w-0 flex">
          <VisibilityScoreGauge
            score={data.youToday}
            hideDescription
            delta={data.youDelta}
          />
        </div>
        <div className="lg:col-span-7 min-w-0 flex">
          <ChartCard
            data={data}
            treatment={treatment}
            aiOverviewVariant={aiOverviewVariant}
            enabledBrandIds={enabledBrandIds}
            chartHeight={260}
            showModeToggle
            defaultMode="focus"
            delta={data.youDelta}
          />
        </div>
        <div className="lg:col-span-3 min-w-0 flex">
          <GapsToFillCard data={data} />
        </div>
      </div>

      <ScrollReveal>
        <CompetitorsBlock
          data={data}
          treatment={treatment}
          aiOverviewVariant={aiOverviewVariant}
        />
      </ScrollReveal>

      <p
        className="text-[var(--color-fg-muted)]"
        style={{ fontSize: 11 + treatment.bodyBumpPx }}
      >
        Last {data.rangeN} days · {enabledEngineIds.size} of {ENGINES.length} AI engines · synthetic preview data
      </p>
    </div>
  );
}

// ─── MAIN WRAPPER ───────────────────────────────────────────────────────────

interface VisibilityScannerSectionProps {
  brands?: MockBrand[];
  dates?: Date[];
  variant?: "A" | "B" | "C";
  aiOverviewVariant?: AIOverviewVariant;
}

const TREATMENTS: Record<"A" | "B" | "C", Treatment> = {
  A: TREATMENT_COMPACT_LABEL,
  B: TREATMENT_STANDARD_LABEL,
  C: TREATMENT_LARGE_LABEL,
};

export function VisibilityScannerSection({
  brands = MOCK_BRANDS,
  dates = MOCK_DATES,
  variant = "B",
  aiOverviewVariant,
}: VisibilityScannerSectionProps) {
  // The mock data is seeded from `new Date()` at module load, which produces
  // slightly different values on the server vs. on the client during hydration.
  // That mismatch shows up as different SVG path coordinates in the SoV donut.
  // Render nothing until mount so React only paints from client-side state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [range, setRange] = useState<RangeKey>("90d");
  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(() => new Date());
  const enabledBrandIds = useMemo<Set<string>>(
    () => new Set(brands.map((b) => b.id)),
    [brands],
  );
  const [enabledEngineIds, setEnabledEngineIds] = useState<Set<string>>(
    () => new Set(ENGINES.map((e) => e.id))
  );

  const rangeN = computeRangeN(range, customStart, customEnd);
  const data = useScannerData(brands, dates, rangeN, enabledEngineIds);

  const minDate = dates[0] ?? new Date();
  const maxDate = dates[dates.length - 1] ?? new Date();

  const toggleEngine = (id: string) => {
    setEnabledEngineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCustomApply = (s: Date, e: Date) => {
    setCustomStart(s);
    setCustomEnd(e);
    setRange("custom");
  };

  if (!mounted) {
    return <div className="min-h-[600px]" aria-hidden />;
  }

  return (
    <VariantBody
      data={data}
      treatment={TREATMENTS[variant]}
      range={range}
      onRangeChange={setRange}
      customStart={customStart}
      customEnd={customEnd}
      onCustomApply={handleCustomApply}
      enabledBrandIds={enabledBrandIds}
      enabledEngineIds={enabledEngineIds}
      toggleEngine={toggleEngine}
      minDate={minDate}
      maxDate={maxDate}
      aiOverviewVariant={aiOverviewVariant}
    />
  );
}
