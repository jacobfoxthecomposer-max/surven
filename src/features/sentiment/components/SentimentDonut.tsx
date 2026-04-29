"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/atoms/Card";
import type { ScanResult } from "@/types/database";

const CONFIG = {
  positive: { label: "Positive", color: "#96A283" },
  neutral:  { label: "Neutral",  color: "#C8C2B4" },
  negative: { label: "Negative", color: "#B54631" },
} as const;

interface Props {
  results: ScanResult[];
}

export function SentimentDonut({ results }: Props) {
  const { counts, total, dominant, pcts } = useMemo(() => {
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
    return { counts, total, dominant, pcts };
  }, [results]);

  if (total === 0) return null;

  const chartData = (["positive", "neutral", "negative"] as const)
    .filter((k) => counts[k] > 0)
    .map((k) => ({ name: CONFIG[k].label, value: counts[k], color: CONFIG[k].color }));

  return (
    <Card className="flex flex-col">
      <h3 className="text-sm font-semibold text-[var(--color-fg)] mb-4">Overall Sentiment</h3>

      {/* Donut */}
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
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
              formatter={(value: number) => [`${Math.round((value / total) * 100)}%`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {dominant && (
            <>
              <span className="text-2xl font-bold text-[var(--color-fg)]">{pcts[dominant]}%</span>
              <span className="text-xs text-[var(--color-fg-muted)]">{CONFIG[dominant].label}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
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

      <p className="text-xs text-[var(--color-fg-muted)] mt-4 pt-3 border-t border-[var(--color-border)]">
        Based on {total} AI mention{total !== 1 ? "s" : ""}
      </p>
    </Card>
  );
}
