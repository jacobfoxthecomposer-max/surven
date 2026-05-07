"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Crown,
  Target,
  Trash2,
  Undo2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { NextScanCard } from "@/components/atoms/NextScanCard";
import { TimeRangeDropdown, type TimeRangeKey } from "@/components/atoms/TimeRangeDropdown";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { promptLimit, planLabel, type Plan } from "@/utils/plans";
import { generatePromptResearchData } from "@/features/prompt-research/mockData";
import { IntentsTable } from "@/features/prompt-research/IntentsTable";
import { CustomPromptsSection } from "@/features/prompt-research/CustomPromptsSection";
import { PromptResearchStrip } from "@/features/prompt-research/PromptResearchStrip";
import {
  addUserTrackedPrompt,
  removeUserTrackedPrompt,
} from "@/utils/userTrackedPrompts";
import {
  INTENT_LABEL,
  INTENT_COLOR,
} from "@/features/prompt-research/taxonomy";
import { AI_MODELS } from "@/utils/constants";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { Intent } from "@/features/prompt-research/types";

type TimeRange = "14d" | "30d" | "90d" | "ytd" | "all";

// Rolling-window entry shown in the "Recently Deleted Prompts" rail
// directly below the Currently Tracked Prompts box. Persisted to
// localStorage; capped at 5 (oldest evicted on overflow).
type RecentlyDeleted = {
  id: string;
  canonical: string;
  intentType: Intent["intentType"];
  variantCount: number;
  /** Epoch ms — used for "x min ago" rendering. */
  removedAt: number;
};

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease },
} as const;

const SAGE = "#5E7250";
const SAGE_BG = "rgba(150,162,131,0.18)";
const RUST = "#B54631";
const RUST_BG = "rgba(181,70,49,0.12)";

