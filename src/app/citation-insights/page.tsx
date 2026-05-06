"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Info,
  Link2,
  Database,
  ShieldCheck,
  ArrowRight,
  Search,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";
import { TimeRangeDropdown, type TimeRangeKey } from "@/components/atoms/TimeRangeDropdown";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { CustomDatePopover } from "@/components/atoms/CustomDatePopover";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan, useRangedScans } from "@/features/dashboard/hooks/useScan";
import { CitationGapSection } from "@/features/dashboard/pages/CitationGapSection";
import { AuthorityBreakdown } from "@/features/citation-insights/AuthorityBreakdown";
import { SourceCategoryBreakdown } from "@/features/citation-insights/SourceCategoryBreakdown";
import { CitationsByEngine } from "@/features/citation-insights/CitationsByEngine";
import { CitedDomainsTable } from "@/features/citation-insights/CitedDomainsTable";
import { CitationDiagnosticBand } from "@/features/citation-insights/CitationDiagnosticBand";
import { CitationFixActions } from "@/features/citation-insights/CitationFixActions";
import { CitationFooterDiagnostic } from "@/features/citation-insights/CitationFooterDiagnostic";
import { AI_MODELS } from "@/utils/constants";
import { getAuthority } from "@/utils/citationAuthority";
import { colorForValue, SURVEN_THRESHOLDS } from "@/utils/brandColors";
import type { TimeRange } from "@/utils/timeRange";

