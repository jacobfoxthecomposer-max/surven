"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  HelpCircle,
  Link2,
  Database,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { CleanStatCard, type CleanStatCardSpec } from "@/features/dashboard/pages/PromptsSection";
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
    // Per-engine unique source counts — used by the mini bar chart in
    // the Unique Sources card right slot.
    const perEngineSources = new Map<string, Set<string>>();
    for (const m of AI_MODELS) perEngineSources.set(m.id, new Set());
    for (const r of results) {
      if (!r.citations) continue;
      const engineSet = perEngineSources.get(r.model_name);
      for (const d of r.citations) {
        if (!uniqueDomains.has(d)) {
          uniqueDomains.add(d);
          authorityCounts[getAuthority(d)]++;
        }
        totalCitations++;
        domainFreq.set(d, (domainFreq.get(d) ?? 0) + 1);
        if (engineSet) engineSet.add(d);
      }
    }
    const enginesSourceCounts = AI_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      count: perEngineSources.get(m.id)?.size ?? 0,
    }));

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
      enginesSourceCounts,
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
    // Sandwich structure: GOOD → BAD → GOOD. Lead with the strongest
    // citation source or footprint, middle with the highest-leverage
    // weakness (authority mix or engine spread), close with another
    // positive (full engine coverage or healthy authority %).
    const s1 = top
      ? `${top.domain} is doing the heavy lifting — ${top.count} of ${insights.totalCitations} citations across ${insights.engineCount} AI engine${insights.engineCount === 1 ? "" : "s"}, an anchor source that's already proven it can land you in answers.`
      : `Your scan returned ${insights.totalCitations} total citations across ${insights.uniqueDomains} domain${insights.uniqueDomains === 1 ? "" : "s"} — the foundation is in place to start naming the authority sources AI weights highest.`;
    const s2 = insights.highAuthorityPct < 40
      ? `High-authority sources, however, only make up ${insights.highAuthorityPct}% of your citation mix — that's the lever to pull, since AI weights trusted domains far more heavily than long-tail blog mentions.`
      : insights.engineCount < 4
        ? `Only ${insights.engineCount} of 4 engines are citing any source for you, which means ${4 - insights.engineCount} engine${4 - insights.engineCount === 1 ? " is" : "s are"} answering questions about ${business.name} without naming you at all.`
        : `${insights.uniqueDomains} cited domain${insights.uniqueDomains === 1 ? "" : "s"} is a ${profileWord} authority footprint — broaden the source mix so a single domain change can't tank your visibility.`;
    const s3 = insights.engineCount === 4
      ? `Every tracked AI engine is pulling at least one citation for you, so coverage is intact across the board — the work from here is depth, not breadth.`
      : insights.highAuthorityPct >= 50
        ? `High-authority sources still make up ${insights.highAuthorityPct}% of your mix, and that signal alone gives AI strong evidence to keep citing you over competitors.`
        : `You're earning citations on ${insights.uniqueDomains} distinct domain${insights.uniqueDomains === 1 ? "" : "s"} — every additional source compounds, since AI weights cross-source corroboration.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (!insights || !insights.topDomain) {
      return { label: "Open Website Audit to start earning citations", href: "/audit" };
    }
    if (insights.highAuthorityPct < 40) {
      return { label: "Open Website Audit to earn high-authority citations", href: "/audit" };
    }
    return { label: "Open Website Audit to broaden your citation footprint", href: "/audit" };
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

          {/* Right col — action panel. items-end pushes the fixed-width
              NextScanCard (320px) to the right edge of its column so it
              hugs the page's right margin. */}
          <div className="flex flex-col gap-2 items-end">
            <NextScanCard />
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

            {/* All Cited Domains table — moved above the KPI cards so the
                full domain list is the first thing the user sees, with
                the summary metrics framing it below. */}
            <motion.div {...reveal}>
              <CitedDomainsTable results={results} />
            </motion.div>

            {/* KPI cards — full width now that the FixActions side panel
                ("4 ways to strengthen your sources") was removed. */}
            <div className="flex flex-col gap-4 min-w-0">
                {insights && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    {(() => {
                      // Stat strip layout — Citation Rate | Authority
                      // Breakdown (compact donut) | Unique Sources. The
                      // middle card replaces the previous "Authority Mix"
                      // CleanStatCard with the full AuthorityBreakdown
                      // donut visualization, restyled to match the
                      // CleanStatCard chrome so all three slots share the
                      // same height and rhythm.
                      const citationCard: CleanStatCardSpec = {
                        icon: Link2,
                        label: "Citation Rate",
                        hint:
                          "Share of AI responses about you that include a cited source. 50%+ is strong; under 25% means AI engines are answering without grounding their claims.",
                        value: `${insights.citationRate}%`,
                        sub: `${insights.totalCitations} total citations`,
                        gauge: { type: "citation", pct: insights.citationRate, size: "lg" },
                        bottomLine:
                          insights.citationRate >= 45
                            ? { icon: CheckCircle2, text: "Strong grounding — AI is backing claims about you with named sources", tone: "good" }
                            : insights.citationRate >= 20
                              ? { icon: TrendingUp, text: "Push high-authority sources to lift this past 45% — fastest credibility gain", tone: "warn" }
                              : { icon: AlertTriangle, text: "Below 20% — AI is answering without sources, hurting trust signals", tone: "warn" },
                        cta: { label: "See prompts", href: "/prompts#prompts-table" },
                      };
                      // Per-engine source mini bar chart — fills the
                      // right slot of the Unique Sources card so the
                      // "Across N engines" subline gets a visual
                      // breakdown. Bars are colored with each engine's
                      // brand hue + scaled to the leader engine.
                      const engineMax = Math.max(
                        1,
                        ...insights.enginesSourceCounts.map((e) => e.count),
                      );
                      // On-brand palette — pulled from SURVEN_CATEGORICAL
                      // (citationAuthority.ts) so engines slot into the
                      // same earthy sage/rust/slate/gold tones every
                      // other chart on the site uses, instead of the
                      // engines' loud OEM brand colors.
                      const ENGINE_COLOR: Record<string, string> = {
                        chatgpt: "#7D8E6C",
                        claude: "#B54631",
                        gemini: "#5B7BAB",
                        google_ai: "#C9A95B",
                      };
                      const sourcesCard: CleanStatCardSpec = {
                        icon: Database,
                        label: "Unique Sources",
                        hint:
                          "How many different sources AI engines pulled from when describing you. More variety means broader trust — under 5 sources signals a thin authority footprint.",
                        value: `${insights.uniqueDomains}`,
                        sub: `Across ${insights.engineCount} ${insights.engineCount === 1 ? "engine" : "engines"}`,
                        rightSlot: (
                          <div
                            className="flex flex-col gap-2"
                            style={{ width: 230 }}
                            aria-label="Unique sources per engine"
                          >
                            <p
                              className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
                              style={{
                                fontSize: 10,
                                letterSpacing: "0.08em",
                              }}
                            >
                              Sources per engine
                            </p>
                            <div className="flex items-end justify-between gap-2">
                              {insights.enginesSourceCounts.map((e) => {
                                const color = ENGINE_COLOR[e.id] ?? "#5E7250";
                                const MAX_BAR = 92;
                                const MIN_BAR = 18;
                                // Fixed pixel height so the bar renders
                                // reliably — percentage heights collapse
                                // to 0 inside flex-col children whose
                                // parent uses items-end (no stretch).
                                const heightPx = Math.max(
                                  MIN_BAR,
                                  Math.round((e.count / engineMax) * MAX_BAR),
                                );
                                return (
                                  <div
                                    key={e.id}
                                    className="flex flex-col items-center gap-2"
                                    title={`${e.name}: ${e.count} unique sources`}
                                  >
                                    <span
                                      className="tabular-nums font-bold"
                                      style={{
                                        fontSize: 15,
                                        lineHeight: 1,
                                        color,
                                        letterSpacing: "-0.02em",
                                      }}
                                    >
                                      {e.count}
                                    </span>
                                    <div
                                      className="rounded-lg transition-all"
                                      style={{
                                        width: 36,
                                        height: heightPx,
                                        backgroundColor: color,
                                        boxShadow: `0 2px 8px ${color}40`,
                                      }}
                                    />
                                    <div
                                      className="rounded-full flex items-center justify-center"
                                      style={{
                                        width: 30,
                                        height: 30,
                                        backgroundColor: `${color}26`,
                                      }}
                                    >
                                      <EngineIcon id={e.id} size={16} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Overlap explainer — bars sum higher than
                                the unique total because the same domain
                                cited by multiple engines counts in each
                                engine's bar but only once in the total. */}
                            <p
                              className="text-[var(--color-fg-muted)] italic"
                              style={{
                                fontSize: 10.5,
                                lineHeight: 1.4,
                              }}
                            >
                              Bars sum higher than {insights.uniqueDomains} —
                              engines often cite the same source, so a shared
                              domain counts once in the total but in each
                              engine's bar.
                            </p>
                          </div>
                        ),
                        bottomLine:
                          insights.uniqueDomains >= 8
                            ? { icon: CheckCircle2, text: "Diverse footprint — no single source can tank visibility", tone: "good" }
                            : insights.uniqueDomains >= 5
                              ? { icon: TrendingUp, text: "Broaden the source mix — earn 3+ more domain placements", tone: "warn" }
                              : { icon: AlertTriangle, text: "Thin footprint — get listed on directories + earn editorial mentions", tone: "warn" },
                      };
                      return (
                        <>
                          <CleanStatCard spec={citationCard} />
                          <AuthorityBreakdown
                            results={results}
                            variant="compact"
                          />
                          <CleanStatCard spec={sourcesCard} />
                        </>
                      );
                    })()}
                  </motion.div>
                )}

            </div>

            {/* Citation Gap Analysis — now consolidates the previous
                "What to watch" + "What's working" diagnostic bands as
                inline headlines above each panel (gap + listed). */}
            <motion.div {...reveal}>
              <CitationGapSection
                results={results}
                businessName={business.name}
              />
            </motion.div>

            <motion.div
              {...reveal}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch"
            >
              <SourceCategoryBreakdown results={results} />
              <CitationsByEngine results={results} />
            </motion.div>
          </>
        )}

        <BetaFeedbackFooter />
      </div>
    </DashboardLayout>
  );
}
