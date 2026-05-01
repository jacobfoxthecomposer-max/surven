"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Info, ListChecks, Layers, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { AIOverview } from "@/components/atoms/AIOverview";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { generatePromptResearchData } from "@/features/prompt-research/mockData";
import { EntityGrid } from "@/features/prompt-research/EntityGrid";
import { TaxonomyCoverage } from "@/features/prompt-research/TaxonomyCoverage";
import { IntentDistribution } from "@/features/prompt-research/IntentDistribution";
import { IntentsTable } from "@/features/prompt-research/IntentsTable";
import { NextMoves } from "@/features/prompt-research/NextMoves";
import { HowToRank } from "@/features/prompt-research/HowToRank";
import { TAXONOMY_LABEL } from "@/features/prompt-research/taxonomy";
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

export default function PromptResearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();

  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id))
  );
  const [toast, setToast] = useState<string | null>(null);

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

  const data = useMemo(() => {
    if (!business) return null;
    return generatePromptResearchData(
      business.id,
      business.name,
      business.industry,
      business.city,
      competitors
    );
  }, [business, competitors]);

  const insights = useMemo(() => {
    if (!data) return null;
    const intents = data.intents;
    const totalVariants = intents.reduce((acc, i) => acc + i.variants.length, 0);
    const avgCoverage =
      intents.length > 0
        ? Math.round(
            intents.reduce((acc, i) => acc + i.overallCoverage, 0) / intents.length
          )
        : 0;
    const trackedCount = intents.filter((i) => i.inTracker).length;

    const byTaxonomy = new Map<string, { count: number; covSum: number }>();
    for (const i of intents) {
      const prev = byTaxonomy.get(i.taxonomy) ?? { count: 0, covSum: 0 };
      byTaxonomy.set(i.taxonomy, {
        count: prev.count + 1,
        covSum: prev.covSum + i.overallCoverage,
      });
    }

    let strongest: { tax: string; cov: number } | null = null;
    let weakest: { tax: string; cov: number } | null = null;
    for (const [tax, v] of byTaxonomy.entries()) {
      const cov = v.covSum / v.count;
      if (strongest === null || cov > strongest.cov) strongest = { tax, cov };
      if (weakest === null || cov < weakest.cov) weakest = { tax, cov };
    }

    return {
      totalIntents: intents.length,
      totalVariants,
      avgCoverage,
      trackedCount,
      strongest,
      weakest,
    };
  }, [data]);

  const handleSendToTracker = (selectedIds: string[]) => {
    const totalVariants =
      data?.intents
        .filter((i) => selectedIds.includes(i.id))
        .reduce((acc, i) => acc + i.variants.length, 0) ?? 0;
    setToast(
      `Sent ${selectedIds.length} intent${selectedIds.length === 1 ? "" : "s"} (${totalVariants} variants) to Tracker.`
    );
    setTimeout(() => setToast(null), 4000);
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

  const landscapeWord = !insights
    ? "unknown"
    : insights.avgCoverage >= 60
    ? "strong"
    : insights.avgCoverage >= 35
    ? "developing"
    : insights.totalIntents >= 60
    ? "broad"
    : "thin";

  const landscapeColor =
    landscapeWord === "strong"
      ? "#7D8E6C"
      : landscapeWord === "developing" || landscapeWord === "broad"
      ? "#A09890"
      : "#B54631";

  const aiInsight = insights && insights.strongest && insights.weakest
    ? `Your strongest territory is ${TAXONOMY_LABEL[insights.strongest.tax as keyof typeof TAXONOMY_LABEL]} (${Math.round(insights.strongest.cov)}% coverage). Your weakest is ${TAXONOMY_LABEL[insights.weakest.tax as keyof typeof TAXONOMY_LABEL]} at ${Math.round(insights.weakest.cov)}% — that's where the biggest opportunity sits.`
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        {/* Header */}
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
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color: "var(--color-fg)",
              }}
            >
              Your prompt landscape is{" "}
              <span style={{ color: landscapeColor, fontStyle: "italic" }}>
                {landscapeWord}
              </span>
              .
            </h1>
            <p className="text-sm text-[var(--color-fg-muted)] mt-1.5 max-w-[760px]">
              In GEO (Generative Engine Optimization), a prompt is a question
              someone asks an AI. You "win" that prompt when the AI mentions
              your brand in its answer.
            </p>
          </div>
          <div className="shrink-0 mt-1">
            <NextScanCard />
          </div>
        </motion.div>

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
                      : "bg-transparent text-[var(--color-fg-muted)] border-[var(--color-border)] hover:text-[var(--color-fg-secondary)]")
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

        {!data || !insights ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <Card className="flex items-center gap-4 p-5">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                  <ListChecks className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-xs text-[var(--color-fg-muted)]">Intents</p>
                    <HoverHint hint="How many distinct prompt intents we've researched for you. Each intent rolls up multiple paraphrasings of the same question. The more we research, the more options you have for what to track in Tracker.">
                      <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                    </HoverHint>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: "var(--color-fg)",
                    }}
                  >
                    {insights.totalIntents}
                  </p>
                  <p className="text-xs text-[var(--color-fg-muted)]">Researched</p>
                  <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                    {insights.trackedCount} already in Tracker
                  </p>
                </div>
              </Card>

              <Card className="flex items-center gap-4 p-5">
                <div className="h-10 w-10 rounded-xl bg-[#6BA3F5]/10 flex items-center justify-center flex-shrink-0">
                  <Layers className="h-5 w-5 text-[#3D7BC4]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-xs text-[var(--color-fg-muted)]">Variants</p>
                    <HoverHint hint="People phrase the same question 15 different ways, and AI gives different answers depending on the phrasing. We test multiple paraphrasings per intent so you get a real signal instead of one shaky data point. 5+ variants per intent is healthy.">
                      <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                    </HoverHint>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: "var(--color-fg)",
                    }}
                  >
                    {insights.totalVariants}
                  </p>
                  <p className="text-xs text-[var(--color-fg-muted)]">Paraphrasings</p>
                  <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                    ~{Math.round(insights.totalVariants / Math.max(insights.totalIntents, 1))} avg per intent
                  </p>
                </div>
              </Card>

              <Card className="flex items-center gap-4 p-5">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    insights.avgCoverage >= 60
                      ? "bg-[#96A283]/10"
                      : insights.avgCoverage < 30
                      ? "bg-[#B54631]/10"
                      : "bg-[var(--color-primary)]/10"
                  }`}
                >
                  <Sparkles
                    className={`h-5 w-5 ${
                      insights.avgCoverage >= 60
                        ? "text-[#96A283]"
                        : insights.avgCoverage < 30
                        ? "text-[#B54631]"
                        : "text-[var(--color-primary)]"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-xs text-[var(--color-fg-muted)]">Coverage</p>
                    <HoverHint hint="How often AI engines mention your brand across every prompt variant we test. Above 60% is strong AI presence. 30–60% is mid-pack — most phrasings surface you, but you have gaps. Below 30% means most paraphrasings don't pick you up.">
                      <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                    </HoverHint>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: "var(--color-fg)",
                    }}
                  >
                    {insights.avgCoverage}%
                  </p>
                  <p className="text-xs text-[var(--color-fg-muted)]">Avg mention rate</p>
                  <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                    Across {AI_MODELS.length} engines
                  </p>
                </div>
              </Card>
            </motion.div>

            {/* AIOverview */}
            {aiInsight && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease }}
              >
                <AIOverview text={aiInsight} size="md" />
              </motion.div>
            )}

            {/* Next moves — prescriptive top section */}
            <motion.div {...reveal}>
              <NextMoves
                intents={data.intents}
                weakestTaxonomy={insights.weakest?.tax ?? null}
                weakestCoverage={
                  insights.weakest ? Math.round(insights.weakest.cov) : 0
                }
                competitorName={data.entityGrid.competitors[0] ?? null}
              />
            </motion.div>

            {/* Entity grid */}
            <motion.div {...reveal}>
              <EntityGrid data={data.entityGrid} />
            </motion.div>

            {/* Charts row */}
            <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TaxonomyCoverage intents={data.intents} />
              <IntentDistribution intents={data.intents} />
            </motion.div>

            {/* Intents table */}
            <motion.div {...reveal} id="intents-table" className="scroll-mt-6">
              <IntentsTable
                intents={data.intents}
                onSendToTracker={handleSendToTracker}
              />
            </motion.div>

            {/* How to rank — playbook bottom section */}
            <motion.div {...reveal}>
              <HowToRank />
            </motion.div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[var(--radius-md)] shadow-lg"
            style={{
              background: "var(--color-fg)",
              color: "var(--color-bg)",
              fontSize: 13,
            }}
          >
            {toast}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
