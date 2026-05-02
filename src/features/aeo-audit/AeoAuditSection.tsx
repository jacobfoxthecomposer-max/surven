"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Check,
  AlertTriangle,
  X as XIcon,
  ChevronDown,
  Loader2,
  ExternalLink,
  Compass,
  Layers,
  Quote,
  ShieldCheck,
  Gauge,
  ListChecks,
  Puzzle,
  Info,
} from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";

const CHROME_EXT_URL = "https://chromewebstore.google.com/detail/surven-auditor/";

// Small inline link surfaced in low-key spots (hero subtitle, scan form
// helper text, loading state tip).
function ChromeExtLink({ children }: { children?: React.ReactNode }) {
  return (
    <a
      href={CHROME_EXT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium hover:underline transition-colors"
      style={{ color: "var(--color-primary-hover)" }}
    >
      <Puzzle className="h-3.5 w-3.5" />
      {children ?? "Get the Chrome extension"}
      <ArrowRight className="h-3 w-3" />
    </a>
  );
}

// Bigger CTA card — used at the bottom of the results cascade.
function ChromeExtCallout() {
  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden h-full flex flex-col"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      <div
        className="px-5 py-5 flex-1 flex flex-col gap-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)",
        }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="h-11 w-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
          >
            <Puzzle className="h-5 w-5" style={{ color: COLORS.primary }} />
          </div>
          <div className="min-w-0">
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--color-fg)",
                lineHeight: 1.2,
              }}
            >
              Audit any page in one click
            </p>
            <p
              className="text-[var(--color-fg-secondary)] mt-1"
              style={{ fontSize: 14, lineHeight: 1.5 }}
            >
              The Surven Chrome extension runs this same readability scan on
              whichever page you&apos;re visiting — no copy-paste needed.
            </p>
          </div>
        </div>
        <a
          href={CHROME_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium shadow-md transition-colors shrink-0"
          style={{ fontSize: 14 }}
        >
          <Puzzle className="h-4 w-4" />
          Install extension
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function WebsiteAuditCallout() {
  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden h-full flex flex-col"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      <div
        className="px-5 py-5 flex-1 flex flex-col gap-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)",
        }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="h-11 w-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
          >
            <ListChecks className="h-5 w-5" style={{ color: COLORS.primary }} />
          </div>
          <div className="min-w-0">
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--color-fg)",
                lineHeight: 1.2,
              }}
            >
              Open the full Website Audit
            </p>
            <p
              className="text-[var(--color-fg-secondary)] mt-1"
              style={{ fontSize: 14, lineHeight: 1.5 }}
            >
              Severity-tagged findings across schema, freshness, FAQ
              markup, and meta — with deeper diagnostics and action plans.
            </p>
          </div>
        </div>
        <a
          href="/audit"
          className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium shadow-md transition-colors shrink-0"
          style={{ fontSize: 14 }}
        >
          <ListChecks className="h-4 w-4" />
          Open Website Audit
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
import { Card } from "@/components/atoms/Card";
import { AIOverview } from "@/components/atoms/AIOverview";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COLORS } from "@/utils/constants";
import { buildMockScanResult } from "./mockResult";
import {
  PILLAR_BLURBS,
  PILLAR_LABELS,
  type CheckResult,
  type Pillar,
  type PillarScore,
  type ScanResult,
} from "./types";

const EASE = [0.16, 1, 0.3, 1] as const;
// Aligned to the canonical reveal used on Prompt Research + Sentiment pages
// (y: 20, blur 4 -> 0, duration 0.55).
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: EASE },
} as const;

const STATUS_TOK = {
  pass: {
    color: "#5E7250",
    bg: "rgba(150,162,131,0.16)",
    Icon: Check,
    label: "Pass",
  },
  partial: {
    color: "#B8A030",
    bg: "rgba(184,160,48,0.16)",
    Icon: AlertTriangle,
    label: "Partial",
  },
  fail: {
    color: "#B54631",
    bg: "rgba(181,70,49,0.14)",
    Icon: XIcon,
    label: "Fail",
  },
} as const;

const GRADE_TOK = {
  good: { color: "#5E7250", label: "Good" },
  average: { color: "#B8A030", label: "Average" },
  poor: { color: "#B54631", label: "Needs work" },
} as const;

// ─── Helpers for the in-depth summary + effort pills ─────────────────────

function formatEffort(min: number): string {
  if (min < 10) return `${min} min`;
  if (min < 60) return `~${min} min`;
  if (min < 120) return `~1 hr`;
  return `~${Math.round(min / 60)} hr`;
}

function effortBadge(min: number): { label: string; color: string; bg: string } {
  if (min <= 10) return { label: "Quick win", color: "#5E7250", bg: "rgba(150,162,131,0.16)" };
  if (min <= 30) return { label: "Small task", color: "#B8A030", bg: "rgba(184,160,48,0.16)" };
  return { label: "Dev work", color: "#7A8FA6", bg: "rgba(122,143,166,0.18)" };
}

