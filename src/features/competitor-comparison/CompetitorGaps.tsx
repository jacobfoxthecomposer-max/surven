"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Target,
} from "lucide-react";
import Link from "next/link";
import type { ScanResult } from "@/types/database";

interface GapItem {
  prompt: string;
  competitor: string;
  models: string[];
}

interface CompetitorGapsProps {
  results: ScanResult[];
  competitors: string[];
}

const MODEL_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

const EASE = [0.16, 1, 0.3, 1] as const;

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

const PAGE_SIZE = 3;

function NavArrow({
  dir,
  onClick,
  disabled,
}: {
  dir: "up" | "down";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  const wrapperPad = dir === "up" ? "pt-2 pb-1" : "pt-1 pb-2";
  return (
    <div className={`flex justify-center ${wrapperPad}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={dir === "up" ? "Show previous" : "Show next"}
        className={
          "rounded-full p-1 transition-colors " +
          (disabled
            ? "text-[var(--color-border)] cursor-default"
            : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] cursor-pointer")
        }
      >
        <Icon className="h-5 w-5" />
      </button>
    </div>
  );
}

function GapInsightCard({
  variant,
  title,
  summary,
  items,
  footerHref,
  footerLabel,
}: {
  variant: "gaps" | "winning";
  title: string;
  summary: string;
  items: GapItem[];
  footerHref: string;
  footerLabel: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const visibleItems = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const palette = variant === "gaps" ? GAPS_PALETTE : WINS_PALETTE;
  const HeaderIcon = palette.HeaderIcon;
  const RowIcon = palette.rowIcon;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full overflow-hidden">
      {/* Gradient header — matches InsightCard exactly */}
      <div
        className="p-5"
        style={{
          background: palette.gradient,
          borderLeft: `4px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <HeaderIcon
            className="h-4 w-4 shrink-0"
            style={{ color: palette.accent }}
          />
          <p
            className="uppercase font-semibold"
            style={{
              fontSize: 11,
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
            fontSize: 28,
            fontWeight: 500,
            color: "var(--color-fg)",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h3>
        <p
          className="mt-1.5 text-[var(--color-fg-secondary)]"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {summary}
        </p>
      </div>

      {/* Sub-cards */}
      {items.length === 0 ? (
        <p
          className="flex-1 flex items-center justify-center text-[var(--color-fg-muted)] p-6 text-center"
          style={{ fontSize: 13 }}
        >
          {variant === "gaps"
            ? "No gaps found — you're keeping up with every competitor on every prompt."
            : "No clear advantages yet — keep building visibility on category prompts."}
        </p>
      ) : (
        <div className="flex-1 flex flex-col px-4 pb-2">
          <NavArrow
            dir="up"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          />

          {/* Cards */}
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="space-y-3"
          >
            {visibleItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex items-start gap-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors"
              >
                {/* Icon tile */}
                <div
                  className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: palette.tileBg }}
                >
                  <RowIcon className="h-4 w-4" style={{ color: palette.accent }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="leading-snug"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      fontWeight: 500,
                      color: "var(--color-fg)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                    }}
                  >
                    &ldquo;{item.prompt}&rdquo;
                  </p>
                  <p
                    className="text-[var(--color-fg-muted)] mt-1"
                    style={{ fontSize: 12.5, lineHeight: 1.5 }}
                  >
                    {variant === "gaps"
                      ? `${item.competitor} is cited by ${item.models.join(", ")} — you aren't. Close this gap.`
                      : `You're cited by ${item.models.join(", ")} — ${item.competitor} isn't. Defend this position.`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.models.map((m) => (
                      <span
                        key={m}
                        className="rounded px-1.5 py-0.5 font-semibold"
                        style={{
                          fontSize: 9.5,
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
                    className="group inline-flex items-center gap-1 mt-2 font-semibold transition-opacity hover:opacity-80"
                    style={{ fontSize: 12.5, color: palette.accentText }}
                  >
                    View in Prompt Tracker
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>

          <NavArrow
            dir="down"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          />
        </div>
      )}

      {/* Footer CTA */}
      <div className="px-5 py-3 border-t border-[var(--color-border)]">
        <Link
          href={footerHref}
          className="group inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
          style={{ fontSize: 12.5, color: palette.accentText }}
        >
          {variant === "gaps" ? (
            <Target className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          )}
          {footerLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

export function CompetitorGaps({
  results,
  competitors,
}: CompetitorGapsProps) {
  const { gaps, advantages } = useMemo(() => {
    const gapMap = new Map<string, GapItem>();
    const advantageMap = new Map<string, GapItem>();

    for (const r of results) {
      if (!r.competitor_mentions) continue;

      for (const competitor of competitors) {
        const competitorMentioned = r.competitor_mentions[competitor] === true;
        const clientMentioned = r.business_mentioned;
        const key = `${competitor}||${r.prompt_text}`;
        const modelLabel = MODEL_LABELS[r.model_name] ?? r.model_name;

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
          const existing = advantageMap.get(key);
          if (existing) {
            if (!existing.models.includes(modelLabel))
              existing.models.push(modelLabel);
          } else {
            advantageMap.set(key, {
              prompt: r.prompt_text,
              competitor,
              models: [modelLabel],
            });
          }
        }
      }
    }

    return {
      gaps: Array.from(gapMap.values()).slice(0, 8),
      advantages: Array.from(advantageMap.values()).slice(0, 8),
    };
  }, [results, competitors]);

  if (gaps.length === 0 && advantages.length === 0) return null;

  return (
    <section id="gaps-section">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <GapInsightCard
          variant="gaps"
          title={`${gaps.length} gap${gaps.length === 1 ? "" : "s"} to close`}
          summary="Prompts where a competitor is cited and you aren't — highest-leverage optimization targets."
          items={gaps}
          footerHref="/audit"
          footerLabel="Diagnose gaps in a GEO audit"
        />
        <GapInsightCard
          variant="winning"
          title={`${advantages.length} prompt${advantages.length === 1 ? "" : "s"} you own`}
          summary="You're cited and the competitor isn't — defend and amplify these positions."
          items={advantages}
          footerHref="/citation-insights"
          footerLabel="See citation sources powering these wins"
        />
      </div>
    </section>
  );
}
