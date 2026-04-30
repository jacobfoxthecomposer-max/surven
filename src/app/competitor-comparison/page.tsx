"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, GitCompare, Calendar, Info, TrendingUp, BarChart3, Trophy } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Button } from "@/components/atoms/Button";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { AIOverview } from "@/components/atoms/AIOverview";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { ComparisonSection } from "@/features/dashboard/pages/ComparisonSection";
import { CompetitorHeatmap } from "@/features/competitor-comparison/CompetitorHeatmap";
import { CompetitorGaps } from "@/features/competitor-comparison/CompetitorGaps";
import { CompetitorCitedDomains } from "@/features/competitor-comparison/CompetitorCitedDomains";
import { ExportModal } from "@/features/competitor-comparison/ExportModal";
import { AI_MODELS } from "@/utils/constants";

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
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);
  const [exportOpen, setExportOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id))
  );

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

  const results = latestScan?.results ?? [];
  const score = latestScan?.visibility_score ?? 0;
  const competitorNames = competitors.map((c) => c.name);
  const hasResults = results.length > 0 && competitorNames.length > 0;

  // Compute KPI insights
  const kpiInsights = useMemo(() => {
    if (!hasResults) return null;
    const avgCompetitorScore = competitorNames.length > 0
      ? competitorNames.reduce((acc, name) => {
          let mentioned = 0, total = 0;
          for (const r of results) {
            if (r.competitor_mentions && name in r.competitor_mentions) {
              total++;
              if (r.competitor_mentions[name]) mentioned++;
            }
          }
          return acc + (total > 0 ? Math.round((mentioned / total) * 100) : 0);
        }, 0) / competitorNames.length
      : 0;

    const modelScores = AI_MODELS.map((m) => {
      const modelResults = results.filter((r) => r.model_name === m.id);
      if (modelResults.length === 0) return { name: m.name, id: m.id, score: 0 };
      const hits = modelResults.filter((r) => r.business_mentioned).length;
      return { name: m.name, id: m.id, score: Math.round((hits / modelResults.length) * 100) };
    }).sort((a, b) => b.score - a.score);

    const bestModel = modelScores[0];
    const bestModelScore = bestModel?.score ?? 0;
    const bestModelName = bestModel?.name ?? null;

    const outperformingNames = competitorNames.filter((name) => {
      let mentioned = 0, total = 0;
      for (const r of results) {
        if (r.competitor_mentions && name in r.competitor_mentions) {
          total++;
          if (r.competitor_mentions[name]) mentioned++;
        }
      }
      const compScore = total > 0 ? Math.round((mentioned / total) * 100) : 0;
      return score > compScore;
    });

    return { avgCompetitorScore: Math.round(avgCompetitorScore), bestModelScore, bestModelName, outperforming: outperformingNames.length, outperformingNames };
  }, [results, competitorNames, score, hasResults]);

  const overallTrend = kpiInsights
    ? score > kpiInsights.avgCompetitorScore
      ? "ahead"
      : score < kpiInsights.avgCompetitorScore
      ? "behind"
      : "matching"
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-10" id="competitor-dashboard">
        {/* Display font headline with dynamic keyword */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
          }}>
            You're{" "}
            <span style={{
              color: overallTrend === "ahead" ? "#7D8E6C" : overallTrend === "behind" ? "#B54631" : "#A09890",
              fontStyle: "italic",
            }}>
              {overallTrend === "ahead" ? "outpacing" : overallTrend === "behind" ? "losing ground to" : "matching"}
            </span>{" "}
            the competition.
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1.5">
            See how {business.name} compares across AI platforms.
          </p>
        </motion.div>

        {hasResults && (
          <>
            {/* Filter bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease }}
              className="flex flex-wrap items-center gap-2 pb-4 border-b border-[var(--color-border)]"
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

              <span className="text-[var(--color-fg-muted)] mr-1" style={{ fontSize: 14 }}>
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

            {/* KPI Cards */}
            {kpiInsights && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                <Card className="flex items-center gap-4 p-5">
                  <div className="h-10 w-10 rounded-xl bg-[#96A283]/10 flex items-center justify-center flex-shrink-0">
                    <GitCompare className="h-5 w-5 text-[#96A283]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="text-xs text-[var(--color-fg-muted)]">vs Competition</p>
                      <HoverHint hint="How your visibility score compares to competitors' average.">
                        <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                      </HoverHint>
                    </div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: "var(--color-fg)" }}>
                      +{(score - kpiInsights.avgCompetitorScore).toFixed(0)}%
                    </p>
                    <p className="text-xs text-[var(--color-fg-muted)]">
                      {score > kpiInsights.avgCompetitorScore ? "Above" : "Below"} average
                    </p>
                    <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                      You: {score}% · Competitor avg: {kpiInsights.avgCompetitorScore}%
                    </p>
                  </div>
                </Card>

                <Card className="flex items-center gap-4 p-5">
                  <div className="h-10 w-10 rounded-xl bg-[#96A283]/10 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-5 w-5 text-[#96A283]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="text-xs text-[var(--color-fg-muted)]">Best Platform</p>
                      <HoverHint hint="Your strongest AI platform based on visibility score.">
                        <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                      </HoverHint>
                    </div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: "var(--color-fg)" }}>
                      {kpiInsights.bestModelScore}%
                    </p>
                    <p className="text-xs text-[var(--color-fg-muted)]">Visibility score</p>
                    {kpiInsights.bestModelName && (
                      <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                        on {kpiInsights.bestModelName}
                      </p>
                    )}
                  </div>
                </Card>

                <Card className="flex items-center gap-4 p-5">
                  <div className="h-10 w-10 rounded-xl bg-[#96A283]/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-5 w-5 text-[#96A283]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="text-xs text-[var(--color-fg-muted)]">Outperforming</p>
                      <HoverHint hint="Number of competitors you rank higher than by visibility score.">
                        <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                      </HoverHint>
                    </div>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: "var(--color-fg)" }}>
                      {kpiInsights.outperforming}/{competitorNames.length}
                    </p>
                    <p className="text-xs text-[var(--color-fg-muted)]">Competitors</p>
                    {kpiInsights.outperformingNames.length > 0 && (
                      <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                        {kpiInsights.outperformingNames.slice(0, 2).join(", ")}
                        {kpiInsights.outperformingNames.length > 2 ? ` +${kpiInsights.outperformingNames.length - 2} more` : ""}
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* AIOverview callout */}
            {kpiInsights && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease }}
              >
                <AIOverview
                  text={
                    kpiInsights.outperforming === competitorNames.length
                      ? `You're dominating — ranking ahead of all ${competitorNames.length} competitors.`
                      : kpiInsights.outperforming > 0
                      ? `You're outperforming ${kpiInsights.outperforming} of ${competitorNames.length} competitors. Focus on ${
                          competitorNames.filter((name) => {
                            let mentioned = 0, total = 0;
                            for (const r of results) {
                              if (r.competitor_mentions && name in r.competitor_mentions) {
                                total++;
                                if (r.competitor_mentions[name]) mentioned++;
                              }
                            }
                            const compScore = total > 0 ? Math.round((mentioned / total) * 100) : 0;
                            return score < compScore;
                          })[0] || "improving"
                        } to take the lead.`
                      : `You're behind on average. Competitive analysis shows opportunities to improve visibility.`
                  }
                  size="md"
                />
              </motion.div>
            )}
          </>
        )}


        {/* No competitors state */}
        {competitorNames.length === 0 && !bizLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="text-center py-16 space-y-2">
              <GitCompare className="h-8 w-8 text-[var(--color-fg-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-fg-secondary)] font-medium">No competitors added</p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Add competitors in Settings to see how you compare across AI platforms.
              </p>
            </Card>
          </motion.div>
        )}

        {/* No scan results state */}
        {competitorNames.length > 0 && results.length === 0 && !scanLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="text-center py-16 space-y-2">
              <p className="text-[var(--color-fg-secondary)] font-medium">No scan data yet</p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Run a scan from the Dashboard — competitor data will appear here automatically.
              </p>
            </Card>
          </motion.div>
        )}

        {/* Loading scan */}
        {scanLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {/* Main content */}
        {hasResults && (
          <>
            {/* 1: AI Visibility Score comparison bar chart */}
            <motion.div {...reveal} id="scores-section">
              <ComparisonSection
                results={results}
                businessScore={score}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>

            {/* 2: Platform heatmap */}
            <motion.div {...reveal}>
              <CompetitorHeatmap
                results={results}
                businessName={business.name}
                businessScore={score}
                competitors={competitorNames}
              />
            </motion.div>

            {/* 3: Competitive gaps & advantages */}
            <motion.div {...reveal}>
              <CompetitorGaps
                results={results}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>

            {/* 4: Cited domains per competitor */}
            <motion.div {...reveal}>
              <CompetitorCitedDomains
                results={results}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>
          </>
        )}
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        businessName={business.name}
        scanDate={latestScan?.created_at ?? null}
      />
    </DashboardLayout>
  );
}
