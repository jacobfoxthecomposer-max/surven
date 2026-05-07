"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SURVEN_SEMANTIC, SURVEN_THRESHOLDS, colorForValue } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";
import type { SentimentDataPoint } from "@/features/sentiment/hooks/useSentimentHistory";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface Props {
  results: ScanResult[];
  history: SentimentDataPoint[];
}

interface Row {
  key: string;
  label: string;
  hint: string;
  status: string;
  statusColor: string;
  value: string;
  valueColor: string;
  delta: number | null;
  href: string;
  icon?: ModelName;
  detail: ReactNode;
}

function statusFromPositiveRate(pct: number): { word: string; color: string } {
  if (pct >= 70) return { word: "STRONG", color: SURVEN_SEMANTIC.good };
  if (pct >= 40) return { word: "MIXED", color: SURVEN_SEMANTIC.mid };
  return { word: "CONCERNING", color: SURVEN_SEMANTIC.bad };
}

function statusFromNegativeCount(count: number, total: number): { word: string; color: string } {
  if (total === 0) return { word: "NO DATA", color: SURVEN_SEMANTIC.neutral };
  const rate = count / total;
  if (count === 0) return { word: "CLEAN", color: SURVEN_SEMANTIC.good };
  if (rate < 0.1) return { word: "LOW", color: SURVEN_SEMANTIC.mid };
  return { word: "ELEVATED", color: SURVEN_SEMANTIC.bad };
}

function truncate(text: string, n: number): string {
  return text.length > n ? text.slice(0, n).trim() + "…" : text;
}

