"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GitCompare, Calendar, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { CompetitorHero } from "@/features/competitor-comparison/CompetitorHero";
import { VisibilityLeaderboard } from "@/features/competitor-comparison/VisibilityLeaderboard";
import { CompetitorVisibilityChart } from "@/features/competitor-comparison/CompetitorVisibilityChart";
import { CompetitorFixActions } from "@/features/competitor-comparison/CompetitorFixActions";
import { CompetitorRowTable } from "@/features/competitor-comparison/CompetitorRowTable";
import { CompetitorHeatmap } from "@/features/competitor-comparison/CompetitorHeatmap";
import { CompetitorGaps } from "@/features/competitor-comparison/CompetitorGaps";
import { CompetitorCitedDomains } from "@/features/competitor-comparison/CompetitorCitedDomains";
import { CompetitorRankChart } from "@/features/competitor-comparison/CompetitorRankChart";
import { CompetitorShareOfVoiceChart } from "@/features/competitor-comparison/CompetitorShareOfVoiceChart";
import { FooterDiagnostic } from "@/features/competitor-comparison/FooterDiagnostic";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { AI_MODELS, COMPETITOR_PALETTE } from "@/utils/constants";

type TimeRange = "14d" | "30d" | "90d" | "ytd" | "all";
const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease },
} as const;

