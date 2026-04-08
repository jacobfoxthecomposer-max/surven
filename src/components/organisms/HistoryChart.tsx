"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from "recharts";
import { COLORS } from "@/utils/constants";
import type { Scan } from "@/types/database";

interface HistoryChartProps {
  scans: Scan[];
}

export function HistoryChart({ scans }: HistoryChartProps) {
  const data = useMemo(
    () =>
      scans.map((s) => ({
        date: new Date(s.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: s.visibility_score,
      })),
    [scans]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--color-fg-muted)]">
        Run multiple scans to see trends over time.
      </div>
    );
  }

  return (
    <div aria-label="Visibility score history chart" role="img">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={COLORS.surfaceAlt}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: COLORS.fgMuted, fontSize: 12 }}
            axisLine={{ stroke: COLORS.border }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: COLORS.fgMuted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "var(--radius-md)",
              color: COLORS.fg,
              fontSize: 13,
            }}
            labelStyle={{ color: COLORS.fgSecondary }}
          />
          <Area
            type="monotone"
            dataKey="score"
            fill="url(#scoreGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={COLORS.primary}
            strokeWidth={2.5}
            dot={{ fill: COLORS.primary, r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: COLORS.primary, stroke: COLORS.fg, strokeWidth: 2 }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