function buildPageSummary(result: ScanResult): string {
  const checks = result.checks;
  const fails = checks.filter((c) => c.status === "fail");
  const partials = checks.filter((c) => c.status === "partial");
  const passing = checks.filter((c) => c.status === "pass");

  // Strongest + weakest pillars
  const sorted = [...result.pillars].sort(
    (a, b) => b.earned / b.max - a.earned / a.max,
  );
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  // How many points are recoverable from non-passing checks
  const recoverable = [...fails, ...partials].reduce(
    (s, c) => s + (c.max - c.earned),
    0,
  );
  const totalEffort = [...fails, ...partials].reduce((s, c) => s + c.effortMin, 0);
  const effortLabel =
    totalEffort < 60
      ? `under an hour`
      : totalEffort < 240
      ? `${Math.round(totalEffort / 60)} hours of focused work`
      : `a focused day of work`;

  const strongPct = Math.round((strongest.earned / strongest.max) * 100);
  const weakPct = Math.round((weakest.earned / weakest.max) * 100);

  if (fails.length === 0 && partials.length === 0) {
    return `Every check passed. ${result.score}/100 across all 25 readability signals — your site reads cleanly to AI engines from front to back. Keep an eye on freshness and schema coverage as the page evolves.`;
  }
  if (fails.length === 0) {
    return `${result.score}/100 across 25 readability checks. ${PILLAR_LABELS[strongest.pillar]} is your strongest pillar at ${strongPct}%. ${partials.length} partial issue${partials.length === 1 ? "" : "s"} sit between you and a higher score — most are tightening passes already in place. Roughly ${Math.round(recoverable)} points are recoverable in ${effortLabel}.`;
  }
  return `${result.score}/100 across 25 readability checks. ${PILLAR_LABELS[strongest.pillar]} is your strongest pillar at ${strongPct}%; ${PILLAR_LABELS[weakest.pillar]} is the weakest at ${weakPct}%. ${fails.length} check${fails.length === 1 ? "" : "s"} are blocking AI from reading parts of your site, plus ${partials.length} partial issue${partials.length === 1 ? "" : "s"}. Roughly ${Math.round(recoverable)} points are recoverable in ${effortLabel}, and ${passing.length} of the easy wins are already locked in.`;
}

function formatScannedAt(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? "1 day ago" : `${day} days ago`;
}

interface AeoAuditSectionProps {
  /** Plan kept for future soft-gating; no longer hard-paywalls anything. */
  plan?: "free" | "plus" | "premium" | "admin";
  /** Display name of the business in subtitle copy. */
  businessName?: string;
  /**
   * The site URL to scan. Captured during onboarding and passed in by the
   * route. When omitted (preview / dev), the page falls back to the mock
   * result so the layout still renders.
   */
  siteUrl?: string;
}

