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
  Legend,
  Area,
} from "recharts";
import { COLORS, AI_MODELS } from "@/utils/constants";
import type { Scan } from "@/types/database";

interface HistoryChartProps {
  scans: Scan[];
}

export function HistoryChart({ scans }: HistoryChartProps) {
  const { data, hasModelData } = useMemo(() => {
    const chartData = scans.map((s) => {
      const point: Record<string, string | number> = {
        date: new Date(s.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: s.visibility_score,
      };
      if (s.model_scores) {
        for (const model of AI_MODELS) {
          if (s.model_scores[model.id] !== undefined) {
            point[model.id] = s.model_scores[model.id];
          }
        }
      }
      return point;
    });

    const anyModelData = scans.some((s) => s.model_scores != null);

    return { data: chartData, hasModelData: anyModelData };
  }, [scans]);

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
            formatter={(value, name) => {
              const model = AI_MODELS.find((m) => m.id === (name as string));
              return [`${value}%`, model ? model.name : "Overall"];
            }}
          />
          {hasModelData && (
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              formatter={(value) => {
                const model = AI_MODELS.find((m) => m.id === value);
                return model ? model.name : "Overall";
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="score"
            fill="url(#scoreGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="score"
            name="score"
            stroke={COLORS.primary}
            strokeWidth={2.5}
            dot={{ fill: COLORS.primary, r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: COLORS.primary, stroke: COLORS.fg, strokeWidth: 2 }}
            animationDuration={1000}
          />
          {hasModelData &&
            AI_MODELS.map((model) => (
              <Line
                key={model.id}
                type="monotone"
                dataKey={model.id}
                name={model.id}
                stroke={model.color}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4, fill: model.color, strokeWidth: 0 }}
                animationDuration={1000}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
