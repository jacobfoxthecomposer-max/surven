"use client";

/**
 * Dashboard page — rebuilt 2026-05-07.
 *
 * Architecture (top to bottom):
 *   1. Eyebrow ("VISIBILITY REPORT · {date}")
 *   2. Hero — Cormorant 52px plain-English sentence with a colored italic
 *      keyword (strong / moderate / thin / not yet measured), subline naming
 *      the business, industry, city, scan counts; Run scan button right-aligned.
 *   3. KPI strip — 3 cards (Visibility · Share of Voice · Sentiment).
 *   4. Page-level AIOverview — data-derived insight from buildDashboardInsight.
 *   5. Trio (2-col on xl): Visibility gauge + Visibility-over-time chart.
 *   6. 2-col split: How each AI sees you | What's next.
 *   7. How you rank against competitors (full-width).
 *   8. 2-col split: Brand sentiment | Citation gaps + wins.
 *   9. Questions we tested (Prompt Results).
 *   10. Footer — CSV export + Beta feedback.
 *
 * The shape, copy, and layout decisions here are direct outputs of the
 * 2026-05-07 dashboard research: brand-consistency audit (Surven cofounder
 * guide), naive-user critique ("Linda the lawyer"), UI/UX research
 * (Stripe/Linear/Plausible/Profound/Peec/Athena patterns), and
 * AI-visibility category analysis. Every section heading lives INSIDE its
 * card with a bottom-border separator, every chart card carries an
 * AIOverview derived from real computed data, no hardcoded hexes for
 * fg/bg, no banned-word copy.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { summarizeSentiment } from "@/features/dashboard/utils/heroSentence";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import {
  TimeRangeDropdown,
  type TimeRangeKey,
} from "@/components/atoms/TimeRangeDropdown";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { VisibilityScoreGauge } from "@/components/atoms/VisibilityScoreGauge";
import {
  ChartCard,
  MOCK_BRANDS,
  MOCK_DATES,
  MOCK_N,
  TREATMENT_STANDARD_LABEL,
  useScannerData,
} from "@/features/dashboard/pages/VisibilityScannerSection";
import { ModelBreakdownSection } from "@/features/dashboard/pages/ModelBreakdownSection";
import { PromptResultsSection } from "@/features/dashboard/pages/PromptResultsSection";
import { ComparisonSection } from "@/features/dashboard/pages/ComparisonSection";
import { HistorySection } from "@/features/dashboard/pages/HistorySection";
import { SentimentSection } from "@/features/dashboard/pages/SentimentSection";
import { CitationGapSection } from "@/features/dashboard/pages/CitationGapSection";
import { WhatsNextCard } from "@/components/organisms/WhatsNextCard";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import {
  CleanStatCard,
  type CleanStatCardSpec,
} from "@/features/dashboard/pages/PromptsSection";
import { MessageSquare, Users } from "lucide-react";
import { buildDashboardHero } from "@/features/dashboard/utils/heroSentence";
import { exportScanResultsAsCsv } from "@/utils/csvExport";
import { AI_MODELS } from "@/utils/constants";
import { runMockScan } from "@/services/mockScanEngine";
import type { Scan, ScanResult, ScanWithResults } from "@/types/database";

const MODEL_LABELS: Record<ScanResult["model_name"], string> = {
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

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, history, scanning, isLoading: scanLoading, runScan } = useScan(
    business,
    competitors,
  );
  const { toast } = useToast();
  const firstScanTriggered = useRef(false);

  // ── Filter state — mirrors the Tracker hero ────────────────────────
  // Time range affects the visibility-over-time chart. Engine filter
  // applies to every results-derived section so toggling an engine off
  // recomputes KPI / per-engine / sentiment / etc. live.
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("90d");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [enabledEngineIds, setEnabledEngineIds] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id)),
  );

  function toggleEngine(id: string) {
    setEnabledEngineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // always keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleExport() {
    if (!effectiveLatestScan || !business) return;
    exportScanResultsAsCsv(effectiveLatestScan, business.name);
  }

  async function handleRunScan() {
    toast("Scan started — querying AI tools…", "info");
    try {
      await runScan();
      toast("Scan complete!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Scan failed. Please try again.", "error");
    }
  }

  // Auto-run first scan after onboarding (?firstScan=1).
  useEffect(() => {
    if (firstScanTriggered.current) return;
    if (searchParams?.get("firstScan") !== "1") return;
    if (!business || scanning || scanLoading) return;
    if (latestScan) {
      router.replace("/dashboard");
      return;
    }
    firstScanTriggered.current = true;
    toast("Running your first scan — querying AI tools…", "info");
    runScan()
      .then(() => toast("Scan complete!", "success"))
      .catch((err) =>
        toast(err instanceof Error ? err.message : "Scan failed.", "error"),
      )
      .finally(() => router.replace("/dashboard"));
  }, [business, latestScan, scanning, scanLoading, searchParams, router, runScan, toast]);

  // ── Hooks above must run unconditionally; keep auth/loading branches below.
  const competitorList = competitors;
  const competitorNames = competitorList.map((c) => c.name);

  // ── Mock-data fallback ───────────────────────────────────────────────
  // When Supabase has no scan yet (placeholder env, fresh dev machine, or
  // a brand-new business that hasn't run its first scan), synthesize a
  // ScanWithResults using runMockScan — the SAME engine that powers the
  // mock fallback on /api/scan and the mock-data layer used across the
  // rest of the site. This keeps the dashboard populated for design QA
  // and demos. Real scans (when available) take priority.
  const effectiveLatestScan = useMemo<ScanWithResults | null>(() => {
    if (latestScan) return latestScan;
    if (!business) return null;
    const mock = runMockScan({
      businessName: business.name,
      industry: business.industry,
      city: business.city,
      state: business.state,
      competitors: competitorNames,
    });
    const now = new Date().toISOString();
    return {
      id: "mock-scan-latest",
      business_id: business.id,
      visibility_score: mock.visibilityScore,
      scan_type: "manual",
      model_scores: null,
      created_at: now,
      results: mock.results.map((r, i) => ({
        ...r,
        id: `mock-scan-result-${i}`,
        scan_id: "mock-scan-latest",
        created_at: now,
      })),
    };
    // Note: competitorNames is already a derived array; depend on its
    // joined identity to avoid re-running mockScan on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestScan, business, competitorNames.join("|")]);

  // 6 weekly history points anchored to the effective-latest score so the
  // history chart has a meaningful trend to draw when Supabase is empty.
  const effectiveHistory = useMemo<Scan[]>(() => {
    if (history.length > 0) return history;
    if (!business || !effectiveLatestScan) return [];
    const now = Date.now();
    const points: Scan[] = [];
    for (let i = 0; i < 6; i++) {
      const created = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      // Walk the score backward by ~1.5pts/week with ±4pt jitter so the
      // line breathes without getting wild.
      const drift = i * 1.5;
      const jitter = (((i * 73) % 9) - 4) * 0.6;
      const score = Math.max(
        0,
        Math.min(100, effectiveLatestScan.visibility_score - drift + jitter),
      );
      points.push({
        id: `mock-history-${i}`,
        business_id: business.id,
        visibility_score: Math.round(score * 10) / 10,
        scan_type: i === 0 ? "manual" : "automated",
        model_scores: null,
        created_at: created.toISOString(),
      });
    }
    // Reverse so the chart x-axis runs oldest → newest.
    return points.reverse();
  }, [history, business, effectiveLatestScan]);

  const score = effectiveLatestScan?.visibility_score ?? 0;
  const allResults = effectiveLatestScan?.results ?? [];

  // Apply engine filter — every results-derived section uses this.
  const results = useMemo(
    () => allResults.filter((r) => enabledEngineIds.has(r.model_name)),
    [allResults, enabledEngineIds],
  );

  // Apply time range to history (chart only). Range cutoffs in days; "ytd"
  // and "all" handled explicitly. Custom ranges use the from/to ISO pair.
  const filteredHistory = useMemo(() => {
    if (effectiveHistory.length === 0) return effectiveHistory;
    const now = Date.now();
    const cutoffDays: Partial<Record<TimeRangeKey, number>> = {
      "14d": 14,
      "30d": 30,
      "90d": 90,
    };
    if (timeRange === "all") return effectiveHistory;
    if (timeRange === "ytd") {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      return effectiveHistory.filter(
        (s) => new Date(s.created_at).getTime() >= startOfYear,
      );
    }
    if (timeRange === "custom" && customRange) {
      const fromTs = new Date(customRange.from + "T00:00:00").getTime();
      const toTs = new Date(customRange.to + "T23:59:59").getTime();
      return effectiveHistory.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return t >= fromTs && t <= toTs;
      });
    }
    const days = cutoffDays[timeRange];
    if (!days) return effectiveHistory;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return effectiveHistory.filter((s) => new Date(s.created_at).getTime() >= cutoff);
  }, [effectiveHistory, timeRange, customRange]);

  const hero = useMemo(
    () =>
      buildDashboardHero({
        business: business
          ? { industry: business.industry, city: business.city, state: business.state }
          : null,
        results,
        lastScanDate: effectiveLatestScan?.created_at ?? null,
      }),
    [business, results, effectiveLatestScan?.created_at],
  );

  const topMentionedCompetitorMemo = useMemo(() => {
    if (results.length === 0 || competitorList.length === 0) return null;
    const counts = new Map<string, number>();
    for (const c of competitorList) counts.set(c.name, 0);
    for (const r of results) {
      for (const [name, present] of Object.entries(r.competitor_mentions ?? {})) {
        if (!present) continue;
        if (!counts.has(name)) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0 || ranked[0][1] === 0) return null;
    return { name: ranked[0][0], count: ranked[0][1] };
  }, [results, competitorList]);

  // AI-summary text for the AISummaryGenerator pill — synthesizes the
  // page's headline finding in 2 sentences. Same shape the Tracker uses.
  function buildAiSummaryText(): string {
    if (results.length === 0) {
      return `${business?.name ?? "Your business"} hasn't been scanned yet. Run a scan to see how often ChatGPT, Claude, Gemini, and Google AI name you when answering customer questions.`;
    }
    const byEngine = new Map<ScanResult["model_name"], { mentioned: number; total: number }>();
    for (const r of results) {
      const e = byEngine.get(r.model_name) ?? { mentioned: 0, total: 0 };
      e.total += 1;
      if (r.business_mentioned) e.mentioned += 1;
      byEngine.set(r.model_name, e);
    }
    const ranked = [...byEngine.entries()]
      .map(([model, s]) => ({
        model,
        rate: s.total ? s.mentioned / s.total : 0,
        ...s,
      }))
      .sort((a, b) => b.rate - a.rate);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const tail = topMentionedCompetitorMemo
      ? ` ${topMentionedCompetitorMemo.name} is the named competitor to watch with ${topMentionedCompetitorMemo.count} mentions across these scans.`
      : "";

    if (ranked.length === 1) {
      return `${MODEL_LABELS[best.model]} mentions ${business?.name ?? "you"} in ${best.mentioned} of ${best.total} answers.${tail}`;
    }
    return `${MODEL_LABELS[best.model]} mentions ${business?.name ?? "you"} most — ${best.mentioned} of ${best.total} answers (${Math.round(best.rate * 100)}%). ${MODEL_LABELS[worst.model]} is the weak link at ${worst.mentioned} of ${worst.total} (${Math.round(worst.rate * 100)}%).${tail}`;
  }

  function buildAiSummaryCTA() {
    if (results.length === 0) return null;
    return { label: "Open Code Scanner", href: "/site-audit" };
  }

  // ── Tracker-style visibility chart data ─────────────────────────────
  // Same data shape + hook the AI Visibility Tracker uses, so the
  // ChartCard rendered on the dashboard is byte-identical to the Tracker
  // (gauge, glowing YOU line, end-of-line dual pill, hover-to-highlight,
  // delta pill in the header). RangeN translates the dashboard's
  // TimeRangeKey to a day count using the same map MOCK_BRANDS does.
  // IMPORTANT: these hooks must run unconditionally on every render —
  // never put them after the auth/loading early-return guards below or
  // React throws "Rendered more hooks than during the previous render."
  const rangeN = useMemo(() => {
    const map: Record<string, number> = { "14d": 14, "30d": 30, "90d": 90 };
    if (timeRange === "all") return MOCK_N;
    if (timeRange === "ytd") {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const days = Math.ceil((now.getTime() - start.getTime()) / 86400000);
      return Math.max(2, Math.min(MOCK_N, days));
    }
    if (timeRange === "custom" && customRange) {
      const from = new Date(customRange.from + "T00:00:00").getTime();
      const to = new Date(customRange.to + "T23:59:59").getTime();
      const days = Math.ceil((to - from) / 86400000);
      return Math.max(2, Math.min(MOCK_N, days));
    }
    return map[timeRange] ?? MOCK_N;
  }, [timeRange, customRange]);

  const scannerData = useScannerData(MOCK_BRANDS, MOCK_DATES, rangeN, enabledEngineIds);
  const enabledBrandIds = useMemo<Set<string>>(
    () => new Set(MOCK_BRANDS.map((b) => b.id)),
    [],
  );

  // SoV brands derived from the same scannerData powering the chart, so
  // the slim card's leaderboard + delta pills match the chart visually.
  const sovBrands = useMemo(
    () =>
      scannerData.scaledBrands.map((b) => {
        const current = b.data[b.data.length - 1] ?? 0;
        const previous = b.data[0] ?? 0;
        return {
          id: b.id,
          name: b.name,
          isYou: b.isYou,
          color: b.color,
          current,
          delta: Math.round((current - previous) * 10) / 10,
        };
      }),
    [scannerData.scaledBrands],
  );

  // Auth protection — early returns must come AFTER all hooks have
  // executed for this render so the hook order stays stable across
  // mounts (React's Rules of Hooks).
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

  // hasScan = "show populated dashboard." True when we have any data,
  // real OR mock-fallback. Empty state only fires when there's no
  // business to even synthesize from.
  const hasScan = !!effectiveLatestScan;
  const noResults = results.length === 0 && !scanLoading;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ─── 1. Hero — canonical Tracker pattern ────────────────────── */}
        {/* AISummaryGenerator pill at top, headline + NextScanCard side-by-
            side (no description paragraph), then time-range + engine chips.
            Visually + structurally identical to /ai-visibility-tracker. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
        >
          {/* Two-column layout: LEFT owns the whole vertical stack
              (AISummaryGenerator → headline → filter row), RIGHT is just
              NextScanCard. Pulling NextScanCard into its OWN column (not
              sharing a flex row with AISummaryGenerator or the headline)
              is the only way to avoid the stretch-to-tallest gap that
              was creating empty cream above the headline. The left
              column's children flow with explicit mt-* values, so the
              filter row lands flush under the headline. */}
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <AISummaryGenerator
                getSummary={buildAiSummaryText}
                getCTA={buildAiSummaryCTA}
              />
              <h1
                className="mt-5"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px, 4.6vw, 60px)",
                  fontWeight: 600,
                  // Tight line-height (1.0) trims the descender slack below
                  // the period so the filter row sits visually flush.
                  lineHeight: 1.0,
                  letterSpacing: "-0.01em",
                  color: "var(--color-fg)",
                }}
              >
                Your AI visibility is{" "}
                <span style={{ color: hero.color, fontStyle: "italic" }}>
                  {hero.word}
                </span>
                .
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <TimeRangeDropdown
                  value={timeRange}
                  customFrom={customRange?.from}
                  customTo={customRange?.to}
                  onChange={(key, fromISO, toISO) => {
                    if (key === "custom" && fromISO && toISO) {
                      setCustomRange({ from: fromISO, to: toISO });
                      setTimeRange("custom");
                    } else {
                      setTimeRange(key);
                    }
                  }}
                />
                <DashboardEngineChips
                  enabledIds={enabledEngineIds}
                  onToggle={toggleEngine}
                />
              </div>
            </div>
            <div className="shrink-0 hidden lg:block">
              <NextScanCard />
            </div>
          </div>

          {/* On mobile / narrow widths NextScanCard drops below the hero
              left-column instead of overflowing it. */}
          <div className="lg:hidden mt-4">
            <NextScanCard />
          </div>

          {/* Visibility gauge centered above the over-time chart. */}
          {hasScan && (
            <div className="mt-5 flex justify-center">
              <VisibilityScoreGauge
                score={scannerData.youToday}
                delta={scannerData.youDelta}
              />
            </div>
          )}

          {hasScan && (
            <div className="mt-4">
              <ChartCard
                data={scannerData}
                treatment={TREATMENT_STANDARD_LABEL}
                enabledBrandIds={enabledBrandIds}
                chartHeight={300}
                showInsight={false}
                showOptimizationMarkers={false}
                showPromptChangeMarkers={false}
                delta={scannerData.youDelta}
              />
            </div>
          )}

          {/* Side-by-side stat cards under the chart — same uniform
              CleanStatCard chrome that the Tracked Prompts page uses for
              its 4-card row. Equal width, equal height, single visual
              rhythm. */}
          {hasScan && (
            <div className="mt-4">
              <DashboardStatStrip
                results={results}
                competitors={competitorList}
                sovDelta={scannerData.youDelta}
                sovShare={scannerData.sharePct}
                sovBrands={sovBrands}
              />
            </div>
          )}
        </motion.div>

        {/* ─── 4. What's Next ─────────────────────────────────────────── */}
        {/* Visibility gauge moved INTO the hero (above the chart card);
            this row is now just the actions card on its own. */}
        <motion.div {...reveal}>
          <WhatsNextCard />
        </motion.div>

        {/* ─── 5. How each AI sees you (per-engine sentence card) ──────── */}
        {results.length > 0 && (
          <motion.div {...reveal}>
            <ModelBreakdownSection results={results} />
          </motion.div>
        )}

        {/* ─── 6. How you rank against competitors ─────────────────────── */}
        {results.length > 0 && competitorNames.length > 0 && (
          <motion.div {...reveal}>
            <ComparisonSection
              results={results}
              businessScore={score}
              businessName={business.name}
              competitors={competitorNames}
            />
          </motion.div>
        )}

        {/* ─── 7. 2-col: Sentiment | Citation gap ─────────────────────── */}
        {results.length > 0 && (
          <motion.div
            {...reveal}
            className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch"
          >
            <SentimentSection results={results} />
            <CitationGapSection results={results} businessName={business.name} />
          </motion.div>
        )}

        {/* ─── 8. Questions we tested (prompt results) ─────────────────── */}
        {results.length > 0 && (
          <motion.div {...reveal}>
            <PromptResultsSection results={results} businessName={business.name} />
          </motion.div>
        )}

        {/* ─── 9. Visibility over time ─────────────────────────────────── */}
        {filteredHistory.length > 0 && (
          <motion.div {...reveal}>
            <HistorySection scans={filteredHistory} />
          </motion.div>
        )}

        {/* ─── 10. Empty state ─────────────────────────────────────────── */}
        {noResults && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center space-y-3"
          >
            <p
              className="font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.2,
                color: "var(--color-fg)",
              }}
            >
              No scan yet.
            </p>
            <p
              className="text-[var(--color-fg-muted)] mx-auto"
              style={{ fontSize: 13.5, lineHeight: 1.55, maxWidth: 480 }}
            >
              Run your first scan to see where ChatGPT, Claude, Gemini, and Google AI
              name {business.name}.
            </p>
            <div className="pt-2">
              <Button onClick={handleRunScan} loading={scanning} size="md">
                Run first scan
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── 11. Export footer ───────────────────────────────────────── */}
        {results.length > 0 && (
          <motion.div
            {...reveal}
            transition={{ duration: 0.45, ease }}
            className="flex justify-end"
          >
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </motion.div>
        )}
      </div>

      <div className="mt-6">
        <BetaFeedbackFooter />
      </div>
    </DashboardLayout>
  );
}

