"use client";

/**
 * Prompt-Cluster Dominance — concept mockup, multi-competitor variant.
 * Shows you vs. up to 5 competitors per AI-generated topic cluster so
 * premium users (5 competitors + you = 6 brands) see the full picture.
 *
 * Two-tier taxonomy in play:
 *   - Cluster labels themselves (Tier 2) are AI-generated per business
 *     based on actual prompt content. Mock here uses a personal-injury
 *     law vertical so it lines up with Joey's current scan setup.
 *   - Cluster rows are sorted by YOUR-vs-LEADER gap descending, top-gap
 *     row highlighted as the next "where to write content" target.
 */
import { motion } from "framer-motion";
import { ArrowRight, Crown, Plus, Sparkles, Target, Trophy } from "lucide-react";
import { AIOverview } from "@/components/atoms/AIOverview";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COMPETITOR_PALETTE } from "@/utils/constants";

const ease = [0.16, 1, 0.3, 1] as const;
const YOU_COLOR = "#7D8E6C";
const MAX_COMPETITORS = 5;

function competitorColor(name: string): string {
  const hash = Math.abs(
    [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return COMPETITOR_PALETTE[hash % COMPETITOR_PALETTE.length];
}

interface BrandStat {
  name: string;
  visibility: number;
  isYou: boolean;
}

interface ClusterRow {
  label: string;
  promptCount: number;
  brands: BrandStat[]; // ordered by visibility desc
}

// Mock: 6 personal-injury clusters × 6 brands (Morgan + 5 competitors).
// Replicates what the cluster card will look like for a premium user.
const MOCK_CLUSTERS: ClusterRow[] = [
  {
    label: "Class actions",
    promptCount: 7,
    brands: [
      { name: "Goff Law", visibility: 71, isYou: false },
      { name: "Cellino Law", visibility: 52, isYou: false },
      { name: "Jacoby & Meyers", visibility: 38, isYou: false },
      { name: "Morgan and Morgan", visibility: 18, isYou: true },
      { name: "Stewart J. Guss", visibility: 12, isYou: false },
      { name: "Saiontz & Kirk", visibility: 8, isYou: false },
    ],
  },
  {
    label: "Workers' comp",
    promptCount: 5,
    brands: [
      { name: "Goff Law", visibility: 64, isYou: false },
      { name: "Morgan and Morgan", visibility: 32, isYou: true },
      { name: "Cellino Law", visibility: 28, isYou: false },
      { name: "Jacoby & Meyers", visibility: 22, isYou: false },
      { name: "Saiontz & Kirk", visibility: 18, isYou: false },
      { name: "Stewart J. Guss", visibility: 9, isYou: false },
    ],
  },
  {
    label: "Mass torts",
    promptCount: 4,
    brands: [
      { name: "Goff Law", visibility: 58, isYou: false },
      { name: "Morgan and Morgan", visibility: 41, isYou: true },
      { name: "Jacoby & Meyers", visibility: 35, isYou: false },
      { name: "Cellino Law", visibility: 27, isYou: false },
      { name: "Stewart J. Guss", visibility: 19, isYou: false },
      { name: "Saiontz & Kirk", visibility: 11, isYou: false },
    ],
  },
  {
    label: "Medical malpractice",
    promptCount: 6,
    brands: [
      { name: "Morgan and Morgan", visibility: 55, isYou: true },
      { name: "Goff Law", visibility: 55, isYou: false },
      { name: "Jacoby & Meyers", visibility: 41, isYou: false },
      { name: "Cellino Law", visibility: 33, isYou: false },
      { name: "Saiontz & Kirk", visibility: 22, isYou: false },
      { name: "Stewart J. Guss", visibility: 18, isYou: false },
    ],
  },
  {
    label: "Personal injury",
    promptCount: 11,
    brands: [
      { name: "Morgan and Morgan", visibility: 73, isYou: true },
      { name: "Goff Law", visibility: 62, isYou: false },
      { name: "Jacoby & Meyers", visibility: 48, isYou: false },
      { name: "Cellino Law", visibility: 35, isYou: false },
      { name: "Saiontz & Kirk", visibility: 24, isYou: false },
      { name: "Stewart J. Guss", visibility: 19, isYou: false },
    ],
  },
  {
    label: "Wrongful death",
    promptCount: 3,
    brands: [
      { name: "Morgan and Morgan", visibility: 68, isYou: true },
      { name: "Goff Law", visibility: 55, isYou: false },
      { name: "Cellino Law", visibility: 42, isYou: false },
      { name: "Jacoby & Meyers", visibility: 38, isYou: false },
      { name: "Saiontz & Kirk", visibility: 25, isYou: false },
      { name: "Stewart J. Guss", visibility: 16, isYou: false },
    ],
  },
];

// Tier color for the gap pill — sage at 0% (you lead/tie) → rust at >40%.
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

interface Props {
  /**
   * How many competitor slots the user's plan allows. Defaults to 5
   * (premium). Pass 1 for plus, 0 for free — empty-slot CTA fills the
   * remaining rows in each cluster.
   */
  competitorLimit?: number;
}

export function PromptClusterDominance({ competitorLimit = 5 }: Props) {
  // Compute YOU vs cluster-leader gap, sort clusters by gap desc.
  const sorted = MOCK_CLUSTERS.map((c) => {
    const ranked = [...c.brands].sort((a, b) => b.visibility - a.visibility);
    const you = ranked.find((b) => b.isYou)!;
    const leader = ranked[0];
    const gap = leader.isYou ? 0 : leader.visibility - you.visibility;
    return { ...c, brands: ranked, you, leader, gap };
  }).sort((a, b) => b.gap - a.gap);

  const topGap = sorted[0];
  const insight =
    topGap.gap > 0
      ? `Biggest gap: ${topGap.label} (${topGap.promptCount} prompts) — you sit at ${topGap.you.visibility}% while ${topGap.leader.name} owns ${topGap.leader.visibility}%. Closing this cluster moves more leads than any other.`
      : `You lead or tie every prompt cluster. Defend by keeping content fresh on the highest-volume topics.`;

  // Empty-slot count per cluster — based on plan's competitor limit, not
  // on the mock data (mock always gives 5 competitors).
  const filledCompetitors = Math.min(
    competitorLimit,
    MAX_COMPETITORS,
  );
  const emptyPerCluster = Math.max(0, MAX_COMPETITORS - filledCompetitors);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.12 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target
            className="h-4 w-4"
            style={{ color: "var(--color-primary)" }}
          />
          <SectionHeading
            text="Prompt-cluster dominance"
            info="Every scanned prompt grouped by topic (auto-generated per business). Shows you + every tracked competitor inside each cluster so you can see WHICH kind of question you're losing — not just which prompt."
          />
        </div>
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
          Concept
        </span>
      </div>

      <div className="mb-4">
        <AIOverview text={insight} size="sm" gradient />
      </div>

      <div className="space-y-3">
        {sorted.map((c, ci) => {
          const tier = gapTier(c.gap);
          const isTopGap = ci === 0 && c.gap > 0;
          // Trim the brand list to the user's plan limit (you + N comps).
          const visibleBrands = c.brands.slice(0, 1 + filledCompetitors);
          // Find competitors NOT in the visible set — for the dashed CTA slots.
          // Premium = no slots; plus = 4 slots; free = 5 slots.
          return (
            <div
              key={c.label}
              className="rounded-[var(--radius-md)] px-4 py-3"
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
              {/* Cluster header — label + count + gap pill */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isTopGap && (
                    <Trophy className="h-3.5 w-3.5 text-[#B54631] shrink-0" />
                  )}
                  <span
                    className="truncate"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--color-fg)",
                    }}
                  >
                    {c.label}
                  </span>
                  <span
                    className="text-[var(--color-fg-muted)] tabular-nums shrink-0"
                    style={{ fontSize: 11 }}
                  >
                    {c.promptCount} prompts
                  </span>
                </div>
                <span
                  className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 tabular-nums"
                  style={{
                    fontSize: 12,
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

              {/* Mini-leaderboard inside the cluster — every brand sorted
                  by visibility within THIS cluster. Same row rhythm as
                  the main Visibility Leaderboard but compact. */}
              <ol className="space-y-1">
                {visibleBrands.map((b, bi) => {
                  const color = b.isYou ? YOU_COLOR : competitorColor(b.name);
                  const rank = bi + 1;
                  return (
                    <li
                      key={b.name}
                      className="flex items-center gap-2.5 px-2 py-1 rounded-[var(--radius-sm)]"
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
                        className="tabular-nums shrink-0 text-[var(--color-fg-muted)]"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          width: 14,
                          textAlign: "right",
                        }}
                      >
                        {rank}
                      </span>
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="truncate"
                        style={{
                          fontSize: 12,
                          fontWeight: b.isYou ? 700 : 500,
                          color: b.isYou
                            ? "var(--color-fg)"
                            : "var(--color-fg-secondary)",
                          width: 130,
                        }}
                        title={b.name}
                      >
                        {b.isYou ? "You" : b.name}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
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
                          width: 36,
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

                {/* Empty slots — dashed CTA rows for free/plus plans */}
                {Array.from({ length: emptyPerCluster }).map((_, i) => {
                  const slotRank = visibleBrands.length + i + 1;
                  const canAddMore = competitorLimit < MAX_COMPETITORS;
                  const Icon = canAddMore ? Plus : Crown;
                  return (
                    <li
                      key={`empty-${i}`}
                      className="flex items-center gap-2.5 px-2 py-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30"
                    >
                      <span
                        className="tabular-nums shrink-0 text-[var(--color-fg-muted)] opacity-50"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          width: 14,
                          textAlign: "right",
                        }}
                      >
                        {slotRank}
                      </span>
                      <span className="h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 border border-dashed border-[var(--color-border)]">
                        <Icon className="h-2 w-2 text-[var(--color-fg-muted)]" />
                      </span>
                      <span
                        className="truncate text-[var(--color-fg-muted)]"
                        style={{ fontSize: 11, fontWeight: 500, width: 130 }}
                      >
                        {canAddMore ? "Add competitor" : "Upgrade to add"}
                      </span>
                      <a
                        href={canAddMore ? "/settings" : "/settings/billing"}
                        className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-alt)]/40 border border-dashed border-[var(--color-border)]/50"
                      />
                      <span
                        className="tabular-nums shrink-0 text-right text-[var(--color-fg-muted)]"
                        style={{ fontSize: 11, width: 36 }}
                      >
                        —
                      </span>
                    </li>
                  );
                })}
              </ol>

              {isTopGap && (
                <a
                  href="#"
                  className="mt-2.5 group inline-flex items-center gap-1 text-[12px] font-semibold text-[#B54631] hover:opacity-80 transition-opacity"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate content brief for {c.label.toLowerCase()}
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
