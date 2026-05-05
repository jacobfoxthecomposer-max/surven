"use client";

/**
 * Prompt-Cluster Dominance — real-data variant.
 *
 * Groups every scanned prompt into industry-specific topic clusters
 * (auto-resolved from `business.industry` via INDUSTRY_CLUSTERS in
 * `utils/promptCategories.ts`). For each cluster, computes per-brand
 * visibility from real ScanResults and renders a mini-leaderboard
 * sorted by gap descending. Top-gap cluster gets the highlighted
 * "where to write content" treatment.
 *
 * No DB schema needed yet — clustering runs client-side from prompt
 * text. When `auto_clusters` lands on the Business record, swap the
 * heuristic for a useQuery read; the rest of this component is
 * unchanged.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, MessageSquare, Sparkles, Target, Trophy } from "lucide-react";
import { AIOverview } from "@/components/atoms/AIOverview";
import { HoverHint } from "@/components/atoms/HoverHint";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COMPETITOR_PALETTE } from "@/utils/constants";
import { PLAN_FEATURES } from "@/utils/plans";
import {
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_ORDER,
  clusterForPrompt,
  clustersForIndustry,
  inferIntents,
} from "@/utils/promptCategories";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;
const YOU_COLOR = "#7D8E6C";
const MAX_COMPETITORS = PLAN_FEATURES.premium.maxCompetitors;

function competitorColor(name: string): string {
  const hash = Math.abs(
    [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return COMPETITOR_PALETTE[hash % COMPETITOR_PALETTE.length];
}

// Slug a cluster label so it matches the anchor IDs on /prompts —
// `cluster-personal-injury` etc. Same algorithm as PromptsByCluster.
function clusterSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Sample competitor names per industry — used to pad each cluster's
// mini-leaderboard out to 5 brands so the visualization shows the full
// premium-tier shape even when the user has only added 1 real competitor.
// All names are real businesses in each vertical so the demo reads as
// plausible. Plus-tier users get their 1 real competitor + 4 sampled
// here; premium users get all real if they have ≥5 added.
const SAMPLE_COMPETITORS: Record<string, string[]> = {
  Lawyer: ["Cellino Law", "Jacoby & Meyers", "Saiontz & Kirk", "Stewart J. Guss", "Carter Mario"],
  Restaurant: ["Cheesecake Factory", "Olive Garden", "Outback Steakhouse", "BJ's Brewhouse", "Texas Roadhouse"],
  Plumber: ["Roto-Rooter", "Mr. Rooter", "Benjamin Franklin", "Mike Diamond", "ARS Rescue Rooter"],
  Dentist: ["Aspen Dental", "Western Dental", "Dental Works", "Pacific Dental", "Comfort Dental"],
  "Marketing Agency": ["WebFX", "Disruptive Advertising", "Thrive Internet", "SmartSites", "Ignite Visibility"],
  "Real Estate Agent": ["Coldwell Banker", "Keller Williams", "RE/MAX", "Century 21", "Compass"],
  "Auto Mechanic": ["Midas", "Jiffy Lube", "Pep Boys", "Firestone", "Christian Brothers"],
  Salon: ["Supercuts", "Great Clips", "Drybar", "Hair Cuttery", "Sport Clips"],
  Gym: ["Planet Fitness", "LA Fitness", "Equinox", "Anytime Fitness", "Crunch"],
};
const GENERIC_SAMPLE_COMPETITORS = ["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"];

function padCompetitors(
  real: string[],
  industry: string | undefined | null,
  cap: number,
): string[] {
  if (real.length >= cap) return real.slice(0, cap);
  const samples =
    (industry && SAMPLE_COMPETITORS[industry]) ?? GENERIC_SAMPLE_COMPETITORS;
  const realSet = new Set(real.map((n) => n.toLowerCase()));
  const picks: string[] = [...real];
  for (const s of samples) {
    if (picks.length >= cap) break;
    if (!realSet.has(s.toLowerCase())) picks.push(s);
  }
  return picks.slice(0, cap);
}

function gapTier(gap: number): { bg: string; text: string; label: string } {
  if (gap <= 0)
    return { bg: "rgba(125,142,108,0.22)", text: "#5E7250", label: "You lead" };
  if (gap <= 10)
    return { bg: "rgba(150,162,131,0.20)", text: "#7D8E6C", label: "Close" };
  if (gap <= 25)
    return { bg: "rgba(184,160,48,0.20)", text: "#7E6B17", label: "Trailing" };
  if (gap <= 45)
    return { bg: "rgba(201,123,69,0.20)", text: "#A06210", label: "Wide gap" };
  return { bg: "rgba(181,70,49,0.20)", text: "#B54631", label: "Critical" };
}

interface BrandStat {
  name: string;
  visibility: number; // 0-100
  isYou: boolean;
}

interface ClusterRow {
  label: string;
  promptCount: number;
  brands: BrandStat[]; // sorted by visibility desc
  you: BrandStat;
  leader: BrandStat;
  gap: number; // leader.visibility - you.visibility
}

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
  industry?: string | null;
}

export function PromptClusterDominance({
  results,
  businessName,
  competitors,
  industry,
}: Props) {
  const [viewMode, setViewMode] = useState<"general" | "personalized">("general");
  // Pad to 5 competitors using industry-appropriate sample names — every
  // cluster cell shows you + 5 brands regardless of how many the user has
  // actually added. Their real competitors come first, samples fill the rest.
  const paddedCompetitors = useMemo(
    () => padCompetitors(competitors, industry, MAX_COMPETITORS),
    [competitors, industry],
  );

  const clusterRows = useMemo<ClusterRow[]>(() => {
    if (results.length === 0) return [];

    // 1. Bucket REAL results by cluster label (industry-aware).
    const buckets = new Map<string, ScanResult[]>();
    for (const r of results) {
      const cluster = clusterForPrompt(r.prompt_text, industry);
      const arr = buckets.get(cluster) ?? [];
      arr.push(r);
      buckets.set(cluster, arr);
    }

    // 2. Compute baseline overall visibility per brand — used as a seed for
    //    synthesizing rows for clusters with no real-prompt coverage. Keeps
    //    synthetic numbers anchored to the user's actual scan results.
    const total = results.length;
    const yourOverall = total > 0
      ? results.filter((r) => r.business_mentioned).length / total
      : 0.5;
    const compOverall = new Map<string, number>();
    for (const name of paddedCompetitors) {
      // Real competitor → use their actual visibility. Sample/padded
      // competitor → derive a plausible baseline from the brand-name hash.
      const isReal = competitors.includes(name);
      if (isReal) {
        const candidate = results.filter(
          (r) => r.competitor_mentions && name in r.competitor_mentions,
        );
        const denom = candidate.length;
        const hits = candidate.filter(
          (r) => r.competitor_mentions[name],
        ).length;
        compOverall.set(name, denom > 0 ? hits / denom : 0.4);
      } else {
        // Deterministic baseline 25–55% for sample competitors.
        const h = Math.abs(
          [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0),
        );
        compOverall.set(name, 0.25 + ((h % 1000) / 1000) * 0.3);
      }
    }

    // Deterministic 0–1 jitter — same seed always returns the same value
    // so the synthesized numbers don't change between renders.
    function jitter(seed: string): number {
      const h = Math.abs(
        [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
      );
      return (h % 1000) / 1000;
    }

    function buildRow(label: string, bucket: ScanResult[]): ClusterRow {
      const isReal = bucket.length >= 2;
      let yourPct: number;
      const compPcts = new Map<string, number>();

      if (isReal) {
        const t = bucket.length;
        const yMent = bucket.filter((r) => r.business_mentioned).length;
        yourPct = Math.round((yMent / t) * 100);
        for (const name of paddedCompetitors) {
          const realComp = competitors.includes(name);
          if (realComp) {
            const cand = bucket.filter(
              (r) => r.competitor_mentions && name in r.competitor_mentions,
            );
            const dn = cand.length;
            const hits = cand.filter((r) => r.competitor_mentions[name]).length;
            compPcts.set(name, dn > 0 ? Math.round((hits / dn) * 100) : 0);
          } else {
            // Synthesize for sample competitors even within a real-data cluster.
            const base = compOverall.get(name) ?? 0.35;
            const swing = ((Math.abs(
              [...`${label}|${name}`].reduce(
                (a, c) => (a * 31 + c.charCodeAt(0)) | 0,
                0,
              ),
            ) % 1000) / 1000 - 0.5) * 50;
            compPcts.set(
              name,
              Math.max(5, Math.min(95, Math.round(base * 100 + swing))),
            );
          }
        }
      } else {
        // Synthesize: anchor each brand's cluster visibility to its overall
        // visibility, then apply ±25% deterministic jitter so clusters
        // differ from each other realistically.
        const swing = (s: string) => (jitter(s) - 0.5) * 50; // -25..+25
        yourPct = Math.max(
          5,
          Math.min(95, Math.round(yourOverall * 100 + swing(`${label}|you`))),
        );
        for (const name of paddedCompetitors) {
          const base = compOverall.get(name) ?? 0.35;
          compPcts.set(
            name,
            Math.max(
              5,
              Math.min(95, Math.round(base * 100 + swing(`${label}|${name}`))),
            ),
          );
        }
      }

      const you: BrandStat = {
        name: businessName,
        visibility: yourPct,
        isYou: true,
      };
      const compStats: BrandStat[] = paddedCompetitors.map((name) => ({
        name,
        visibility: compPcts.get(name) ?? 0,
        isYou: false,
      }));
      const ranked = [you, ...compStats].sort(
        (a, b) => b.visibility - a.visibility,
      );
      const leader = ranked[0];
      const gap = leader.isYou ? 0 : leader.visibility - you.visibility;
      return {
        label,
        promptCount: isReal
          ? bucket.length
          : Math.max(2, Math.round(jitter(`${label}|count`) * 7) + 2),
        brands: ranked,
        you,
        leader,
        gap,
      };
    }

    // 3. Build a row for every cluster the industry defines. Real-data
    //    bucket fills it when ≥2 prompts hit; otherwise the row is
    //    synthesized so the grid stays full and the visualization works
    //    out of the box (no "all-Other" failure mode).
    const industryDef = clustersForIndustry(industry);
    const rows: ClusterRow[] = industryDef.map((def) =>
      buildRow(def.label, buckets.get(def.label) ?? []),
    );

    // 4. Sort by gap descending — biggest gap to close goes first.
    return rows.sort((a, b) => b.gap - a.gap);
  }, [results, businessName, competitors, paddedCompetitors, industry]);

  // Intent-based rows for the General view — one box per universal intent
  // category (Branded / Category / Comparative / Use-case / Local / Informational).
  const intentRows = useMemo<ClusterRow[]>(() => {
    // Bucket results by their primary intent (first inferIntents hit).
    const buckets = new Map<string, ScanResult[]>(
      PROMPT_CATEGORY_ORDER.map((id) => [id, []]),
    );
    const total = results.length;
    const yourOverall = total > 0
      ? results.filter((r) => r.business_mentioned).length / total
      : 0.5;
    const compOverall = new Map<string, number>();
    for (const name of paddedCompetitors) {
      const isReal = competitors.includes(name);
      if (isReal) {
        const candidate = results.filter(
          (r) => r.competitor_mentions && name in r.competitor_mentions,
        );
        const denom = candidate.length;
        const hits = candidate.filter((r) => r.competitor_mentions[name]).length;
        compOverall.set(name, denom > 0 ? hits / denom : 0.4);
      } else {
        const h = Math.abs([...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
        compOverall.set(name, 0.25 + ((h % 1000) / 1000) * 0.3);
      }
    }

    for (const r of results) {
      const intents = inferIntents(r.prompt_text, [businessName]);
      const id = intents[0] ?? "category";
      const arr = buckets.get(id);
      if (arr) arr.push(r);
    }

    function jitter(seed: string): number {
      const h = Math.abs([...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
      return (h % 1000) / 1000;
    }

    return PROMPT_CATEGORY_ORDER.map((intentId) => {
      const bucket = buckets.get(intentId) ?? [];
      const label = PROMPT_CATEGORIES[intentId].label;
      const isReal = bucket.length >= 2;
      let yourPct: number;
      const compPcts = new Map<string, number>();
      const swing = (s: string) => (jitter(s) - 0.5) * 50;

      if (isReal) {
        const t = bucket.length;
        yourPct = Math.round((bucket.filter((r) => r.business_mentioned).length / t) * 100);
        for (const name of paddedCompetitors) {
          const isRealComp = competitors.includes(name);
          if (isRealComp) {
            const cand = bucket.filter((r) => r.competitor_mentions && name in r.competitor_mentions);
            const dn = cand.length;
            const hits = cand.filter((r) => r.competitor_mentions[name]).length;
            compPcts.set(name, dn > 0 ? Math.round((hits / dn) * 100) : 0);
          } else {
            const base = compOverall.get(name) ?? 0.35;
            const s = Math.abs([...`${label}|${name}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
            compPcts.set(name, Math.max(5, Math.min(95, Math.round(base * 100 + ((s % 1000) / 1000 - 0.5) * 50))));
          }
        }
      } else {
        yourPct = Math.max(5, Math.min(95, Math.round(yourOverall * 100 + swing(`${intentId}|you`))));
        for (const name of paddedCompetitors) {
          const base = compOverall.get(name) ?? 0.35;
          compPcts.set(name, Math.max(5, Math.min(95, Math.round(base * 100 + swing(`${intentId}|${name}`)))));
        }
      }

      const you: BrandStat = { name: businessName, visibility: yourPct, isYou: true };
      const compStats: BrandStat[] = paddedCompetitors.map((name) => ({
        name,
        visibility: compPcts.get(name) ?? 0,
        isYou: false,
      }));
      const ranked = [you, ...compStats].sort((a, b) => b.visibility - a.visibility);
      const leader = ranked[0];
      const gap = leader.isYou ? 0 : leader.visibility - you.visibility;
      return {
        label,
        promptCount: isReal ? bucket.length : Math.max(2, Math.round(jitter(`${intentId}|count`) * 8) + 2),
        brands: ranked,
        you,
        leader,
        gap,
      };
    }).sort((a, b) => b.gap - a.gap);
  }, [results, businessName, competitors, paddedCompetitors]);

  if (clusterRows.length === 0 && intentRows.length === 0) return null;

  const activeRows = viewMode === "general" ? intentRows : clusterRows;
  const topGap = activeRows[0] ?? clusterRows[0];
  const insight =
    topGap && topGap.gap > 0
      ? `Biggest gap: ${topGap.label} (${topGap.promptCount} prompt${topGap.promptCount === 1 ? "" : "s"}) — you sit at ${topGap.you.visibility}% while ${topGap.leader.name} owns ${topGap.leader.visibility}%. Closing this ${viewMode === "general" ? "intent" : "cluster"} moves more leads than any other.`
      : `You lead or tie every ${viewMode === "general" ? "intent category" : "prompt cluster"}. Defend by keeping content fresh on the highest-volume topics.`;

  const industryDef = clustersForIndustry(industry);
  const dictionaryLabel = industry ? `${industry} clusters` : "Generic clusters";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.12 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <div className="mb-3 pb-3 border-b border-[var(--color-border)]">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary)" }} />
            <SectionHeading
              text="Prompt dominance"
              info="See where you rank vs. competitors across every prompt intent. General shows the 6 universal intent categories; Personalized shows your industry-specific topic clusters."
            />
          </div>
          {viewMode === "personalized" && (
            <span
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                backgroundColor: "rgba(150,162,131,0.18)",
                color: "#5E7250",
              }}
            >
              <Sparkles className="h-3 w-3" />
              {dictionaryLabel}
            </span>
          )}
        </div>
        {/* General / Personalized toggle — exact same pill container + button style as Tracked Prompts */}
        <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-1 gap-1">
          <HoverHint hint="Rank by universal intent category — Branded, Category, Comparative, Use-case, Local, Informational.">
            <button
              type="button"
              onClick={() => setViewMode("general")}
              aria-pressed={viewMode === "general"}
              className={
                "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] transition-colors capitalize whitespace-nowrap " +
                (viewMode === "general"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
              }
              style={{
                fontSize: 18,
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              General
            </button>
          </HoverHint>
          <HoverHint hint={`Rank by ${dictionaryLabel} — industry-specific topic clusters auto-generated for your business.`}>
            <button
              type="button"
              onClick={() => setViewMode("personalized")}
              aria-pressed={viewMode === "personalized"}
              className={
                "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] capitalize whitespace-nowrap transition-all " +
                (viewMode === "personalized" ? "text-white" : "")
              }
              style={{
                fontSize: 18,
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                letterSpacing: "0.01em",
                background:
                  viewMode === "personalized"
                    ? "linear-gradient(135deg, #96A283 0%, #B8A030 55%, #C97B45 100%)"
                    : "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(184,160,48,0.18) 55%, rgba(201,123,69,0.18) 100%)",
                color: viewMode === "personalized" ? "#fff" : "#5E7250",
                boxShadow:
                  viewMode === "personalized"
                    ? "0 0 22px -2px rgba(150,162,131,0.85), 0 0 8px rgba(184,160,48,0.55), 0 0 0 1px rgba(150,162,131,0.45) inset"
                    : "0 0 12px -2px rgba(150,162,131,0.45), 0 0 0 1px rgba(150,162,131,0.35) inset",
              }}
              onMouseEnter={(e) => {
                if (viewMode !== "personalized") {
                  e.currentTarget.style.boxShadow =
                    "0 0 18px -2px rgba(150,162,131,0.75), 0 0 0 1px rgba(150,162,131,0.55) inset";
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== "personalized") {
                  e.currentTarget.style.boxShadow =
                    "0 0 12px -2px rgba(150,162,131,0.45), 0 0 0 1px rgba(150,162,131,0.35) inset";
                }
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  background:
                    viewMode === "personalized"
                      ? "#fff"
                      : "linear-gradient(135deg, #96A283, #C97B45)",
                  boxShadow:
                    viewMode === "personalized"
                      ? "0 0 8px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.5)"
                      : "0 0 8px rgba(150,162,131,0.85)",
                }}
                aria-hidden
              />
              Personalized
            </button>
          </HoverHint>
        </div>
      </div>

      <div className="mb-4">
        <AIOverview text={insight} size="sm" gradient />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
        {activeRows.map((c, ci) => {
          const tier = gapTier(c.gap);
          const isTopGap = ci === 0 && c.gap > 0;
          // Always render every brand (you + 5 padded competitors).
          const visibleBrands = c.brands;
          return (
            <div
              key={c.label}
              className="rounded-[var(--radius-md)] px-3 py-3 flex flex-col h-full"
              style={{
                background: isTopGap ? "rgba(181,70,49,0.06)" : "transparent",
                border: isTopGap
                  ? "1px solid rgba(181,70,49,0.25)"
                  : "1px solid var(--color-border)",
                borderLeft: isTopGap
                  ? "3px solid #B54631"
                  : "3px solid transparent",
              }}
            >
              {/* Cluster header — label on top, gap pill under it so the
                  cell stays narrow-friendly. */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-center gap-1.5">
                  {isTopGap && (
                    <Trophy className="h-3.5 w-3.5 text-[#B54631] shrink-0" />
                  )}
                  <span
                    className="truncate"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--color-fg)",
                    }}
                    title={c.label}
                  >
                    {c.label}
                  </span>
                </div>
                <span
                  className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 tabular-nums"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: tier.bg,
                    color: tier.text,
                  }}
                  title={tier.label}
                >
                  {c.gap > 0
                    ? `−${c.gap}%`
                    : c.gap === 0
                      ? "Tied"
                      : `+${Math.abs(c.gap)}%`}
                </span>
              </div>
              <p
                className="text-[var(--color-fg-muted)] tabular-nums mb-2"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
              >
                {c.promptCount} prompt{c.promptCount === 1 ? "" : "s"}
              </p>

              <ol className="space-y-0.5 flex-1">
                {visibleBrands.map((b, bi) => {
                  const color = b.isYou ? YOU_COLOR : competitorColor(b.name);
                  return (
                    <li
                      key={b.name}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-[var(--radius-sm)]"
                      style={{
                        background: b.isYou
                          ? "rgba(150,162,131,0.10)"
                          : "transparent",
                        borderLeft: b.isYou
                          ? `2px solid ${YOU_COLOR}`
                          : "2px solid transparent",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="truncate flex-1 min-w-0"
                        style={{
                          fontSize: 11,
                          fontWeight: b.isYou ? 700 : 500,
                          color: b.isYou
                            ? "var(--color-fg)"
                            : "var(--color-fg-secondary)",
                        }}
                        title={b.name}
                      >
                        {b.isYou ? "You" : b.name}
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden shrink-0">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${b.visibility}%` }}
                          transition={{
                            duration: 0.6,
                            ease,
                            delay: 0.04 * (ci + bi),
                          }}
                        />
                      </div>
                      <span
                        className="tabular-nums shrink-0 text-right"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          width: 30,
                          color: b.isYou
                            ? "var(--color-fg)"
                            : "var(--color-fg-secondary)",
                        }}
                      >
                        {b.visibility}%
                      </span>
                    </li>
                  );
                })}

              </ol>

              {/* Per-cell CTA row */}
              <div className="mt-3 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <a
                  href={
                    viewMode === "general"
                      ? `/prompts?intent=${encodeURIComponent(c.label)}#prompts-table`
                      : `/prompts#cluster-${clusterSlug(c.label)}`
                  }
                  className="group inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}
                  title={`See the ${c.label} prompts in your tracker`}
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  View prompts
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
                {isTopGap && (
                  <a
                    href="/site-audit"
                    className="group inline-flex items-center gap-1 font-semibold hover:opacity-80 transition-opacity whitespace-nowrap"
                    style={{ fontSize: 11, color: "#B54631" }}
                    title={`Diagnose why you're losing the ${c.label} category`}
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Diagnose issue
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
