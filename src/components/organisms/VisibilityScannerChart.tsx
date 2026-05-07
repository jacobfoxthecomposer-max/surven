"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ReferenceDot,
  ReferenceLine,
} from "recharts";
import { COLORS } from "@/utils/constants";

export interface VisibilityBrand {
  id: string;
  name: string;
  color: string;
  isYou: boolean;
  data: number[];
}

export type EndLabelStyle = "value" | "name-value" | "name-value-large" | "none";

export type FocusMode = "full" | "tight" | "padded" | "window";

export interface OptimizationMarker {
  /** Real calendar date the optimization shipped. */
  date: Date;
  /** Short label for the optimization (e.g. "FAQ schema added"). */
  label: string;
  /** Optional accent color — defaults to sage on positive gain, gray on loss. */
  color?: string;
}

/**
 * Prompt-set change event. Surfaces as a vertical dashed line spanning the
 * chart with a labeled flag at the top so the viewer can attribute any
 * dip/spike in the rate to a denominator change rather than performance.
 * Sage = prompts added, rust = prompts removed.
 */
export interface PromptChangeMarker {
  /** Real calendar date the prompt set changed. */
  date: Date;
  /** Net delta. Positive = prompts added; negative = prompts removed. */
  delta: number;
  /** Optional explainer (e.g. "Comparison + Use-case prompts"). */
  detail?: string;
}

/**
 * ISO-week key — "YYYY-Www" using Monday-start weeks. Two events that fall
 * in the same calendar week (Mon–Sun) get the same key. Used to collapse
 * multiple tactics shipped in the same week into one marker on the chart.
 */
