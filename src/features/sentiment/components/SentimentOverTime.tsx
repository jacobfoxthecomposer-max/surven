"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "@/components/atoms/Card";
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

export function SentimentOverTime({ data, isLoading }: Props) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    Positive: d.positivePct,
    Neutral: d.neutralPct,
    Negative: d.negativePct,
  }));

  const latestPositive = data.length > 0 ? data[data.length - 1].positivePct : null;
  const prevPositive   = data.length > 1 ? data[data.length - 2].positivePct : null;
  const trend = latestPositive !== null && prevPositive !== null
    ? latestPositive - prevPositive
    : null;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Favorable Sentiment Over Time</h3>
          {latestPositive !== null && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs font-medium text-[#566A47]">
                {trend !== null && trend >= 0 ? "↑ Trending up" : trend !== null ? "↓ Slight dip" : "Latest scan"}
              </span>
              <span className="text-xs text-[var(--color-fg-muted)]">
                {latestPositive}% positive on most recent scan
                {trend !== null && trend !== 0 && ` (${trend > 0 ? "+" : ""}${trend}% vs prior)`}
              </span>
            </div>
          )}
        </div>
        <span className="text-xs text-[var(--color-fg-muted)] shrink-0">{data.length} scan{data.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="md" />
        </div>
      ) : data.length < 2 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-[var(--color-fg-muted)]">Run more scans to see trends over time.</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--color-fg-muted)", paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="Positive"
                stroke="#96A283"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="Neutral"
                stroke="#C8C2B4"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="Negative"
                stroke="#B54631"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
