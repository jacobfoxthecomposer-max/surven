"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
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

interface GapItem {
  prompt: string;
  competitor: string | null;
  models: string[];
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
  const { gaps, advantages } = useMemo(() => {
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

    return {
      // Sort by engines covered descending — most-covered = highest leverage.
      gaps: Array.from(gapMap.values())
        .sort((a, b) => b.models.length - a.models.length)
        .slice(0, 3),
      advantages: Array.from(advantageMap.values())
        .sort((a, b) => b.models.length - a.models.length)
        .slice(0, 3),
    };
  }, [results, competitors]);

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] flex flex-col h-full overflow-hidden"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      {/* Header band — same sage→amber→rust gradient as before. */}
      <div
        className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
          >
            <Sparkles className="h-4 w-4" style={{ color: COLORS.primary }} />
          </div>
          <SectionHeading
            text="Ways to take the lead"
            info="The highest-impact prompts to close gaps on and to defend, derived from your scan."
          />
        </div>
        <p
          className="text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13.5 }}
        >
          Top 3 of each. Click any row to view it in Prompt Tracker.
        </p>
      </div>

      {/* Two nested mini-cards — gaps first, wins second (stacked vertically
          to fit the narrow right column). */}
      <div className="p-4 flex-1 flex flex-col gap-4 min-w-0">
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

  const summary =
    variant === "gaps"
      ? "Prompts where a competitor is cited and you aren't — highest-leverage targets."
      : "You're cited and the competitor isn't — defend and amplify these positions.";

  const emptyText =
    variant === "gaps"
      ? "No gaps found — you match every competitor on every prompt."
      : "No solo wins yet — keep building visibility on category prompts.";

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
      {/* Mini gradient header */}
      <div
        className="px-4 py-3"
        style={{
          background: palette.gradient,
          borderLeft: `3px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <HeaderIcon
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: palette.accent }}
          />
          <p
            className="uppercase font-semibold"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: palette.accentText,
            }}
          >
            {palette.tag}
          </p>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 500,
            color: "var(--color-fg)",
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        <p
          className="mt-1 text-[var(--color-fg-secondary)]"
          style={{ fontSize: 12, lineHeight: 1.45 }}
        >
          {summary}
        </p>
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <p
          className="text-[var(--color-fg-muted)] p-4 text-center"
          style={{ fontSize: 12 }}
        >
          {emptyText}
        </p>
      ) : (
        <div className="px-3 pt-2 pb-2 space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 flex items-start gap-2.5 hover:bg-[var(--color-surface-alt)]/40 transition-colors"
            >
              <div
                className="h-7 w-7 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={{ backgroundColor: palette.tileBg }}
              >
                <RowIcon className="h-3.5 w-3.5" style={{ color: palette.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="leading-snug"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-fg)",
                    letterSpacing: "-0.005em",
                    lineHeight: 1.25,
                  }}
                >
                  &ldquo;{item.prompt}&rdquo;
                </p>
                <p
                  className="text-[var(--color-fg-muted)] mt-1"
                  style={{ fontSize: 11.5, lineHeight: 1.4 }}
                >
                  {variant === "gaps"
                    ? `${item.competitor} is cited by ${item.models.join(", ")} — ${businessName} isn't.`
                    : `Cited by ${item.models.join(", ")} — no competitor mentioned.`}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.models.map((m) => (
                    <span
                      key={m}
                      className="rounded px-1.5 py-0.5 font-semibold"
                      style={{
                        fontSize: 9,
                        backgroundColor: `${palette.accent}18`,
                        color: palette.accentText,
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <Link
                  href="/prompts"
                  className="group inline-flex items-center gap-1 mt-1.5 font-semibold transition-opacity hover:opacity-80"
                  style={{ fontSize: 11.5, color: palette.accentText }}
                >
                  View in Prompt Tracker
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer CTA */}
      <div className="px-4 py-2.5 border-t border-[var(--color-border)] mt-auto">
        <Link
          href={footerHref}
          className="group inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
          style={{ fontSize: 12, color: palette.accentText }}
        >
          {variant === "gaps" ? (
            <Target className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          )}
          {footerLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
