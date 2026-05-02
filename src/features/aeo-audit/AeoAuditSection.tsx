"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Sparkles,
  Check,
  AlertTriangle,
  X as XIcon,
  ChevronDown,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { HoverHint } from "@/components/atoms/HoverHint";
import { COLORS } from "@/utils/constants";
import {
  PILLAR_BLURBS,
  PILLAR_LABELS,
  type CheckResult,
  type Pillar,
  type PillarScore,
  type ScanResult,
} from "./types";

const EASE = [0.16, 1, 0.3, 1] as const;

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

export function AeoAuditSection() {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

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

  return (
    <div className="space-y-5">
      {/* Hero — title + intro */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="space-y-2"
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 44,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
            lineHeight: 1.1,
          }}
        >
          Site audit — measure how AI sees your site
        </h1>
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 760 }}
        >
          Drop in a URL and we'll grade it across 25 checks covering
          discoverability, structured metadata, content quotability, and
          trustworthiness signals — the same axes AI engines weigh when
          deciding whose page to cite.
        </p>
      </motion.div>

      {/* URL input form */}
      <motion.form
        onSubmit={handleScan}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: EASE }}
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="h-4 w-4 shrink-0 text-[var(--color-fg-muted)]" />
          <input
            type="text"
            inputMode="url"
            placeholder="example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={scanning}
            className="flex-1 min-w-0 bg-transparent outline-none text-[var(--color-fg)]"
            style={{ fontSize: 15, fontFamily: "var(--font-sans)" }}
          />
        </div>
        <motion.button
          type="submit"
          whileTap={{ scale: 0.96 }}
          disabled={scanning || !input.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white font-medium disabled:opacity-60"
          style={{ fontSize: 14 }}
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Run audit
            </>
          )}
        </motion.button>
      </motion.form>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] px-4 py-3"
          style={{
            backgroundColor: "rgba(181,70,49,0.10)",
            borderLeft: `3px solid ${STATUS_TOK.fail.color}`,
          }}
        >
          <p style={{ color: STATUS_TOK.fail.color, fontSize: 13, fontWeight: 500 }}>
            {error}
          </p>
        </div>
      )}

      <AnimatePresence>
        {result && !error && (
          <motion.div
            key={result.scannedAt}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="space-y-5"
          >
            <ScoreCard result={result} />
            <PillarGrid pillars={result.pillars} />
            <ChecksList checks={result.checks} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────

function ScoreCard({ result }: { result: ScanResult }) {
  const tier =
    result.score >= 75 ? "good" : result.score >= 45 ? "average" : "poor";
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
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--color-fg-secondary)",
              wordBreak: "break-all",
            }}
          >
            {result.url}
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
              fontSize: 64,
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

// HoverHint is imported for future use (will wire pillar info icons next pass)
void HoverHint;
