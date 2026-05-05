"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import type { ScanResult, ModelName } from "@/types/database";

const COLORS = {
  primary: "#96A283",
  primaryHover: "#7D8E6C",
};

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

const GAPS_PALETTE = {
  accent: "#C97B45",
  accentText: "#8C5A1E",
  gradient:
    "linear-gradient(135deg, rgba(199,123,69,0.20) 0%, rgba(199,123,69,0.03) 100%)",
  tileBg: "rgba(199,123,69,0.18)",
  HeaderIcon: AlertTriangle,
  tag: "WHAT TO CLOSE",
  rowIcon: AlertTriangle,
};

const WINS_PALETTE = {
  accent: "#96A283",
  accentText: "#4A5E3A",
  gradient:
    "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.04) 100%)",
  tileBg: "rgba(150,162,131,0.20)",
  HeaderIcon: Sparkles,
  tag: "WHERE YOU'RE WINNING",
  rowIcon: CheckCircle2,
};

const ENGINE_PALETTE = {
  accent: "#7E6B17",
  accentText: "#5C4D0E",
  gradient:
    "linear-gradient(135deg, rgba(184,160,48,0.18) 0%, rgba(184,160,48,0.03) 100%)",
  tileBg: "rgba(184,160,48,0.18)",
  HeaderIcon: Swords,
  tag: "ENGINES TO FOCUS",
  rowIcon: Cpu,
};

interface GapItem {
  prompt: string;
  competitor: string | null;
  models: string[];
}

interface EngineGap {
  /** Display label like "ChatGPT". */
  engine: string;
  /** Top competitor on this engine. */
  competitor: string;
  /** Their visibility on this engine, 0–100. */
  competitorPct: number;
  /** Your visibility on this engine, 0–100. */
  yourPct: number;
  /** competitorPct - yourPct, used for sorting. */
  gap: number;
}

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
}

export function CompetitorFixActions({
  results,
  businessName,
  competitors,
}: Props) {
  const { gaps, advantages, engineGaps } = useMemo(() => {
    const gapMap = new Map<string, GapItem>();
    const advantageMap = new Map<string, GapItem>();

    for (const r of results) {
      if (!r.competitor_mentions) continue;

      for (const competitor of competitors) {
        const competitorMentioned = r.competitor_mentions[competitor] === true;
        const clientMentioned = r.business_mentioned;
        const key = `${competitor}||${r.prompt_text}`;
        const modelLabel = MODEL_LABELS[r.model_name as ModelName] ?? r.model_name;

        if (competitorMentioned && !clientMentioned) {
          const existing = gapMap.get(key);
          if (existing) {
            if (!existing.models.includes(modelLabel))
              existing.models.push(modelLabel);
          } else {
            gapMap.set(key, {
              prompt: r.prompt_text,
              competitor,
              models: [modelLabel],
            });
          }
        }

        if (clientMentioned && !competitorMentioned) {
          // Advantage rows are per-prompt, not per-competitor — collapse so
          // the same prompt with multiple "uncited" competitors doesn't
          // appear three times.
          const advKey = r.prompt_text;
          const existing = advantageMap.get(advKey);
          if (existing) {
            if (!existing.models.includes(modelLabel))
              existing.models.push(modelLabel);
          } else {
            advantageMap.set(advKey, {
              prompt: r.prompt_text,
              competitor: null,
              models: [modelLabel],
            });
          }
        }
      }
    }

    // ── Engine-level head-to-head ─────────────────────────────────────
    // For each engine we compute: your visibility %, every competitor's
    // visibility %, and surface the largest gap. Pulls from the same scan
    // data as the Visibility Leaderboard / Average-Rank chart on this page,
    // so the panel becomes a direct call-to-action for those visuals.
    const engines: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    const engineGapList: EngineGap[] = [];
    for (const m of engines) {
      const modelResults = results.filter((r) => r.model_name === m);
      if (modelResults.length === 0) continue;
      const yourPct = Math.round(
        (modelResults.filter((r) => r.business_mentioned).length /
          modelResults.length) *
          100,
      );
      let topCompetitor: string | null = null;
      let topPct = 0;
      for (const c of competitors) {
        const relevant = modelResults.filter(
          (r) => r.competitor_mentions && c in r.competitor_mentions,
        );
        if (relevant.length === 0) continue;
        const compPct = Math.round(
          (relevant.filter((r) => r.competitor_mentions[c]).length /
            relevant.length) *
            100,
        );
        if (compPct > topPct) {
          topPct = compPct;
          topCompetitor = c;
        }
      }
      if (topCompetitor && topPct > yourPct) {
        engineGapList.push({
          engine: MODEL_LABELS[m],
          competitor: topCompetitor,
          competitorPct: topPct,
          yourPct,
          gap: topPct - yourPct,
        });
      }
    }
    engineGapList.sort((a, b) => b.gap - a.gap);

    return {
      // Sort by engines covered descending — most-covered = highest leverage.
      gaps: Array.from(gapMap.values())
        .sort((a, b) => b.models.length - a.models.length)
        .slice(0, 3),
      advantages: Array.from(advantageMap.values())
        .sort((a, b) => b.models.length - a.models.length)
        .slice(0, 3),
      engineGaps: engineGapList.slice(0, 3),
    };
  }, [results, competitors]);

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] flex flex-col h-full overflow-hidden"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      {/* Header band — same sage→amber→rust gradient as before. Tightened
          padding so the panel can match the data row's height on the left. */}
      <div
        className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2.5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div
          className="h-7 w-7 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />
        </div>
        <SectionHeading
          text="Ways to take the lead"
          info="The highest-impact prompts to close gaps on and to defend, derived from your scan."
        />
      </div>

      {/* Three nested mini-cards — engine head-to-head, gaps, wins. All
          stacked vertically to fit the narrow right column. */}
      <div className="p-3 flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        <NestedEngineCard items={engineGaps} businessName={businessName} />
        <NestedGapCard
          variant="gaps"
          items={gaps}
          businessName={businessName}
          footerHref="/audit"
          footerLabel="Diagnose gaps in a GEO audit"
        />
        <NestedGapCard
          variant="winning"
          items={advantages}
          businessName={businessName}
          footerHref="/citation-insights"
          footerLabel="See citation sources powering these wins"
        />
      </div>
    </div>
  );
}

