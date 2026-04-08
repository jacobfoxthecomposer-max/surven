"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { COLORS } from "@/utils/constants";
import type { CompetitorScore } from "@/types/database";

interface ComparisonChartProps {
  businessName: string;
  businessScore: number;
  competitors: CompetitorScore[];
}

const BAR_COLORS = [
  COLORS.primary,
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
];

export function ComparisonChart({
  businessName,
  businessScore,
  competitors,
}: ComparisonChartProps) {
  const data = useMemo(() => {
    const items = [
      { name: businessName, score: businessScore, isYou: true },
      ...competitors.map((c) => ({
        name: c.name,
        score: c.score,
        isYou: false,
      })),
    ];
    return items;
  }, [businessName, businessScore, competitors]);

  if (competitors.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--color-fg-muted)]">
        Add competitors to see how you compare.
      </div>
    );
  }

  return (
    <div aria-label="Competitor comparison chart" role="img">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={COLORS.surfaceAlt}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: COLORS.fgMuted, fontSize: 12 }}
            axisLine={{ stroke: COLORS.border }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: COLORS.fgSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "var(--radius-md)",
              color: COLORS.fg,
              fontSize: 13,
            }}
            formatter={(value) => [`${value}%`, "Score"]}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} animationDuration={800}>
            {data.map((entry, idx) => (
              <Cell
                key={entry.name}
                fill={entry.isYou ? COLORS.primary : BAR_COLORS[(idx) % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
