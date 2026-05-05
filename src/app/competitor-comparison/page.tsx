"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, ChevronDown, GitCompare, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { CompetitorHero } from "@/features/competitor-comparison/CompetitorHero";
import { VisibilityLeaderboard } from "@/features/competitor-comparison/VisibilityLeaderboard";
import { CompetitorVisibilityChart } from "@/features/competitor-comparison/CompetitorVisibilityChart";
import { PromptClusterDominance } from "@/features/competitor-comparison/PromptClusterDominance";
import { CompetitorFixActions } from "@/features/competitor-comparison/CompetitorFixActions";
import { CompetitorRankChart } from "@/features/competitor-comparison/CompetitorRankChart";
import { CompetitorShareOfVoiceChart } from "@/features/competitor-comparison/CompetitorShareOfVoiceChart";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { AI_MODELS, COMPETITOR_PALETTE } from "@/utils/constants";

type TimeRange = "14d" | "30d" | "90d" | "ytd" | "all" | "custom";
const TIME_RANGES: { key: Exclude<TimeRange, "custom">; label: string }[] = [
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

// "May 3" / "May 3, 2025" — drop the year only when the date is in the
// current calendar year so labels stay compact for in-year ranges.
function fmtCustomDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

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
  const [timeRange, setTimeRange] = useState<TimeRange>("90d");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>(daysAgoIso(30));
  const [customTo, setCustomTo] = useState<string>(todayIso());
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);
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

  // Close the time-range dropdown when the user clicks anywhere outside it.
  useEffect(() => {
    if (!rangeMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (
        rangeMenuRef.current &&
        !rangeMenuRef.current.contains(e.target as Node)
      ) {
        setRangeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [rangeMenuOpen]);

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

  const buildAISummary = (): string => {
    if (!hasResults) {
      return `No competitor scan data yet for ${business.name}. Once a scan runs, this panel surfaces where rivals are leading and which gaps close fastest.`;
    }
    const gap = avgCompetitorScore - score;
    const leading = score >= avgCompetitorScore;
    const s1 = leading
      ? `You're ahead at ${score}% visibility — ${Math.abs(gap)}% above the ${competitorNames.length}-competitor average. Defend that lead by keeping fresh content flowing on the prompts where rivals are starting to creep up.`
      : `You sit at ${score}% visibility, ${Math.abs(gap)}% behind the ${competitorNames.length}-competitor average — that's a closeable gap if you focus on the intent categories where one rival owns disproportionate share.`;
    const s2 = `Across ${competitorNames.length} tracked competitor${competitorNames.length === 1 ? "" : "s"}, the brands publishing more frequently on high-volume prompts are quietly compounding mention share — every week they're cited and you're not is a lead they take from you.`;
    const s3 = leading
      ? `One thing to watch: the runner-up is closer than they look on engines where you're weakest — defend by widening your citation footprint on those models.`
      : `One bright spot: no rival is dominant across every engine, so the gap closes quickly when you ship targeted fixes.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (!hasResults) {
      return { label: "Run a site audit to start tracking competitors", href: "/site-audit" };
    }
    return { label: "Run a site audit to close the biggest competitive gap", href: "/site-audit" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" id="competitor-dashboard">
        <AISummaryGenerator getSummary={buildAISummary} getCTA={buildAICTA} />
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
              {/* Time-range dropdown — collapsed pill cluster + Custom into a
                  single button. Hover shows a tooltip; click opens a menu of
                  every range. */}
              <div className="relative" ref={rangeMenuRef}>
                <button
                  type="button"
                  onClick={() => setRangeMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={rangeMenuOpen}
                  title="Adjust the time window for every chart on this page"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-fg-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors"
                  style={{ fontSize: 14 }}
                >
                  <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                  {timeRange === "custom"
                    ? `${fmtCustomDate(customFrom)} – ${fmtCustomDate(customTo)}`
                    : (TIME_RANGES.find((r) => r.key === timeRange)?.label ??
                      "All")}
                  <ChevronDown
                    className={
                      "h-3.5 w-3.5 text-[var(--color-fg-muted)] transition-transform " +
                      (rangeMenuOpen ? "rotate-180" : "")
                    }
                  />
                </button>

                {rangeMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1.5 z-20 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-1"
                  >
                    {TIME_RANGES.map(({ key, label }) => {
                      const active = timeRange === key;
                      return (
                        <button
                          key={key}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setTimeRange(key);
                            setCustomFormOpen(false);
                            setRangeMenuOpen(false);
                          }}
                          className={
                            "w-full text-left px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-colors " +
                            (active
                              ? "bg-[var(--color-primary)] text-white"
                              : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                          }
                          style={{ fontSize: 14 }}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <div className="my-1 border-t border-[var(--color-border)]" />
                    <button
                      role="menuitem"
                      onClick={() => setCustomFormOpen((o) => !o)}
                      aria-expanded={customFormOpen}
                      className={
                        "w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-colors " +
                        (timeRange === "custom"
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                      }
                      style={{ fontSize: 14 }}
                    >
                      <Calendar className="h-3.5 w-3.5" /> Custom range
                      <ChevronDown
                        className={
                          "h-3.5 w-3.5 ml-auto transition-transform " +
                          (customFormOpen ? "rotate-180" : "")
                        }
                      />
                    </button>

                    {customFormOpen && (
                      <div className="px-2 pt-2 pb-1.5 space-y-2 border-t border-[var(--color-border)] mt-1">
                        <label className="block">
                          <span
                            className="block text-[var(--color-fg-muted)] mb-1 uppercase tracking-wider"
                            style={{ fontSize: 10, fontWeight: 600 }}
                          >
                            From
                          </span>
                          <input
                            type="date"
                            value={customFrom}
                            max={customTo || todayIso()}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] tabular-nums"
                            style={{ fontSize: 13 }}
                          />
                        </label>
                        <label className="block">
                          <span
                            className="block text-[var(--color-fg-muted)] mb-1 uppercase tracking-wider"
                            style={{ fontSize: 10, fontWeight: 600 }}
                          >
                            To
                          </span>
                          <input
                            type="date"
                            value={customTo}
                            min={customFrom || undefined}
                            max={todayIso()}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] tabular-nums"
                            style={{ fontSize: 13 }}
                          />
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={
                              !customFrom ||
                              !customTo ||
                              new Date(customFrom) > new Date(customTo)
                            }
                            onClick={() => {
                              setTimeRange("custom");
                              setCustomFormOpen(false);
                              setRangeMenuOpen(false);
                            }}
                            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-[var(--radius-sm)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            style={{ fontSize: 13 }}
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomFormOpen(false)}
                            className="px-3 py-1.5 rounded-[var(--radius-sm)] font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-alt)] transition-colors"
                            style={{ fontSize: 13 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

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

        {/* Data row — wide left col: visibility-over-time chart on top, then
            the leaderboard below. Narrow right col: just the "Ways to take
            the lead" panel pinned to the top-right corner, full height. */}
        {hasResults && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
              <CompetitorVisibilityChart />
              {/* Half-width split: leaderboard on the left, average-rank
                  chart on the right. items-stretch keeps both bottoms aligned
                  per the locked side-by-side rule. */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <VisibilityLeaderboard
                  results={filteredResults}
                  businessName={business.name}
                  competitors={competitorNames}
                  history={history}
                  plan={plan}
                  totalCompetitorCount={allCompetitorNames.length}
                />
                <CompetitorRankChart
                  results={filteredResults}
                  businessName={business.name}
                  competitors={competitorNames}
                  history={history}
                  plan={plan}
                  totalCompetitorCount={allCompetitorNames.length}
                />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
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
            {/* Cluster dominance (wide) + Share of voice (narrow, donut-only)
                side-by-side. items-stretch keeps both bottoms aligned. */}
            <motion.div
              {...reveal}
              className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4 items-stretch"
            >
              <PromptClusterDominance
                results={filteredResults}
                businessName={business.name}
                competitors={competitorNames}
                industry={business.industry}
              />
              <CompetitorShareOfVoiceChart />
            </motion.div>

            {/* Gaps + Wins now live inside the "Ways to take the lead"
                panel above (CompetitorFixActions), so no separate row here. */}

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
