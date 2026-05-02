"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Lock,
  Crown,
  ArrowRight,
  Check,
  AlertTriangle,
  X as XIcon,
  ChevronDown,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
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
const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: EASE },
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

interface AeoAuditSectionProps {
  /** "free" gates behind a Plus paywall; "plus"/"premium"/"admin" unlocks. */
  plan?: "free" | "plus" | "premium" | "admin";
  /** Display name of the business in subtitle copy. */
  businessName?: string;
}

export function AeoAuditSection({
  plan = "plus",
  businessName = "your site",
}: AeoAuditSectionProps) {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const isFree = plan === "free";

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || scanning) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/aeo-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: input.trim() }),
      });
      const json = (await res.json()) as ScanResult & { error?: string };
      if (!res.ok) {
        setError(json.error || "Scan failed.");
      } else if (json.error) {
        setError(json.error);
        setResult(json);
      } else {
        setResult(json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setScanning(false);
    }
  }

  function handleLoadExample() {
    setError(null);
    setResult(buildMockScanResult());
    setInput("");
  }

  function handleNewScan() {
    setResult(null);
    setError(null);
    setInput("");
  }

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
    ? "Scan your site to see exactly which AEO and SEO checks are passing — and which gaps are costing you AI citations."
    : failCount > 0
    ? `${failCount} check${failCount === 1 ? "" : "s"} failed and ${partialCount} need partial fixes. Tackle the failures first to lift your score fast.`
    : partialCount > 0
    ? `Solid foundation — no failures, but ${partialCount} check${partialCount === 1 ? "" : "s"} could go from partial to pass with light edits.`
    : "Site is well-tuned for AI visibility. Keep monitoring for content freshness and schema coverage.";

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
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
          }}
        >
          {!result ? (
            <>
              Your site&apos;s AEO score is{" "}
              <span style={{ color: "var(--color-fg-muted)", fontStyle: "italic" }}>
                unknown
              </span>
              .
            </>
          ) : (
            <>
              Your site&apos;s AEO score is{" "}
              <span style={{ color: scoreColor!, fontStyle: "italic" }}>
                {scoreWord}
              </span>
              .
            </>
          )}
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1.5">
          How well {businessName} is set up to be discovered, parsed, quoted,
          and trusted by AI engines like ChatGPT, Claude, and Gemini.
        </p>
      </motion.div>

      {/* AIOverview callout */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
      >
        <AIOverview text={aiOverviewText} />
      </motion.div>

      {/* ── Free upgrade prompt ── */}
      {isFree && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
        >
          <Card>
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
              >
                <Lock className="h-7 w-7" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                  }}
                >
                  Site Audit is a Plus feature
                </h2>
                <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                  Run a 25-check AEO audit on any URL. See exactly which AI
                  visibility levers your site is missing — schema, freshness,
                  AI-bot access, citation links, and more.
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm shadow-md transition-colors"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Plus
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleLoadExample}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Or view an example audit
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Scan form (paid users) ── */}
      {!isFree && !result && !scanning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
        >
          <Card>
            <form onSubmit={handleScan} className="space-y-4">
              <Input
                label="Website URL"
                type="url"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={scanning}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="submit"
                  loading={scanning}
                  disabled={scanning || !input.trim()}
                >
                  <Search className="h-4 w-4" />
                  Run Site Audit
                </Button>
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
                  Or load an example audit
                </button>
              </div>
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
            </form>
          </Card>
        </motion.div>
      )}

      {/* ── Loading ── */}
      {scanning && (
        <Card className="!p-6">
          <div className="flex items-center justify-center gap-3 py-6 text-[var(--color-fg-secondary)]">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-primary)" }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              Running 25 checks across 4 pillars…
            </span>
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
            {/* Action bar — matches crawlability */}
            <motion.div
              {...reveal}
              className="flex items-center justify-between flex-wrap gap-3"
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {result.url}
              </a>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleNewScan}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Scan a different URL
                </Button>
              </div>
            </motion.div>

            <motion.div {...reveal}>
              <ScoreCard result={result} />
            </motion.div>
            <motion.div {...reveal}>
              <PillarGrid pillars={result.pillars} />
            </motion.div>
            <motion.div {...reveal}>
              <ChecksList checks={result.checks} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <Card className="!p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p
            className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-1"
            style={{ fontSize: 11, letterSpacing: "0.12em" }}
          >
            Site audit score
          </p>
          <p
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 14 }}
          >
            Overall AEO grade across 25 checks
          </p>
          <p
            className="text-[var(--color-fg-muted)] mt-1"
            style={{ fontSize: 12 }}
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
              fontSize: 72,
              fontWeight: 500,
              color: tok.color,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {result.score}
          </span>
          <span
            className="text-[var(--color-fg-muted)] tabular-nums"
            style={{ fontSize: 18, fontFamily: "var(--font-display)" }}
          >
            /100
          </span>
          <span
            className="rounded-full px-3 py-1 self-center font-semibold"
            style={{
              fontSize: 12,
              backgroundColor: `${tok.color}1f`,
              color: tok.color,
            }}
          >
            {tok.label}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ─── Pillar grid ──────────────────────────────────────────────────────────

