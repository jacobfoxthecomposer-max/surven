"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Info, ListChecks, Layers, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { generatePromptResearchData } from "@/features/prompt-research/mockData";
import { EntityGrid } from "@/features/prompt-research/EntityGrid";
import { TaxonomyCoverage } from "@/features/prompt-research/TaxonomyCoverage";
import { IntentDistribution } from "@/features/prompt-research/IntentDistribution";
import { IntentsTable } from "@/features/prompt-research/IntentsTable";
import { CustomPromptsSection } from "@/features/prompt-research/CustomPromptsSection";
import { HowToRank } from "@/features/prompt-research/HowToRank";
import { PromptResearchDiagnosticBand } from "@/features/prompt-research/PromptResearchDiagnosticBand";
import { PromptResearchFixActions } from "@/features/prompt-research/PromptResearchFixActions";
import { TAXONOMY_LABEL } from "@/features/prompt-research/taxonomy";
import { AI_MODELS } from "@/utils/constants";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";

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
  const { latestScan } = useScan(business, competitors);

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
    const seedKey = `${business.id}-${latestScan?.id ?? "noscan"}`;
    return generatePromptResearchData(
      seedKey,
      business.name,
      business.industry,
      business.city,
      competitors
    );
  }, [business, competitors, latestScan?.id]);

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

  const jumpToTable = () => {
    const el = document.getElementById("intents-table");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
      ? SURVEN_SEMANTIC.good
      : landscapeWord === "developing" || landscapeWord === "broad"
      ? SURVEN_SEMANTIC.neutral
      : SURVEN_SEMANTIC.bad;

  const competitorNames = competitors.map((c) => c.name);
  const untrackedCount = data
    ? data.intents.filter((i) => !i.inTracker).length
    : 0;

  const buildAISummary = (): string => {
    if (!insights) {
      return `No prompt research data yet for ${business.name}. Once a scan runs, this panel surfaces which intent categories you cover well and where the biggest opportunities sit.`;
    }
    const strongLabel = insights.strongest
      ? TAXONOMY_LABEL[insights.strongest.tax as keyof typeof TAXONOMY_LABEL]
      : null;
    const weakLabel = insights.weakest
      ? TAXONOMY_LABEL[insights.weakest.tax as keyof typeof TAXONOMY_LABEL]
      : null;
    const s1 = strongLabel && weakLabel && insights.strongest && insights.weakest
      ? `Across ${insights.totalIntents} intents and ${insights.totalVariants} prompt variants, your ${landscapeWord} territory is ${strongLabel} (${Math.round(insights.strongest.cov)}% coverage). Your weakest is ${weakLabel} at ${Math.round(insights.weakest.cov)}% — that's where the biggest opportunity sits.`
      : `Across ${insights.totalIntents} intents and ${insights.totalVariants} prompt variants, your average coverage is ${insights.avgCoverage}% — a ${landscapeWord} starting point.`;
    const s2 = insights.trackedCount < insights.totalIntents
      ? `${untrackedCount} of ${insights.totalIntents} intents aren't in your tracker yet — adding the high-volume ones tightens your visibility loop and surfaces leaks faster.`
      : `Every intent on this page is being tracked — your visibility loop is fully wired.`;
    const s3 = weakLabel && insights.weakest && insights.weakest.cov < 40
      ? `Watch ${weakLabel}: AI engines are answering those questions without naming you, and competitors are filling the void.`
      : `One bright spot: no taxonomy area is fully empty — every category has at least some coverage to build on.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (!insights || !insights.weakest) {
      return { label: "Run a site audit to start covering more intents", href: "/site-audit" };
    }
    const weakLabel = TAXONOMY_LABEL[insights.weakest.tax as keyof typeof TAXONOMY_LABEL];
    return { label: `Run a site audit to fix coverage on ${weakLabel}`, href: "/site-audit" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <AISummaryGenerator getSummary={buildAISummary} getCTA={buildAICTA} />
        {/* ===== Top grid — controls ===== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
        >
          <div className="lg:col-span-2 space-y-5 min-w-0">
            <div className="space-y-2">
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
                Your prompt landscape is{" "}
                <span style={{ color: landscapeColor, fontStyle: "italic" }}>
                  {landscapeWord}
                </span>
                .
              </h1>
              <p className="text-[var(--color-fg-muted)] mt-2" style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}>
                <strong className="text-[var(--color-fg)] font-semibold">Why is this important?</strong>{" "}
                Prompt research surfaces every variation of every customer question we can find in your category — even the ones you aren&apos;t tracking yet. Each researched intent is a future tracked prompt and a future answer you could be winning.
              </p>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <NextScanCard />
          </div>
        </motion.div>

        {/* Full-width divider */}
        <div className="border-t border-[var(--color-border)]" />

        {!data || !insights ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* ===== Zone 1: KPIs + AIOverview + EntityGrid (left) | FixActions (right) ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
                {/* KPI cards */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <KpiCard
                    icon={<ListChecks className="h-5 w-5 text-[var(--color-primary)]" />}
                    iconBg="bg-[var(--color-primary)]/10"
                    label="Intents"
                    hint="How many distinct prompt intents we've researched for you. Each intent rolls up multiple phrasings. More researched = more options to send to Tracker."
                    value={insights.totalIntents.toString()}
                    subtitle="Researched"
                    detail={`${insights.trackedCount} already in Tracker · ${untrackedCount} to add`}
                    href="#intents-table"
                    linkLabel="Pick what to track"
                    onClick={jumpToTable}
                  />
                  <KpiCard
                    icon={<Layers className="h-5 w-5 text-[#3D7BC4]" />}
                    iconBg="bg-[#6BA3F5]/10"
                    label="Variants"
                    hint="How many ways we phrase each question. AI returns different answers per phrasing, so testing variants gives you a real signal instead of a shaky one. 5+ variants per intent is healthy."
                    value={insights.totalVariants.toString()}
                    subtitle="Paraphrasings"
                    detail={`~${Math.round(insights.totalVariants / Math.max(insights.totalIntents, 1))} avg per intent`}
                    href="#intents-table"
                    linkLabel="See variants per intent"
                    onClick={jumpToTable}
                  />
                  <KpiCard
                    icon={
                      <Sparkles
                        className="h-5 w-5"
                        style={{
                          color:
                            insights.avgCoverage >= 60
                              ? SURVEN_SEMANTIC.goodAlt
                              : insights.avgCoverage < 30
                              ? SURVEN_SEMANTIC.bad
                              : "var(--color-primary)",
                        }}
                      />
                    }
                    iconBg={
                      insights.avgCoverage >= 60
                        ? "bg-[#96A283]/10"
                        : insights.avgCoverage < 30
                        ? "bg-[#B54631]/10"
                        : "bg-[var(--color-primary)]/10"
                    }
                    label="Coverage"
                    hint="How often AI engines mention you across every prompt variant. Above 60% is strong; 30–60% means gaps in some phrasings; under 30% means most don't pick you up."
                    value={`${insights.avgCoverage}%`}
                    subtitle="Avg mention rate"
                    detail={`Across ${AI_MODELS.length} engines`}
                    href="/citation-insights"
                    linkLabel="Why AI cites you"
                  />
                </motion.div>

                {/* Entity grid — last item in left column, sets the bottom edge */}
                <motion.div {...reveal} className="flex-1">
                  <EntityGrid data={data.entityGrid} />
                </motion.div>
              </div>

              {/* Right column — fix actions, h-full to match left column height */}
              <div className="flex flex-col">
                <PromptResearchFixActions
                  intents={data.intents}
                  businessName={business.name}
                  competitors={competitorNames}
                  onJumpToTable={jumpToTable}
                />
              </div>
            </div>

            {/* ===== Zone 2: full-width charts + diagnostic ===== */}
            <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TaxonomyCoverage intents={data.intents} />
              <IntentDistribution intents={data.intents} />
            </motion.div>

            <PromptResearchDiagnosticBand
              intents={data.intents}
              businessName={business.name}
            />

            {/* Intents table */}
            <motion.div {...reveal} id="intents-table" className="scroll-mt-6">
              <IntentsTable
                intents={data.intents}
                onSendToTracker={handleSendToTracker}
              />
            </motion.div>

            {/* Custom prompts (Premium-gated) */}
            <motion.div {...reveal}>
              <CustomPromptsSection businessId={business.id} />
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

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  hint: string;
  value: string;
  subtitle: string;
  detail: string;
  href: string;
  linkLabel: string;
  onClick?: () => void;
}

function KpiCard({
  icon,
  iconBg,
  label,
  hint,
  value,
  subtitle,
  detail,
  href,
  linkLabel,
  onClick,
}: KpiCardProps) {
  return (
    <Card className="flex flex-col p-5 h-full">
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs text-[var(--color-fg-muted)]">{label}</p>
            <HoverHint hint={hint}>
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
            {value}
          </p>
          <p className="text-xs text-[var(--color-fg-muted)]">{subtitle}</p>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
            {detail}
          </p>
        </div>
      </div>
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[11px] font-semibold mt-3 pt-3 border-t border-[var(--color-border)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors group"
      >
        {linkLabel}
        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </Card>
  );
}
