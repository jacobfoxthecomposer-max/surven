"use client";

import { useState, useMemo } from "react";
import { Info } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { AIOverview } from "@/components/atoms/AIOverview";
import { Spinner } from "@/components/atoms/Spinner";
import type { SentimentDataPoint } from "@/features/sentiment/hooks/useSentimentHistory";

interface Props {
  data: SentimentDataPoint[];
  isLoading: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const LINES = [
  { key: "Positive", color: "#96A283" },
  { key: "Neutral",  color: "#C8C2B4" },
  { key: "Negative", color: "#B54631" },
] as const;

type Range = "14d" | "30d" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

// Custom SVG end-of-line pill for the Positive line
function EndLabel(props: {
  x?: number; y?: number; value?: number;
  index?: number; dataLength: number; color: string;
}) {
  const { x = 0, y = 0, value, index, dataLength, color } = props;
  if (index !== dataLength - 1 || value == null) return null;
  const label = `${value}%`;
  const w = label.length * 7 + 14;
  return (
    <g>
      <rect x={x + 6} y={y - 10} rx={10} ry={10} width={w} height={20} fill={color} />
      <text
        x={x + 6 + w / 2} y={y + 4.5}
        textAnchor="middle" fill="white"
        fontSize={10} fontWeight={700}
      >
        {label}
      </text>
    </g>
  );
}

export function SentimentOverTime({ data, isLoading }: Props) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [range, setRange]             = useState<Range>("all");

  const filteredData = useMemo(() => {
    if (range === "14d") return data.slice(-14);
    if (range === "30d") return data.slice(-30);
    return data;
  }, [data, range]);

  const chartData = filteredData.map((d) => ({
    date: formatDate(d.date),
    Positive: d.positivePct,
    Neutral: d.neutralPct,
    Negative: d.negativePct,
  }));

  const latestPositive = filteredData.length > 0 ? filteredData[filteredData.length - 1].positivePct : null;
  const prevPositive   = filteredData.length > 1 ? filteredData[filteredData.length - 2].positivePct : null;
  const trend = latestPositive !== null && prevPositive !== null ? latestPositive - prevPositive : null;

  const insight = latestPositive !== null
    ? trend !== null && trend > 0
      ? `Positive sentiment is trending up — ${latestPositive}% on your most recent scan, up ${trend}% from the prior scan.`
      : trend !== null && trend < 0
      ? `Positive sentiment dipped ${Math.abs(trend)}% since the last scan. Watch for patterns in which prompts are shifting.`
      : `Positive sentiment is holding steady at ${latestPositive}% across your most recent scans.`
    : null;

  return (
    <Card>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Favorable Sentiment Over Time</h3>
          <HoverHint hint="Tracks how your brand's positive sentiment rate changes across scans. Each point is one scan's overall positive mention rate.">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>

        {/* Range pills */}
        <div className="flex items-center gap-1">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: range === key ? "var(--color-primary)" : "var(--color-surface-alt)",
                color: range === key ? "white" : "var(--color-fg-muted)",
              }}
            >
              {label}
            </button>
          ))}
          <span className="text-xs text-[var(--color-fg-muted)] ml-2 shrink-0">
            {filteredData.length} scan{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* AI callout */}
      {insight && <div className="mb-4"><AIOverview text={insight} size="sm" /></div>}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="md" />
        </div>
      ) : filteredData.length < 2 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-[var(--color-fg-muted)]">Run more scans to see trends over time.</p>
        </div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 56, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--color-fg)",
                  }}
                  formatter={(value, name) => [`${Number(value)}%`, String(name)]}
                />
                {LINES.map(({ key, color }) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={key === "Positive" ? 3 : hoveredLine === key ? 2.5 : 2}
                    strokeOpacity={hoveredLine && hoveredLine !== key ? 0.15 : 1}
                    dot={false}
                    isAnimationActive={true}
                    style={{ transition: "stroke-opacity 0.2s, stroke-width 0.2s" }}
                    label={key === "Positive"
                      ? <EndLabel dataLength={chartData.length} color={color} />
                      : undefined
                    }
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive legend */}
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-[var(--color-border)]">
            {LINES.map(({ key, color }) => (
              <button
                key={key}
                onMouseEnter={() => setHoveredLine(key)}
                onMouseLeave={() => setHoveredLine(null)}
                className="flex items-center gap-1.5 group"
                style={{ opacity: hoveredLine && hoveredLine !== key ? 0.4 : 1, transition: "opacity 0.2s" }}
              >
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors">
                  {key}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