function isoWeekKey(d: Date): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  // Move to the Thursday of this week — Thursday's year owns the ISO week
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((t.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${t.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Find the index in `dates` whose value is closest to `target`. Returns -1
 * if `dates` is empty or the closest match is more than `toleranceMs` away
 * (event happened outside the visible range — should not render).
 */
function findNearestDateIndex(
  dates: Date[],
  target: Date,
  toleranceMs: number = 1000 * 60 * 60 * 24 * 3,
): number {
  if (dates.length === 0) return -1;
  const t = target.getTime();
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < dates.length; i++) {
    const diff = Math.abs(dates[i].getTime() - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestDiff <= toleranceMs ? bestIdx : -1;
}

const MARKER_PALETTE = [
  "#C97B45", // orange
  "#B8A030", // yellow
  "#7D8E6C", // deep sage
  "#B54631", // rust
  "#5B7A8E", // muted blue-grey
];

interface VisibilityScannerChartProps {
  brands: VisibilityBrand[];
  dates: Date[];
  enabledIds: Set<string>;
  height?: number;
  hoveredBrandId?: string | null;
  yPadding?: number;
  strokeYou?: number;
  strokeHovered?: number;
  strokeDefault?: number;
  /** Permanent glow blur for YOU's line (always on, regardless of hover). */
  youGlowBlur?: number;
  lineType?: "linear" | "monotone";
  tooltipFontSize?: number;
  gridStroke?: string;
  gridOpacity?: number;
  /** Explicit Y-axis tick array. Overrides domain auto-fit when provided. */
  yTicks?: number[];
  /** End-of-line label style for each brand. */
  endLabelStyle?: EndLabelStyle;
  /** Right-side gutter (px) reserved for end labels. */
  endLabelGutter?: number;
  /**
   * Y-axis focus mode.
   * - "full"   → all visible brands (default)
   * - "tight"  → just YOU's range, ±2 padding
   * - "padded" → just YOU's range, ±6 padding
   * - "window" → fixed ±15 window centered on YOU's average
   */
  focusMode?: FocusMode;
  /** Optional list of optimization markers shown as small dots on YOU's line. */
  optimizationMarkers?: OptimizationMarker[];
  /**
   * Optional prompt-set change events. Rendered as full-height dashed
   * vertical lines with "+N" / "−N" flag labels so a denominator shift is
   * visually attributable, not invisible. Sage = added, rust = removed.
   */
  promptChangeMarkers?: PromptChangeMarker[];
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── CUSTOM TOOLTIP (dedupes + default-left positioning) ─────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
  dataKey?: string;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  coordinate?: { x: number; y: number };
  brands: VisibilityBrand[];
  fontSize: number;
}

function CustomTooltip({
  active,
  payload,
  label,
  coordinate,
  brands,
  fontSize,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const seen = new Set<string>();
  const filtered = payload.filter((p) => {
    const key = String(p.name ?? "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const sorted = [...filtered].sort(
    (a, b) => Number(b.value ?? 0) - Number(a.value ?? 0)
  );

  const W = 150;
  const margin = 14;
  const cursorX = coordinate?.x ?? 0;
  const placeLeft = cursorX > W + margin;
  const transform = placeLeft
    ? `translateX(calc(-100% - ${margin}px))`
    : `translateX(${margin}px)`;

  return (
    <div
      style={{
        transform,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 4,
        padding: "5px 8px",
        boxShadow: "var(--shadow-sm)",
        fontSize,
        color: COLORS.fg,
        width: W,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          color: COLORS.fgSecondary,
          fontSize: fontSize - 1,
          marginBottom: 2,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {sorted.map((item, i) => {
        const brand = brands.find((b) => b.id === item.name);
        const displayName = brand
          ? brand.isYou
            ? "Your Business"
            : brand.name
          : String(item.name);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              padding: "1px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: brand?.isYou ? 600 : 400,
                }}
              >
                {displayName}
              </span>
            </div>
            <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>
              {item.value}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── CROSSHAIR CURSOR ────────────────────────────────────────────────────────

interface CrosshairCursorProps {
  points?: { x: number; y: number }[];
  width?: number;
  height?: number;
  top?: number;
  left?: number;
  stroke: string;
}
function CrosshairCursor({
  points,
  width,
  height,
  top,
  left,
  stroke,
}: CrosshairCursorProps) {
  if (!points || points.length === 0) return null;
  const x = points[0].x;
  const yPoint = points[points.length - 1].y;
  const right = (left ?? 0) + (width ?? 0);
  const bottom = (top ?? 0) + (height ?? 0);
  return (
    <g style={{ pointerEvents: "none" }}>
      <line
        x1={x}
        y1={top}
        x2={x}
        y2={bottom}
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <line
        x1={left}
        y1={yPoint}
        x2={right}
        y2={yPoint}
        stroke={stroke}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.55}
      />
    </g>
  );
}

// ─── END-OF-LINE LABEL (rendered via Line dot prop) ──────────────────────────
// Percentage first, then company name. Collision detection via pre-computed
// stackSlots map (passed through closure) — when a brand's last-value is close
// to another's, it gets a slot offset that stacks the label vertically.

interface EndLabelDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  brand: VisibilityBrand;
  totalPoints: number;
  value: number;
  style: EndLabelStyle;
  stackSlot: number;
  slotPx: number;
  firstValue?: number;
  onHover?: (id: string | null) => void;
  isDimmed?: boolean;
}

function EndLabelDot({
  cx,
  cy,
  index,
  brand,
  totalPoints,
  value,
  style,
  stackSlot,
  slotPx,
  firstValue,
  onHover,
  isDimmed,
}: EndLabelDotProps) {
  if (cx == null || cy == null) return null;
  if (index !== totalPoints - 1) return <g />;
  if (style === "none") {
    return <circle cx={cx} cy={cy} r={3} fill={brand.color} />;
  }

  const isLarge = style === "name-value-large";
  const showName = style !== "value";
  const valStr = `${value.toFixed(1)}%`;
  const nameStr = brand.isYou ? "You" : brand.name;
  const text = showName ? `${valStr}  ${nameStr}` : valStr;

  const charW = isLarge ? 6.8 : 6;
  const padX = isLarge ? 10 : 8;
  const W = Math.max(isLarge ? 70 : 44, text.length * charW + padX * 2);
  const H = isLarge ? 22 : 18;
  const fontSize = isLarge ? 11 : 10;
  const labelX = cx + 8;
  const labelY = cy + stackSlot * slotPx;

  const showDelta = brand.isYou && firstValue != null && !isNaN(firstValue);
  const delta = showDelta ? value - firstValue! : 0;
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
  const deltaColor = delta > 0 ? "#6a9e6a" : delta < 0 ? "#c06060" : "#888888";
  const dPadX = 7;
  const dH = H;
  const dW = Math.max(34, deltaStr.length * 6 + dPadX * 2);
  const dX = labelX + W + 5;

  return (
    <g
      style={{
        cursor: onHover ? "pointer" : "default",
        opacity: isDimmed ? 0.25 : 1,
        transition: "opacity 200ms ease-out",
      }}
      onMouseEnter={() => onHover?.(brand.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <circle
        cx={cx}
        cy={cy}
        r={brand.isYou ? 4 : 3}
        fill={brand.color}
        stroke="#fff"
        strokeWidth={1.5}
        style={{ pointerEvents: "none" }}
      />
      <rect
        x={labelX}
        y={labelY - H / 2}
        width={W}
        height={H}
        rx={H / 2}
        fill={brand.color}
        opacity={0.95}
      />
      <text
        x={labelX + padX}
        y={labelY + (isLarge ? 4 : 3.5)}
        fill="#ffffff"
        fontSize={fontSize}
        fontWeight={brand.isYou ? 700 : 600}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {text}
      </text>
      {showDelta && (
        <>
          <rect
            x={dX}
            y={labelY - dH / 2}
            width={dW}
            height={dH}
            rx={dH / 2}
            fill={deltaColor}
            opacity={0.9}
          />
          <text
            x={dX + dPadX}
            y={labelY + (isLarge ? 4 : 3.5)}
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {deltaStr}
          </text>
        </>
      )}
    </g>
  );
}

// ─── MAIN CHART ──────────────────────────────────────────────────────────────

export function VisibilityScannerChart({
  brands,
  dates,
  enabledIds,
  height = 320,
  hoveredBrandId = null,
  yPadding = 0,
  strokeYou = 2.75,
  strokeHovered = 3.5,
  strokeDefault = 1.75,
  youGlowBlur = 0.5,
  lineType = "linear",
  tooltipFontSize = 10,
  gridStroke = "rgba(107,109,107,0.45)",
  gridOpacity = 1,
  yTicks,
  endLabelStyle = "name-value",
  endLabelGutter = 130,
  focusMode = "full",
  optimizationMarkers,
  promptChangeMarkers,
}: VisibilityScannerChartProps) {
  const [legendHoverId, setLegendHoverId] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<{
    x: number;
    y: number;
    label: string;
    highlight?: string;
    body: string;
    color: string;
  } | null>(null);

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

  const yDomain = useMemo<[number | string, number | string]>(() => {
    if (yTicks && yTicks.length > 0) {
      return [Math.min(...yTicks), Math.max(...yTicks)];
    }

    // Focus modes — compute domain from YOU's series only
    if (focusMode !== "full") {
      const you = visibleBrands.find((b) => b.isYou) ?? brands.find((b) => b.isYou);
      const series = (you?.data ?? []).filter((v): v is number => v != null);
      if (series.length > 0) {
        const min = Math.min(...series);
        const max = Math.max(...series);
        const avg = series.reduce((s, v) => s + v, 0) / series.length;
        if (focusMode === "tight") {
          // Pin start point to the bottom and end point to the top
          // (or reversed for a declining line). Line stretches the full
          // chart height; mid-range dips/spikes may clip — that's intentional.
          const first = series[0];
          const last = series[series.length - 1];
          const lo = Math.min(first, last);
          const hi = Math.max(first, last);
          return [Math.max(0, Math.floor(lo - 3)), Math.min(100, Math.ceil(hi + 3))];
        }
        if (focusMode === "padded") {
          return [Math.max(0, Math.floor(min - 6)), Math.min(100, Math.ceil(max + 6))];
        }
        // window
        return [Math.max(0, Math.floor(avg - 15)), Math.min(100, Math.ceil(avg + 15))];
      }
    }

    if (yPadding <= 0) return [0, 100];
    let min = 100;
    let max = 0;
    for (const b of visibleBrands) {
      for (const v of b.data) {
        if (v == null) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (min === 100 && max === 0) return [0, 100];
    return [
      Math.max(0, Math.floor(min - yPadding)),
      Math.min(100, Math.ceil(max + yPadding)),
    ];
  }, [visibleBrands, brands, yPadding, yTicks, focusMode]);

  if (data.length === 0 || visibleBrands.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--color-fg-muted)]">
        Select at least one brand to compare.
      </div>
    );
  }

  const tickEvery = data.length <= 14 ? 2 : data.length <= 30 ? 5 : 14;
  const xTicks = data
    .map((_, i) =>
      i % tickEvery === 0 || i === data.length - 1 ? data[i].date : null
    )
    .filter((v): v is string => v !== null);

  // Compute stack slots for end labels — sort visible brands by last value
  // descending. If a brand's last value is within `thresholdValue` of the
  // previous one's, bump its slot by 1 (stacks the label below).
  const stackSlots: Record<string, number> = {};
  {
    const yMin = typeof yDomain[0] === "number" ? yDomain[0] : 0;
    const yMax = typeof yDomain[1] === "number" ? yDomain[1] : 100;
    const yRange = Math.max(1, yMax - yMin);
    // 6% of the visible y-range — close enough that labels would overlap visually
    const thresholdValue = yRange * 0.06;
    const sorted = visibleBrands
      .map((b) => ({ id: b.id, value: b.data[b.data.length - 1] ?? 0 }))
      .sort((a, b) => b.value - a.value);
    let slot = 0;
    let prevValue = Infinity;
    for (const item of sorted) {
      if (prevValue - item.value < thresholdValue) {
        slot += 1;
      } else {
        slot = 0;
      }
      stackSlots[item.id] = slot;
      prevValue = item.value;
    }
  }

  const effectiveHoverId = hoveredBrandId ?? legendHoverId;

  const strokeFor = (brand: VisibilityBrand) => {
    if (effectiveHoverId === brand.id) return strokeHovered;
    if (brand.isYou) return strokeYou;
    return strokeDefault;
  };

  // YOU glows always; competitors never glow
  const filterFor = (brand: VisibilityBrand) => {
    if (brand.isYou && youGlowBlur > 0) {
      return `drop-shadow(0 0 ${youGlowBlur}px ${brand.color}) drop-shadow(0 0 ${youGlowBlur * 1.6}px ${brand.color})`;
    }
    return undefined;
  };

  const opacityFor = (brand: VisibilityBrand) => {
    if (effectiveHoverId && effectiveHoverId !== brand.id) return 0.08;
    return 1;
  };

  return (
    <div
      aria-label="AI visibility multi-brand chart over time"
      role="img"
      className="relative"
      style={{ touchAction: "none" }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 12, right: endLabelGutter, bottom: 4, left: -8 }}
        >
          <defs>
            <linearGradient id="visYouGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.06} />
              <stop offset="75%" stopColor={COLORS.primary} stopOpacity={0.02} />
              <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
            {visibleBrands.filter((b) => !b.isYou).map((b) => (
              <linearGradient key={`grad-${b.id}`} id={`grad-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={b.color} stopOpacity={0.15} />
                <stop offset="75%" stopColor={b.color} stopOpacity={0.03} />
                <stop offset="100%" stopColor={b.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 4"
            stroke={gridStroke}
            strokeOpacity={gridOpacity}
            vertical={false}
          />

          <XAxis
            dataKey="date"
            ticks={xTicks}
            tick={{ fill: COLORS.fgMuted, fontSize: 11 }}
            axisLine={{ stroke: COLORS.border }}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: COLORS.fgMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
            allowDecimals={false}
            allowDataOverflow={focusMode !== "full"}
          />

          <Tooltip
            cursor={<CrosshairCursor stroke={COLORS.fgMuted} />}
            offset={0}
            allowEscapeViewBox={{ x: true }}
            wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
            content={(props) => (
              <CustomTooltip
                active={props.active as boolean}
                payload={props.payload as unknown as TooltipPayloadItem[]}
                label={props.label as string}
                coordinate={props.coordinate as { x: number; y: number }}
                brands={brands}
                fontSize={tooltipFontSize}
              />
            )}
          />

          {visibleBrands.find((b) => b.isYou) && (
            <Area
              type={lineType}
              dataKey={visibleBrands.find((b) => b.isYou)!.id}
              fill="url(#visYouGradient)"
              fillOpacity={
                effectiveHoverId && effectiveHoverId !== visibleBrands.find((b) => b.isYou)!.id
                  ? 0.1
                  : 1
              }
              stroke="none"
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
            />
          )}

          {visibleBrands
            .filter((b) => !b.isYou)
            .map((b) => (
              <Line
                key={b.id}
                type={lineType}
                dataKey={b.id}
                name={b.id}
                stroke={b.color}
                strokeWidth={1.5}

                strokeOpacity={effectiveHoverId && effectiveHoverId !== b.id ? 0.08 : 0.5}
                dot={(props) => (
                  <EndLabelDot
                    {...(props as { cx?: number; cy?: number; index?: number })}
                    brand={b}
                    totalPoints={data.length}
                    value={Number((props as { payload?: Record<string, number> }).payload?.[b.id] ?? 0)}
                    style={endLabelStyle}
                    stackSlot={stackSlots[b.id] ?? 0}
                    slotPx={endLabelStyle === "name-value-large" ? 26 : 22}
                    onHover={setLegendHoverId}
                    isDimmed={!!effectiveHoverId && effectiveHoverId !== b.id}
                  />
                )}
                activeDot={{ r: 3, fill: b.color, strokeWidth: 0, style: { pointerEvents: "none" } }}
                animationDuration={900}
                animationEasing="ease-out"
                connectNulls
              />
            ))}

          {visibleBrands
            .filter((b) => b.isYou)
            .map((b) => (
              <Line
                key={b.id}
                type={lineType}
                dataKey={b.id}
                name={b.id}
                stroke={b.color}
                strokeWidth={strokeFor(b)}
                strokeOpacity={opacityFor(b)}
                style={{ filter: filterFor(b) }}
                dot={(props) => (
                  <EndLabelDot
                    {...(props as { cx?: number; cy?: number; index?: number })}
                    brand={b}
                    totalPoints={data.length}
                    value={Number((props as { payload?: Record<string, number> }).payload?.[b.id] ?? 0)}
                    style={endLabelStyle}
                    stackSlot={stackSlots[b.id] ?? 0}
                    slotPx={endLabelStyle === "name-value-large" ? 26 : 22}
                    firstValue={b.data[0]}
                    onHover={setLegendHoverId}
                    isDimmed={!!effectiveHoverId && effectiveHoverId !== b.id}
                  />
                )}
                activeDot={{ r: 5, fill: b.color, stroke: COLORS.bg, strokeWidth: 1.5, style: { pointerEvents: "none" } }}
                animationDuration={1100}
                animationEasing="ease-out"
                connectNulls
              />
            ))}

          {/* Prompt-set change events. Dashed vertical SEGMENT drawn from
              the top of the chart down to YOU's line value at that date —
              never below the YOU line. Carries a "+N" / "−N" flag at the
              top. Anchored to real calendar dates so they stay put when
              the time range changes. */}
          {promptChangeMarkers && promptChangeMarkers.length > 0 &&
            (() => {
              const youSeriesPC = (visibleBrands.find((b) => b.isYou) ?? brands.find((b) => b.isYou))?.data ?? [];
              const chartYMaxPC = typeof yDomain[1] === "number" ? yDomain[1] : 100;
              return promptChangeMarkers
                .map((m) => ({ m, idx: findNearestDateIndex(dates, m.date) }))
                .filter(({ idx }) => idx >= 0 && idx < data.length)
                .map(({ m, idx }, i) => {
                const added = m.delta >= 0;
                const color = added ? "#5E7250" : "#B54631";
                const sign = added ? "+" : "−";
                const flagLabel = `${sign}${Math.abs(m.delta)}`;
                const detail = m.detail
                  ? `${flagLabel} prompts · ${m.detail}`
                  : `${flagLabel} prompts tracked`;
                const youVal = youSeriesPC[idx] ?? 0;
                return (
                  <ReferenceLine
                    key={`promptchange-${i}`}
                    segment={[
                      { x: data[idx].date, y: chartYMaxPC },
                      { x: data[idx].date, y: youVal },
                    ]}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    ifOverflow="visible"
                    label={{
                      position: "insideTopLeft",
                      offset: 6,
                      content: (props: unknown) => {
                        const vb = (props as { viewBox?: { x?: number; y?: number } }).viewBox ?? {};
                        const x = vb.x ?? 0;
                        const y = (vb.y ?? 0) + 4;
                        const padX = 6;
                        const padY = 2;
                        const fontSize = 10;
                        // Width approx: sign(1) + digits + 'p' = ~5 chars
                        const w = Math.max(28, flagLabel.length * 6 + padX * 2);
                        const h = fontSize + padY * 2;
                        return (
                          <g
                            style={{ cursor: "help", pointerEvents: "all" }}
                            onMouseEnter={(e) =>
                              setHoveredMarker({
                                x: e.clientX,
                                y: e.clientY,
                                label: detail,
                                body: added
                                  ? "New prompts widen the denominator. Any rate dip here may be dilution, not real performance loss."
                                  : "Removing prompts narrows the denominator. Rate changes here may not reflect real movement.",
                                color,
                              })
                            }
                            onMouseLeave={() => setHoveredMarker(null)}
                          >
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              rx={3}
                              fill={color}
                              opacity={0.92}
                            />
                            <text
                              x={x + w / 2}
                              y={y + h / 2 + 0.5}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={fontSize}
                              fontWeight={700}
                              fill="#FFFFFF"
                              style={{ pointerEvents: "none" }}
                            >
                              {flagLabel}
                            </text>
                          </g>
                        );
                      },
                    }}
                  />
                );
              });
            })()}

          {/* Optimization markers — same vertical-dashed-line + flag chrome
              as prompt-change events, but the flag carries the % visibility
              gained since the optimization shipped. Sage on positive gain;
              if the optimization lost / held flat, the line dims to gray
              and the flag is suppressed entirely. */}
          {optimizationMarkers && optimizationMarkers.length > 0 && (() => {
            const you = visibleBrands.find((b) => b.isYou);
            if (!you) return null;
            const youSeries = you.data;
            const lastValue = youSeries[youSeries.length - 1] ?? 0;
            const chartYMaxOpt = typeof yDomain[1] === "number" ? yDomain[1] : 100;

            // Group tactics by ISO week so multiple optimizations shipped
            // in the same Mon–Sun span collapse into a single chart marker.
            // Anchor the marker at the EARLIEST event in the group so the
            // % gain reflects "how much have we climbed since the first
            // tactic in this batch shipped" — the most truthful read.
            type Group = { idx: number; labels: string[] };
            const grouped = new Map<string, Group>();
            for (const entry of optimizationMarkers) {
              const idx = findNearestDateIndex(dates, entry.date);
              if (idx < 0 || idx >= data.length) continue;
              const key = isoWeekKey(dates[idx]);
              const existing = grouped.get(key);
              if (existing) {
                if (idx < existing.idx) existing.idx = idx;
                existing.labels.push(entry.label);
              } else {
                grouped.set(key, { idx, labels: [entry.label] });
              }
            }
            const groups = Array.from(grouped.values()).sort((a, b) => a.idx - b.idx);

            return groups.map((g, i) => {
              const markerValue = youSeries[g.idx] ?? 0;
              const gain = lastValue - markerValue;
              const isPositive = gain >= 0.5;
              const color = isPositive ? "#5E7250" : "#9CA09A";
              const flagLabel = isPositive ? `+${gain.toFixed(1)}%` : null;
              // Hover label collapses cleanly: 1 tactic = plain text;
              // 2+ = bulleted multi-line so the user sees every item that
              // shipped in that week.
              const labelDisplay =
                g.labels.length === 1
                  ? g.labels[0]
                  : g.labels.map((l) => `• ${l}`).join("\n");
              const body = isPositive
                ? `Visibility climbed ${gain.toFixed(1)}% since ${
                    g.labels.length === 1 ? "this shipped" : "these shipped"
                  }.`
                : `Still settling — most optimizations take 1–3 months to show full impact.`;
              return (
                <ReferenceLine
                  key={`opt-${i}`}
                  segment={[
                    { x: data[g.idx].date, y: chartYMaxOpt },
                    { x: data[g.idx].date, y: markerValue },
                  ]}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={isPositive ? 1 : 0.55}
                  ifOverflow="visible"
                  label={
                    flagLabel
                      ? {
                          position: "insideTopLeft",
                          offset: 6,
                          content: (props: unknown) => {
                            const vb =
                              (props as { viewBox?: { x?: number; y?: number } }).viewBox ?? {};
                            const x = vb.x ?? 0;
                            const y = (vb.y ?? 0) + 4;
                            const padX = 6;
                            const padY = 2;
                            const fontSize = 10;
                            const w = Math.max(36, flagLabel.length * 6 + padX * 2);
                            const h = fontSize + padY * 2;
                            return (
                              <g
                                style={{ cursor: "help", pointerEvents: "all" }}
                                onMouseEnter={(e) =>
                                  setHoveredMarker({
                                    x: e.clientX,
                                    y: e.clientY,
                                    label: labelDisplay,
                                    highlight: flagLabel,
                                    body,
                                    color,
                                  })
                                }
                                onMouseLeave={() => setHoveredMarker(null)}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={w}
                                  height={h}
                                  rx={3}
                                  fill={color}
                                  opacity={0.92}
                                />
                                {/* Subtle count badge if 2+ tactics shipped that week. */}
                                {g.labels.length > 1 && (
                                  <>
                                    <circle
                                      cx={x + w + 2}
                                      cy={y + h / 2}
                                      r={7}
                                      fill="#FFFFFF"
                                      stroke={color}
                                      strokeWidth={1.25}
                                    />
                                    <text
                                      x={x + w + 2}
                                      y={y + h / 2 + 0.5}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fontSize={9}
                                      fontWeight={700}
                                      fill={color}
                                      style={{ pointerEvents: "none" }}
                                    >
                                      {g.labels.length}
                                    </text>
                                  </>
                                )}
                                <text
                                  x={x + w / 2}
                                  y={y + h / 2 + 0.5}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize={fontSize}
                                  fontWeight={700}
                                  fill="#FFFFFF"
                                  style={{ pointerEvents: "none" }}
                                >
                                  {flagLabel}
                                </text>
                              </g>
                            );
                          },
                        }
                      : undefined
                  }
                />
              );
            });
          })()}
        </LineChart>
      </ResponsiveContainer>
      <style>{`
        @keyframes vsmFade {
          from { opacity: 0; transform: translate(-50%, calc(-100% - 20px)); }
          to   { opacity: 1; transform: translate(-50%, calc(-100% - 22px)); }
        }
      `}</style>
      {/* Marker tooltip — portaled to <body> with position:fixed so it
          can never be clipped by ancestor overflow:hidden, transforms, or
          stacking contexts. Mouse coords are captured in viewport space
          via e.clientX/clientY at hover time. */}
      <MarkerTooltipPortal hovered={hoveredMarker} />
    </div>
  );
}

interface MarkerTooltipPortalProps {
  hovered: {
    x: number;
    y: number;
    label: string;
    highlight?: string;
    body: string;
    color: string;
  } | null;
}

function MarkerTooltipPortal({ hovered }: MarkerTooltipPortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || !hovered || typeof document === "undefined") return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        left: hovered.x,
        top: hovered.y - 14,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        className="rounded-md border bg-[var(--color-surface)] shadow-md"
        style={{
          borderColor: "var(--color-border)",
          borderLeft: `3px solid ${hovered.color}`,
          padding: "6px 10px",
          minWidth: 200,
          maxWidth: 260,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-fg)",
            marginBottom: 2,
            whiteSpace: "pre-line",
          }}
        >
          {hovered.label}
        </div>
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.4,
            color: "var(--color-fg-secondary)",
          }}
        >
          {hovered.highlight && (
            <span
              style={{
                color: hovered.color,
                fontWeight: 700,
                fontSize: 12,
                marginRight: 4,
              }}
            >
              {hovered.highlight}
            </span>
          )}
          {hovered.body}
        </div>
      </div>
    </div>,
    document.body,
  );
}