export function AeoAuditSection({
  plan: _plan = "plus",
  businessName = "your site",
  siteUrl,
}: AeoAuditSectionProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Auto-scan on mount. If a real siteUrl was provided, hit the live
  // scan endpoint; otherwise drop in the mock so the page renders for
  // QA / unsigned-in / no-URL-yet states.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!siteUrl) {
        setResult(buildMockScanResult());
        return;
      }
      setScanning(true);
      setError(null);
      try {
        const res = await fetch("/api/aeo-scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: siteUrl }),
        });
        const json = (await res.json()) as ScanResult & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Scan failed.");
        } else if (json.error) {
          setError(json.error);
          setResult(json);
        } else {
          setResult(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Network error.");
        }
      } finally {
        if (!cancelled) setScanning(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [siteUrl]);

  // Score-derived headline word + color (mirrors crawlability page).
  const scoreWord = result
    ? result.score < 26
      ? "Poor"
      : result.score < 56
      ? "Fair"
      : result.score < 81
      ? "Good"
      : "Excellent"
    : null;
  const scoreColor = result
    ? result.score < 26
      ? "#B54631"
      : result.score < 56
      ? "#C97B45"
      : result.score < 81
      ? "#96A283"
      : "#7D8E6C"
    : null;

  // Top-of-page AI summary copy.
  const failCount =
    result?.checks.filter((c) => c.status === "fail").length ?? 0;
  const partialCount =
    result?.checks.filter((c) => c.status === "partial").length ?? 0;
  const aiOverviewText = !result
    ? "Reading your site through every AI engine's lens to identify what's clear and what's getting missed."
    : failCount > 0
    ? `${failCount} readability gap${failCount === 1 ? "" : "s"} are blocking AI from reading parts of your site, plus ${partialCount} partial issue${partialCount === 1 ? "" : "s"}. Tackle the failures first.`
    : partialCount > 0
    ? `No major readability blockers — ${partialCount} check${partialCount === 1 ? "" : "s"} could move from partial to pass with light edits.`
    : "Site reads cleanly for AI engines. Keep monitoring content freshness and schema coverage.";

  return (
    <div className="space-y-5 w-full">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
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
          {scanning && !result ? (
            <>
              Scanning your site&apos;s{" "}
              <span style={{ color: "var(--color-fg-muted)", fontStyle: "italic" }}>
                AI readability
              </span>
              …
            </>
          ) : result ? (
            <>
              Your site&apos;s AI readability is{" "}
              <span style={{ color: scoreColor!, fontStyle: "italic" }}>
                {scoreWord}
              </span>
              .
            </>
          ) : (
            <>
              Your site&apos;s AI readability is{" "}
              <span style={{ color: "var(--color-fg-muted)", fontStyle: "italic" }}>
                loading
              </span>
              …
            </>
          )}
        </h1>
        <p className="text-[var(--color-fg-muted)] mt-2" style={{ fontSize: 15.5, lineHeight: 1.55 }}>
          How well AI engines like ChatGPT, Claude, and Gemini can read,
          understand, and quote {businessName}. 25 checks across discoverability,
          structure, quotability, and trust signals.
        </p>
      </motion.div>

      {/* Stat strip — quick anchor under the hero */}
      {result && <ResultStatStrip result={result} />}

      {/* AIOverview callout — short headline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
      >
        <AIOverview text={aiOverviewText} />
      </motion.div>

      {/* Natural-language summary — in-depth paragraph computed from real data */}
      {result && <PageSummary result={result} />}

      {/* Inline error banner if the auto-scan blew up. */}
      {error && (
        <div
          className="text-sm rounded-[var(--radius-md)] p-3 border-l-4"
          style={{
            color: "#B54631",
            borderLeftColor: "#B54631",
            backgroundColor: "rgba(181,70,49,0.06)",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {scanning && (
        <Card className="!p-6">
          <div className="flex flex-col items-center gap-3 py-6 text-[var(--color-fg-secondary)]">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-primary)" }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Running 25 checks across 4 pillars…
              </span>
            </div>
            <p
              className="text-[var(--color-fg-muted)] text-center"
              style={{ fontSize: 12.5 }}
            >
              Tip: <ChromeExtLink>install the Chrome extension</ChromeExtLink>{" "}
              to scan any page without leaving it.
            </p>
          </div>
        </Card>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div
            key={result.scannedAt}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="space-y-5"
          >
            {/* Scanned-URL link — small, no rescan affordance (the URL
                comes from onboarding; one source of truth). */}
            <motion.div {...reveal}>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
                style={{ fontSize: 14 }}
              >
                <ExternalLink className="h-4 w-4" />
                {result.url}
              </a>
            </motion.div>

            {/* Priority fix cards — full-width, no fix steps (Chrome ext takes that),
                effort + impact pills front-and-center. */}
            <motion.div {...reveal}>
              <PriorityFixCards checks={result.checks} />
            </motion.div>

            {/* Pillar progress bars — horizontal, scan-friendly. */}
            <motion.div {...reveal}>
              <PillarBars pillars={result.pillars} checks={result.checks} />
            </motion.div>

            {/* Full audit detail — collapsed by default. */}
            <motion.div {...reveal}>
              <ChecksList checks={result.checks} />
            </motion.div>

            <motion.div
              {...reveal}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch"
            >
              <ChromeExtCallout />
              <WebsiteAuditCallout />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat strip (under hero) ──────────────────────────────────────────────

// Half-circle gauge math, mirroring VisibilityScoreGauge.tsx so the visual
// identity matches across the product.
function polar(cx: number, cy: number, r: number, deg: number) {
  return {
    x: cx - r * Math.cos((deg * Math.PI) / 180),
    y: cy - r * Math.sin((deg * Math.PI) / 180),
  };
}
function halfArc(cx: number, cy: number, r: number, a: number, b: number) {
  const s = polar(cx, cy, r, a);
  const e = polar(cx, cy, r, b);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

function ResultStatStrip({ result }: { result: ScanResult }) {
  const tier =
    result.score >= 81
      ? "good"
      : result.score >= 56
      ? "good"
      : result.score >= 26
      ? "average"
      : "poor";
  const tok = GRADE_TOK[tier];
  const scannedAtPretty = formatScannedAt(result.scannedAt);

  // Half-circle gauge math
  const gaugeWidth = 240;
  const cx = 130;
  const cy = 130;
  const r = 100;
  const stroke = 18;
  const angle = 180 * (result.score / 100);
  const tierLabel =
    result.score >= 81
      ? "EXCELLENT"
      : result.score >= 56
      ? "GREAT"
      : result.score >= 26
      ? "FAIR"
      : "LOW";
  const tierDescription =
    result.score >= 81
      ? "AI engines read your site clearly across nearly every signal — protect this position."
      : result.score >= 56
      ? "Solid foundation with room to climb. A few targeted fixes will lift the score."
      : result.score >= 26
      ? "AI engines pick up parts of your site but miss key signals. Plenty of room to improve."
      : "AI engines struggle to read this page. The biggest growth lever sits here.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 flex items-center gap-6 flex-wrap"
    >
      {/* Half-circle gauge */}
      <div className="relative shrink-0" style={{ width: gaugeWidth }}>
        <svg viewBox="0 0 260 150" width="100%" style={{ display: "block" }}>
          <defs>
            {/*
              Both gradients anchored to user-space coordinates spanning the
              full arc (x=30 left tip → x=230 right tip), NOT the active
              path's bounding box. Without userSpaceOnUse the active arc
              compresses all four color stops into whatever portion is
              filled — so a 51% score would still show sage/deep at the end.
              With userSpaceOnUse, a 51% arc only shows the rust → amber
              section of the gradient, which is what the tier actually is.
            */}
            <linearGradient
              id="aeoGaugeTrack"
              gradientUnits="userSpaceOnUse"
              x1="30"
              y1="0"
              x2="230"
              y2="0"
            >
              <stop offset="0%" stopColor="#B54631" stopOpacity="0.18" />
              <stop offset="33%" stopColor="#C97B45" stopOpacity="0.20" />
              <stop offset="66%" stopColor="#96A283" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#7D8E6C" stopOpacity="0.30" />
            </linearGradient>
            <linearGradient
              id="aeoGaugeActive"
              gradientUnits="userSpaceOnUse"
              x1="30"
              y1="0"
              x2="230"
              y2="0"
            >
              <stop offset="0%" stopColor="#B54631" />
              <stop offset="33%" stopColor="#C97B45" />
              <stop offset="66%" stopColor="#96A283" />
              <stop offset="100%" stopColor="#7D8E6C" />
            </linearGradient>
          </defs>
          {/* Track (full half-arc, soft) */}
          <path
            d={halfArc(cx, cy, r, 0, 180)}
            stroke="url(#aeoGaugeTrack)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
          {/* Filled portion (gradient — same color stops as track at full opacity) */}
          <path
            d={halfArc(cx, cy, r, 0, angle)}
            stroke="url(#aeoGaugeActive)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
          />
          {/* Score number — placed in the visual center of the arc bowl */}
          <text
            x={cx}
            y={cy - 28}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 56,
              fontWeight: 600,
              fill: tok.color,
              letterSpacing: "-0.02em",
            }}
          >
            {result.score}
          </text>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fill="var(--color-fg-muted)"
            fontSize="14"
            style={{ fontFamily: "var(--font-display)" }}
          >
            /100
          </text>
        </svg>
        {/* Tier label + question-mark hover hint, centered below the arc */}
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span
            className="font-semibold uppercase"
            style={{
              fontSize: 14,
              letterSpacing: "0.12em",
              color: tok.color,
            }}
          >
            {tierLabel}
          </span>
          <HoverHint hint={tierDescription}>
            <Info
              className="h-3.5 w-3.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
              aria-label="Score tier explanation"
            />
          </HoverHint>
        </div>
      </div>

      {/* Right-side meta */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 15, lineHeight: 1.55 }}
        >
          AI readability across 25 checks.
        </p>
        <div
          className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-[var(--color-fg-secondary)]"
          style={{ fontSize: 14 }}
        >
          <span>
            Last scan{" "}
            <span className="font-semibold text-[var(--color-fg)]">
              {scannedAtPretty}
            </span>
          </span>
          <span className="text-[var(--color-fg-muted)]" style={{ fontSize: 13 }}>
            ·
          </span>
          <span>
            Next scan{" "}
            <span className="font-semibold text-[var(--color-fg)]">in 7 days</span>
          </span>
          <span className="text-[var(--color-fg-muted)]" style={{ fontSize: 13 }}>
            ·
          </span>
          <span>
            Scan time{" "}
            <span className="font-semibold text-[var(--color-fg)] tabular-nums">
              {(result.durationMs / 1000).toFixed(1)}s
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page summary (in-depth paragraph) ────────────────────────────────────

function PageSummary({ result }: { result: ScanResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: EASE }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
    >
      <p
        className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-2"
        style={{ fontSize: 11.5, letterSpacing: "0.12em" }}
      >
        In-depth summary
      </p>
      <p
        className="text-[var(--color-fg)]"
        style={{ fontSize: 16, lineHeight: 1.6, fontFamily: "var(--font-sans)" }}
      >
        {buildPageSummary(result)}
      </p>
    </motion.div>
  );
}

// ─── Priority fix cards ───────────────────────────────────────────────────
// Full-width cards for the top 3 highest-impact non-passing checks. No fix
// instructions inline — those live in the Chrome extension. Each card shows
// status, label, readability impact, effort + impact pills, and a deep link
// into the extension.

function PriorityFixCards({ checks }: { checks: CheckResult[] }) {
  const fixable = checks
    .filter((c) => c.status !== "pass")
    .map((c) => ({ check: c, gain: c.max - c.earned }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  if (fixable.length === 0) return null;
  const totalGain = fixable.reduce((s, x) => s + x.gain, 0);

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      <div
        className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
          >
            <Sparkles className="h-4.5 w-4.5" style={{ color: COLORS.primary, height: 18, width: 18 }} />
          </div>
          <SectionHeading
            text="Fix these first"
            info="The three highest-impact issues across all pillars, ranked by points recoverable."
          />
        </div>
        <p className="text-[var(--color-fg-secondary)]" style={{ fontSize: 14 }}>
          Recover ~
          <span className="font-semibold tabular-nums" style={{ color: COLORS.primary }}>
            {Math.round(totalGain)}
          </span>{" "}
          points by tackling these.
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {fixable.map(({ check, gain }) => {
          const tok = STATUS_TOK[check.status];
          const Icon = tok.Icon;
          const eff = effortBadge(check.effortMin);
          return (
            <li
              key={check.id}
              className="px-5 py-5 flex items-start gap-4 hover:bg-[var(--color-surface-alt)]/30 transition-colors"
            >
              <span
                className="inline-flex items-center justify-center rounded-[var(--radius-md)] shrink-0 mt-0.5"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: tok.bg,
                  color: tok.color,
                }}
                aria-label={tok.label}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className="text-[var(--color-fg)]"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                    }}
                  >
                    {check.label}
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 font-semibold uppercase"
                    style={{
                      fontSize: 10.5,
                      letterSpacing: "0.12em",
                      backgroundColor: tok.bg,
                      color: tok.color,
                    }}
                  >
                    {tok.label}
                  </span>
                </div>
                <p
                  className="text-[var(--color-fg-secondary)]"
                  style={{ fontSize: 15, lineHeight: 1.55 }}
                >
                  {check.readabilityImpact}
                </p>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold tabular-nums"
                    style={{
                      fontSize: 12.5,
                      backgroundColor: `${COLORS.primary}1f`,
                      color: COLORS.primaryHover,
                    }}
                  >
                    +{Math.round(gain)} pts
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold tabular-nums"
                    style={{
                      fontSize: 12.5,
                      backgroundColor: "rgba(60,62,60,0.06)",
                      color: "var(--color-fg-secondary)",
                    }}
                  >
                    {formatEffort(check.effortMin)}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold uppercase"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.10em",
                      backgroundColor: eff.bg,
                      color: eff.color,
                    }}
                  >
                    {eff.label}
                  </span>
                  <a
                    href={CHROME_EXT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 ml-auto font-semibold transition-opacity hover:opacity-80"
                    style={{ fontSize: 13, color: COLORS.primaryHover }}
                  >
                    <Puzzle className="h-3.5 w-3.5" />
                    Open the fix in Chrome extension
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Pillar bars (horizontal) ─────────────────────────────────────────────

function PillarBars({
  pillars,
  checks,
}: {
  pillars: PillarScore[];
  checks: CheckResult[];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div
        className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2.5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)",
        }}
      >
        <div
          className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
        >
          <Layers className="h-4 w-4" style={{ color: COLORS.primary }} />
        </div>
        <SectionHeading
          text="Pillar breakdown"
          info="Score per pillar across the 25 checks. Hover the icon for each pillar's role."
        />
      </div>
      <div className="px-5 py-5 space-y-5">
        {pillars.map((p, i) => {
          const Icon = PILLAR_ICON[p.pillar];
          const tok = GRADE_TOK[p.grade];
          const rows = checks.filter((c) => c.pillar === p.pillar);
          const passCount = rows.filter((c) => c.status === "pass").length;
          const partialCount = rows.filter((c) => c.status === "partial").length;
          const failCount = rows.filter((c) => c.status === "fail").length;
          const total = rows.length || 1;
          const passPct = (passCount / total) * 100;
          const partialPct = (partialCount / total) * 100;
          const failPct = (failCount / total) * 100;
          return (
            <div key={p.pillar} className="space-y-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tok.color}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color: tok.color }} />
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "var(--color-fg)",
                    lineHeight: 1.1,
                  }}
                >
                  {PILLAR_LABELS[p.pillar]}
                </p>
                <span
                  className="font-semibold uppercase"
                  style={{ fontSize: 11.5, letterSpacing: "0.12em", color: tok.color }}
                >
                  {tok.label}
                </span>
                <span className="inline-flex items-baseline tabular-nums ml-auto">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 30,
                      fontWeight: 600,
                      color: tok.color,
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                    }}
                  >
                    {p.earned}
                  </span>
                  <span
                    className="text-[var(--color-fg-muted)]"
                    style={{ fontSize: 16, fontFamily: "var(--font-display)" }}
                  >
                    /{p.max}
                  </span>
                </span>
              </div>
              {/* Stacked segment bar: pass / partial / fail. Modeled on the
                  SentimentByPlatform pattern — each segment animates in with
                  its own staggered transition. */}
              <div
                className="h-3 rounded-full overflow-hidden flex bg-[var(--color-surface-alt)]"
              >
                {passPct > 0 && (
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: STATUS_TOK.pass.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${passPct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                  />
                )}
                {partialPct > 0 && (
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: STATUS_TOK.partial.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${partialPct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 + 0.05, ease: EASE }}
                  />
                )}
                {failPct > 0 && (
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: STATUS_TOK.fail.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${failPct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 + 0.1, ease: EASE }}
                  />
                )}
              </div>
              <div
                className="flex items-center gap-3 text-[var(--color-fg-secondary)]"
                style={{ fontSize: 13 }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="rounded-full"
                    style={{ width: 9, height: 9, backgroundColor: STATUS_TOK.pass.color }}
                  />
                  <span className="tabular-nums font-semibold text-[var(--color-fg)]">
                    {passCount}
                  </span>{" "}
                  pass
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="rounded-full"
                    style={{ width: 9, height: 9, backgroundColor: STATUS_TOK.partial.color }}
                  />
                  <span className="tabular-nums font-semibold text-[var(--color-fg)]">
                    {partialCount}
                  </span>{" "}
                  partial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="rounded-full"
                    style={{ width: 9, height: 9, backgroundColor: STATUS_TOK.fail.color }}
                  />
                  <span className="tabular-nums font-semibold text-[var(--color-fg)]">
                    {failCount}
                  </span>{" "}
                  fail
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────

function ScoreCard({ result }: { result: ScanResult }) {
  const tier =
    result.score >= 81
      ? "good"
      : result.score >= 56
      ? "good"
      : result.score >= 26
      ? "average"
      : "poor";
  const tok = GRADE_TOK[tier];
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col h-full">
      <div
        className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2.5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)",
        }}
      >
        <div
          className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
        >
          <Gauge className="h-4 w-4" style={{ color: COLORS.primary }} />
        </div>
        <SectionHeading
          text="Readability score"
          info="Overall grade across 25 checks of how clearly AI engines can read your site."
        />
      </div>
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 flex-1">
        <div className="min-w-0">
          <p
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 15 }}
          >
            How clearly AI can read your site, across 25 checks.
          </p>
          <p
            className="text-[var(--color-fg-muted)] mt-1"
            style={{ fontSize: 13 }}
          >
            Scanned {new Date(result.scannedAt).toLocaleString()} ·{" "}
            {(result.durationMs / 1000).toFixed(1)}s
          </p>
        </div>
        <div className="flex items-baseline gap-3 shrink-0">
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 84,
              fontWeight: 600,
              color: tok.color,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {result.score}
          </span>
          <span
            className="text-[var(--color-fg-muted)] tabular-nums"
            style={{ fontSize: 20, fontFamily: "var(--font-display)" }}
          >
            /100
          </span>
          <span
            className="rounded-full px-3 py-1 self-center font-semibold"
            style={{
              fontSize: 13,
              backgroundColor: `${tok.color}1f`,
              color: tok.color,
            }}
          >
            {tok.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Pillar grid ──────────────────────────────────────────────────────────

const PILLAR_ICON: Record<Pillar, typeof Compass> = {
  discoverable: Compass,
  structured: Layers,
  quotable: Quote,
  trustworthy: ShieldCheck,
};

function PillarGrid({
  pillars,
  checks,
}: {
  pillars: PillarScore[];
  checks: CheckResult[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pillars.map((p) => (
        <PillarCard
          key={p.pillar}
          score={p}
          checks={checks.filter((c) => c.pillar === p.pillar)}
        />
      ))}
    </div>
  );
}

function PillarCard({
  score,
  checks,
}: {
  score: PillarScore;
  checks: CheckResult[];
}) {
  const tok = GRADE_TOK[score.grade];
  const pct = score.max === 0 ? 0 : (score.earned / score.max) * 100;
  const Icon = PILLAR_ICON[score.pillar];

  const passCount = checks.filter((c) => c.status === "pass").length;
  const partialCount = checks.filter((c) => c.status === "partial").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "var(--shadow-lg)" }}
      transition={{ duration: 0.2 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] overflow-hidden flex flex-col"
    >
      {/* Top header band — canonical mono-sage gradient (tier color stays
          on the number, eyebrow, and progress bar). */}
      <div
        className="px-5 pt-4 pb-4 flex items-start justify-between gap-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-11 w-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${tok.color}22` }}
          >
            <Icon className="h-5 w-5" style={{ color: tok.color }} />
          </div>
          <div className="min-w-0">
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--color-fg)",
                lineHeight: 1.15,
              }}
            >
              {PILLAR_LABELS[score.pillar]}
            </p>
            <p
              className="uppercase font-semibold mt-1"
              style={{ fontSize: 11, letterSpacing: "0.12em", color: tok.color }}
            >
              {tok.label}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 600,
              color: tok.color,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {score.earned}
          </span>
          <span
            className="tabular-nums text-[var(--color-fg-muted)]"
            style={{ fontSize: 17, fontFamily: "var(--font-display)" }}
          >
            /{score.max}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-3 flex-1">
        <div
          className="rounded-full bg-[var(--color-surface-alt)] overflow-hidden"
          style={{ height: 8 }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="h-full rounded-full"
            style={{ backgroundColor: tok.color }}
          />
        </div>

        {/* Pass / partial / fail breakdown */}
        <div className="flex items-center gap-3 text-[var(--color-fg-secondary)]" style={{ fontSize: 13 }}>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{ width: 9, height: 9, backgroundColor: STATUS_TOK.pass.color }}
            />
            <span className="tabular-nums font-semibold">{passCount}</span> pass
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{ width: 9, height: 9, backgroundColor: STATUS_TOK.partial.color }}
            />
            <span className="tabular-nums font-semibold">{partialCount}</span> partial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="rounded-full"
              style={{ width: 9, height: 9, backgroundColor: STATUS_TOK.fail.color }}
            />
            <span className="tabular-nums font-semibold">{failCount}</span> fail
          </span>
        </div>

        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 14, lineHeight: 1.5 }}
        >
          {PILLAR_BLURBS[score.pillar]}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Top fixes panel ──────────────────────────────────────────────────────
