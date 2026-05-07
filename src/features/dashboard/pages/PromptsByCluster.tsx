"use client";

/**
 * "Personalized prompt themes" — the Personalized view mounted inside the
 * Tracked Prompts box on /prompts. Groups every tracked prompt (real
 * defaults + custom + industry samples) into the business's
 * industry-specific topic clusters, then renders each prompt with the
 * same data-dense per-row format the General view uses (engine hit map,
 * coverage %, position, sentiment).
 *
 * Per-prompt metrics are SYNTHESIZED deterministically from the prompt
 * text + business name so the row data is stable across renders. When
 * real per-prompt scan history lands, swap the `synthMetrics` helper for
 * a real lookup against ScanResult; the row markup stays the same.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  ChevronsUpDown,
  Hash,
  HelpCircle,
  MessageSquare,
  Minus,
  Plus,
  Target,
} from "lucide-react";
import { COLORS } from "@/utils/constants";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { HoverHint } from "@/components/atoms/HoverHint";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";
import { useSearchPrompts } from "@/features/business/hooks/useSearchPrompts";
import {
  INDUSTRY_SAMPLE_PROMPTS,
  PROMPT_CATEGORIES,
  clusterForPrompt,
  clustersForIndustry,
  primaryIntent,
} from "@/utils/promptCategories";

const ease = [0.16, 1, 0.3, 1] as const;

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const DEFAULT_PROMPT_TEMPLATES = [
  "What are the best {industry}s in {location}?",
  "Can you recommend a good {industry} near {location}?",
  "Who are the top rated {industry}s in {location}?",
  "I'm looking for a {industry} in {location}, who should I go to?",
  "What {industry} in {location} has the best reviews?",
  "Which {industry}s in {location} do you recommend for someone new to the area?",
];

const ENGINES = ["chatgpt", "claude", "gemini", "google_ai"] as const;
type EngineId = (typeof ENGINES)[number];

interface PromptMetrics {
  /** % of engines that mention you for this prompt (0-100). */
  coverage: number;
  /** Avg ordinal position when mentioned (1.0 = listed first). */
  position: number;
  /** Monthly search volume (rounded to nearest 10). */
  volume: number;
  /** Sentiment bucket. */
  sentiment: "positive" | "neutral" | "negative";
  /** Which engines mentioned you. */
  hits: Record<EngineId, boolean>;
  /** Which engines included a LINK to you in their answer. A subset of
   * `hits` — an engine can mention without linking, but never link
   * without mentioning. */
  links: Record<EngineId, boolean>;
}

