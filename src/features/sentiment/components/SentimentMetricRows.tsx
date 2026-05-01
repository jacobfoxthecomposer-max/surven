"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
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
  cta: string;
  icon?: ModelName;
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

export function SentimentMetricRows({ results, history }: Props) {
  const rows = useMemo<Row[]>(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    if (total === 0) return [];

    const positiveCount = mentioned.filter((r) => r.sentiment === "positive").length;
    const negativeCount = mentioned.filter((r) => r.sentiment === "negative").length;
    const positivePct = Math.round((positiveCount / total) * 100);

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
      return { model: m, total: t, positivePct: Math.round((pos / t) * 100) };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const sortedByPositive = [...perModel].sort((a, b) => b.positivePct - a.positivePct);
    const best = sortedByPositive[0] ?? null;
    const worst = sortedByPositive.length > 1 ? sortedByPositive[sortedByPositive.length - 1] : null;

    const positiveStatus = statusFromPositiveRate(positivePct);
    const negativeStatus = statusFromNegativeCount(negativeCount, total);

    const out: Row[] = [
      {
        key: "positive",
        label: "Positive sentiment rate",
        hint: "Share of AI mentions that describe your brand favorably. 70%+ is healthy. Below 40% means most mentions are critical or lukewarm.",
        status: positiveStatus.word,
        statusColor: positiveStatus.color,
        value: `${positivePct}%`,
        valueColor: colorForValue(positivePct, SURVEN_THRESHOLDS.sentimentPositive),
        delta: positiveDelta,
        href: "/prompts",
        cta: "View positive prompts",
      },
      {
        key: "negative",
        label: "Negative signals",
        hint: "Mentions where AI used critical or dismissive language. Each one is a specific prompt + engine combination worth fixing.",
        status: negativeStatus.word,
        statusColor: negativeStatus.color,
        value: negativeCount === 0 ? "0" : `${negativeCount}`,
        valueColor: negativeCount === 0 ? SURVEN_SEMANTIC.good : SURVEN_SEMANTIC.bad,
        delta: negativeDelta == null ? null : -negativeDelta, // invert: dropping negatives = good
        href: "/audit",
        cta: "Fix in audit",
      },
    ];

    if (best) {
      const bestStatus = statusFromPositiveRate(best.positivePct);
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
        cta: `${MODEL_LABELS[best.model]} breakdown`,
        icon: best.model,
      });
    }

    if (worst && worst.model !== best?.model) {
      const worstStatus = statusFromPositiveRate(worst.positivePct);
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
        cta: `Fix ${MODEL_LABELS[worst.model]} prompts`,
        icon: worst.model,
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
          {/* Status pill (mini gauge replacement — colored badge) */}
          <div
            className="shrink-0 px-2.5 py-1 rounded-[var(--radius-sm)] flex items-center justify-center"
            style={{
              background: `${row.statusColor}1A`,
              minWidth: 96,
            }}
          >
            <span
              className="text-[10px] font-bold tracking-wider"
              style={{ color: row.statusColor }}
            >
              {row.status}
            </span>
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {row.icon && <EngineIcon id={row.icon} size={13} />}
              <span className="text-sm font-medium text-[var(--color-fg)]">{row.label}</span>
              <HoverHint hint={row.hint} placement="top">
                <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
              </HoverHint>
            </div>
          </div>

          {/* Value + delta */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
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

          {/* CTA link */}
          <Link
            href={row.href}
            className="shrink-0 flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ color: SURVEN_SEMANTIC.good, minWidth: 140, justifyContent: "flex-end" }}
          >
            <span>{row.cta}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ))}
    </Card>
  );
}
