"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GitCompare, Calendar, Download, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { CompetitorHero } from "@/features/competitor-comparison/CompetitorHero";
import { EngineComparisonBars } from "@/features/competitor-comparison/EngineComparisonBars";
import { DiagnosticBand } from "@/features/competitor-comparison/DiagnosticBand";
import { CompetitorFixActions } from "@/features/competitor-comparison/CompetitorFixActions";
import { CompetitorRowTable } from "@/features/competitor-comparison/CompetitorRowTable";
import { CompetitorHeatmap } from "@/features/competitor-comparison/CompetitorHeatmap";
import { CompetitorGaps } from "@/features/competitor-comparison/CompetitorGaps";
import { CompetitorCitedDomains } from "@/features/competitor-comparison/CompetitorCitedDomains";
import { FooterDiagnostic } from "@/features/competitor-comparison/FooterDiagnostic";
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
    () => new Set(AI_MODELS.map((m) => m.id)),
  );

  const results = latestScan?.results ?? [];
  const score = latestScan?.visibility_score ?? 0;
  const competitorNames = useMemo(
    () => competitors.map((c) => c.name),
    [competitors],
  );
  const hasResults = results.length > 0 && competitorNames.length > 0;

  const filteredResults = useMemo(
    () => results.filter((r) => selectedModels.has(r.model_name)),
    [results, selectedModels],
  );

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
      <div className="space-y-8" id="competitor-dashboard">
        {/* Hero zone — left 2/3: headline + filter + engine bars + diagnostic. Right 1/3: action panel + fix actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5 min-w-0">
            <CompetitorHero
              businessName={business.name}
              score={score}
              avgCompetitorScore={avgCompetitorScore}
              competitorCount={competitorNames.length}
            />

            {hasResults && (
              <>
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

                {/* Per-engine you-vs-competitor bars */}
                <EngineComparisonBars
                  results={filteredResults}
                  competitors={competitorNames}
                />

                {/* Diagnostic callouts (vertically stacked) */}
                <DiagnosticBand
                  businessName={business.name}
                  results={filteredResults}
                  competitors={competitorNames}
                />
              </>
            )}
          </div>

          {/* Right col — action panel + how-to-beat fix actions */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <NextScanCard />
              <button
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <a
                href="/settings"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Manage competitors
              </a>
            </div>

            {hasResults && (
              <CompetitorFixActions
                results={filteredResults}
                businessName={business.name}
                competitors={competitorNames}
              />
            )}
          </div>
        </div>

        {/* Full-width divider line — separates hero zone from rest of page */}
        {hasResults && (
          <div className="border-t border-[var(--color-border)]" />
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

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        businessName={business.name}
        scanDate={latestScan?.created_at ?? null}
      />
    </DashboardLayout>
  );
}