export default function CompetitorComparisonPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { plan } = useUserProfile();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, history, isLoading: scanLoading } = useScan(
    business,
    competitors,
  );
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id)),
  );
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(
    new Set(),
  );

  const results = latestScan?.results ?? [];
  const score = latestScan?.visibility_score ?? 0;
  const allCompetitorNames = useMemo(
    () => competitors.map((c) => c.name),
    [competitors],
  );
  // Empty `selectedCompetitors` is treated as "all selected" so we never have
  // to seed it from the async competitors load.
  const competitorNames = useMemo(
    () =>
      selectedCompetitors.size === 0
        ? allCompetitorNames
        : allCompetitorNames.filter((n) => selectedCompetitors.has(n)),
    [allCompetitorNames, selectedCompetitors],
  );
  const hasResults = results.length > 0 && allCompetitorNames.length > 0;

  const filteredResults = useMemo(
    () => results.filter((r) => selectedModels.has(r.model_name)),
    [results, selectedModels],
  );

  const competitorColor = (name: string) =>
    COMPETITOR_PALETTE[
      Math.abs(
        [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
      ) % COMPETITOR_PALETTE.length
    ];

  const toggleCompetitor = (name: string) => {
    setSelectedCompetitors((prev) => {
      const next =
        prev.size === 0 ? new Set(allCompetitorNames) : new Set(prev);
      if (next.has(name)) {
        if (next.size === 1) return prev; // always keep at least one
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Avg competitor score — hook must run before any returns
  const avgCompetitorScore = useMemo(() => {
    if (!hasResults) return 0;
    const compScores = competitorNames.map((name) => {
      let mentioned = 0;
      let total = 0;
      for (const r of filteredResults) {
        if (r.competitor_mentions && name in r.competitor_mentions) {
          total++;
          if (r.competitor_mentions[name]) mentioned++;
        }
      }
      return total > 0 ? Math.round((mentioned / total) * 100) : 0;
    });
    return compScores.length > 0
      ? Math.round(compScores.reduce((a, b) => a + b, 0) / compScores.length)
      : 0;
  }, [filteredResults, competitorNames, hasResults]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6" id="competitor-dashboard">
        {/* Top hero row — headline + filters take the full left, NextScanCard
            hugs the right edge in a fixed-width column. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6 items-stretch">
          <div className="space-y-5 min-w-0">
            <CompetitorHero
              businessName={business.name}
              score={score}
              avgCompetitorScore={avgCompetitorScore}
              competitorCount={competitorNames.length}
            />

            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease }}
                className="flex flex-wrap items-center gap-2"
              >
              <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1">
                {TIME_RANGES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTimeRange(key)}
                    className={
                      "px-3.5 py-2 font-medium rounded-[var(--radius-sm)] transition-colors " +
                      (timeRange === key
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                    }
                    style={{ fontSize: 14 }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-[var(--radius-md)] border transition-colors bg-[var(--color-surface)] text-[var(--color-fg-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]"
                style={{ fontSize: 14 }}
                title="Custom date range (coming soon)"
              >
                <Calendar className="h-4 w-4" /> Custom
              </button>

              <div className="h-4 w-px bg-[var(--color-border)]" />

              <span
                className="text-[var(--color-fg-muted)] mr-1"
                style={{ fontSize: 14 }}
              >
                AI engines:
              </span>
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
                      <EngineIcon id={m.id} size={13} /> {m.name}
                    </button>
                  );
                })}
              </div>

              </motion.div>
            )}

            {/* Filter row 2 — Manage competitors (sage glow) + per-competitor
                colored toggles for slicing every chart on the page. */}
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease }}
                className="flex flex-wrap items-center gap-2"
              >
                <a
                  href="/settings"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-[var(--radius-md)] border border-[var(--color-primary)]/40 bg-[var(--color-surface)] text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)] transition-all shadow-[0_0_14px_-3px_rgba(150,162,131,0.55)] hover:shadow-[0_0_20px_-2px_rgba(150,162,131,0.7)]"
                  style={{ fontSize: 14 }}
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  Manage competitors
                </a>

                <div className="h-4 w-px bg-[var(--color-border)]" />

                <span
                  className="text-[var(--color-fg-muted)] mr-1"
                  style={{ fontSize: 14 }}
                >
                  Who you&apos;re tracking:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {allCompetitorNames.map((name) => {
                    const color = competitorColor(name);
                    const active =
                      selectedCompetitors.size === 0 ||
                      selectedCompetitors.has(name);
                    return (
                      <button
                        key={name}
                        onClick={() => toggleCompetitor(name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] border font-medium transition-colors"
                        style={{
                          fontSize: 14,
                          background: active ? color : "transparent",
                          color: active ? "#fff" : color,
                          borderColor: active ? color : `${color}66`,
                          opacity: active ? 1 : 0.85,
                        }}
                        title={
                          active
                            ? `Hide ${name} from charts`
                            : `Include ${name} in charts`
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: active ? "#fff" : color,
                            opacity: active ? 0.9 : 1,
                          }}
                        />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right col — NextScanCard hugs the right edge in a fixed 260px slot. */}
          <div className="flex flex-col">
            <NextScanCard />
          </div>
        </div>

        {/* Divider line — sits between filter/action row and the data row below */}
        {hasResults && (
          <div className="border-t border-[var(--color-border)]" />
        )}

        {/* Data row — left 2/3: engine bars + stretched diagnostic. Right 1/3: fix actions */}
        {hasResults && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
              <CompetitorVisibilityChart />
              <VisibilityLeaderboard
                results={filteredResults}
                businessName={business.name}
                competitors={competitorNames}
                history={history}
                plan={plan}
                totalCompetitorCount={allCompetitorNames.length}
              />
            </div>
            <div className="flex flex-col">
              <CompetitorFixActions
                results={filteredResults}
                businessName={business.name}
                competitors={competitorNames}
              />
            </div>
          </div>
        )}

        {hasResults && (
          <>
            {/* Data-dense competitor rows with drawer */}
            <motion.div {...reveal}>
              <CompetitorRowTable
                results={filteredResults}
                businessName={business.name}
                businessScore={score}
                competitors={competitorNames}
              />
            </motion.div>

            {/* Heatmap (mid-page reference) */}
            <motion.div {...reveal}>
              <CompetitorHeatmap
                results={filteredResults}
                businessName={business.name}
                businessScore={score}
                competitors={competitorNames}
              />
            </motion.div>

            {/* Average rank over time — cloned from AI Visibility Tracker */}
            <motion.div {...reveal}>
              <CompetitorRankChart />
            </motion.div>

            {/* Share of voice over time — cloned from AI Visibility Tracker */}
            <motion.div {...reveal}>
              <CompetitorShareOfVoiceChart />
            </motion.div>

            {/* Gaps & advantages */}
            <motion.div {...reveal}>
              <CompetitorGaps
                results={filteredResults}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>

            {/* Cited domains per competitor */}
            <motion.div {...reveal}>
              <CompetitorCitedDomains
                results={filteredResults}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>

            {/* Footer 3-column diagnostic strip */}
            <FooterDiagnostic
              results={filteredResults}
              businessName={business.name}
              competitors={competitorNames}
            />

            {/* Beta feedback callout — shared organism with Code Scanner. */}
            <BetaFeedbackFooter />
          </>
        )}

        {/* Empty / loading states */}
        {competitorNames.length === 0 && !bizLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="text-center py-16 space-y-2">
              <GitCompare className="h-8 w-8 text-[var(--color-fg-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-fg-secondary)] font-medium">
                No competitors added
              </p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Add competitors in Settings to see how you compare across AI
                platforms.
              </p>
            </Card>
          </motion.div>
        )}

        {competitorNames.length > 0 && results.length === 0 && !scanLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="text-center py-16 space-y-2">
              <p className="text-[var(--color-fg-secondary)] font-medium">
                No scan data yet
              </p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Run a scan from the Dashboard — competitor data will appear
                here automatically.
              </p>
            </Card>
          </motion.div>
        )}

        {scanLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