/* ── Dashboard stat strip — Sentiment + Share of voice ──────────────── */
/**
 * Two CleanStatCards in a side-by-side grid using the canonical
 * Tracked-Prompts-page row pattern. Equal width / equal height. Sits
 * directly below the visibility chart card.
 */
function DashboardStatStrip({
  results,
  competitors,
  sovDelta,
  sovShare,
  sovBrands,
}: {
  results: ScanResult[];
  competitors: { name: string }[];
  sovDelta: number;
  sovShare: number;
  sovBrands: { name: string; isYou: boolean; current: number }[];
}) {
  const sentiment = summarizeSentiment(results);

  // Top-mentioned competitor for the SoV subline.
  const topCompetitor = (() => {
    if (results.length === 0 || competitors.length === 0) return null;
    const counts = new Map<string, number>();
    for (const c of competitors) counts.set(c.name, 0);
    for (const r of results) {
      for (const [name, present] of Object.entries(r.competitor_mentions ?? {})) {
        if (!present) continue;
        if (!counts.has(name)) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0 || ranked[0][1] === 0) return null;
    return { name: ranked[0][0], count: ranked[0][1] };
  })();

  // Top brand by current share for the SoV subline (for when no real
  // competitor mention beats yours we still surface the leader).
  const topSovBrand = [...sovBrands].sort((a, b) => b.current - a.current)[0];

  const sentimentSpec: CleanStatCardSpec = {
    icon: MessageSquare,
    label: "Sentiment",
    hint: "When AI describes you, the dominant tone across all mentions in the latest scan. Strong = mostly positive; Concerning = negatives outweigh positives.",
    value: sentiment.verdict === "No data" ? "—" : sentiment.verdict,
    sub:
      sentiment.total > 0
        ? `${sentiment.positive} positive · ${sentiment.neutral} neutral · ${sentiment.negative} negative`
        : "No sentiment data yet",
  };

  const sovSubline = topCompetitor
    ? `${topCompetitor.name} leads competitors with ${topCompetitor.count} mentions`
    : topSovBrand && !topSovBrand.isYou
      ? `${topSovBrand.name} leads at ${topSovBrand.current.toFixed(1)}%`
      : competitors.length === 0
        ? "Add competitors to compare"
        : "You're leading the field";

  const sovSpec: CleanStatCardSpec = {
    icon: Users,
    label: "Share of voice",
    hint: "Your share of every brand mention across the prompts we tracked. Higher = AI names you more often than competitors.",
    value: `${Math.round(sovShare)}%`,
    sub: sovSubline,
    delta: {
      direction: sovDelta > 0.04 ? "up" : sovDelta < -0.04 ? "down" : "flat",
      pct: sovDelta,
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <CleanStatCard spec={sentimentSpec} />
      <CleanStatCard spec={sovSpec} />
    </div>
  );
}

/* ── Inline EngineChips ───────────────────────────────────────────────── */
/**
 * Mirrors the EngineChips render inside VisibilityScannerSection — sage
 * filled when active, transparent + warm-grey border when not, hover hint
 * on each. Kept inline (not exported) since the chip behaviour is locked
 * to the dashboard's engine-filter set.
 */
function DashboardEngineChips({
  enabledIds,
  onToggle,
}: {
  enabledIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="text-[var(--color-fg-muted)] mr-1"
        style={{ fontSize: 14 }}
      >
        AI engines:
      </span>
      {AI_MODELS.map((m) => {
        const active = enabledIds.has(m.id);
        return (
          <HoverHint
            key={m.id}
            hint={`${active ? "Hide" : "Show"} ${m.name} data in the dashboard.`}
          >
            <button
              type="button"
              onClick={() => onToggle(m.id)}
              className={
                "inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] border transition-colors " +
                (active
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-transparent text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-fg-secondary)]")
              }
              style={{ fontSize: 13 }}
            >
              <EngineIcon id={m.id} size={15} />
              {m.name}
            </button>
          </HoverHint>
        );
      })}
    </div>
  );
}