const TIME_RANGES: { key: Exclude<TimeRange, "custom">; label: string }[] = [
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

export default function CitationInsightsPage() {
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id))
  );

  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);
  const { results: rangedResults, isLoading: rangeLoading } = useRangedScans(
    business,
    timeRange,
    customStart,
    customEnd,
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

  const allResults =
    timeRange === "all" ? latestScan?.results ?? [] : rangedResults;
  const results = useMemo(
    () =>
      selectedModels.size === AI_MODELS.length
        ? allResults
        : allResults.filter((r) => selectedModels.has(r.model_name)),
    [allResults, selectedModels]
  );

  const insights = useMemo(() => {
    if (results.length === 0) return null;

    const totalResponses = results.length;
    const responsesWithBusiness = results.filter((r) => r.business_mentioned).length;
    const citationRate = totalResponses > 0
      ? Math.round((responsesWithBusiness / totalResponses) * 100)
      : 0;

    const uniqueDomains = new Set<string>();
    let totalCitations = 0;
    const authorityCounts = { high: 0, medium: 0, low: 0 };
    const domainFreq = new Map<string, number>();
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        if (!uniqueDomains.has(d)) {
          uniqueDomains.add(d);
          authorityCounts[getAuthority(d)]++;
        }
        totalCitations++;
        domainFreq.set(d, (domainFreq.get(d) ?? 0) + 1);
      }
    }

    const totalUnique = uniqueDomains.size;
    const highAuthorityPct =
      totalUnique > 0 ? Math.round((authorityCounts.high / totalUnique) * 100) : 0;

    const topDomain = Array.from(domainFreq.entries()).sort((a, b) => b[1] - a[1])[0];
    const enginesWithCitations = new Set(
      results.filter((r) => r.citations && r.citations.length > 0).map((r) => r.model_name)
    );

    return {
      citationRate,
      totalCitations,
      uniqueDomains: totalUnique,
      authorityCounts,
      highAuthorityPct,
      topDomain: topDomain ? { domain: topDomain[0], count: topDomain[1] } : null,
      engineCount: enginesWithCitations.size,
    };
  }, [results]);

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

  const profileWord = !insights
    ? "unknown"
    : insights.uniqueDomains >= 8 && insights.highAuthorityPct >= 50
    ? "strong"
    : insights.uniqueDomains >= 5
    ? "diverse"
    : insights.uniqueDomains >= 2
    ? "concentrated"
    : "thin";

  const profileColor =
    profileWord === "strong" || profileWord === "diverse"
      ? "#7D8E6C"
      : profileWord === "thin"
      ? "#B54631"
      : "#A09890";

  const hasResults = allResults.length > 0;

  const buildAISummary = (): string => {
    if (!insights) {
      return `No citation data yet for ${business.name}. Run a scan from the Dashboard to see which sources AI engines are pulling from when they answer questions about you.`;
    }
    const top = insights.topDomain;
    const s1 = top
      ? `${top.domain} is doing the heavy lifting — ${top.count} of ${insights.totalCitations} citations across ${insights.engineCount} AI engine${insights.engineCount === 1 ? "" : "s"}, but ${insights.uniqueDomains} total cited domain${insights.uniqueDomains === 1 ? "" : "s"} means your authority footprint is ${profileWord}.`
      : `AI engines aren't citing any sources for ${business.name} yet — getting listed on high-authority directories is the fastest way to start showing up.`;
    const s2 = `High-authority sources make up ${insights.highAuthorityPct}% of your citation mix${insights.highAuthorityPct < 40 ? " — that's the lever to pull, since AI weights citations from trusted domains far more heavily" : " — keep that pressure on, since AI weights trusted domains far more heavily"}.`;
    const s3 = insights.engineCount < 4
      ? `Watch your engine spread: only ${insights.engineCount} of 4 engines are citing any source for you, which means ${4 - insights.engineCount} engine${4 - insights.engineCount === 1 ? " is" : "s are"} answering without naming you at all.`
      : `One bright spot: every tracked AI engine is pulling at least one citation for you — coverage is intact across the board.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (!insights || !insights.topDomain) {
      return { label: "Run a site audit to start earning citations", href: "/site-audit" };
    }
    if (insights.highAuthorityPct < 40) {
      return { label: "Run a site audit to earn high-authority citations", href: "/site-audit" };
    }
    return { label: "Run a site audit to broaden your citation footprint", href: "/site-audit" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <AISummaryGenerator getSummary={buildAISummary} getCTA={buildAICTA} />
        {/* Top hero row — headline + filter (left 2/3), action panel (right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-5 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
              className="space-y-2 min-w-0"
            >
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
                Your citation profile is{" "}
                <span style={{ color: profileColor, fontStyle: "italic" }}>
                  {profileWord}
                </span>
                .
              </h1>
              <p className="text-[var(--color-fg-muted)] mt-2" style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}>
                <strong className="text-[var(--color-fg)] font-semibold">Why is this important?</strong>{" "}
                Citations are the third-party sites AI pulls quotes and links from when answering about {business.name}. Getting listed on the sources AI already trusts is the highest-leverage thing you can do to surface in more answers.
              </p>
            </motion.div>

            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease }}
                className="flex flex-wrap items-center gap-2"
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
                        <EngineIcon id={m.id} size={13} />
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right col — action panel */}
          <div className="flex flex-col gap-2">
            <NextScanCard />
            <Link
              href="/audit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <Search className="h-4 w-4" />
              Run GEO audit
            </Link>
            <Link
              href="/competitor-comparison"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Compare competitors
            </Link>
          </div>
        </div>

        {/* Loading / empty / content */}
        {scanLoading || rangeLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : !hasResults ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="text-center py-20"
          >
            {latestScan ? (
              <>
                <p className="text-lg text-[var(--color-fg-secondary)]">
                  No scans in this range
                </p>
                <p className="text-sm text-[var(--color-fg-muted)] mt-2">
                  Try a wider range or switch back to All.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg text-[var(--color-fg-secondary)]">
                  No scan data yet
                </p>
                <p className="text-sm text-[var(--color-fg-muted)] mt-2">
                  Run a scan from the Dashboard to see citation insights.
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <>
            {/* Divider line — sits between control row and the data row below */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Data row — left col-span-2 stacks KPIs + AIOverview + WhatToWatch.
                Right col-span-1 holds FixActions, h-full to match the combined left-col height. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
                {/* KPI cards */}
                {insights && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    {(() => {
                      const rateColor = colorForValue(
                        insights.citationRate,
                        SURVEN_THRESHOLDS.citationRate,
                      );
                      return (
                        <Card className="flex flex-col gap-3 p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${rateColor}1A` }}
                            >
                              <Link2
                                className="h-5 w-5"
                                style={{ color: rateColor }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs text-[var(--color-fg-muted)]">
                                  Citation Rate
                                </p>
                                <HoverHint hint="Share of AI responses about you that include a cited source. 50%+ is strong; under 25% means AI engines are answering without grounding their claims.">
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
                                {insights.citationRate}%
                              </p>
                              <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                                {insights.totalCitations} total citations
                              </p>
                            </div>
                          </div>
                          <Link
                            href="/prompts"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors mt-auto"
                          >
                            See prompts <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Card>
                      );
                    })()}

                    <Card className="flex flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                          <Database className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <p className="text-xs text-[var(--color-fg-muted)]">
                              Unique Sources
                            </p>
                            <HoverHint hint="How many different sources AI engines pulled from when describing you. More variety means broader trust — under 5 sources signals a thin authority footprint.">
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
                            {insights.uniqueDomains}
                          </p>
                          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                            Across {insights.engineCount}{" "}
                            {insights.engineCount === 1 ? "engine" : "engines"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/ai-visibility-tracker"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors mt-auto"
                      >
                        Engine breakdown <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Card>

                    <Card className="flex flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            insights.highAuthorityPct >= 60
                              ? "bg-[#96A283]/10"
                              : insights.highAuthorityPct < 30
                              ? "bg-[#B54631]/10"
                              : "bg-[var(--color-primary)]/10"
                          }`}
                        >
                          <ShieldCheck
                            className={`h-5 w-5 ${
                              insights.highAuthorityPct >= 60
                                ? "text-[#96A283]"
                                : insights.highAuthorityPct < 30
                                ? "text-[#B54631]"
                                : "text-[var(--color-primary)]"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <p className="text-xs text-[var(--color-fg-muted)]">
                              Authority Mix
                            </p>
                            <HoverHint hint="Share of citations from heavyweight sources (Yelp, Google, BBB, major news). Above 50% is strong; under 25% means AI is leaning on weak sources to describe you.">
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
                            {insights.highAuthorityPct}%
                          </p>
                          <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5 opacity-70 leading-tight">
                            {insights.authorityCounts.high} high ·{" "}
                            {insights.authorityCounts.medium} med ·{" "}
                            {insights.authorityCounts.low} low
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/audit"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors mt-auto"
                      >
                        Run audit <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Card>
                  </motion.div>
                )}

                {/* What to watch only — its bottom aligns with FixActions bottom via items-stretch */}
                <CitationDiagnosticBand
                  results={results}
                  businessName={business.name}
                  mode="watch"
                />
              </div>

              <div className="flex flex-col">
                <CitationFixActions
                  results={results}
                  businessName={business.name}
                />
              </div>
            </div>

            {/* Full-width What's working */}
            <CitationDiagnosticBand
              results={results}
              businessName={business.name}
              mode="working"
            />

            {/* Sections */}
            <motion.div {...reveal}>
              <CitationGapSection
                results={results}
                businessName={business.name}
              />
            </motion.div>

            <motion.div
              {...reveal}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <AuthorityBreakdown results={results} />
              <SourceCategoryBreakdown results={results} />
            </motion.div>

            <motion.div {...reveal}>
              <CitationsByEngine results={results} />
            </motion.div>

            <motion.div {...reveal}>
              <CitedDomainsTable results={results} />
            </motion.div>

            {/* Footer 3-column diagnostic strip */}
            <CitationFooterDiagnostic
              results={results}
              businessName={business.name}
            />
          </>
        )}

        <BetaFeedbackFooter />
      </div>
    </DashboardLayout>
  );
}
