"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { ShieldCheck, HelpCircle, ArrowRight, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AUTHORITY_COLOR,
  AUTHORITY_LABEL,
  getAuthority,
  type AuthorityTier,
} from "@/utils/citationAuthority";
import type { ScanResult } from "@/types/database";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = endAngle - startAngle;
  const adj = sweep >= 360 ? 359.999 : sweep;
  const adjustedEnd = startAngle + adj;
  const so = polarToCartesian(cx, cy, outerR, adjustedEnd);
  const eo = polarToCartesian(cx, cy, outerR, startAngle);
  const si = polarToCartesian(cx, cy, innerR, adjustedEnd);
  const ei = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = adj <= 180 ? 0 : 1;
  return [
    "M", so.x, so.y,
    "A", outerR, outerR, 0, largeArc, 0, eo.x, eo.y,
    "L", ei.x, ei.y,
    "A", innerR, innerR, 0, largeArc, 1, si.x, si.y,
    "Z",
  ].join(" ");
}

interface AuthorityBreakdownProps {
  results: ScanResult[];
  /** "full" (default) renders the standalone card with gradient header,
   *  list+donut split, and ChartExplainer. "compact" matches the
   *  CleanStatCard chrome on /citation-insights so this card can live
   *  inline in the 3-card stat strip beside Citation Rate + Unique
   *  Sources. */
  variant?: "compact" | "full";
}

const ORDER: AuthorityTier[] = ["high", "medium", "low"];

