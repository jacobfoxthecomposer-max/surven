"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { TrendingUp, TrendingDown, Activity, Globe } from "lucide-react";
import { COLORS } from "@/utils/constants";
import {
  VisibilityScannerChart,
  type VisibilityBrand,
} from "@/components/organisms/VisibilityScannerChart";

/* ==========================================================================
 * AI Visibility Scanner — Section
 * --------------------------------------------------------------------------
 * Multi-brand visibility tracking over time. Shows how often a business and
 * its competitors are mentioned across AI engines, with filter controls and
 * a multi-line trend chart.
 *
 * Currently runs on synthetic 90-day mock data so the layout/UX can be
 * reviewed on Vercel preview deployments before wiring real scan history.
 * Replace `MOCK_BRANDS` and `MOCK_DATES` with a hook that loads scans for
 * the current business + tracked competitors when the scan API is ready.
 * ========================================================================== */

// ── Mock data layer (replace with real scan history hook) ────────────────────

function genLine(base: number, trend: number, noise: number, n: number, seedMul = 1) {
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

const MOCK_N = 90;

const MOCK_BRANDS: VisibilityBrand[] = [
  { id: "you", name: "Your Business", color: COLORS.primary, isYou: true,  data: genLine(45, 0.18, 2.6, MOCK_N, 1) },
  { id: "c1",  name: "ProPlumber Austin", color: COLORS.scoreOrange, isYou: false, data: genLine(63, 0.10, 2.4, MOCK_N, 2) },
  { id: "c2",  name: "FastFix Plumbing",  color: COLORS.scoreYellow, isYou: false, data: genLine(38, 0.07, 2.8, MOCK_N, 3) },
  { id: "c3",  name: "Austin Pros",       color: COLORS.info,        isYou: false, data: genLine(28, 0.04, 2.0, MOCK_N, 4) },
  { id: "c4",  name: "LeakMasters",       color: COLORS.scoreGreen,  isYou: false, data: genLine(34, 0.06, 2.2, MOCK_N, 5) },
  { id: "c5",  name: "RapidFlow",         color: COLORS.danger,      isYou: false, data: genLine(22, 0.05, 2.4, MOCK_N, 6) },
];

function buildDates(n: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}
const MOCK_DATES = buildDates(MOCK_N);

// ── Filter constants ─────────────────────────────────────────────────────────

const RANGES = [
  { key: "14d", label: "14d", n: 14 },
  { key: "30d", label: "30d", n: 30 },
  { key: "60d", label: "60d", n: 60 },
  { key: "90d", label: "90d", n: 90 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const ENGINES = [
  { id: "chatgpt",   label: "ChatGPT" },
  { id: "claude",    label: "Claude" },
  { id: "gemini",    label: "Gemini" },
  { id: "google_ai", label: "Google AI" },
  { id: "perplexity", label: "Perplexity" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

interface VisibilityScannerSectionProps {
  brands?: VisibilityBrand[];
  dates?: Date[];
}

export function VisibilityScannerSection({
  brands = MOCK_BRANDS,
  dates = MOCK_DATES,
}: VisibilityScannerSectionProps) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [enabledBrandIds, setEnabledBrandIds] = useState<Set<string>>(
    () => new Set(brands.map((b) => b.id))
  );
  const [enabledEngineIds, setEnabledEngineIds] = useState<Set<string>>(
    () => new Set(ENGINES.map((e) => e.id))
  );

  const rangeN = RANGES.find((r) => r.key === range)?.n ?? 30;

  // Slice brand data + dates to selected range
  const sliced = useMemo(() => {
    const start = Math.max(0, dates.length - rangeN);
    return {
      dates: dates.slice(start),
      brands: brands.map((b) => ({ ...b, data: b.data.slice(start) })),
    };
  }, [brands, dates, rangeN]);

  // Engine count scales the values (visualizes "fewer engines = lower coverage")
  const engineScale = enabledEngineIds.size / ENGINES.length || 0.2;
  const scaledBrands = useMemo(
    () =>
      sliced.brands.map((b) => ({
        ...b,
        data: b.data.map((v) => Math.round(v * (0.55 + engineScale * 0.45) * 10) / 10),
      })),
    [sliced.brands, engineScale]
  );

  const you = scaledBrands.find((b) => b.isYou);
  const youLatest = you?.data[you.data.length - 1] ?? 0;
  const youFirst = you?.data[0] ?? 0;
  const youDelta = Math.round(youLatest - youFirst);

  // KPIs — derived from current "you" series
  const totalMentions = Math.round(youLatest * 71);
  const sharePct = scaledBrands.length
    ? Math.round((youLatest / scaledBrands.reduce((s, b) => s + (b.data[b.data.length - 1] ?? 0), 0)) * 1000) / 10
    : 0;
  const avgPosition = scaledBrands
    .map((b) => ({ id: b.id, latest: b.data[b.data.length - 1] ?? 0 }))
    .sort((a, b) => b.latest - a.latest)
    .findIndex((x) => x.id === "you") + 1;

  const toggleBrand = (id: string) => {
    setEnabledBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleEngine = (id: string) => {
    setEnabledEngineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section>
      {/* ─── Section header ─── */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">
            AI Visibility Scanner
          </p>
          <h2 className="text-2xl text-[var(--color-fg)]">
            How AI sees you vs your competitors
          </h2>
        </div>

        {/* Range pills */}
        <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={
                "px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors " +
                (range === r.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KPI strip ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
      >
        <KpiCard
          label="Brand Mentions"
          value={totalMentions.toLocaleString("en-US")}
          delta={`${youDelta >= 0 ? "+" : ""}${youDelta}%`}
          deltaDir={youDelta >= 0 ? "up" : "down"}
          icon={<Activity className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />}
        />
        <KpiCard
          label="Avg Position"
          value={`#${avgPosition || "—"}`}
          delta="of 6 tracked"
          deltaDir="neutral"
          icon={<TrendingUp className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />}
        />
        <KpiCard
          label="Share of Voice"
          value={`${sharePct}%`}
          delta={`${youDelta >= 0 ? "+" : ""}${Math.abs(Math.round(youDelta * 0.1))}%`}
          deltaDir={youDelta >= 0 ? "up" : "down"}
          icon={<Globe className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />}
        />
        <KpiCard
          label="Citation Rate"
          value={`${Math.round(youLatest)}%`}
          delta={`${youDelta >= 0 ? "+" : ""}${youDelta}% vs ${range}`}
          deltaDir={youDelta >= 0 ? "up" : "down"}
          icon={
            youDelta >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" style={{ color: COLORS.danger }} />
            )
          }
        />
      </motion.div>

      {/* ─── Engine filter chips ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-[var(--color-fg-muted)] mr-1">AI engines:</span>
        {ENGINES.map((e) => {
          const active = enabledEngineIds.has(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggleEngine(e.id)}
              className={
                "px-2.5 py-1 text-xs rounded-[var(--radius-full)] border transition-colors " +
                (active
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-transparent text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-fg-secondary)]")
              }
            >
              {e.label}
            </button>
          );
        })}
      </div>

      {/* ─── Chart ─── */}
      <Card className="p-5">
        <VisibilityScannerChart
          brands={scaledBrands}
          dates={sliced.dates}
          enabledIds={enabledBrandIds}
        />
      </Card>

      {/* ─── Competitor toggle row ─── */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {scaledBrands.map((b) => {
          const enabled = enabledBrandIds.has(b.id);
          const latest = b.data[b.data.length - 1] ?? 0;
          const first = b.data[0] ?? 0;
          const delta = Math.round(latest - first);
          return (
            <button
              key={b.id}
              onClick={() => toggleBrand(b.id)}
              className={
                "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-left transition-all " +
                (enabled
                  ? "bg-[var(--color-surface)] border-[var(--color-border-hover)]"
                  : "bg-transparent border-[var(--color-border)] opacity-50 hover:opacity-80")
              }
            >
              <span
                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{
                  backgroundColor: b.color,
                  boxShadow: b.isYou ? `0 0 0 2px var(--color-bg), 0 0 0 3px ${b.color}` : "none",
                }}
              >
                {b.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[var(--color-fg)] truncate">
                  {b.isYou ? "You" : b.name}
                </p>
                <p className="text-[10px] text-[var(--color-fg-muted)]">
                  {Math.round(latest)}%
                  <span
                    className="ml-1"
                    style={{ color: delta >= 0 ? COLORS.scoreGreen : COLORS.danger }}
                  >
                    {delta >= 0 ? "+" : ""}{delta}
                  </span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Footer meta ─── */}
      <p className="mt-4 text-[11px] text-[var(--color-fg-muted)]">
        Last {rangeN} days · {enabledEngineIds.size} of {ENGINES.length} AI engines · synthetic preview data
      </p>
    </section>
  );
}

// ── KPI subcomponent ────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  deltaDir: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

function KpiCard({ label, value, delta, deltaDir, icon }: KpiCardProps) {
  const deltaColor =
    deltaDir === "up"
      ? COLORS.scoreGreen
      : deltaDir === "down"
      ? COLORS.danger
      : COLORS.fgMuted;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)] font-medium">
          {label}
        </p>
        {icon}
      </div>
      <p
        className="text-2xl text-[var(--color-fg)] leading-none mb-1.5"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="text-[11px]" style={{ color: deltaColor }}>
        {delta}
      </p>
    </div>
  );
}