// Deterministic 0–1 jitter from a string seed — same input always returns
// the same value so the synthetic metrics stay stable across renders.
function jitter(seed: string): number {
  const h = Math.abs(
    [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return (h % 1000) / 1000;
}

function synthMetrics(
  promptText: string,
  businessName: string,
  isBranded = false,
): PromptMetrics {
  const seed = `${businessName}|${promptText}`;
  // Branded prompts behave very differently in real AI responses: AI tools
  // almost always know the business when its name is in the query, so
  // coverage skews 90–100%, rank skews #1.0–1.5, sentiment skews positive,
  // and link presence is near-perfect. Unbranded queries get the wider
  // "discovery" distribution.
  const baseCov = isBranded
    ? 90 + jitter(`${seed}|cov`) * 10 // 90–100%
    : 25 + jitter(`${seed}|cov`) * 70; // 25–95%
  const coverage = Math.round(baseCov);
  const position = isBranded
    ? 1 + Math.round(jitter(`${seed}|pos`) * 5) / 10 // 1.0–1.5
    : 1 + Math.round(jitter(`${seed}|pos`) * 4 * 10) / 10; // 1.0–5.0
  // Volume scales with prompt length — shorter, head-term queries get
  // higher monthly search volume than long-tail ones. Caps at ~13K.
  const lenFactor = Math.max(0.2, 1 - promptText.length / 80);
  const volume = Math.max(
    10,
    Math.round(((jitter(`${seed}|vol`) * 0.6 + lenFactor * 0.4) * 13000) / 10) * 10,
  );
  const sBucket = jitter(`${seed}|sent`);
  const sentiment: PromptMetrics["sentiment"] = isBranded
    ? sBucket < 0.85
      ? "positive"
      : "neutral"
    : sBucket < 0.55
      ? "positive"
      : sBucket < 0.85
        ? "neutral"
        : "negative";
  const hits = ENGINES.reduce(
    (acc, e) => ({ ...acc, [e]: jitter(`${seed}|${e}`) < coverage / 100 }),
    {} as Record<EngineId, boolean>,
  );
  // Links are a subset of hits. Branded queries link nearly always (90%);
  // unbranded link about 70% of the time when mentioned.
  const linkOdds = isBranded ? 0.9 : 0.7;
  const links = ENGINES.reduce(
    (acc, e) => ({
      ...acc,
      [e]: hits[e] ? jitter(`${seed}|link|${e}`) < linkOdds : false,
    }),
    {} as Record<EngineId, boolean>,
  );
  return { coverage, position, volume, sentiment, hits, links };
}

const SENTIMENT_TOK = {
  positive: { label: "Positive", text: "#5E7250", bg: "rgba(125,142,108,0.20)" },
  neutral: { label: "Neutral", text: "var(--color-fg-muted)", bg: "var(--color-surface-alt)" },
  negative: { label: "Negative", text: "#B54631", bg: "rgba(181,70,49,0.18)" },
} as const;

function coverageTier(c: number): { text: string; bg: string } {
  if (c >= 75) return { text: "#5E7250", bg: "rgba(125,142,108,0.20)" };
  if (c >= 50) return { text: "#7D8E6C", bg: "rgba(150,162,131,0.18)" };
  if (c >= 25) return { text: "#A06210", bg: "rgba(201,123,69,0.18)" };
  return { text: "#B54631", bg: "rgba(181,70,49,0.18)" };
}

// Position tier — lower rank = better (#1.0 is best). Sage at the top,
// rust near the bottom. Used to color-code the Position column text so
// the eye can scan rows for "where am I struggling."
function positionTier(r: number): string {
  if (r <= 1.5) return "#5E7250"; // deep sage — top
  if (r <= 2.5) return "#7D8E6C"; // sage — strong
  if (r <= 3.5) return "#7E6B17"; // gold — mid
  if (r <= 4.5) return "#A06210"; // amber — trailing
  return "#B54631"; // rust — last
}

// Per-theme accent color — deterministic from the cluster label so a given
// theme always renders the same color across pages/sessions. Curated for
// the warm Surven palette: sage / amber / gold / dusty rose / muted purple
// / slate / teal / rust. Used for the cluster's left border, hash icon,
// and header gradient band.
const THEME_ACCENT_PALETTE = [
  "#7D8E6C", // sage
  "#C97B45", // amber
  "#B8A030", // gold
  "#A07878", // dusty rose
  "#9B7EC8", // muted purple
  "#5BAF92", // teal-sage
  "#7A8FA6", // slate
  "#B54631", // rust
];

// Per-cluster faded teaser shown in the "Add prompts" CTA row at the
// bottom of every theme. Pulls from the matching INDUSTRY_SAMPLE_PROMPTS
// pool when one exists for the (industry, cluster) pair, falling back
// to a generic "next prompt to track" template that name-checks the
// cluster label so the teaser still feels relevant.
function teaserForCluster(
  clusterLabel: string,
  industry: string | undefined | null,
  location: string,
  state: string,
): string {
  const samples =
    (industry && INDUSTRY_SAMPLE_PROMPTS[industry]?.[clusterLabel]) ?? [];
  // Stable per-cluster pick.
  const seed = `${industry ?? "x"}|${clusterLabel}|teaser`;
  const h = Math.abs(
    [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  );
  const pick =
    samples.length > 0
      ? samples[h % samples.length]
      : `Top ${clusterLabel.toLowerCase()} options in {location}`;
  return pick.replace(/\{location\}/g, location).replace(/\{state\}/g, state);
}

function themeAccent(label: string): string {
  const h = Math.abs(
    [...label].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return THEME_ACCENT_PALETTE[h % THEME_ACCENT_PALETTE.length];
}

// Short synthetic "what AI said" snippet per (prompt, engine, cited?). Same
// deterministic approach as synthMetrics — same input always returns the
// same line so the expanded panel reads stably across renders.
function synthSnippet(
  promptText: string,
  engine: EngineId,
  cited: boolean,
  businessName: string,
): string {
  const seed = `${promptText}|${engine}|${businessName}`;
  const idx = Math.abs(
    [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0),
  );
  const cohort = idx % 4;
  if (cited) {
    return [
      `Listed ${businessName} among the top 3 recommendations with 2 competitors.`,
      `Mentioned ${businessName} as a strong fit, citing reviews and reputation.`,
      `Surfaced ${businessName} in a 4-firm shortlist; ranked #${(cohort % 3) + 1}.`,
      `Recommended ${businessName} alongside 1 competitor for this query.`,
    ][cohort];
  }
  return [
    "Recommended 3 competitors but did not mention you.",
    "Returned a generic answer with no specific firm named.",
    "Cited 2 competitors and a directory page; no mention of your brand.",
    "Pointed to an industry directory instead of naming firms.",
  ][cohort];
}

type PromptsFilter = "branded" | "unbranded" | "cited" | "uncited" | "added";

export function PromptsByCluster({
  selectedFilters = new Set<PromptsFilter>(),
}: {
  selectedFilters?: Set<PromptsFilter>;
}) {
  const { activeBusiness } = useActiveBusiness();
  const { prompts: customPrompts } = useSearchPrompts(activeBusiness?.id);

  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Per-cluster collapse state — keyed by cluster slug. `true` = collapsed
  // (table hidden, header-only). Default expanded so first-time visitors
  // see all data without clicking.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCluster = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleRow = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Track the slug requested via hash so we can apply collapse state
  // once `grouped` is ready (business data loads asynchronously).
  const [deepLinkSlug, setDeepLinkSlug] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.replace(/^#/, "");
    return hash.startsWith("cluster-") ? hash.slice("cluster-".length) : null;
  });

  useEffect(() => {
    if (!deepLinkSlug) return;
    setHighlightedSlug(deepLinkSlug);
    const t = setTimeout(() => setHighlightedSlug(null), 3500);
    return () => clearTimeout(t);
  }, [deepLinkSlug]);

  const allPrompts = useMemo(() => {
    if (!activeBusiness) return [] as string[];
    const location = `${activeBusiness.city}, ${activeBusiness.state}`;
    const defaults = DEFAULT_PROMPT_TEMPLATES.map((t) =>
      t
        .replace("{industry}", activeBusiness.industry.toLowerCase())
        .replace("{location}", location),
    );
    const customs = customPrompts.map((p) => p.prompt_text);
    return [...defaults, ...customs];
  }, [activeBusiness, customPrompts]);

  const grouped = useMemo(() => {
    if (!activeBusiness) return [] as { label: string; prompts: string[] }[];
    const industryDef = clustersForIndustry(activeBusiness.industry);
    const location = `${activeBusiness.city}, ${activeBusiness.state}`;
    const samplesForIndustry =
      INDUSTRY_SAMPLE_PROMPTS[activeBusiness.industry] ?? {};

    const buckets = new Map<string, string[]>();
    for (const def of industryDef) buckets.set(def.label, []);
    buckets.set("Other", []);

    for (const p of allPrompts) {
      const c = clusterForPrompt(p, activeBusiness.industry);
      const arr = buckets.get(c) ?? buckets.get("Other")!;
      arr.push(p);
    }
    for (const def of industryDef) {
      const samples = samplesForIndustry[def.label] ?? [];
      const arr = buckets.get(def.label)!;
      const seen = new Set(arr.map((p) => p.toLowerCase()));
      for (const s of samples) {
        const filled = s
          .replace(/\{location\}/g, location)
          .replace(/\{state\}/g, activeBusiness.state);
        if (!seen.has(filled.toLowerCase())) {
          arr.push(filled);
          seen.add(filled.toLowerCase());
        }
      }
    }

    return Array.from(buckets.entries())
      .map(([label, prompts]) => ({ label, prompts }))
      .filter((b) => !(b.label === "Other" && b.prompts.length === 0));
  }, [allPrompts, activeBusiness]);

  // When a specific cluster is deep-linked, collapse every other cluster
  // so only the target is open. Runs once grouped is populated.
  useEffect(() => {
    if (!deepLinkSlug || grouped.length === 0) return;
    const next: Record<string, boolean> = {};
    for (const g of grouped) {
      const s = slug(g.label);
      next[s] = s !== deepLinkSlug; // true = collapsed, false = open
    }
    setCollapsed(next);
    setDeepLinkSlug(null); // only apply once
    // Scroll the target cluster to the vertical center of the viewport
    // after React has flushed the collapse state update.
    setTimeout(() => {
      document
        .getElementById(`cluster-${deepLinkSlug}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }, [grouped, deepLinkSlug]);

  if (!activeBusiness) return null;

  // Aggregate cluster-level summary (avg coverage across the cluster's prompts).
  function clusterAvgCoverage(prompts: string[]): number {
    if (prompts.length === 0) return 0;
    const sum = prompts.reduce(
      (s, p) => s + synthMetrics(p, activeBusiness!.name).coverage,
      0,
    );
    return Math.round(sum / prompts.length);
  }

  // Count "problem" prompts in a cluster — surfaced in the header so the
  // user can see leaks at a glance even when the box is collapsed.
  // `leaks` = 0/4 engines cited (visibility leak, rust)
  // `weak`  = exactly 1/4 engines cited (weak coverage, amber)
  function clusterProblems(prompts: string[]): {
    leaks: number;
    weak: number;
  } {
    let leaks = 0;
    let weak = 0;
    for (const p of prompts) {
      const isBranded = p
        .toLowerCase()
        .includes(activeBusiness!.name.toLowerCase());
      const m = synthMetrics(p, activeBusiness!.name, isBranded);
      const cited = ENGINES.filter((e) => m.hits[e]).length;
      if (cited === 0) leaks++;
      else if (cited === 1) weak++;
    }
    return { leaks, weak };
  }

  // Top-right "Expand all" / "Collapse all" toggle. The default is "first
  // open, rest closed", so a slug is considered expanded when its
  // explicit value is `false` OR when it's undefined AND it's the first
  // cluster in the grouped list.
  const allSlugs = grouped.map((g) => slug(g.label));
  const isExpandedSlug = (s: string, idx: number) => {
    const v = collapsed[s];
    return v === undefined ? idx === 0 : !v;
  };
  const anyExpanded = allSlugs.some((s, i) => isExpandedSlug(s, i));
  const toggleAll = () => {
    if (anyExpanded) {
      const next: Record<string, boolean> = {};
      for (const s of allSlugs) next[s] = true;
      setCollapsed(next);
    } else {
      const next: Record<string, boolean> = {};
      for (const s of allSlugs) next[s] = false;
      setCollapsed(next);
    }
  };

  return (
    <motion.div
      id="prompts-by-cluster"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 scroll-mt-24"
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] grid grid-cols-3 items-center gap-2">
        <div className="flex items-center gap-2">
          <Target
            className="h-4 w-4"
            style={{ color: "var(--color-primary)" }}
          />
          <SectionHeading
            text={`Personalized prompt themes for ${activeBusiness.name}`}
            info="Every tracked prompt grouped into industry-specific themes Surven auto-generated for your business. Same per-prompt metrics as the General view — engine hit map, coverage, position, sentiment."
          />
        </div>
        {/* Global Collapse all / Expand all toggle — centered in the header */}
        <div className="flex justify-center">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--color-surface-alt)]"
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--color-fg-secondary)",
            border: "1px solid var(--color-border)",
            fontFamily: "var(--font-sans)",
          }}
          title={anyExpanded ? "Collapse every theme" : "Expand every theme"}
        >
          {anyExpanded ? (
            <Minus className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          {anyExpanded ? "Collapse all" : "Expand all"}
        </button>
        </div>
        {/* Empty third column keeps the button centered */}
        <div />
      </div>

      <div className="space-y-4">
        {grouped.map((g, idx) => {
          const id = `cluster-${slug(g.label)}`;
          const clusterSlug = slug(g.label);
          const isHighlighted = highlightedSlug === clusterSlug;
          // Default: first (top) cluster is expanded, the rest are
          // collapsed so the page lands compact. Once the user toggles
          // any box, that explicit choice (true/false) overrides the
          // index-based default.
          const explicit = collapsed[clusterSlug];
          const isCollapsed = explicit === undefined ? idx !== 0 : explicit;
          const isEmpty = g.prompts.length === 0;
          const avgCov = clusterAvgCoverage(g.prompts);
          const tier = coverageTier(avgCov);
          const accent = themeAccent(g.label);
          const { leaks, weak } = clusterProblems(g.prompts);
          const hasLeak = leaks > 0;
          const hasWeak = weak > 0;
          // When collapsed AND the cluster has visibility leaks, paint
          // the box's outer border + glow rust so the user can spot
          // problem themes at a glance without expanding.
          const collapsedAlert = isCollapsed && hasLeak;
          return (
            <section
              key={g.label}
              id={id}
              className="rounded-[var(--radius-md)] border scroll-mt-24 transition-all overflow-hidden"
              style={{
                background: isHighlighted
                  ? "rgba(150,162,131,0.06)"
                  : collapsedAlert
                    ? "rgba(181,70,49,0.04)"
                    : "transparent",
                borderTopColor: collapsedAlert
                  ? "rgba(181,70,49,0.45)"
                  : isHighlighted
                    ? "rgba(150,162,131,0.55)"
                    : "var(--color-border)",
                borderRightColor: collapsedAlert
                  ? "rgba(181,70,49,0.45)"
                  : isHighlighted
                    ? "rgba(150,162,131,0.55)"
                    : "var(--color-border)",
                borderBottomColor: collapsedAlert
                  ? "rgba(181,70,49,0.45)"
                  : isHighlighted
                    ? "rgba(150,162,131,0.55)"
                    : "var(--color-border)",
                borderLeftColor: collapsedAlert ? "#B54631" : accent,
                borderLeftWidth: 4,
                borderLeftStyle: "solid",
                boxShadow: collapsedAlert
                  ? "0 0 0 3px rgba(181,70,49,0.12)"
                  : isHighlighted
                    ? "0 0 0 3px rgba(150,162,131,0.18)"
                    : "none",
              }}
            >
              {/* Cluster header — title + prompt count + avg coverage tier.
                  Background is a soft horizontal gradient anchored to the
                  theme's accent so the eye can color-match the header to
                  the left-edge stripe and the Hash icon. */}
              <header
                onClick={() => toggleCluster(clusterSlug)}
                className="flex items-center justify-between gap-3 px-5 py-1.5 border-b border-[var(--color-border)] cursor-pointer select-none"
                style={{
                  background: `linear-gradient(90deg, ${accent}1F 0%, ${accent}08 60%, transparent 100%)`,
                }}
                role="button"
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Hash
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: accent }}
                  />
                  <h3
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 19,
                      fontWeight: 600,
                      color: "var(--color-fg)",
                      lineHeight: 1.2,
                    }}
                  >
                    {g.label}
                  </h3>
                  <span
                    className="text-[var(--color-fg-muted)] tabular-nums shrink-0"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {g.prompts.length} prompt{g.prompts.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {/* Problem badges — always visible. Rust pill counts
                      visibility leaks (0/4 cited), amber counts weak
                      coverage (1/4). Both inline so the cluster's health
                      reads at a glance even when collapsed. */}
                  {hasLeak && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        backgroundColor: "rgba(181,70,49,0.15)",
                        color: "#B54631",
                      }}
                      title={`${leaks} prompt${leaks === 1 ? "" : "s"} with zero AI engines citing you`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {leaks} leak{leaks === 1 ? "" : "s"}
                    </span>
                  )}
                  {hasWeak && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 tabular-nums"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        backgroundColor: "rgba(201,123,69,0.15)",
                        color: "#A06210",
                      }}
                      title={`${weak} prompt${weak === 1 ? "" : "s"} cited by only 1 of 4 engines`}
                    >
                      {weak} weak
                    </span>
                  )}
                  {!isEmpty && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 tabular-nums"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: tier.bg,
                        color: tier.text,
                      }}
                      title="Average coverage across this cluster"
                    >
                      {avgCov}% avg
                    </span>
                  )}
                  <a
                    href="#prompts-by-cluster"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
                    title="Permalink"
                  >
                    #{clusterSlug}
                  </a>
                  {/* Collapse / expand chevron — rotates 180° based on
                      state. Click on the whole header also toggles. */}
                  <ChevronDown
                    className={
                      "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200 " +
                      (isCollapsed ? "" : "rotate-180")
                    }
                  />
                </div>
              </header>

              {isCollapsed ? null : isEmpty ? (
                <>
                  <div className="px-5 py-3 flex items-center gap-2 text-[var(--color-fg-muted)]">
                    <MessageSquare className="h-3.5 w-3.5 opacity-60" />
                    <p style={{ fontSize: 13 }}>
                      No tracked prompts in this theme yet.
                    </p>
                  </div>
                  <motion.a
                    href="/prompt-research"
                    whileTap={{ scale: 0.99 }}
                    className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-[var(--color-surface-alt)]/60 group"
                    style={{
                      fontFamily: "var(--font-sans)",
                      borderTop: "1px dashed var(--color-border)",
                    }}
                  >
                    <span className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="inline-flex items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-110"
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: "rgba(150,162,131,0.18)",
                          color: COLORS.primaryHover,
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                      <span
                        className="truncate italic"
                        style={{
                          fontSize: 13,
                          color: "var(--color-fg-muted)",
                          opacity: 0.7,
                        }}
                      >
                        &ldquo;
                        {teaserForCluster(
                          g.label,
                          activeBusiness.industry,
                          `${activeBusiness.city}, ${activeBusiness.state}`,
                          activeBusiness.state,
                        )}
                        &rdquo;
                      </span>
                    </span>
                    <span
                      className="inline-flex items-center gap-1 shrink-0 uppercase tracking-wider transition-colors group-hover:text-[var(--color-primary)]"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: COLORS.primaryHover,
                      }}
                    >
                      Add prompts
                    </span>
                  </motion.a>
                </>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: "var(--color-surface)" }}>
                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <th className="w-6" />
                        <th
                          className="text-left py-2 px-5 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          Prompt
                        </th>
                        <th
                          className="text-right py-2 px-4 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            Volume
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                          </span>
                        </th>
                        <th
                          className="text-center py-2 px-4 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1">
                            Status
                            <HoverHint hint="Which AI engines mentioned your business in their answer.">
                              <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-70" />
                            </HoverHint>
                          </span>
                        </th>
                        <th
                          className="text-center py-2 px-4 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1">
                            Cited
                            <HoverHint hint="Which AI engines linked to your site in their answer.">
                              <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-70" />
                            </HoverHint>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </span>
                        </th>
                        <th
                          className="text-center py-2 px-4 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1">
                            Branded
                            <HoverHint hint="Prompts that mention your business name. Tracks how AI describes you when someone asks about your brand directly.">
                              <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-70" />
                            </HoverHint>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </span>
                        </th>
                        <th
                          className="text-center py-2 px-4 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1">
                            Intent
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </span>
                        </th>
                        <th
                          className="text-right py-2 px-4 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            Avg Rank
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                          </span>
                        </th>
                        <th
                          className="text-right py-2 px-5 uppercase tracking-wider text-[var(--color-fg-muted)]"
                          style={{ fontSize: 10, fontWeight: 600 }}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            Sentiment
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.prompts
                        .map((p, i) => ({
                          p,
                          i,
                          m: synthMetrics(
                            p,
                            activeBusiness.name,
                            p
                              .toLowerCase()
                              .includes(activeBusiness.name.toLowerCase()),
                          ),
                        }))
                        .filter(({ p, m }) => {
                          const wantBranded = selectedFilters.has("branded");
                          const wantUnbranded = selectedFilters.has("unbranded");
                          const wantCited = selectedFilters.has("cited");
                          const wantUncited = selectedFilters.has("uncited");
                          const isBranded = p.toLowerCase().includes(activeBusiness.name.toLowerCase());
                          if (wantBranded && !wantUnbranded && !isBranded) return false;
                          if (wantUnbranded && !wantBranded && isBranded) return false;
                          if (wantCited || wantUncited) {
                            const linked = ENGINES.some((e) => m.links[e]);
                            if (wantCited && !wantUncited && !linked) return false;
                            if (wantUncited && !wantCited && linked) return false;
                          }
                          return true;
                        })
                        .map(({ p, i, m }) => {
                        const covTier = coverageTier(m.coverage);
                        const sTok = SENTIMENT_TOK[m.sentiment];
                        const isBranded = p
                          .toLowerCase()
                          .includes(activeBusiness.name.toLowerCase());
                        const rowKey = `${id}-${i}`;
                        const isOpen = !!expanded[rowKey];
                        return (
                          <Fragment key={rowKey}>
                          <tr
                            onClick={() => toggleRow(rowKey)}
                            className="cursor-pointer hover:bg-[var(--color-surface-alt)]/60 transition-colors"
                            style={{
                              borderBottom: "1px solid var(--color-border)",
                              // Branded distinction now lives in the
                              // dedicated Brand column; rows stay clean.
                              background: "transparent",
                            }}
                            aria-expanded={isOpen}
                          >
                            <td className="py-2.5 pl-3 pr-1 align-middle">
                              <ChevronDown
                                className={
                                  "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200 " +
                                  (isOpen ? "rotate-180" : "")
                                }
                              />
                            </td>
                            <td className="py-2.5 px-5">
                              <p
                                className="text-[var(--color-fg)] leading-snug"
                                style={{ fontSize: 13 }}
                              >
                                &ldquo;{p}&rdquo;
                              </p>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span
                                className="tabular-nums text-[var(--color-fg-secondary)]"
                                style={{ fontSize: 12, fontWeight: 600 }}
                              >
                                {m.volume.toLocaleString()}
                              </span>
                            </td>
                            {/* Status — per-engine dot row (mention). Sage
                                if cited, faded if not. Rust pill at 0/4,
                                amber at 1/4. */}
                            <td className="py-2.5 px-4">
                              {(() => {
                                const cited = ENGINES.filter(
                                  (e) => m.hits[e],
                                ).length;
                                const allMissed = cited === 0;
                                const lowCoverage = cited === 1;
                                return (
                                  <div
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
                                    style={{
                                      backgroundColor: allMissed
                                        ? "rgba(181,70,49,0.10)"
                                        : lowCoverage
                                          ? "rgba(201,123,69,0.10)"
                                          : "transparent",
                                      border: "1px solid transparent",
                                    }}
                                    title={
                                      allMissed
                                        ? "Zero AI engines cited you on this prompt — visibility leak"
                                        : lowCoverage
                                          ? "Only 1 of 4 AI engines cited you — weak coverage"
                                          : `Cited by ${cited} of 4 AI engines`
                                    }
                                  >
                                    {ENGINES.map((e) => (
                                      <span
                                        key={e}
                                        className="rounded-full"
                                        style={{
                                          width: 7,
                                          height: 7,
                                          backgroundColor: allMissed
                                            ? "#B54631"
                                            : m.hits[e]
                                              ? "#7D8E6C"
                                              : "rgba(107,109,107,0.3)",
                                        }}
                                      />
                                    ))}
                                    {(allMissed || lowCoverage) && (
                                      <span
                                        className="uppercase tracking-wider"
                                        style={{
                                          fontSize: 9.5,
                                          fontWeight: 700,
                                          color: allMissed
                                            ? "#B54631"
                                            : "#A06210",
                                          letterSpacing: "0.08em",
                                          marginLeft: 2,
                                        }}
                                      >
                                        {cited}/4
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            {/* Cited — link-presence per engine (stronger
                                citation than a bare mention). */}
                            <td className="py-2.5 px-4">
                              {(() => {
                                const linked = ENGINES.filter(
                                  (e) => m.links[e],
                                ).length;
                                const allMissed = linked === 0;
                                const lowCoverage = linked === 1;
                                return (
                                  <div
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
                                    style={{
                                      backgroundColor: allMissed
                                        ? "rgba(181,70,49,0.10)"
                                        : lowCoverage
                                          ? "rgba(201,123,69,0.10)"
                                          : "transparent",
                                      border: "1px solid transparent",
                                    }}
                                    title={
                                      allMissed
                                        ? "Zero AI engines linked to you in their answer"
                                        : lowCoverage
                                          ? "Only 1 of 4 AI engines linked to you"
                                          : `Linked by ${linked} of 4 AI engines`
                                    }
                                  >
                                    {ENGINES.map((e) => (
                                      <span
                                        key={e}
                                        className="rounded-full"
                                        style={{
                                          width: 7,
                                          height: 7,
                                          // Cited dots use link-blue (matches
                                          // /prompts main + highlights tables)
                                          // — subconscious "this is linked"
                                          // cue. Rust stays for the 0/4 leak.
                                          backgroundColor: allMissed
                                            ? "#B54631"
                                            : m.links[e]
                                              ? "#2563EB"
                                              : "rgba(107,109,107,0.3)",
                                        }}
                                      />
                                    ))}
                                    {(allMissed || lowCoverage) && (
                                      <span
                                        className="uppercase tracking-wider"
                                        style={{
                                          fontSize: 9.5,
                                          fontWeight: 700,
                                          color: allMissed
                                            ? "#B54631"
                                            : "#A06210",
                                          letterSpacing: "0.08em",
                                          marginLeft: 2,
                                        }}
                                      >
                                        {linked}/4
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            {/* Brand — own column. Compact sage pill if
                                prompt mentions the business name; em-dash
                                otherwise. */}
                            <td className="py-2.5 px-4 text-center">
                              {isBranded ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    color: "#7D8E6C",
                                    backgroundColor: "#7D8E6C1F",
                                  }}
                                  title="Prompt includes your brand name directly."
                                >
                                  <span
                                    className="rounded-full shrink-0"
                                    style={{
                                      width: 4,
                                      height: 4,
                                      backgroundColor: "#7D8E6C",
                                    }}
                                  />
                                  Branded
                                </span>
                              ) : (
                                <span
                                  className="text-[var(--color-fg-muted)]"
                                  style={{ fontSize: 12 }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                            {/* Intent — single primary intent pill. */}
                            <td className="py-2.5 px-4 text-center">
                              {(() => {
                                const id = primaryIntent(p, [
                                  activeBusiness.name,
                                ]);
                                const cat = PROMPT_CATEGORIES[id];
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: cat.color,
                                      backgroundColor: `${cat.color}1F`,
                                    }}
                                    title={cat.description}
                                  >
                                    <span
                                      className="rounded-full shrink-0"
                                      style={{
                                        width: 5,
                                        height: 5,
                                        backgroundColor: cat.color,
                                      }}
                                    />
                                    {cat.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {(() => {
                                const c = positionTier(m.position);
                                return (
                                  <span
                                    className="inline-flex items-center justify-center tabular-nums rounded-md"
                                    style={{
                                      fontFamily: "ui-monospace, monospace",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: c,
                                      backgroundColor: `${c}1F`,
                                      padding: "2px 8px",
                                      minWidth: 44,
                                    }}
                                    title="Avg rank when mentioned — lower is better"
                                  >
                                    #{m.position.toFixed(1)}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-5 text-right">
                              <span
                                className="inline-flex items-center rounded-full px-2.5 py-0.5"
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  backgroundColor: sTok.bg,
                                  color: sTok.text,
                                }}
                              >
                                {sTok.label}
                              </span>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr
                              style={{
                                borderBottom:
                                  "1px solid var(--color-border)",
                              }}
                            >
                              <td
                                colSpan={9}
                                className="px-5 py-5"
                                style={{
                                  backgroundColor:
                                    "rgba(150,162,131,0.06)",
                                }}
                              >
                                <p
                                  className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-3"
                                  style={{
                                    fontSize: 11,
                                    letterSpacing: "0.12em",
                                  }}
                                >
                                  What AI said
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                  {ENGINES.map((e) => {
                                    const cited = m.hits[e];
                                    return (
                                      <div
                                        key={e}
                                        className="rounded-md border bg-[var(--color-surface)] p-3 flex flex-col"
                                        style={{
                                          borderColor: cited
                                            ? "rgba(150,162,131,0.45)"
                                            : "var(--color-border)",
                                          borderLeftWidth: 3,
                                          borderLeftColor: cited
                                            ? "#7D8E6C"
                                            : "rgba(181,70,49,0.4)",
                                        }}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-1.5">
                                            <EngineIcon id={e} size={14} />
                                            <span
                                              style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "var(--color-fg)",
                                              }}
                                            >
                                              {e === "chatgpt"
                                                ? "ChatGPT"
                                                : e === "claude"
                                                  ? "Claude"
                                                  : e === "gemini"
                                                    ? "Gemini"
                                                    : "Google AI"}
                                            </span>
                                          </div>
                                          <span
                                            className="uppercase tabular-nums"
                                            style={{
                                              fontSize: 9.5,
                                              fontWeight: 700,
                                              letterSpacing: "0.08em",
                                              color: cited
                                                ? "#5E7250"
                                                : "#B54631",
                                            }}
                                          >
                                            {cited ? "Cited" : "Missing"}
                                          </span>
                                        </div>
                                        <p
                                          className="text-[var(--color-fg-secondary)]"
                                          style={{
                                            fontSize: 12,
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          {synthSnippet(
                                            p,
                                            e,
                                            cited,
                                            activeBusiness.name,
                                          )}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        );
                      })}
                      {/* Per-cluster Add prompts CTA — same ghost-row
                          treatment as the General view. Faded teaser on
                          the left signals what the next tracked prompt
                          could look like for THIS theme; whole row links
                          to /prompt-research. */}
                      <tr>
                        <td colSpan={9} className="p-0">
                          <motion.a
                            href="/prompt-research"
                            whileTap={{ scale: 0.99 }}
                            className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-[var(--color-surface-alt)]/60 group"
                            style={{
                              fontFamily: "var(--font-sans)",
                              borderTop: "1px dashed var(--color-border)",
                            }}
                          >
                            <span className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className="inline-flex items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-110"
                                style={{
                                  width: 22,
                                  height: 22,
                                  backgroundColor: "rgba(150,162,131,0.18)",
                                  color: COLORS.primaryHover,
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </span>
                              <span
                                className="truncate italic"
                                style={{
                                  fontSize: 13,
                                  color: "var(--color-fg-muted)",
                                  opacity: 0.7,
                                }}
                              >
                                &ldquo;
                                {teaserForCluster(
                                  g.label,
                                  activeBusiness.industry,
                                  `${activeBusiness.city}, ${activeBusiness.state}`,
                                  activeBusiness.state,
                                )}
                                &rdquo;
                              </span>
                            </span>
                            <span
                              className="inline-flex items-center gap-1 shrink-0 uppercase tracking-wider transition-colors group-hover:text-[var(--color-primary)]"
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                color: COLORS.primaryHover,
                              }}
                            >
                              Add prompts
                            </span>
                          </motion.a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </motion.div>
  );
}
