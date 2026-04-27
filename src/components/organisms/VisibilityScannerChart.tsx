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
import { COLORS } from "@/utils/constants";

export interface VisibilityBrand {
  id: string;
  name: string;
  color: string;
  isYou: boolean;
  /** 0-100 daily score series, length must match `dates`. */
  data: number[];
}

interface VisibilityScannerChartProps {
  brands: VisibilityBrand[];
  dates: Date[];
  enabledIds: Set<string>;
  height?: number;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VisibilityScannerChart({
  brands,
  dates,
  enabledIds,
  height = 320,
}: VisibilityScannerChartProps) {
  const data = useMemo(() => {
    return dates.map((d, i) => {
      const point: Record<string, string | number> = {
        date: fmtDate(d),
      };
      for (const brand of brands) {
        if (enabledIds.has(brand.id)) {
          point[brand.id] = brand.data[i] ?? 0;
        }
      }
      return point;
    });
  }, [brands, dates, enabledIds]);

  const visibleBrands = useMemo(
    () => brands.filter((b) => enabledIds.has(b.id)),
    [brands, enabledIds]
  );

  if (data.length === 0 || visibleBrands.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--color-fg-muted)]">
        Select at least one brand to compare.
      </div>
    );
  }

  // X-axis tick density — show every Nth tick to avoid crowding
  const tickEvery = data.length <= 14 ? 2 : data.length <= 30 ? 5 : 14;
  const ticks = data
    .map((_, i) => (i % tickEvery === 0 || i === data.length - 1 ? data[i].date : null))
    .filter((v): v is string => v !== null);

  return (
    <div aria-label="AI visibility multi-brand chart over time" role="img">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 4, left: -8 }}>
          <defs>
            <linearGradient id="visYouGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.22} />
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
            ticks={ticks}
            tick={{ fill: COLORS.fgMuted, fontSize: 11 }}
            axisLine={{ stroke: COLORS.border }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: COLORS.fgMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "var(--radius-md)",
              color: COLORS.fg,
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: COLORS.fgSecondary, marginBottom: 4 }}
            itemSorter={(item) => -(Number(item.value) || 0)}
            formatter={(value, name) => {
              const b = brands.find((x) => x.id === name);
              return [`${value}%`, b?.name ?? String(name)];
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="plainline"
            formatter={(value) => {
              const b = brands.find((x) => x.id === value);
              return b ? (b.isYou ? `${b.name} (You)` : b.name) : value;
            }}
          />

          {/* Soft area fill under YOUR line for emphasis */}
          {visibleBrands.find((b) => b.isYou) && (
            <Area
              type="monotone"
              dataKey={visibleBrands.find((b) => b.isYou)!.id}
              fill="url(#visYouGradient)"
              stroke="none"
              isAnimationActive={false}
            />
          )}

          {/* Competitor lines first (so YOUR line draws on top) */}
          {visibleBrands
            .filter((b) => !b.isYou)
            .map((b) => (
              <Line
                key={b.id}
                type="monotone"
                dataKey={b.id}
                name={b.id}
                stroke={b.color}
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 4, fill: b.color, strokeWidth: 0 }}
                animationDuration={900}
                connectNulls
              />
            ))}

          {/* YOUR line — drawn last, thicker, with dots */}
          {visibleBrands
            .filter((b) => b.isYou)
            .map((b) => (
              <Line
                key={b.id}
                type="monotone"
                dataKey={b.id}
                name={b.id}
                stroke={b.color}
                strokeWidth={2.75}
                dot={{ fill: b.color, r: 0 }}
                activeDot={{ r: 6, fill: b.color, stroke: COLORS.bg, strokeWidth: 2 }}
                animationDuration={1100}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