function PillarGrid({ pillars }: { pillars: PillarScore[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {pillars.map((p) => (
        <PillarCard key={p.pillar} score={p} />
      ))}
    </div>
  );
}

function PillarCard({ score }: { score: PillarScore }) {
  const tok = GRADE_TOK[score.grade];
  const pct = score.max === 0 ? 0 : (score.earned / score.max) * 100;
  return (
    <Card className="!p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
          }}
        >
          {PILLAR_LABELS[score.pillar]}
        </p>
        <span
          className="font-semibold"
          style={{ fontSize: 11, color: tok.color, letterSpacing: "0.04em" }}
        >
          {tok.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 500,
            color: "var(--color-fg)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          {score.earned}
        </span>
        <span
          className="tabular-nums text-[var(--color-fg-muted)]"
          style={{ fontSize: 14, fontFamily: "var(--font-display)" }}
        >
          /{score.max}
        </span>
      </div>
      <div
        className="rounded-full bg-[var(--color-surface-alt)] overflow-hidden"
        style={{ height: 6 }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: tok.color }}
        />
      </div>
      <p
        className="text-[var(--color-fg-secondary)]"
        style={{ fontSize: 12.5, lineHeight: 1.4 }}
      >
        {PILLAR_BLURBS[score.pillar]}
      </p>
    </Card>
  );
}

// ─── Checks list ──────────────────────────────────────────────────────────

function ChecksList({ checks }: { checks: CheckResult[] }) {
  const grouped: Record<Pillar, CheckResult[]> = {
    discoverable: [],
    structured: [],
    quotable: [],
    trustworthy: [],
  };
  for (const c of checks) grouped[c.pillar].push(c);

  return (
    <div className="space-y-5">
      {(Object.keys(grouped) as Pillar[]).map((p) => (
        <div
          key={p}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <div
            className="px-5 py-3 border-b border-[var(--color-border)] rounded-t-[var(--radius-lg)]"
            style={{
              background:
                "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(184,160,48,0.10) 50%, rgba(201,123,69,0.10) 100%)",
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: COLORS.primary }} />
              <SectionHeading text={PILLAR_LABELS[p]} info={PILLAR_BLURBS[p]} />
            </div>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {grouped[p].map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false);
  const tok = STATUS_TOK[check.status];
  const Icon = tok.Icon;
  const expandable = check.recommendation.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => expandable && setOpen((o) => !o)}
        className={
          "w-full text-left px-5 py-3 flex items-center gap-3 transition-colors " +
          (expandable
            ? "hover:bg-[var(--color-surface-alt)]/40 cursor-pointer"
            : "cursor-default")
        }
        aria-expanded={open}
      >
        <span
          className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 28,
            height: 28,
            backgroundColor: tok.bg,
            color: tok.color,
          }}
          aria-label={tok.label}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[var(--color-fg)]"
            style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}
          >
            {check.label}
          </p>
          <p
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 12.5, lineHeight: 1.4 }}
          >
            {check.detail}
          </p>
        </div>
        <span
          className="tabular-nums shrink-0"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: tok.color,
            fontWeight: 500,
          }}
        >
          {check.earned}
          <span
            className="text-[var(--color-fg-muted)]"
            style={{ fontSize: 12 }}
          >
            /{check.max}
          </span>
        </span>
        {expandable && (
          <ChevronDown
            className={
              "h-4 w-4 text-[var(--color-fg-muted)] transition-transform " +
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
              className="px-5 pb-4 pt-1 flex items-start gap-2"
              style={{ borderLeft: `3px solid ${tok.color}` }}
            >
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 mt-1"
                style={{ color: tok.color }}
              />
              <p
                className="text-[var(--color-fg-secondary)]"
                style={{ fontSize: 13, lineHeight: 1.5 }}
              >
                {check.recommendation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
