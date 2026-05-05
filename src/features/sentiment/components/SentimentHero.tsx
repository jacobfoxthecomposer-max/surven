"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/atoms/Card";
import { BadgeDelta } from "@/components/atoms/BadgeDelta";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";
import type { SentimentDataPoint } from "@/features/sentiment/hooks/useSentimentHistory";

interface Props {
  results: ScanResult[];
  history: SentimentDataPoint[];
  businessName: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusFromPct(pct: number): { word: string; color: string } {
  if (pct >= 70) return { word: "strong", color: SURVEN_SEMANTIC.good };
  if (pct >= 40) return { word: "mixed", color: SURVEN_SEMANTIC.mid };
  return { word: "concerning", color: SURVEN_SEMANTIC.bad };
}

export function SentimentHero({ results, history, businessName }: Props) {
  const data = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of mentioned) {
      if (r.sentiment) counts[r.sentiment as keyof typeof counts]++;
    }
    const positivePct = total > 0 ? Math.round((counts.positive / total) * 100) : 0;

    // Trend delta from history
    const delta = history.length >= 2
      ? history[history.length - 1].positivePct - history[history.length - 2].positivePct
      : null;

    // Top negative-driving prompts (deduped) + which engines flagged them
    const negativeMap = new Map<string, { prompt: string; engines: Set<ModelName>; }>();
    for (const r of mentioned) {
      if (r.sentiment !== "negative") continue;
      const key = r.prompt_text.slice(0, 80);
      if (!negativeMap.has(key)) {
        negativeMap.set(key, { prompt: r.prompt_text, engines: new Set() });
      }
      negativeMap.get(key)!.engines.add(r.model_name as ModelName);
    }
    const issues = Array.from(negativeMap.values())
      .sort((a, b) => b.engines.size - a.engines.size)
      .slice(0, 3);

    return { total, counts, positivePct, delta, issues };
  }, [results, history]);

  if (data.total === 0) return null;

  const status = statusFromPct(data.positivePct);
  const ringRadius = 56;
  const ringStroke = 14;
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - data.positivePct / 100);

  // Multi-series chart data — all three sentiment buckets so the user sees
  // not just whether positive went up, but whether the lift came from
  // neutrals or whether negatives also fell.
  const chartData = history.map((d) => ({
    date: formatDate(d.date),
    positive: d.positivePct,
    neutral: d.neutralPct,
    negative: d.negativePct,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT — Sentiment ring */}
      <Card className="lg:col-span-3 flex flex-col">
        <h3
          style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}
        >
          Sentiment
        </h3>

        <div className="flex-1 flex items-center justify-center py-2">
          <div className="relative" style={{ width: 160, height: 160 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80" cy="80" r={ringRadius}
                fill="none"
                stroke="var(--color-surface-alt)"
                strokeWidth={ringStroke}
              />
              <circle
                cx="80" cy="80" r={ringRadius}
                fill="none"
                stroke={SURVEN_SEMANTIC.good}
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 80 80)"
                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600, lineHeight: 1, color: "var(--color-fg)" }}>
                {data.positivePct}%
              </span>
              <span className="text-[11px] text-[var(--color-fg-muted)] mt-1 uppercase tracking-wide">Positive</span>
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <span
              style={{ fontFamily: "var(--font-display)", fontSize: 18, fontStyle: "italic", color: status.color }}
            >
              {status.word}
            </span>
            {data.delta != null && (
              <BadgeDelta
                deltaType={data.delta > 0 ? "increase" : data.delta < 0 ? "decrease" : "neutral"}
                value={`${data.delta > 0 ? "+" : ""}${data.delta}%`}
                variant="solid"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-fg-muted)] pt-2 border-t border-[var(--color-border)]">
            <span><span className="font-semibold text-[var(--color-fg)]">{data.counts.positive}</span> pos</span>
            <span>·</span>
            <span><span className="font-semibold text-[var(--color-fg)]">{data.counts.neutral}</span> neu</span>
            <span>·</span>
            <span><span className="font-semibold text-[var(--color-fg)]">{data.counts.negative}</span> neg</span>
          </div>
        </div>
      </Card>

      {/* CENTER — Trend chart */}
      <Card className="lg:col-span-6 flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3
            style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}
          >
            Sentiment over time
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            {/* Three-series legend — same compact pattern as the AI Visibility
                "over time" chart (color dot + tiny label per series). */}
            <div className="flex items-center gap-2.5 text-[10.5px] text-[var(--color-fg-muted)]">
              <span className="inline-flex items-center gap-1">
                <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: SURVEN_SEMANTIC.good }} />
                Positive
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: SURVEN_SEMANTIC.neutral }} />
                Neutral
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: SURVEN_SEMANTIC.bad }} />
                Negative
              </span>
            </div>
            <span className="text-xs text-[var(--color-fg-muted)]">
              {history.length} scan{history.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-[180px]">
          {chartData.length < 2 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-[var(--color-fg-muted)]">Run more scans to see the trend.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "var(--color-fg)",
                  }}
                  formatter={(value, name) => [`${Number(value)}%`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                />
                <Line
                  type="monotone"
                  dataKey="positive"
                  stroke={SURVEN_SEMANTIC.good}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: SURVEN_SEMANTIC.good, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="neutral"
                  stroke={SURVEN_SEMANTIC.neutral}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: SURVEN_SEMANTIC.neutral, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="negative"
                  stroke={SURVEN_SEMANTIC.bad}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: SURVEN_SEMANTIC.bad, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* RIGHT — What needs attention */}
      <Card className="lg:col-span-3 flex flex-col">
        <div className="flex items-center gap-1.5 mb-3">
          <AlertTriangle className="h-4 w-4" style={{ color: data.issues.length > 0 ? SURVEN_SEMANTIC.bad : SURVEN_SEMANTIC.goodAlt }} />
          <h3
            style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--color-fg)" }}
          >
            What needs attention
          </h3>
        </div>

        {data.issues.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center mb-2"
              style={{ background: "rgba(150,162,131,0.18)" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: SURVEN_SEMANTIC.goodAlt }} />
            </div>
            <p className="text-xs text-[var(--color-fg-muted)] leading-snug">
              No negative signals across {data.total} mentions. Sentiment is clean.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-2.5">
            {data.issues.map((issue, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-2.5"
                style={{ background: "rgba(181,70,49,0.04)" }}
              >
                <p className="text-xs text-[var(--color-fg)] leading-snug line-clamp-2 mb-1.5">
                  &ldquo;{issue.prompt.length > 70 ? issue.prompt.slice(0, 70) + "…" : issue.prompt}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {Array.from(issue.engines).slice(0, 4).map((e) => (
                      <EngineIcon key={e} id={e} size={11} />
                    ))}
                    <span className="text-[10px] text-[var(--color-fg-muted)] ml-1">
                      {issue.engines.size} engine{issue.engines.size !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/audit"
          className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs font-medium hover:opacity-70 transition-opacity"
          style={{ color: SURVEN_SEMANTIC.bad }}
        >
          <span>Run sentiment audit</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}