export function SentimentMetricRows({ results, history }: Props) {
  const rows = useMemo<Row[]>(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    if (total === 0) return [];

    const positiveResults = mentioned.filter((r) => r.sentiment === "positive");
    const neutralResults = mentioned.filter((r) => r.sentiment === "neutral");
    const negativeResults = mentioned.filter((r) => r.sentiment === "negative");

    const positiveCount = positiveResults.length;
    const neutralCount = neutralResults.length;
    const negativeCount = negativeResults.length;
    const positivePct = Math.round((positiveCount / total) * 100);
    const neutralPct = Math.round((neutralCount / total) * 100);
    const negativePct = Math.round((negativeCount / total) * 100);

    const positiveDelta = history.length >= 2
      ? history[history.length - 1].positivePct - history[history.length - 2].positivePct
      : null;

    const negativeDelta = history.length >= 2
      ? history[history.length - 1].negativePct - history[history.length - 2].negativePct
      : null;

    const models: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    const perModel = models.map((m) => {
      const mm = mentioned.filter((r) => r.model_name === m);
      const t = mm.length;
      if (t === 0) return null;
      const pos = mm.filter((r) => r.sentiment === "positive").length;
      const neg = mm.filter((r) => r.sentiment === "negative").length;
      return { model: m, total: t, pos, neg, positivePct: Math.round((pos / t) * 100) };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const sortedByPositive = [...perModel].sort((a, b) => b.positivePct - a.positivePct);
    const best = sortedByPositive[0] ?? null;
    const worst = sortedByPositive.length > 1 ? sortedByPositive[sortedByPositive.length - 1] : null;

    const positiveStatus = statusFromPositiveRate(positivePct);
    const negativeStatus = statusFromNegativeCount(negativeCount, total);

    const out: Row[] = [];

    // Row 1 — Positive sentiment rate. Detail: stacked breakdown bar + counts.
    out.push({
      key: "positive",
      label: "Positive sentiment rate",
      hint: "Share of AI mentions that describe your brand favorably. 70%+ is healthy. Below 40% means most mentions are critical or lukewarm.",
      status: positiveStatus.word,
      statusColor: positiveStatus.color,
      value: `${positivePct}%`,
      valueColor: colorForValue(positivePct, SURVEN_THRESHOLDS.sentimentPositive),
      delta: positiveDelta,
      href: "/prompts",
      detail: (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-[120px] max-w-[220px]">
            <div className="h-1.5 rounded-full overflow-hidden flex bg-[var(--color-border)]">
              {positivePct > 0 && <div className="h-full" style={{ width: `${positivePct}%`, background: SURVEN_SEMANTIC.goodAlt }} />}
              {neutralPct > 0 && <div className="h-full" style={{ width: `${neutralPct}%`, background: SURVEN_SEMANTIC.neutral }} />}
              {negativePct > 0 && <div className="h-full" style={{ width: `${negativePct}%`, background: SURVEN_SEMANTIC.bad }} />}
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-[var(--color-fg-muted)] whitespace-nowrap">
            <span><span style={{ color: SURVEN_SEMANTIC.good, fontWeight: 600 }}>{positiveCount}</span> pos</span>
            <span>{neutralCount} neu</span>
            <span><span style={{ color: SURVEN_SEMANTIC.bad, fontWeight: 600 }}>{negativeCount}</span> neg</span>
          </div>
        </div>
      ),
    });

    // Row 2 — Negative signals. Detail: actual negative prompts with engine icons.
    out.push({
      key: "negative",
      label: "Negative signals",
      hint: "Mentions where AI used critical or dismissive language. Each one is a specific prompt + engine combination worth fixing.",
      status: negativeStatus.word,
      statusColor: negativeStatus.color,
      value: negativeCount === 0 ? "0" : `${negativeCount}`,
      valueColor: negativeCount === 0 ? SURVEN_SEMANTIC.good : SURVEN_SEMANTIC.bad,
      delta: negativeDelta == null ? null : -negativeDelta,
      href: "/audit",
      detail: negativeCount === 0 ? (
        <span className="text-[11px] text-[var(--color-fg-muted)]">No negative mentions across any engine.</span>
      ) : (
        <div className="flex flex-col gap-1 min-w-0 max-w-[420px]">
          {negativeResults.slice(0, 2).map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] min-w-0">
              <EngineIcon id={r.model_name} size={11} />
              <span className="text-[var(--color-fg-muted)] shrink-0">{MODEL_LABELS[r.model_name]}</span>
              <span className="text-[var(--color-fg-secondary)] truncate">&ldquo;{truncate(r.prompt_text, 60)}&rdquo;</span>
            </div>
          ))}
          {negativeResults.length > 2 && (
            <span className="text-[10px] text-[var(--color-fg-muted)]">+{negativeResults.length - 2} more</span>
          )}
        </div>
      ),
    });

    // Row 3 — Strongest engine. Detail: pos/neg breakdown + top positive prompt on that engine.
    if (best) {
      const bestStatus = statusFromPositiveRate(best.positivePct);
      const topPositiveOnBest = positiveResults.find((r) => r.model_name === best.model);
      out.push({
        key: "best",
        label: "Strongest engine",
        hint: "The AI engine where your brand gets the highest share of positive mentions.",
        status: bestStatus.word,
        statusColor: bestStatus.color,
        value: `${best.positivePct}%`,
        valueColor: bestStatus.color,
        delta: null,
        href: "/competitor-comparison",
        icon: best.model,
        detail: (
          <div className="flex flex-col gap-0.5 min-w-0 max-w-[420px]">
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-fg-muted)] whitespace-nowrap">
              <span><span style={{ color: SURVEN_SEMANTIC.good, fontWeight: 600 }}>{best.pos}</span> positive</span>
              <span>·</span>
              <span>{best.total} total mention{best.total !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span><span style={{ color: SURVEN_SEMANTIC.bad, fontWeight: 600 }}>{best.neg}</span> negative</span>
            </div>
            {topPositiveOnBest && (
              <span className="text-[11px] text-[var(--color-fg-secondary)] truncate">
                Top: &ldquo;{truncate(topPositiveOnBest.prompt_text, 70)}&rdquo;
              </span>
            )}
          </div>
        ),
      });
    }

    // Row 4 — Weakest engine. Detail: pos/neg breakdown + worst (negative or neutral) prompt on that engine.
    if (worst && worst.model !== best?.model) {
      const worstStatus = statusFromPositiveRate(worst.positivePct);
      const worstPromptOnEngine =
        negativeResults.find((r) => r.model_name === worst.model) ??
        neutralResults.find((r) => r.model_name === worst.model);
      out.push({
        key: "worst",
        label: "Weakest engine",
        hint: "The AI engine where your brand has the lowest share of positive mentions — your highest-leverage fix.",
        status: worstStatus.word,
        statusColor: worstStatus.color,
        value: `${worst.positivePct}%`,
        valueColor: worstStatus.color,
        delta: null,
        href: "/audit",
        icon: worst.model,
        detail: (
          <div className="flex flex-col gap-0.5 min-w-0 max-w-[420px]">
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-fg-muted)] whitespace-nowrap">
              <span><span style={{ color: SURVEN_SEMANTIC.good, fontWeight: 600 }}>{worst.pos}</span> positive</span>
              <span>·</span>
              <span>{worst.total} total mention{worst.total !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span><span style={{ color: SURVEN_SEMANTIC.bad, fontWeight: 600 }}>{worst.neg}</span> negative</span>
            </div>
            {worstPromptOnEngine && (
              <span className="text-[11px] text-[var(--color-fg-secondary)] truncate">
                Worst: &ldquo;{truncate(worstPromptOnEngine.prompt_text, 70)}&rdquo;
              </span>
            )}
          </div>
        ),
      });
    }

    return out;
  }, [results, history]);

  if (rows.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      {rows.map((row, i) => (
        <div
          key={row.key}
          className={
            "flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-surface-alt)]/40 transition-colors " +
            (i > 0 ? "border-t border-[var(--color-border)]" : "")
          }
        >
          {/* Status pill */}
          <div
            className="shrink-0 px-2.5 py-1 rounded-[var(--radius-sm)] flex items-center justify-center"
            style={{ background: `${row.statusColor}1A`, minWidth: 96 }}
          >
            <span className="text-[10px] font-bold tracking-wider" style={{ color: row.statusColor }}>
              {row.status}
            </span>
          </div>

          {/* Compact label + value + delta — all left-grouped */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {row.icon && <EngineIcon id={row.icon} size={13} />}
              <span className="text-sm font-medium text-[var(--color-fg)]">{row.label}</span>
              <HoverHint hint={row.hint} placement="top">
                <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
              </HoverHint>
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1,
                color: row.valueColor,
              }}
            >
              {row.value}
            </span>
            {row.delta != null && row.delta !== 0 && (
              <BadgeDelta
                deltaType={row.delta > 0 ? "increase" : "decrease"}
                value={`${row.delta > 0 ? "+" : ""}${row.delta}%`}
                variant="solid"
              />
            )}
          </div>

          {/* Vertical divider */}
          <div className="h-8 w-px bg-[var(--color-border)] shrink-0" />

          {/* Inline data preview — actual content, not a link */}
          <div className="flex-1 min-w-0">
            {row.detail}
          </div>

          {/* Subtle drill-in arrow */}
          <Link
            href={row.href}
            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-alt)] transition-colors"
            style={{ color: SURVEN_SEMANTIC.good }}
            aria-label="View more"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ))}
    </Card>
  );
}
