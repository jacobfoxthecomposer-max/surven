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

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Download } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { AIOverview } from "@/components/atoms/AIOverview";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { GaugeSection } from "@/features/dashboard/pages/GaugeSection";
import { ModelBreakdownSection } from "@/features/dashboard/pages/ModelBreakdownSection";
import { PromptResultsSection } from "@/features/dashboard/pages/PromptResultsSection";
import { ComparisonSection } from "@/features/dashboard/pages/ComparisonSection";
import { HistorySection } from "@/features/dashboard/pages/HistorySection";
import { SentimentSection } from "@/features/dashboard/pages/SentimentSection";
import { CitationGapSection } from "@/features/dashboard/pages/CitationGapSection";
import { WhatsNextCard } from "@/components/organisms/WhatsNextCard";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { DashboardKpiStrip } from "@/features/dashboard/components/DashboardKpiStrip";
import { buildDashboardHero } from "@/features/dashboard/utils/heroSentence";
import { exportScanResultsAsCsv } from "@/utils/csvExport";
import type { ScanResult } from "@/types/database";

const MODEL_LABELS: Record<ScanResult["model_name"], string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

function buildDashboardInsight(
  results: ScanResult[],
  businessName: string,
  topCompetitor: { name: string; count: number } | null,
): string | null {
  if (results.length === 0) return null;
  const byEngine = new Map<ScanResult["model_name"], { mentioned: number; total: number }>();
  for (const r of results) {
    const e = byEngine.get(r.model_name) ?? { mentioned: 0, total: 0 };
    e.total += 1;
    if (r.business_mentioned) e.mentioned += 1;
    byEngine.set(r.model_name, e);
  }
  const ranked = [...byEngine.entries()]
    .map(([model, s]) => ({ model, ...s, rate: s.total ? s.mentioned / s.total : 0 }))
    .sort((a, b) => b.rate - a.rate);
  if (ranked.length === 0) return null;
  const best = ranked[0];

  if (topCompetitor) {
    return `${MODEL_LABELS[best.model]} mentions ${businessName} most — ${best.mentioned} of ${best.total} answers. ${topCompetitor.name} is the competitor to watch with ${topCompetitor.count} mentions.`;
  }
  if (ranked.length === 1) {
    return `${MODEL_LABELS[best.model]} mentions ${businessName} in ${best.mentioned} of ${best.total} answers.`;
  }
  const worst = ranked[ranked.length - 1];
  return `${MODEL_LABELS[best.model]} mentions ${businessName} most — ${best.mentioned} of ${best.total}. ${MODEL_LABELS[worst.model]} is the weak link at ${worst.mentioned} of ${worst.total}.`;
}

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

  function handleExport() {
    if (!latestScan || !business) return;
    exportScanResultsAsCsv(latestScan, business.name);
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
  const score = latestScan?.visibility_score ?? 0;
  const results = latestScan?.results ?? [];
  const competitorList = competitors;
  const competitorNames = competitorList.map((c) => c.name);

  const hero = useMemo(
    () =>
      buildDashboardHero({
        business: business
          ? { industry: business.industry, city: business.city, state: business.state }
          : null,
        results,
        lastScanDate: latestScan?.created_at ?? null,
      }),
    [business, results, latestScan?.created_at],
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

  const insight = useMemo(
    () =>
      buildDashboardInsight(results, business?.name ?? "you", topMentionedCompetitorMemo),
    [results, business?.name, topMentionedCompetitorMemo],
  );

  const reportDateLabel = useMemo(() => {
    const d = latestScan?.created_at ? new Date(latestScan.created_at) : new Date();
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [latestScan?.created_at]);

  // Auth protection
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

  const hasScan = !!latestScan;
  const noResults = results.length === 0 && !scanLoading;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ─── 1. Eyebrow + Hero ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div className="min-w-0">
            <p
              className="text-[var(--color-fg-muted)] uppercase flex items-center gap-1.5"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
            >
              <Calendar className="h-3 w-3" />
              Visibility report &middot; {reportDateLabel}
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px, 4.4vw, 52px)",
                fontWeight: 600,
                lineHeight: 1.12,
                letterSpacing: "-0.01em",
                color: "var(--color-fg)",
                marginTop: 6,
              }}
            >
              {business.name}&rsquo;s AI visibility is{" "}
              <span style={{ color: hero.color, fontStyle: "italic" }}>{hero.word}</span>.
            </h1>
            <p
              className="text-[var(--color-fg-secondary)]"
              style={{ fontSize: 14.5, lineHeight: 1.55, marginTop: 8, maxWidth: 720 }}
            >
              {hasScan && hero.total > 0 ? (
                <>
                  Named in{" "}
                  <span className="tabular-nums font-semibold text-[var(--color-fg)]">
                    {hero.mentioned} of {hero.total}
                  </span>{" "}
                  AI answers about {hero.industryPhrase}
                  {hero.locationPhrase ? ` ${hero.locationPhrase}` : ""}.
                  {hero.lastScanLabel && (
                    <span className="text-[var(--color-fg-muted)]">
                      {" "}
                      Last scan {hero.lastScanLabel}.
                    </span>
                  )}
                </>
              ) : (
                <>
                  We test 4 AI tools (ChatGPT, Claude, Gemini, Google AI) against the
                  questions your customers actually ask. Run a scan to see who AI
                  recommends — you, or your competitors.
                </>
              )}
            </p>
          </div>
        </motion.div>

        {/* ─── 2. KPI strip ────────────────────────────────────────────── */}
        {hasScan && (
          <motion.div {...reveal}>
            <DashboardKpiStrip results={results} competitors={competitorList} />
          </motion.div>
        )}

        {/* ─── 3. Page-level AIOverview ────────────────────────────────── */}
        {insight && (
          <motion.div {...reveal}>
            <AIOverview text={insight} size="md" />
          </motion.div>
        )}

        {/* ─── 4. Trio: Gauge + What's Next ───────────────────────────── */}
        <motion.div
          {...reveal}
          className="grid grid-cols-1 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4 items-stretch"
        >
          <GaugeSection
            score={score}
            hasScan={hasScan}
            scanning={scanning}
            isLoading={scanLoading}
            onRunScan={handleRunScan}
          />
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
        {history.length > 0 && (
          <motion.div {...reveal}>
            <HistorySection scans={history} />
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