export function AuthorityBreakdown({ results, variant = "full" }: AuthorityBreakdownProps) {
  const [hovered, setHovered] = useState<AuthorityTier | null>(null);
  const data = useMemo(() => {
    const counts: Record<AuthorityTier, number> = { high: 0, medium: 0, low: 0 };
    const seen = new Set<string>();
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        if (seen.has(d)) continue;
        seen.add(d);
        counts[getAuthority(d)]++;
      }
    }
    const total = counts.high + counts.medium + counts.low;
    return ORDER.map((tier) => ({
      tier,
      label: AUTHORITY_LABEL[tier],
      count: counts[tier],
      pct: total > 0 ? Math.round((counts[tier] / total) * 100) : 0,
      color: AUTHORITY_COLOR[tier],
    }));
  }, [results]);

  const total = data.reduce((acc, d) => acc + d.count, 0);
  const highPct = data.find((d) => d.tier === "high")?.pct ?? 0;
  const headerGradient =
    highPct >= 60
      ? "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))"
      : "linear-gradient(135deg, rgba(181,70,49,0.10), rgba(181,70,49,0.02))";
  const iconBg = highPct >= 60 ? "bg-[#96A283]/20" : "bg-[#B54631]/15";
  const iconColor = highPct >= 60 ? "text-[#566A47]" : "text-[#8C3522]";

  if (total === 0) return null;

  // ─── COMPACT VARIANT ────────────────────────────────────────────────────
  // Mirrors CleanStatCard chrome (icon tile + label + ⓘ at top, contextual
  // bottom line) so this card slots cleanly between Citation Rate +
  // Unique Sources in the /citation-insights stat strip.
  if (variant === "compact") {
    const tone =
      highPct >= 60 ? "good" : highPct >= 30 ? "warn" : "warn";
    const ToneIcon =
      tone === "good"
        ? CheckCircle2
        : highPct >= 30
          ? TrendingUp
          : AlertTriangle;
    const toneColor =
      tone === "good" ? "#5E7250" : "#A06210";
    const descriptor =
      highPct >= 60
        ? "Trusted-domain mix — AI weights these heaviest in answers"
        : highPct >= 30
          ? "Lean harder on directories + editorial — push high-auth share past 50%"
          : "Authority is thin — directory listings + PR moves this fastest";

    return (
      <Card className="flex flex-col p-5">
        {/* Top row — matches CleanStatCard exactly: icon tile + label + ⓘ */}
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(150,162,131,0.16)" }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: "#5E7250" }} />
          </div>
          <div className="min-w-0 flex-1 flex items-center gap-1">
            <p
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 12 }}
            >
              Authority Breakdown
            </p>
            <HoverHint
              hint="Quality of the sources AI cites about you. High-authority sources (Yelp, Google, BBB, major news) carry more weight in AI ranking."
              placement="top"
            >
              <HelpCircle className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
            </HoverHint>
          </div>
        </div>

        {/* Middle row — custom SVG donut on the left, tier rows on the
            right. Hovering either pops the matching slice out of the
            donut, dims the others, and swaps the center text to the
            slice's tier label + %. Mirrors the Coverage by intent +
            Source Categories charts so all three feel like one family. */}
        {(() => {
          const SIZE = 170;
          const cx = SIZE / 2;
          const cy = SIZE / 2;
          const innerR = 44;
          const outerR = 78;
          const visible = data.filter((d) => d.count > 0);
          let cum = 0;
          const slices = visible.map((d) => {
            const angle = (d.count / total) * 360;
            const slice = {
              ...d,
              startAngle: cum,
              endAngle: cum + angle,
              midAngle: cum + angle / 2,
            };
            cum += angle;
            return slice;
          });
          const hoveredSlice = slices.find((s) => s.tier === hovered);

          return (
            <div className="flex items-center gap-3 mt-3 flex-1 min-h-[170px]">
              <div className="shrink-0" style={{ width: SIZE, height: SIZE }}>
                <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
                  {slices.map((s) => {
                    const isHovered = hovered === s.tier;
                    const isDimmed = hovered !== null && !isHovered;
                    const offset = polarToCartesian(0, 0, isHovered ? 5 : 0, s.midAngle);
                    return (
                      <path
                        key={s.tier}
                        d={describeArc(cx, cy, innerR, outerR, s.startAngle, s.endAngle)}
                        fill={s.color}
                        stroke="var(--color-surface)"
                        strokeWidth={1.5}
                        onMouseEnter={() => setHovered(s.tier)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          cursor: "pointer",
                          opacity: isDimmed ? 0.32 : 1,
                          transform: `translate(${offset.x}px, ${offset.y}px)`,
                          transition: "opacity 180ms ease, transform 180ms ease",
                        }}
                      />
                    );
                  })}
                  {/* Inline slice % labels — at 130px the donut is
                      compact, so we only render the % when a slice is
                      ≥10% to keep things uncluttered. */}
                  {slices.map((s) => {
                    const fraction = s.count / total;
                    if (fraction < 0.1) return null;
                    const isDimmed = hovered !== null && hovered !== s.tier;
                    const offset = polarToCartesian(0, 0, hovered === s.tier ? 5 : 0, s.midAngle);
                    const labelR = (innerR + outerR) / 2;
                    const labelPt = polarToCartesian(cx, cy, labelR, s.midAngle);
                    return (
                      <text
                        key={`${s.tier}-pct`}
                        x={labelPt.x}
                        y={labelPt.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                        fontWeight={700}
                        fill="#1A1C1A"
                        style={{
                          pointerEvents: "none",
                          opacity: isDimmed ? 0.5 : 1,
                          transform: `translate(${offset.x}px, ${offset.y}px)`,
                          transition: "opacity 180ms ease, transform 180ms ease",
                        }}
                      >
                        {`${s.pct}%`}
                      </text>
                    );
                  })}
                  {hoveredSlice ? (
                    <>
                      <text
                        x={cx}
                        y={cy - 14}
                        textAnchor="middle"
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          fill: hoveredSlice.color,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {hoveredSlice.label.toUpperCase()}
                      </text>
                      <text
                        x={cx}
                        y={cy + 7}
                        textAnchor="middle"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 22,
                          fontWeight: 600,
                          fill: "var(--color-fg)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {hoveredSlice.pct}%
                      </text>
                      <text
                        x={cx}
                        y={cy + 20}
                        textAnchor="middle"
                        style={{
                          fontSize: 8.5,
                          fill: "var(--color-fg-muted)",
                        }}
                      >
                        {hoveredSlice.count} source{hoveredSlice.count === 1 ? "" : "s"}
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x={cx}
                        y={cy - 2}
                        textAnchor="middle"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 24,
                          fontWeight: 600,
                          fill: "var(--color-fg)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {total}
                      </text>
                      <text
                        x={cx}
                        y={cy + 14}
                        textAnchor="middle"
                        style={{
                          fontSize: 8.5,
                          fill: "var(--color-fg-muted)",
                        }}
                      >
                        sources
                      </text>
                    </>
                  )}
                </svg>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {data.map((d) => {
                  const isHovered = hovered === d.tier;
                  const isDimmed = hovered !== null && !isHovered;
                  return (
                    <div
                      key={d.tier}
                      onMouseEnter={() => d.count > 0 && setHovered(d.tier)}
                      onMouseLeave={() => setHovered(null)}
                      className="flex items-center gap-1.5 px-1 py-0.5 rounded-[var(--radius-sm)] transition-all"
                      style={{
                        backgroundColor: isHovered ? "rgba(0,0,0,0.04)" : "transparent",
                        opacity: isDimmed ? 0.4 : 1,
                        cursor: d.count > 0 ? "pointer" : "default",
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-sm shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span
                        className="text-[var(--color-fg)] flex-1 truncate"
                        style={{ fontSize: 11 }}
                      >
                        {d.label}
                      </span>
                      <span
                        className="font-semibold text-[var(--color-fg)] tabular-nums"
                        style={{ fontSize: 11 }}
                      >
                        {d.count}
                      </span>
                      <span
                        className="text-[var(--color-fg-muted)] tabular-nums w-7 text-right"
                        style={{ fontSize: 10 }}
                      >
                        {d.pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Bottom row — same chrome as CleanStatCard's bottomLine pattern. */}
        <div
          className="mt-3 pt-3 border-t flex items-start gap-2"
          style={{ borderColor: "rgba(150,162,131,0.25)" }}
        >
          <ToneIcon
            className="h-3.5 w-3.5 shrink-0 mt-0.5"
            style={{ color: toneColor }}
          />
          <p
            className="text-[var(--color-fg-secondary)] flex-1"
            style={{ fontSize: 11.5, lineHeight: 1.4 }}
          >
            {descriptor}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div
        className="-mx-6 -mt-6 px-6 py-4 mb-5"
        style={{ background: headerGradient }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center`}>
              <ShieldCheck className={`h-4 w-4 ${iconColor}`} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">
              Authority Breakdown
            </h3>
            <HoverHint hint="Quality of the sources AI cites about you. High-authority sources (Yelp, Google, BBB, major news) carry more weight in AI ranking.">
              <HelpCircle className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
            </HoverHint>
          </div>
          <Link
            href="/audit"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Run audit <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((d) => d.count > 0)}
                dataKey="count"
                nameKey="label"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                stroke="var(--color-bg)"
                strokeWidth={2}
              >
                {data.filter((d) => d.count > 0).map((d) => (
                  <Cell key={d.tier} fill={d.color} />
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
                formatter={(v, n) => [`${v} sources`, n as string]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.tier} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-[var(--color-fg)] flex-1">
                {d.label} authority
              </span>
              <span className="text-sm font-semibold text-[var(--color-fg)] tabular-nums">
                {d.count}
              </span>
              <span className="text-xs text-[var(--color-fg-muted)] w-10 text-right tabular-nums">
                {d.pct}%
              </span>
            </div>
          ))}

          <div className="pt-3 mt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-fg-muted)]">
              {highPct >= 60
                ? "Strong authority mix — your citations come from trusted sources."
                : highPct >= 30
                ? "Mixed authority — some high-trust sources, room to improve."
                : "Low authority mix — focus on getting listed on high-trust directories."}
            </p>
            <Link
              href="/competitor-comparison"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors shrink-0"
            >
              Compare <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Slices",
            body: "Each slice is one authority tier — high (Yelp, Google, BBB, Wikipedia, major news), medium (Facebook, Reddit, mid-tier directories), or low (everything else).",
          },
          {
            label: "Slice size",
            body: "Number of unique cited domains in that tier. We dedupe — a domain cited 10 times still counts once.",
          },
          {
            label: "Right-hand list",
            body: "Same data as the donut in row form — domain count and percentage share per tier.",
          },
          {
            label: "Colors",
            body: "Semantic — sage = high authority (good), gold = medium (watch), rust = low (concerning). The card header switches sage/rust based on whether your high-authority share is above or below 60%.",
          },
        ]}
        tip="60%+ high-authority share is the bar. Below 30% means most of your citations come from sources AI engines don't trust much."
      />
    </Card>
  );
}