function NestedGapCard({
  variant,
  items,
  businessName,
  footerHref,
  footerLabel,
}: {
  variant: "gaps" | "winning";
  items: GapItem[];
  businessName: string;
  footerHref: string;
  footerLabel: string;
}) {
  const palette = variant === "gaps" ? GAPS_PALETTE : WINS_PALETTE;
  const HeaderIcon = palette.HeaderIcon;
  const RowIcon = palette.rowIcon;

  const title =
    variant === "gaps"
      ? `${items.length} ${items.length === 1 ? "gap" : "gaps"} to close`
      : `${items.length} ${items.length === 1 ? "prompt" : "prompts"} you own`;

  // Trailing summary sits inline to the right of the title to keep the
  // header tight (was a 2-line block above; the lead-in sentence got cut).
  const summary =
    variant === "gaps"
      ? "highest-leverage targets"
      : "defend and amplify these positions";

  const emptyText =
    variant === "gaps"
      ? "No gaps found — you match every competitor on every prompt."
      : "No solo wins yet — keep building visibility on category prompts.";

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
      {/* Mini gradient header — single row: tag + title inline + summary on
          the right. Halves the vertical footprint vs. the prior 2-line block. */}
      <div
        className="px-3 py-2"
        style={{
          background: palette.gradient,
          borderLeft: `3px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <HeaderIcon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: palette.accent }}
            />
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-fg)",
                letterSpacing: "-0.005em",
                lineHeight: 1.15,
              }}
            >
              {title}
            </h3>
          </div>
          <p
            className="text-[var(--color-fg-muted)]"
            style={{ fontSize: 11, lineHeight: 1.3 }}
          >
            {summary}
          </p>
        </div>
      </div>

      {/* Rows — entire row is a Link (drops the separate per-row CTA, since
          tapping anywhere on the row already routes to Prompt Tracker). */}
      {items.length === 0 ? (
        <p
          className="text-[var(--color-fg-muted)] p-3 text-center"
          style={{ fontSize: 11.5 }}
        >
          {emptyText}
        </p>
      ) : (
        <div className="px-2 pt-1.5 pb-1.5 space-y-1.5">
          {items.map((item, idx) => (
            <Link
              key={idx}
              href="/prompts"
              className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 hover:bg-[var(--color-surface-alt)]/50 hover:border-[var(--color-border-hover)] transition-colors"
            >
              <div className="flex items-start gap-2">
                <RowIcon
                  className="h-3.5 w-3.5 shrink-0 mt-0.5"
                  style={{ color: palette.accent }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="leading-snug"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-fg)",
                      letterSpacing: "-0.005em",
                      lineHeight: 1.2,
                    }}
                  >
                    &ldquo;{item.prompt}&rdquo;
                  </p>
                  <p
                    className="text-[var(--color-fg-muted)] mt-0.5"
                    style={{ fontSize: 10.5, lineHeight: 1.35 }}
                  >
                    {variant === "gaps"
                      ? `${item.competitor} cited by ${item.models.join(", ")} — ${businessName} isn't`
                      : `Cited by ${item.models.join(", ")} — no competitor mentioned`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer CTA */}
      <div className="px-3 py-1.5 border-t border-[var(--color-border)] mt-auto">
        <Link
          href={footerHref}
          className="group inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
          style={{ fontSize: 11.5, color: palette.accentText }}
        >
          {variant === "gaps" ? (
            <Target className="h-3 w-3 shrink-0" />
          ) : (
            <TrendingUp className="h-3 w-3 shrink-0" />
          )}
          {footerLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

// ─── Engine head-to-head mini-card ───────────────────────────────────────
// Top 3 engines (ChatGPT/Claude/Gemini/Google AI) where one competitor's
// visibility is the furthest above yours. Pulls from the same scan data
// the page's Visibility Leaderboard + Average-Rank chart use, so this
// card is a compact "where to direct your fix" callout for those visuals.
function NestedEngineCard({
  items,
  businessName,
}: {
  items: EngineGap[];
  businessName: string;
}) {
  const palette = ENGINE_PALETTE;
  const HeaderIcon = palette.HeaderIcon;
  const RowIcon = palette.rowIcon;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
      <div
        className="px-3 py-2"
        style={{
          background: palette.gradient,
          borderLeft: `3px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <HeaderIcon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: palette.accent }}
            />
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-fg)",
                letterSpacing: "-0.005em",
                lineHeight: 1.15,
              }}
            >
              {`${items.length} ${items.length === 1 ? "engine" : "engines"} to focus on`}
            </h3>
          </div>
          <p
            className="text-[var(--color-fg-muted)]"
            style={{ fontSize: 11, lineHeight: 1.3 }}
          >
            biggest competitor lead per engine
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p
          className="text-[var(--color-fg-muted)] p-3 text-center"
          style={{ fontSize: 11.5 }}
        >
          {`No engine where a competitor outranks ${businessName} — keep scanning weekly to catch new gaps.`}
        </p>
      ) : (
        <div className="px-2 pt-1.5 pb-1.5 space-y-1.5">
          {items.map((g) => (
            <div
              key={g.engine}
              className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
            >
              <div className="flex items-start gap-2">
                <RowIcon
                  className="h-3.5 w-3.5 shrink-0 mt-0.5"
                  style={{ color: palette.accent }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className="leading-snug"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-fg)",
                        letterSpacing: "-0.005em",
                        lineHeight: 1.2,
                      }}
                    >
                      {g.engine}
                    </p>
                    <span
                      className="rounded-full px-1.5 py-0.5 font-bold tabular-nums shrink-0"
                      style={{
                        fontSize: 10,
                        backgroundColor: `${palette.accent}1F`,
                        color: palette.accentText,
                      }}
                    >
                      +{g.gap}%
                    </span>
                  </div>
                  <p
                    className="text-[var(--color-fg-muted)] mt-0.5"
                    style={{ fontSize: 10.5, lineHeight: 1.35 }}
                  >
                    {`${g.competitor} ${g.competitorPct}% · ${businessName} ${g.yourPct}%`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-1.5 border-t border-[var(--color-border)] mt-auto">
        <Link
          href="/audit"
          className="group inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
          style={{ fontSize: 11.5, color: palette.accentText }}
        >
          <Cpu className="h-3 w-3 shrink-0" />
          Run an engine-specific audit
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