// Surfaces the 3 highest-point failures + partials across all pillars so the
// user can act without scanning the full 25-row list.

function TopFixesPanel({ checks }: { checks: CheckResult[] }) {
  const fixable = checks
    .filter((c) => c.status !== "pass")
    .map((c) => ({ check: c, gain: c.max - c.earned }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  if (fixable.length === 0) return null;
  const totalGain = fixable.reduce((s, x) => s + x.gain, 0);

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden flex flex-col h-full"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      <div
        className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: COLORS.primary }} />
          </div>
          <SectionHeading
            text="Fix these first"
            info="The three highest-impact failures across all pillars, ranked by points recoverable."
          />
        </div>
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13.5 }}
        >
          Recover ~
          <span
            className="font-semibold tabular-nums"
            style={{ color: COLORS.primary }}
          >
            {Math.round(totalGain)}
          </span>{" "}
          points by tackling these 3.
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {fixable.map(({ check, gain }) => {
          const tok = STATUS_TOK[check.status];
          const Icon = tok.Icon;
          return (
            <li
              key={check.id}
              className="px-5 py-4 flex items-start gap-4 hover:bg-[var(--color-surface-alt)]/40 transition-colors"
            >
              <span
                className="inline-flex items-center justify-center rounded-[var(--radius-md)] shrink-0 mt-0.5"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: tok.bg,
                  color: tok.color,
                }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <p
                  className="text-[var(--color-fg)]"
                  style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}
                >
                  {check.label}
                </p>
                <p
                  className="text-[var(--color-fg-secondary)]"
                  style={{ fontSize: 14, lineHeight: 1.5 }}
                >
                  {check.recommendation}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 font-semibold tabular-nums shrink-0 mt-1"
                style={{
                  fontSize: 13,
                  backgroundColor: `${COLORS.primary}1f`,
                  color: COLORS.primaryHover,
                }}
              >
                +{Math.round(gain)} pts
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Checks list ──────────────────────────────────────────────────────────
// Single card containing all checks. Header: filter chips. Body: rows
// grouped by pillar with thin eyebrow dividers, sorted fail → partial →
// pass within each group. Passes auto-collapse into a single strip.

type ChecksFilter = "needs-work" | "all" | "passing";

const STATUS_RANK: Record<CheckResult["status"], number> = {
  fail: 0,
  partial: 1,
  pass: 2,
};

function ChecksList({ checks }: { checks: CheckResult[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ChecksFilter>("needs-work");

  const grouped: Record<Pillar, CheckResult[]> = {
    discoverable: [],
    structured: [],
    quotable: [],
    trustworthy: [],
  };
  for (const c of checks) grouped[c.pillar].push(c);

  // Sort each pillar's rows: fail → partial → pass.
  for (const p of Object.keys(grouped) as Pillar[]) {
    grouped[p].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  }

  const totalNeedsWork = checks.filter((c) => c.status !== "pass").length;
  const totalPassing = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* Header band — clickable to toggle the full list. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2.5 text-left transition-colors hover:bg-[var(--color-surface-alt)]/30"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)",
        }}
      >
        <div
          className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
        >
          <ListChecks className="h-4 w-4" style={{ color: COLORS.primary }} />
        </div>
        <SectionHeading
          text="All 25 checks"
          info="Every check across the four pillars. Filter to focus on what needs work or what's already passing."
        />
        <span
          className="ml-auto tabular-nums text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13.5 }}
        >
          <span className="font-semibold text-[var(--color-fg)]">
            {totalNeedsWork}
          </span>{" "}
          need{totalNeedsWork === 1 ? "s" : ""} work ·{" "}
          <span className="font-semibold text-[var(--color-fg)]">
            {totalPassing}
          </span>{" "}
          passing
        </span>
        <ChevronDown
          className={
            "h-5 w-5 text-[var(--color-fg-muted)] transition-transform shrink-0 " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="checks-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            {/* Filter chip cluster — sub-row directly under the band. */}
            <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-end">
              <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1">
                {(
                  [
                    { id: "needs-work", label: `Needs work (${totalNeedsWork})` },
                    { id: "all", label: `All (${checks.length})` },
                    { id: "passing", label: `Passing (${totalPassing})` },
                  ] as { id: ChecksFilter; label: string }[]
                ).map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      aria-pressed={active}
                      className={
                        "px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors whitespace-nowrap " +
                        (active
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                      }
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per-pillar groups */}
            <div className="divide-y divide-[var(--color-border)]">
              {(Object.keys(grouped) as Pillar[]).map((p) => (
                <PillarGroup
                  key={p}
                  pillar={p}
                  checks={grouped[p]}
                  filter={filter}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PillarGroup({
  pillar,
  checks,
  filter,
}: {
  pillar: Pillar;
  checks: CheckResult[];
  filter: ChecksFilter;
}) {
  const Icon = PILLAR_ICON[pillar];
  const [showPasses, setShowPasses] = useState(false);

  const fails = checks.filter((c) => c.status === "fail");
  const partials = checks.filter((c) => c.status === "partial");
  const passes = checks.filter((c) => c.status === "pass");

  // Determine what's visible based on filter
  let visibleNeedsWork: CheckResult[] = [];
  let showPassStrip = false;
  let showPassRows = false;

  if (filter === "needs-work") {
    visibleNeedsWork = [...fails, ...partials];
    showPassStrip = false;
    showPassRows = false;
  } else if (filter === "passing") {
    visibleNeedsWork = [];
    showPassStrip = false;
    showPassRows = passes.length > 0;
  } else {
    // all
    visibleNeedsWork = [...fails, ...partials];
    showPassStrip = passes.length > 0 && !showPasses;
    showPassRows = passes.length > 0 && showPasses;
  }

  // Hide entire group if nothing to show under current filter
  if (
    visibleNeedsWork.length === 0 &&
    !showPassStrip &&
    !showPassRows
  ) {
    return null;
  }

  return (
    <div>
      {/* Thin pillar eyebrow */}
      <div className="px-5 py-3 flex items-center gap-2.5 bg-[var(--color-surface-alt)]/30">
        <div
          className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
        >
          <Icon className="h-4 w-4" style={{ color: COLORS.primary }} />
        </div>
        <p
          className="uppercase font-semibold"
          style={{
            fontSize: 12,
            letterSpacing: "0.12em",
            color: "var(--color-fg-secondary)",
          }}
        >
          {PILLAR_LABELS[pillar]}
        </p>
        <span
          className="text-[var(--color-fg-muted)] tabular-nums ml-auto"
          style={{ fontSize: 12 }}
        >
          {passes.length}/{checks.length} passing
        </span>
      </div>

      {/* Needs-work rows */}
      <ul className="divide-y divide-[var(--color-border)]">
        {visibleNeedsWork.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>

      {/* Collapsed pass strip — only on the "all" filter */}
      {showPassStrip && (
        <button
          type="button"
          onClick={() => setShowPasses(true)}
          className="w-full px-5 py-3 flex items-center gap-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors text-left border-t border-[var(--color-border)]"
        >
          <span
            className="inline-flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 26,
              height: 26,
              backgroundColor: STATUS_TOK.pass.bg,
              color: STATUS_TOK.pass.color,
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
          <span
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 13.5, fontWeight: 500 }}
          >
            <span className="font-semibold text-[var(--color-fg)]">
              {passes.length}
            </span>{" "}
            check{passes.length === 1 ? "" : "s"} passing in this pillar
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--color-fg-muted)] ml-auto" />
        </button>
      )}

      {/* Expanded pass rows */}
      {showPassRows && (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {passes.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
          {filter === "all" && (
            <li>
              <button
                type="button"
                onClick={() => setShowPasses(false)}
                className="w-full px-5 py-2.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                style={{ fontSize: 12.5 }}
              >
                Hide passing checks
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false);
  const tok = STATUS_TOK[check.status];
  const Icon = tok.Icon;
  const expandable =
    check.readabilityImpact.length > 0 || check.recommendation.length > 0;
  const pct = check.max === 0 ? 0 : (check.earned / check.max) * 100;

  return (
    <li>
      <button
        type="button"
        onClick={() => expandable && setOpen((o) => !o)}
        className={
          "w-full text-left px-5 py-4 flex items-start gap-4 transition-colors " +
          (expandable
            ? "hover:bg-[var(--color-surface-alt)]/50 cursor-pointer"
            : "cursor-default")
        }
        aria-expanded={open}
      >
        {/* Status icon tile — bigger and rounded square instead of circle */}
        <span
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] shrink-0 mt-0.5"
          style={{
            width: 36,
            height: 36,
            backgroundColor: tok.bg,
            color: tok.color,
          }}
          aria-label={tok.label}
        >
          <Icon className="h-5 w-5" />
        </span>

        {/* Title + status pill + detail */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[var(--color-fg)]"
              style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}
            >
              {check.label}
            </p>
            <span
              className="rounded-full px-2 py-0.5 font-semibold uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.12em",
                backgroundColor: tok.bg,
                color: tok.color,
              }}
            >
              {tok.label}
            </span>
          </div>
          <p
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            {check.detail}
          </p>
        </div>

        {/* Score column with mini bar */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 mt-1">
          <span className="inline-flex items-baseline tabular-nums">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                color: tok.color,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}
            >
              {check.earned}
            </span>
            <span
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 14, fontFamily: "var(--font-display)" }}
            >
              /{check.max}
            </span>
          </span>
          <div
            className="rounded-full bg-[var(--color-surface-alt)] overflow-hidden"
            style={{ width: 64, height: 4 }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: tok.color }}
            />
          </div>
        </div>

        {expandable && (
          <ChevronDown
            className={
              "h-4 w-4 text-[var(--color-fg-muted)] transition-transform shrink-0 mt-2 " +
              (open ? "rotate-180" : "")
            }
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && expandable && (
          <motion.div
            key="rec"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <div
              className="mx-5 mb-5 px-5 py-4 rounded-[var(--radius-md)] grid grid-cols-1 md:grid-cols-2 gap-5"
              style={{
                borderLeft: `3px solid ${tok.color}`,
                backgroundColor: "rgba(150,162,131,0.06)",
              }}
            >
              {check.readabilityImpact && (
                <div>
                  <p
                    className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-1.5"
                    style={{ fontSize: 12, letterSpacing: "0.12em" }}
                  >
                    How this affects readability
                  </p>
                  <p
                    className="text-[var(--color-fg)]"
                    style={{ fontSize: 14.5, lineHeight: 1.6 }}
                  >
                    {check.readabilityImpact}
                  </p>
                </div>
              )}
              {check.recommendation && (
                <div>
                  <p
                    className="uppercase tracking-wider font-semibold mb-1.5 inline-flex items-center gap-1"
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.12em",
                      color: tok.color,
                    }}
                  >
                    <ArrowRight className="h-3 w-3" />
                    Recommended fix
                  </p>
                  <p
                    className="text-[var(--color-fg)]"
                    style={{ fontSize: 14.5, lineHeight: 1.6 }}
                  >
                    {check.recommendation}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
