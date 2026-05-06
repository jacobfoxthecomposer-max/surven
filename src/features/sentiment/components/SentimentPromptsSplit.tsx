"use client";

/**
 * Two-zone prompt scorecard for the Brand Sentiment page. Stacks the
 * top-performing prompts (positive verdict) on top of the needs-attention
 * prompts (negative verdict). Each side is capped at 3 rows so the card
 * height stays bounded — matches Joey's "max 4-5 prompts" rule.
 *
 * Visually mirrors the existing prompts-page row treatment: compact prompt
 * line + sentiment pill + engine icon row + per-row hover affordance.
 */
import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ModelName, ScanResult } from "@/types/database";

interface PromptAggregate {
  prompt: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  engines: Set<ModelName>;
  netScore: number; // positive minus negative — higher = better
}

function aggregatePrompts(results: ScanResult[]): PromptAggregate[] {
  const map = new Map<string, PromptAggregate>();
  for (const r of results) {
    if (!r.business_mentioned || !r.sentiment) continue;
    const key = r.prompt_text;
    const a: PromptAggregate =
      map.get(key) ?? {
        prompt: r.prompt_text,
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
        engines: new Set<ModelName>(),
        netScore: 0,
      };
    a.total += 1;
    if (r.sentiment === "positive") a.positive += 1;
    else if (r.sentiment === "negative") a.negative += 1;
    else a.neutral += 1;
    a.engines.add(r.model_name as ModelName);
    map.set(key, a);
  }
  return Array.from(map.values()).map((a) => ({
    ...a,
    netScore: a.positive - a.negative,
  }));
}

export function SentimentPromptsSplit({
  results,
}: {
  results: ScanResult[];
}) {
  const all = useMemo(() => aggregatePrompts(results), [results]);

  // Top 3 by raw positive count (no strict positive-net filter — if the
  // user only has one truly positive prompt we still surface the next
  // best 2 so the column always reads as a leaderboard, not a stub).
  const strong = useMemo(
    () =>
      [...all]
        .sort(
          (a, b) =>
            b.positive - a.positive ||
            b.netScore - a.netScore ||
            b.total - a.total,
        )
        .slice(0, 3),
    [all],
  );

  // Top 3 prompts most worth fixing — ranked by raw negative count first,
  // then by lowest net positive (so a fully-neutral prompt scores ahead
  // of a strongly-positive one even when neither has a negative mention).
  const needsAttention = useMemo(
    () =>
      [...all]
        .sort(
          (a, b) =>
            b.negative - a.negative ||
            a.netScore - b.netScore ||
            b.total - a.total,
        )
        .slice(0, 3),
    [all],
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full w-full min-w-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        <SectionHeading
          text="Prompts by sentiment"
          info="Your top-performing prompts (where AI consistently frames you well) and your needs-attention prompts (where AI returns critical or dismissive language). Capped at 3 per side to keep the card scannable."
        />
        <Link
          href="/prompts"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] hover:underline"
        >
          View all prompts
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Two-zone body. Each zone has a tinted background so the split
          reads visually even when one side is empty, and uses flex-1 so
          they evenly fill any extra height the parent grid hands them. */}
      <div className="flex-1 grid grid-rows-2 divide-y divide-[var(--color-border)]">
        <PromptGroup
          variant="strong"
          label="Top performing"
          emptyMessage="No prompts have a clear positive lean yet — keep publishing testimonials and case studies on your highest-traffic pages."
          prompts={strong}
        />
        <PromptGroup
          variant="needs-attention"
          label="Needs attention"
          emptyMessage="Nothing flagged — no prompt is generating net-negative framing about your brand right now."
          prompts={needsAttention}
        />
      </div>
    </div>
  );
}

function PromptGroup({
  variant,
  label,
  emptyMessage,
  prompts,
}: {
  variant: "strong" | "needs-attention";
  label: string;
  emptyMessage: string;
  prompts: PromptAggregate[];
}) {
  const accent =
    variant === "strong" ? SURVEN_SEMANTIC.good : SURVEN_SEMANTIC.bad;
  const accentBg =
    variant === "strong"
      ? "rgba(150,162,131,0.18)"
      : "rgba(181,70,49,0.14)";
  const sectionTint =
    variant === "strong"
      ? "linear-gradient(180deg, rgba(150,162,131,0.06) 0%, rgba(150,162,131,0.01) 100%)"
      : "linear-gradient(180deg, rgba(181,70,49,0.05) 0%, rgba(181,70,49,0.01) 100%)";
  const Icon = variant === "strong" ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className="px-5 py-4 flex flex-col gap-3 min-h-0 overflow-hidden"
      style={{ background: sectionTint }}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
        <span
          className="uppercase tracking-wider font-semibold"
          style={{ fontSize: 10.5, letterSpacing: "0.1em", color: accent }}
        >
          {label}
        </span>
        <span
          className="ml-auto inline-flex items-center text-[11px] font-semibold rounded-md px-1.5 py-0.5"
          style={{ color: accent, backgroundColor: accentBg }}
        >
          {prompts.length}
        </span>
      </div>

      {prompts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="flex flex-col items-center gap-2 max-w-[260px]">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: accentBg }}
            >
              <Icon className="h-4 w-4" style={{ color: accent }} />
            </div>
            <p
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 12, lineHeight: 1.5 }}
            >
              {emptyMessage}
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex-1 space-y-1.5 overflow-hidden">
          {prompts.map((p, i) => {
            // Deep-link to the matching row on the Tracked Prompts table.
            // The /prompts page reads ?focus=<text>, normalizes it, finds
            // the matching prompt, expands + scrolls + flashes it. Hash
            // ensures the page jumps to the table on landing.
            const focusHref =
              `/prompts?focus=${encodeURIComponent(p.prompt)}#prompts-table`;
            return (
              <li
                key={i}
                className="rounded-[var(--radius-md)] border px-3 py-2 flex items-start gap-3 group transition-colors hover:bg-[var(--color-surface-alt)]/40"
                style={{
                  background: "var(--color-surface)",
                  borderColor: `${accent}33`,
                }}
              >
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accentBg }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[var(--color-fg)] truncate"
                    style={{ fontSize: 12.5, lineHeight: 1.3, fontWeight: 600 }}
                    title={p.prompt}
                  >
                    &ldquo;{p.prompt}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {Array.from(p.engines)
                        .slice(0, 4)
                        .map((e) => (
                          <EngineIcon key={e} id={e} size={11} />
                        ))}
                      <span
                        className="text-[var(--color-fg-muted)] ml-1 tabular-nums whitespace-nowrap"
                        style={{ fontSize: 10.5 }}
                      >
                        {variant === "strong" ? `${p.positive} pos` : `${p.negative} neg`}{" "}
                        · {p.total} total
                      </span>
                    </div>
                    <Link
                      href={focusHref}
                      className="ml-auto inline-flex items-center gap-0.5 font-semibold whitespace-nowrap hover:underline transition-opacity opacity-80 group-hover:opacity-100"
                      style={{ fontSize: 10.5, color: accent }}
                      aria-label={`View this prompt on the Tracked Prompts page: ${p.prompt}`}
                    >
                      View prompt
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
                <span
                  className="shrink-0 inline-flex items-center text-[11px] font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
                  style={{ color: accent, backgroundColor: accentBg }}
                >
                  {variant === "strong"
                    ? `+${p.netScore}`
                    : `${p.netScore}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