export default function PromptResearchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { plan } = useUserProfile();
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

  // Local override layer over the mock dataset's `inTracker` flag, so
  // Send-to-Tracker and Remove-from-Tracker actions reflect immediately
  // in both the Recommended Prompts table and the Currently Tracked
  // Prompts table without waiting on a real API round-trip. Declared
  // here (above `insights`) so the memo can read it directly.
  const [trackerOverrides, setTrackerOverrides] = useState<Map<string, boolean>>(
    () => new Map(),
  );

  // Rolling window of the 5 most recently removed prompts. Persisted in
  // localStorage so the section survives reloads and remembers across
  // sessions. Newest first; cap at 5 — oldest entry drops on the 6th add.
  const [recentlyDeleted, setRecentlyDeleted] = useState<RecentlyDeleted[]>(
    [],
  );

  // Hydrate from localStorage on mount (client only). Scoped to the
  // active business so switching businesses shows the right history.
  useEffect(() => {
    if (!business?.id) return;
    try {
      const raw = localStorage.getItem(`surven:recently-deleted:${business.id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as RecentlyDeleted[];
        if (Array.isArray(parsed)) setRecentlyDeleted(parsed.slice(0, 5));
      }
    } catch {
      /* ignore — corrupted JSON or no storage */
    }
  }, [business?.id]);

  const insights = useMemo(() => {
    if (!data) return null;
    // Use override-aware intents so the strip + themes update instantly
    // when user sends to / removes from Tracker.
    const intents = data.intents.map((i) =>
      trackerOverrides.has(i.id)
        ? { ...i, inTracker: trackerOverrides.get(i.id)! }
        : i,
    );
    const totalVariants = intents.reduce((acc, i) => acc + i.variants.length, 0);
    const avgCoverage =
      intents.length > 0
        ? Math.round(
            intents.reduce((acc, i) => acc + i.overallCoverage, 0) / intents.length
          )
        : 0;
    const trackedCount = intents.filter((i) => i.inTracker).length;
    const untrackedCount = intents.length - trackedCount;
    const untrackedAvgCoverage =
      untrackedCount > 0
        ? Math.round(
            intents
              .filter((i) => !i.inTracker)
              .reduce((acc, i) => acc + i.overallCoverage, 0) / untrackedCount
          )
        : 0;

    // Per-engine "did this engine cover at least one researched intent
    // for you?" signal — drives the engineHits row on the Intents Tracked
    // CleanStatCard so users see which engines are returning research data.
    const enginesWithCoverage: Record<string, boolean> = {};
    for (const m of AI_MODELS) {
      enginesWithCoverage[m.id] = intents.some((i) =>
        i.variants.some((v) => (v.coverage[m.id as keyof typeof v.coverage] ?? 0) > 0),
      );
    }

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
      untrackedCount,
      untrackedAvgCoverage,
      enginesWithCoverage,
      strongest,
      weakest,
    };
  }, [data, trackerOverrides]);

  const handleSendToTracker = (selectedIds: string[]) => {
    // Selection is now a flat set of items — each checked box = 1
    // prompt sent (whether it's a top-level intent or a single variant
    // beneath one). No more implicit "checking the intent sends all
    // variants" rollup.
    setTrackerOverrides((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) next.set(id, true);
      return next;
    });
    // Persist to localStorage so /prompts (Tracked Prompts page) can pick
    // these up too. Bridge stays here until a real Supabase
    // tracked_prompts table lands — same call shape, swap implementation.
    if (data?.intents) {
      const lookup = new Map(data.intents.map((i) => [i.id, i]));
      const addedAt = new Date().toISOString();
      for (const id of selectedIds) {
        const intent = lookup.get(id);
        if (!intent) continue;
        addUserTrackedPrompt({
          id: intent.id,
          canonical: intent.canonical,
          intentType: intent.intentType,
          variantCount: intent.variants.length,
          addedAt,
          source: "prompt-research",
        });
      }
    }
    setToast(
      `Sent ${selectedIds.length} prompt${selectedIds.length === 1 ? "" : "s"} to Tracker.`
    );
    setTimeout(() => setToast(null), 4000);
  };

  const handleRemoveFromTracker = (intentId: string) => {
    // Capture the row's metadata before it disappears from the tracker
    // so the Recently Deleted section can show it.
    const target = data?.intents.find((i) => i.id === intentId);
    if (target) {
      const entry: RecentlyDeleted = {
        id: intentId,
        canonical: target.canonical,
        intentType: target.intentType,
        variantCount: target.variants.length,
        removedAt: Date.now(),
      };
      setRecentlyDeleted((prev) => {
        const filtered = prev.filter((p) => p.id !== intentId);
        const next = [entry, ...filtered].slice(0, 5);
        if (business?.id) {
          try {
            localStorage.setItem(
              `surven:recently-deleted:${business.id}`,
              JSON.stringify(next),
            );
          } catch {
            /* storage unavailable — non-fatal */
          }
        }
        return next;
      });
    }
    setTrackerOverrides((prev) => {
      const next = new Map(prev);
      next.set(intentId, false);
      return next;
    });
    // Mirror the removal to the cross-page localStorage layer so the
    // /prompts table reflects it too.
    removeUserTrackedPrompt(intentId);
    setToast("Removed from Tracker.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleRestoreDeleted = (intentId: string) => {
    setTrackerOverrides((prev) => {
      const next = new Map(prev);
      next.set(intentId, true);
      return next;
    });
    // Restore puts the prompt back on /prompts too.
    const target = data?.intents.find((i) => i.id === intentId);
    if (target) {
      addUserTrackedPrompt({
        id: target.id,
        canonical: target.canonical,
        intentType: target.intentType,
        variantCount: target.variants.length,
        addedAt: new Date().toISOString(),
        source: "prompt-research",
      });
    }
    setRecentlyDeleted((prev) => {
      const next = prev.filter((p) => p.id !== intentId);
      if (business?.id) {
        try {
          localStorage.setItem(
            `surven:recently-deleted:${business.id}`,
            JSON.stringify(next),
          );
        } catch {
          /* ignore */
        }
      }
      return next;
    });
    setToast("Restored to Tracker.");
    setTimeout(() => setToast(null), 3000);
  };

  // Apply local overrides on top of the mock data so inTracker reflects
  // the user's session actions.
  const intentsWithOverrides = useMemo(() => {
    if (!data) return [];
    return data.intents.map((i) =>
      trackerOverrides.has(i.id)
        ? { ...i, inTracker: trackerOverrides.get(i.id)! }
        : i,
    );
  }, [data, trackerOverrides]);

  const trackedIntents = useMemo(
    () => intentsWithOverrides.filter((i) => i.inTracker),
    [intentsWithOverrides],
  );

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

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        {/* ===== HERO — headline + explainer + control row (left 2/3),
             NextScanCard (right 1/3). Mirrors the /prompts hero pattern
             so the two pages read as a matched set. ===== */}
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
              <p
                className="text-[var(--color-fg-muted)] mt-2"
                style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}
              >
                <strong className="text-[var(--color-fg)] font-semibold">
                  Why is this important?
                </strong>{" "}
                Prompt research surfaces every variation of every customer
                question we can find in your category — even the ones you
                aren&apos;t tracking yet. Each researched intent is a future
                tracked prompt and a future answer you could be winning.
              </p>
            </div>

            {/* Filter row — same TimeRangeDropdown + engine chips pattern
                as the /prompts page so the two pages share controls. */}
            <div className="flex flex-wrap items-center gap-2">
              <TimeRangeDropdown
                value={timeRange as TimeRangeKey}
                onChange={(key) => setTimeRange(key as typeof timeRange)}
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

              {/* Tracker capacity widget — sits inline at the right of
                  the engine chips so the user always sees their slot
                  budget while filtering. Compact horizontal bar with
                  gradient fill (color shifts as fill grows), tracked
                  count under the fill end, and plan cap under the bar
                  right. */}
              <div className="ml-auto">
                {data && (
                  <TrackerQuotaCard
                    trackedCount={
                      data.intents.filter((i) =>
                        trackerOverrides.has(i.id)
                          ? trackerOverrides.get(i.id)
                          : i.inTracker,
                      ).length
                    }
                    plan={plan}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <NextScanCard />
          </div>
        </motion.div>

        <div className="border-t border-[var(--color-border)]" />

        {!data || !insights ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* ===== RECOMMENDED PROMPTS — primary discovery surface.
                 Same reasoning as /prompts: lead with the data, frame
                 it with summary metrics below. ===== */}
            <motion.div {...reveal} id="intents-table" className="scroll-mt-6">
              <IntentsTable
                intents={intentsWithOverrides}
                onSendToTracker={handleSendToTracker}
                industry={business.industry}
                city={business.city}
                state={business.state}
              />
            </motion.div>

            {/* ===== CURRENTLY TRACKED PROMPTS — same chrome as
                 Recommended Prompts but pre-filtered to inTracker only,
                 with a Remove (X) action per row. ===== */}
            <motion.div {...reveal}>
              <TrackedPromptsBox
                intents={trackedIntents}
                onRemove={handleRemoveFromTracker}
              />
            </motion.div>

            {/* ===== RECENTLY DELETED PROMPTS — thin red rail showing
                 the rolling 5-most-recently-removed prompts. Sits
                 directly under the Currently Tracked box. Restore
                 (Undo) brings a prompt back into the Tracker. ===== */}
            {recentlyDeleted.length > 0 && (
              <motion.div {...reveal}>
                <RecentlyDeletedPromptsRail
                  entries={recentlyDeleted}
                  onRestore={handleRestoreDeleted}
                />
              </motion.div>
            )}

            {/* ===== STAT STRIP — 4 visually-rich research-relevant cards:
                 coverage distribution, top untracked win, per-engine
                 coverage gap, and branded vs unbranded split. Each carries
                 its own inline visual (stacked bar / hero card / mini
                 bars / split donut). ===== */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease }}
            >
              <PromptResearchStrip
                intents={intentsWithOverrides}
                onTrack={(id) => handleSendToTracker([id])}
              />
            </motion.div>


            {/* ===== CUSTOM PROMPTS — Premium-gated user-defined prompt
                 library, separate from the researched set. ===== */}
            <motion.div {...reveal}>
              <CustomPromptsSection businessId={business.id} />
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

        <BetaFeedbackFooter />
      </div>
    </DashboardLayout>
  );
}

// ─── TRACKER QUOTA CARD ────────────────────────────────────────────────────
// Compact card under Recommended Prompts: shows current/limit + plan
// label + progress bar, with a glowing upgrade CTA on the right.
// Sage->amber tinted card, animated boxShadow on the CTA so it draws
// the eye without being aggressive.

function TrackerQuotaCard({
  trackedCount,
  plan,
}: {
  trackedCount: number;
  plan: Plan;
}) {
  const limit = promptLimit(plan);
  const planName = planLabel(plan);
  const pct = limit > 0 ? Math.min(100, (trackedCount / limit) * 100) : 0;

  // Next-tier upgrade target — Trial → Plus, Plus → Premium. Premium /
  // Admin users hit a "you're on the highest tier" state instead of an
  // upgrade nudge.
  const upgradeTarget =
    plan === "free"
      ? { plan: "Plus", limit: promptLimit("plus") }
      : plan === "plus"
        ? { plan: "Premium", limit: promptLimit("premium") }
        : null;

  // Pick the dominant fill color from the gradient ring at the current
  // pct — sage when comfortable, gold mid, amber past 70%, rust near
  // cap. Used for the count number's color so the value reads in the
  // same hue the bar's tip is showing.
  const tipColor =
    pct >= 90
      ? "#B54631"
      : pct >= 70
        ? "#C97B45"
        : pct >= 40
          ? "#C9A95B"
          : "#7D8E6C";

  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 py-2.5 flex flex-col"
      style={{ minWidth: 380 }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
          style={{ fontSize: 9.5, letterSpacing: "0.08em" }}
        >
          Tracker capacity · {planName}
        </span>
        {upgradeTarget ? (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors group"
            style={{ fontSize: 11, fontWeight: 600 }}
            title={`Upgrade to ${upgradeTarget.plan} for ${upgradeTarget.limit} prompts`}
          >
            <Crown className="h-3 w-3" />
            Upgrade
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[#5E7250]"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            <Crown className="h-3 w-3" />
            Top tier
          </span>
        )}
      </div>

      {/* Bar scales 0 → plan cap. Fill reveals a single sage→gold→amber
          →rust gradient that's stretched across the full bar so the
          visible color shifts with where the fill ends. The plan cap is
          marked with a vertical tick at the right edge; the current
          tracked count sits below the fill's end. */}
      <div className="relative" style={{ paddingBottom: 18 }}>
        <div
          className="h-2.5 rounded-full overflow-hidden relative"
          style={{ backgroundColor: "var(--color-border)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              // Gradient stretched across the whole bar — using
              // backgroundSize 100%/100% so the visible gradient is
              // proportional to the fill (tip color shifts with usage).
              backgroundImage:
                "linear-gradient(90deg, #5E7250 0%, #7D8E6C 25%, #C9A95B 60%, #C97B45 85%, #B54631 100%)",
              backgroundSize: `${100 / Math.max(pct, 0.1) * 100}% 100%`,
              backgroundPosition: "left center",
              backgroundRepeat: "no-repeat",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Cap tick at the right end of the bar — marks the plan max. */}
          <span
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 rounded-sm"
            style={{
              right: 0,
              width: 2,
              height: 12,
              backgroundColor: "var(--color-fg)",
              opacity: 0.55,
            }}
          />
        </div>
        {/* Number under fill end — the current tracked count, anchored
            to where the fill stops. */}
        <span
          className="absolute tabular-nums font-bold"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            color: tipColor,
            top: 14,
            left: `${pct}%`,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          {trackedCount}
        </span>
        {/* Number under the bar's right end — the plan cap. */}
        <span
          className="absolute tabular-nums font-bold text-[var(--color-fg)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            top: 14,
            right: 0,
            transform: pct > 88 ? "translateX(0)" : "translateX(50%)",
            whiteSpace: "nowrap",
          }}
        >
          {limit}
        </span>
      </div>
    </div>
  );
}

// ─── RECENTLY DELETED PROMPTS ─────────────────────────────────────────────
// Thin rail with red/rust visual cues that appears under the Currently
// Tracked Prompts box once the user has removed at least one prompt.
// Holds the 5 most-recently-deleted entries; clicking the Undo button
// restores a prompt back into the Tracker.

function RecentlyDeletedPromptsRail({
  entries,
  onRestore,
}: {
  entries: RecentlyDeleted[];
  onRestore: (id: string) => void;
}) {
  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden"
      style={{
        borderColor: "rgba(181,70,49,0.32)",
        borderLeftWidth: 3,
        borderLeftColor: RUST,
      }}
    >
      <header
        className="flex items-center justify-between gap-3 px-5 py-2.5"
        style={{
          background: "linear-gradient(90deg, rgba(181,70,49,0.10) 0%, rgba(181,70,49,0.02) 100%)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Trash2 className="h-3.5 w-3.5 shrink-0" style={{ color: RUST }} />
          <h3
            className="uppercase tracking-wider"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              fontWeight: 700,
              color: RUST,
              fontFamily: "var(--font-sans)",
            }}
          >
            Recently Deleted Prompts
          </h3>
          <span
            className="tabular-nums"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(181,70,49,0.75)",
            }}
          >
            · {entries.length} of 5
          </span>
        </div>
        <span
          className="text-[var(--color-fg-muted)] hidden sm:inline"
          style={{ fontSize: 11 }}
        >
          Rolling window — oldest drops on the next removal.
        </span>
      </header>

      <ul
        className="divide-y"
        style={{ borderColor: "rgba(181,70,49,0.18)" }}
      >
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-3 px-5 py-2 group transition-colors"
            style={{ borderColor: "rgba(181,70,49,0.18)" }}
          >
            <Trash2
              className="h-3 w-3 shrink-0 opacity-50"
              style={{ color: RUST }}
            />
            <span
              className="flex-1 truncate text-[var(--color-fg-secondary)]"
              style={{
                fontSize: 13,
                textDecoration: "line-through",
                textDecorationColor: "rgba(181,70,49,0.55)",
                textDecorationThickness: "1px",
              }}
              title={e.canonical}
            >
              {e.canonical}
            </span>
            <span
              className="hidden md:inline-flex items-center gap-1 rounded-full whitespace-nowrap shrink-0 tabular-nums"
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "rgba(181,70,49,0.85)",
                backgroundColor: "rgba(181,70,49,0.10)",
                border: "1px solid rgba(181,70,49,0.30)",
                padding: "2px 7px",
                letterSpacing: "0.02em",
              }}
            >
              {e.variantCount} variants
            </span>
            <span
              className="text-[var(--color-fg-muted)] tabular-nums shrink-0 hidden md:inline"
              style={{ fontSize: 11 }}
            >
              {timeAgo(e.removedAt)}
            </span>
            <button
              type="button"
              onClick={() => onRestore(e.id)}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] transition-all hover:brightness-95 shrink-0"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: RUST,
                backgroundColor: "rgba(181,70,49,0.10)",
                border: "1px solid rgba(181,70,49,0.40)",
                padding: "3px 9px",
                fontFamily: "var(--font-sans)",
              }}
              title="Restore this prompt to the Tracker"
            >
              <Undo2 className="h-3 w-3" />
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── CURRENTLY TRACKED PROMPTS ─────────────────────────────────────────────
// Mirror of the Recommended Prompts table chrome but pre-filtered to
// `inTracker === true` rows and with a Remove (X) action per row in
// place of the bulk Send-to-Tracker workflow. Keeps the same sticky
// thead + sortable headers + footer pagination as the rest of the
// site's tables so the two sections feel like one system.

function TrackedPromptsBox({
  intents,
  onRemove,
}: {
  intents: Intent[];
  onRemove: (id: string) => void;
}) {
  return (
    <section
      id="tracked-prompts-table"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] scroll-mt-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-3 px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              fontWeight: 500,
              color: "var(--color-fg)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            Currently Tracked Prompts
          </h2>
          <SectionHeading
            text=""
            info="Every intent currently in your weekly Tracker scan. Click the X on any row to remove it from your Tracker — slots free up immediately and the prompt drops out of the next scan."
          />
        </div>
        <div className="justify-self-center">
          <span
            className="text-[var(--color-fg-muted)] tabular-nums"
            style={{ fontSize: 13 }}
          >
            <span className="font-semibold text-[var(--color-fg)]">
              {intents.length}
            </span>{" "}
            prompt{intents.length === 1 ? "" : "s"} in your weekly scan
          </span>
        </div>
        <div className="justify-self-end" />
      </div>

      {intents.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div
            className="inline-flex h-10 w-10 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: "rgba(150,162,131,0.18)" }}
          >
            <Target className="h-5 w-5" style={{ color: "#5E7250" }} />
          </div>
          <p
            className="font-semibold text-[var(--color-fg)]"
            style={{ fontSize: 14, lineHeight: 1.3 }}
          >
            No prompts in your Tracker yet
          </p>
          <p
            className="text-[var(--color-fg-muted)] mt-1"
            style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: 360, marginInline: "auto" }}
          >
            Pick prompts from Recommended Prompts above and click{" "}
            <strong className="text-[var(--color-fg-secondary)]">
              Send to Tracker
            </strong>{" "}
            to start monitoring them weekly.
          </p>
        </div>
      ) : (
        <TrackedPromptsTable intents={intents} onRemove={onRemove} />
      )}
    </section>
  );
}

function TrackedPromptsTable({
  intents,
  onRemove,
}: {
  intents: Intent[];
  onRemove: (id: string) => void;
}) {
  const PAGE_OPTIONS = [10, 20, 50, "all"] as const;
  type PageOpt = (typeof PAGE_OPTIONS)[number];
  const [pageSize, setPageSize] = useState<PageOpt>(10);

  const sorted = useMemo(
    () => intents.slice().sort((a, b) => b.importance - a.importance),
    [intents],
  );
  const visible = pageSize === "all" ? sorted : sorted.slice(0, pageSize);

  return (
    <>
      <div
        className="px-6 pb-4 pt-4 overflow-y-auto overflow-x-auto"
        style={{ maxHeight: 720 }}
      >
        <table
          className="w-full"
          style={{
            fontSize: 13,
            tableLayout: "fixed",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <colgroup>
            <col style={{ width: 90 }} />
            <col />
            <col style={{ width: 150 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr>
              {[
                { label: "Remove", align: "left" as const },
                { label: "Prompt", align: "left" as const },
                { label: "Intent", align: "left" as const },
                { label: "Variants", align: "right" as const },
                { label: "Importance", align: "right" as const },
              ].map((h) => (
                <th
                  key={h.label}
                  className={
                    "py-3 px-4 " +
                    (h.align === "right" ? "text-right" : "text-left")
                  }
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    backgroundColor: "var(--color-surface)",
                    boxShadow: "inset 0 -2px 0 rgba(60,62,60,0.22)",
                  }}
                >
                  <span
                    className="inline-flex items-center font-semibold uppercase text-[var(--color-fg-muted)]"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {h.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => {
              const intColor = INTENT_COLOR[i.intentType];
              return (
                <tr
                  key={i.id}
                  className="hover:bg-[var(--color-surface-alt)]/40 transition-colors [&>td]:[border-bottom:1.5px_solid_rgba(60,62,60,0.18)]"
                >
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => onRemove(i.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-white hover:bg-[#B54631] hover:border-[#B54631] transition-colors"
                      aria-label={`Remove ${i.canonical} from Tracker`}
                      title="Remove from Tracker"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className="block truncate text-[var(--color-fg)] font-semibold"
                      style={{ fontSize: 13 }}
                      title={i.canonical}
                    >
                      &ldquo;{i.canonical}&rdquo;
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: intColor,
                        backgroundColor: `${intColor}26`,
                      }}
                    >
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 5,
                          height: 5,
                          backgroundColor: intColor,
                        }}
                      />
                      {INTENT_LABEL[i.intentType]}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className="tabular-nums text-[var(--color-fg-secondary)]"
                      style={{ fontSize: 13 }}
                    >
                      {i.variants.length}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className="tabular-nums text-[var(--color-fg)]"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {i.importance}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[var(--color-border)]">
        <p
          className="text-[var(--color-fg-muted)] tabular-nums"
          style={{ fontSize: 12 }}
        >
          Showing{" "}
          <span className="font-semibold text-[var(--color-fg)]">
            {visible.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-fg)]">
            {sorted.length}
          </span>{" "}
          tracked prompt{sorted.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.08em" }}
          >
            Show
          </span>
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5 gap-0.5">
            {PAGE_OPTIONS.map((opt) => {
              const active = pageSize === opt;
              const label = opt === "all" ? "All" : String(opt);
              return (
                <button
                  key={String(opt)}
                  onClick={() => setPageSize(opt)}
                  className={
                    "px-2.5 py-0.5 rounded transition-colors font-medium " +
                    (active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-sans)",
                    cursor: active ? "default" : "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
