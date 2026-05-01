"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult } from "@/types/database";

const CONFIG = {
  positive: { label: "Positive", color: SURVEN_SEMANTIC.goodAlt },
  neutral:  { label: "Neutral",  color: SURVEN_SEMANTIC.neutral },
  negative: { label: "Negative", color: SURVEN_SEMANTIC.bad },
} as const;

interface Props {
  results: ScanResult[];
}

export function SentimentDonut({ results }: Props) {
  const { counts, total, dominant, pcts, promptHighlights } = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of mentioned) {
      if (r.sentiment) counts[r.sentiment]++;
    }
    const total = mentioned.length;
    const pcts = {
      positive: total > 0 ? Math.round((counts.positive / total) * 100) : 0,
      neutral:  total > 0 ? Math.round((counts.neutral  / total) * 100) : 0,
      negative: total > 0 ? Math.round((counts.negative / total) * 100) : 0,
    };
    const dominant = total > 0
      ? (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof counts)
      : null;

    // Per-prompt positive rate for highlights
    const promptMap = new Map<string, { pos: number; total: number }>();
    for (const r of mentioned) {
      const entry = promptMap.get(r.prompt_text) ?? { pos: 0, total: 0 };
      entry.total++;
      if (r.sentiment === "positive") entry.pos++;
      promptMap.set(r.prompt_text, entry);
    }
    const promptRates = Array.from(promptMap.entries())
      .map(([prompt, { pos, total: t }]) => ({ prompt, pct: Math.round((pos / t) * 100), total: t }))
      .filter((p) => p.total >= 1)
      .sort((a, b) => b.pct - a.pct);

    const best  = promptRates[0] ?? null;
    const worst = promptRates.length > 1 ? promptRates[promptRates.length - 1] : null;
    const promptHighlights = { best, worst };

    return { counts, total, dominant, pcts, promptHighlights };
  }, [results]);

  if (total === 0) return null;

  const chartData = (["positive", "neutral", "negative"] as const)
    .filter((k) => counts[k] > 0)
    .map((k) => ({ name: CONFIG[k].label, value: counts[k], color: CONFIG[k].color }));

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">Overall Sentiment</h3>
        <HoverHint hint="The breakdown of all AI mentions by tone — positive means favorable descriptions, neutral means factual/balanced, negative means critical language.">
          <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
        </HoverHint>
      </div>

      {/* Donut — larger */}
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--color-fg)",
              }}
              formatter={(value) => [`${Math.round((Number(value) / total) * 100)}%`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {dominant && (
            <>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 600, lineHeight: 1, color: "var(--color-fg)" }}>
                {pcts[dominant]}%
              </span>
              <span className="text-xs text-[var(--color-fg-muted)] mt-1">{CONFIG[dominant].label}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {(["positive", "neutral", "negative"] as const).map((k) => (
          <div key={k} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: CONFIG[k].color }} />
              <span className="text-xs text-[var(--color-fg-muted)]">{CONFIG[k].label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-fg)]">{pcts[k]}%</span>
              <span className="text-xs text-[var(--color-fg-muted)]">({counts[k]})</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--color-fg-muted)] mt-3 pb-3 border-b border-[var(--color-border)]">
        Based on {total} AI mention{total !== 1 ? "s" : ""}
      </p>

      {/* Prompt highlights */}
      {(promptHighlights.best || promptHighlights.worst) && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium text-[var(--color-fg-muted)] uppercase tracking-wide">Prompt Highlights</p>
          {promptHighlights.best && (
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-1.5 w-1.5 rounded-full bg-[#96A283] flex-shrink-0 mt-1" />
                <span className="text-xs text-[var(--color-fg-secondary)] leading-snug line-clamp-2">
                  {promptHighlights.best.prompt.length > 70
                    ? promptHighlights.best.prompt.slice(0, 70) + "…"
                    : promptHighlights.best.prompt}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#96A283] flex-shrink-0">{promptHighlights.best.pct}%</span>
            </div>
          )}
          {promptHighlights.worst && promptHighlights.worst.prompt !== promptHighlights.best?.prompt && (
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-1.5 w-1.5 rounded-full bg-[#B54631] flex-shrink-0 mt-1" />
                <span className="text-xs text-[var(--color-fg-secondary)] leading-snug line-clamp-2">
                  {promptHighlights.worst.prompt.length > 70
                    ? promptHighlights.worst.prompt.slice(0, 70) + "…"
                    : promptHighlights.worst.prompt}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#B54631] flex-shrink-0">{promptHighlights.worst.pct}%</span>
            </div>
          )}
        </div>
      )}

      <ChartExplainer
        blocks={[
          {
            label: "Slices",
            body: "Each slice is one sentiment category (positive, neutral, or negative) of how AI models describe your business.",
          },
          {
            label: "Slice size",
            body: "Bigger slice = more AI mentions in that tone. The center number shows the share for whichever tone leads.",
          },
          {
            label: "Colors",
            body: "Sage = positive, gray = neutral, rust = negative. These encode tone — sage means favorable, rust means critical.",
          },
          {
            label: "Prompt highlights",
            body: "Below the donut: the prompt with the highest positive rate, and (if different) the prompt with the lowest. Helps spot which queries drive favorable vs. critical AI responses.",
          },
        ]}
        tip="Hover any slice for the exact share."
      />
    </Card>
  );
}
