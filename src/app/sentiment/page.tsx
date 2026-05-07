"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { CustomDatePopover } from "@/components/atoms/CustomDatePopover";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";
import { TimeRangeDropdown, type TimeRangeKey } from "@/components/atoms/TimeRangeDropdown";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { Calendar, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { useSentimentHistory } from "@/features/sentiment/hooks/useSentimentHistory";
import { SentimentHero } from "@/features/sentiment/components/SentimentHero";
import { SentimentByPlatform } from "@/features/sentiment/components/SentimentByPlatform";
import { SentimentByIntent } from "@/features/sentiment/components/SentimentByIntent";
import { SentimentPromptsSplit } from "@/features/sentiment/components/SentimentPromptsSplit";
import { SentimentSources } from "@/features/sentiment/components/SentimentSources";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { AI_MODELS } from "@/utils/constants";
import type { ModelName } from "@/types/database";

import type { TimeRange } from "@/utils/timeRange";

const TIME_RANGES: { key: Exclude<TimeRange, "custom">; label: string }[] = [
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease },
} as const;

export default function SentimentPage() {
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<TimeRange>("90d");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id))
  );

  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);
  const { data: sentimentHistory = [], isLoading: historyLoading } = useSentimentHistory(business?.id);

  const allResults = latestScan?.results ?? [];

  const results = selectedModels.size === AI_MODELS.length
    ? allResults
    : allResults.filter((r) => selectedModels.has(r.model_name));

  const filteredHistory = useMemo(() => {
    const now = new Date();
    if (timeRange === "14d") return sentimentHistory.slice(-14);
    if (timeRange === "30d") return sentimentHistory.slice(-30);
    if (timeRange === "90d") return sentimentHistory.slice(-90);
    if (timeRange === "ytd") {
      const jan1 = new Date(now.getFullYear(), 0, 1).toISOString();
      return sentimentHistory.filter((d) => d.date >= jan1);
    }
    if (timeRange === "custom" && customStart && customEnd) {
      const startIso = customStart.toISOString();
      const endIso = customEnd.toISOString();
      return sentimentHistory.filter((d) => d.date >= startIso && d.date <= endIso);
    }
    return sentimentHistory;
  }, [timeRange, sentimentHistory, customStart, customEnd]);

  // Headline word + warning detection
  const { dominant, sentimentColor, sentimentWord, warning } = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    if (total === 0) {
      return { dominant: null, sentimentColor: SURVEN_SEMANTIC.neutral, sentimentWord: "unknown", warning: null };
    }
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of mentioned) if (r.sentiment) counts[r.sentiment as keyof typeof counts]++;

    const dom = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as "positive" | "neutral" | "negative");
    const word = dom === "positive" ? "Positive" : dom === "negative" ? "Negative" : "Mixed";
    const color = dom === "positive" ? SURVEN_SEMANTIC.good : dom === "negative" ? SURVEN_SEMANTIC.bad : SURVEN_SEMANTIC.mid;

    // Warning: a single engine is bleeding sentiment
    const models: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    let warning: { engine: ModelName; negPct: number; negCount: number; total: number } | null = null;
    for (const m of models) {
      const mm = mentioned.filter((r) => r.model_name === m);
      if (mm.length < 3) continue;
      const neg = mm.filter((r) => r.sentiment === "negative").length;
      const negPct = Math.round((neg / mm.length) * 100);
      if (negPct >= 25 && (warning === null || negPct > warning.negPct)) {
        warning = { engine: m, negPct, negCount: neg, total: mm.length };
      }
    }

    return { dominant: dom, sentimentColor: color, sentimentWord: word, warning };
  }, [results]);

  // Auth gating — placed AFTER all hooks so React rules-of-hooks are satisfied
  if (!user && !authLoading) {
    router.push("/login");
    return null;
  }

  if (authLoading || bizLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) {
    router.push("/onboarding");
    return null;
  }

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const competitorNames = competitors.map((c) => c.name);
  const negativeCount = results.filter((r) => r.business_mentioned && r.sentiment === "negative").length;
  const positiveCount = results.filter((r) => r.business_mentioned && r.sentiment === "positive").length;
  const totalMentions = results.filter((r) => r.business_mentioned && r.sentiment).length;

  const buildAISummary = (): string => {
    if (totalMentions === 0) {
      return `No sentiment data yet for ${business.name}. Once a scan runs, this panel surfaces how AI engines describe you positively, neutrally, or negatively.`;
    }
    const negPct = Math.round((negativeCount / totalMentions) * 100);
    const posPct = Math.round((positiveCount / totalMentions) * 100);
    // Sandwich structure: GOOD → BAD → GOOD. Open with positive sentiment
    // share, middle with the worst engine spike or negative count, close
    // with a forward positive (clean overall framing or coverage strength).
    const s1 = `${posPct}% positive across ${totalMentions} mention${totalMentions === 1 ? "" : "s"} — sentiment reads ${sentimentWord.toLowerCase()}.`;
    const s2 = warning
      ? `${MODEL_LABELS[warning.engine]}: ${warning.negPct}% negative — bleeding worst.`
      : negativeCount > 0
        ? `${negativeCount} negative mention${negativeCount === 1 ? "" : "s"} (${negPct}% of total) steering AI toward competitors.`
        : `Neutral mentions still leak comparisons — push specifics into cited pages.`;
    const s3 = negativeCount === 0
      ? `Zero negative mentions — defensible base to widen.`
      : posPct > 60
        ? `${posPct}% positive still dominates — replicate that template on weaker pages.`
        : `${totalMentions} tracked mention${totalMentions === 1 ? "" : "s"} — real surface area to optimize.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (warning) {
      return { label: `Optimize to fix the negative framing on ${MODEL_LABELS[warning.engine]}`, href: "/site-audit" };
    }
    if (negativeCount > 0) {
      return { label: "Optimize to flip the negative framing", href: "/site-audit" };
    }
    return { label: "Optimize to defend your sentiment lead", href: "/site-audit" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 w-full">
        <AISummaryGenerator getSummary={buildAISummary} getCTA={buildAICTA} />
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-start justify-between gap-6"
        >
          <div className="space-y-2 min-w-0 flex-1">
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
              Your brand sentiment is{" "}
              {dominant ? (
                <span style={{ color: sentimentColor, fontStyle: "italic" }}>{sentimentWord}</span>
              ) : (
                <span style={{ color: "var(--color-fg-muted)", fontStyle: "italic" }}>unknown</span>
              )}
              .
            </h1>
            <p className="text-[var(--color-fg-muted)] mt-2" style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}>
              <strong className="text-[var(--color-fg)] font-semibold">Why is this important?</strong>{" "}
              Sentiment shows whether AI engines describe {business.name} positively, neutrally, or negatively when customers ask about you. Negative framing in AI answers steers buyers to competitors before they ever click your site.
            </p>
          </div>
          <div className="shrink-0 mt-1">
            <NextScanCard />
          </div>
        </motion.div>

        {/* ── Filter bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease }}
          className="flex flex-wrap items-center gap-2 pb-4 border-b border-[var(--color-border)]"
        >
          <TimeRangeDropdown
            value={timeRange as TimeRangeKey}
            customFrom={customStart ? customStart.toISOString().slice(0, 10) : undefined}
            customTo={customEnd ? customEnd.toISOString().slice(0, 10) : undefined}
            onChange={(key, fromISO, toISO) => {
              setTimeRange(key as typeof timeRange);
              if (key === "custom" && fromISO && toISO) {
                setCustomStart(new Date(fromISO + "T00:00:00"));
                setCustomEnd(new Date(toISO + "T00:00:00"));
              }
            }}
          />

          <div className="h-4 w-px bg-[var(--color-border)]" />

          <span className="text-[var(--color-fg-muted)] mr-1" style={{ fontSize: 14 }}>AI engines:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {AI_MODELS.map((m) => {
              const active = selectedModels.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] border font-medium transition-colors " +
                    (active
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-transparent text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-fg-secondary)]")
                  }
                  style={{ fontSize: 14 }}
                >
                  <EngineIcon id={m.id} size={13} />
                  {m.name}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Content ── */}
        {scanLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : allResults.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="text-center py-20"
          >
            <p className="text-lg text-[var(--color-fg-secondary)]">No scan data yet</p>
            <p className="text-sm text-[var(--color-fg-muted)] mt-2">
              Run a scan from the Dashboard to see brand sentiment analysis.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Hero — 3-zone asymmetric layout */}
            <motion.div {...reveal}>
              <SentimentHero
                results={results}
                history={filteredHistory}
                businessName={business.name}
              />
            </motion.div>

            {/* Prompts split (70%) + Sentiment by AI engine (30%). The
                negative-engine warning sits below the right-side card so
                it stays anchored to the engine context. */}
            <motion.div
              {...reveal}
              className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch"
            >
              <div className="lg:col-span-3 min-w-0 flex">
                <SentimentPromptsSplit results={results} />
              </div>
              <div className="lg:col-span-2 min-w-0 flex flex-col gap-4">
                <SentimentByPlatform results={results} />
                <SentimentByIntent
                  results={results}
                  brandNames={[business.name, ...competitorNames]}
                />
                {warning && (
                  <div
                    className="rounded-[var(--radius-lg)] border p-4 flex items-start gap-3"
                    style={{
                      background: "rgba(181,70,49,0.04)",
                      borderColor: "rgba(181,70,49,0.25)",
                    }}
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(181,70,49,0.12)" }}
                    >
                      <AlertTriangle className="h-4 w-4" style={{ color: SURVEN_SEMANTIC.bad }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold mb-1"
                        style={{ color: "var(--color-fg)" }}
                      >
                        {MODEL_LABELS[warning.engine]} is showing {warning.negPct}% negative sentiment
                      </p>
                      <p className="text-xs text-[var(--color-fg-secondary)] leading-snug">
                        {warning.negCount} of {warning.total} mentions on {MODEL_LABELS[warning.engine]} use critical or dismissive language. Every prompt hitting this engine inherits the negative framing.
                      </p>
                    </div>
                    <Link
                      href="/audit"
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-[var(--radius-md)] text-xs font-semibold text-white transition-opacity hover:opacity-90 self-center"
                      style={{ background: SURVEN_SEMANTIC.bad }}
                    >
                      <span>Fix with audit</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sources driving your sentiment — full breakdown by domain */}
            <motion.div {...reveal}>
              <SentimentSources results={results} />
            </motion.div>

          </>
        )}

        <BetaFeedbackFooter />

        {/* historyLoading kept referenced to avoid lint warning during initial paint */}
        {historyLoading && null}
      </div>
    </DashboardLayout>
  );
}
