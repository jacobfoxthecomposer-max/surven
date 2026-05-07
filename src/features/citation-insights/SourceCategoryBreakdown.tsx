"use client";

import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  getCategory,
  type SourceCategory,
} from "@/utils/citationAuthority";
import type { ScanResult } from "@/types/database";

interface SourceCategoryBreakdownProps {
  results: ScanResult[];
}

const ORDER: SourceCategory[] = [
  "directory",
  "social",
  "news",
  "wiki",
  "your_site",
  "industry",
  "other",
];

interface CategoryRow {
  cat: SourceCategory;
  label: string;
  color: string;
  count: number;
  pct: number;
  uniqueDomains: number;
  topDomain: string | null;
  topDomainCount: number;
}

interface CategorySlice extends CategoryRow {
  startAngle: number;
  endAngle: number;
  midAngle: number;
}

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

export function SourceCategoryBreakdown({ results }: SourceCategoryBreakdownProps) {
  const [hovered, setHovered] = useState<SourceCategory | null>(null);

  const data = useMemo<CategoryRow[]>(() => {
    const counts = new Map<SourceCategory, number>();
    const domainsByCat = new Map<SourceCategory, Map<string, number>>();
    for (const cat of ORDER) {
      counts.set(cat, 0);
      domainsByCat.set(cat, new Map());
    }
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        const cat = getCategory(d);
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
        const dm = domainsByCat.get(cat)!;
        dm.set(d, (dm.get(d) ?? 0) + 1);
      }
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    return ORDER.map((cat) => {
      const count = counts.get(cat) ?? 0;
      const dm = domainsByCat.get(cat)!;
      const sortedDomains = Array.from(dm.entries()).sort((a, b) => b[1] - a[1]);
      const top = sortedDomains[0];
      return {
        cat,
        label: CATEGORY_LABEL[cat],
        color: CATEGORY_COLOR[cat],
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
        uniqueDomains: dm.size,
        topDomain: top ? top[0] : null,
        topDomainCount: top ? top[1] : 0,
      };
    }).filter((d) => d.count > 0);
  }, [results]);

  const total = data.reduce((a, b) => a + b.count, 0);
  const totalUnique = data.reduce((a, b) => a + b.uniqueDomains, 0);

  if (total === 0) return null;

  // Build the slice geometry — same approach as Coverage by intent.
  let cum = 0;
  const slices: CategorySlice[] = data.map((row) => {
    const angle = (row.count / total) * 360;
    const slice: CategorySlice = {
      ...row,
      startAngle: cum,
      endAngle: cum + angle,
      midAngle: cum + angle / 2,
    };
    cum += angle;
    return slice;
  });

  const cx = 140;
  const cy = 140;
  const innerR = 78;
  const outerR = 115;

  const hoveredSlice = slices.find((s) => s.cat === hovered);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      <div className="mb-5 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading
            text="Source Categories"
            info="Where AI is finding information about you — directories, social platforms, news, wikis, your own site, industry sites, or everything else."
          />
          <span className="text-[var(--color-fg-muted)]" style={{ fontSize: 12 }}>
            {total} citations · {totalUnique} sources
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-6 items-center">
        {/* Donut — custom SVG so each slice can pop on hover and the
            center text swaps between total + hovered-slice info. Matches
            the Coverage by intent donut on /prompts so the two charts
            visually rhyme. */}
        <div className="flex justify-center">
          <svg viewBox="0 0 280 280" width={280} height={280}>
            {slices.map((s) => {
              const isHovered = hovered === s.cat;
              const isDimmed = hovered !== null && !isHovered;
              const offset = polarToCartesian(0, 0, isHovered ? 8 : 0, s.midAngle);
              return (
                <path
                  key={s.cat}
                  d={describeArc(cx, cy, innerR, outerR, s.startAngle, s.endAngle)}
                  fill={s.color}
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                  onMouseEnter={() => setHovered(s.cat)}
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
            {/* Inline slice % labels — same threshold as Coverage by intent. */}
            {slices.map((s) => {
              const fraction = s.count / total;
              if (fraction < 0.05) return null;
              const isDimmed = hovered !== null && hovered !== s.cat;
              const offset = polarToCartesian(0, 0, hovered === s.cat ? 8 : 0, s.midAngle);
              const labelR = (innerR + outerR) / 2;
              const labelPt = polarToCartesian(cx, cy, labelR, s.midAngle);
              return (
                <text
                  key={`${s.cat}-pct`}
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill="#1A1C1A"
                  style={{
                    pointerEvents: "none",
                    opacity: isDimmed ? 0.5 : 1,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    transition: "opacity 180ms ease, transform 180ms ease",
                  }}
                >
                  {`${Math.round(fraction * 100)}%`}
                </text>
              );
            })}
            {hoveredSlice ? (
              <>
                <text
                  x={cx}
                  y={cy - 32}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    fill: hoveredSlice.color,
                    letterSpacing: "0.1em",
                  }}
                >
                  {hoveredSlice.label.toUpperCase()}
                </text>
                <text
                  x={cx}
                  y={cy + 6}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 44,
                    fontWeight: 600,
                    fill: "var(--color-fg)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {Math.round(hoveredSlice.pct)}%
                </text>
                <text
                  x={cx}
                  y={cy + 26}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  {hoveredSlice.count} citations · {hoveredSlice.uniqueDomains}{" "}
                  {hoveredSlice.uniqueDomains === 1 ? "source" : "sources"}
                </text>
                {hoveredSlice.topDomain && (
                  <text
                    x={cx}
                    y={cy + 42}
                    textAnchor="middle"
                    style={{
                      fontSize: 10.5,
                      fill: "var(--color-fg-muted)",
                    }}
                  >
                    Top: {hoveredSlice.topDomain} ({hoveredSlice.topDomainCount})
                  </text>
                )}
              </>
            ) : (
              <>
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 50,
                    fontWeight: 600,
                    fill: "var(--color-fg)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {total}
                </text>
                <text
                  x={cx}
                  y={cy + 18}
                  textAnchor="middle"
                  style={{
                    fontSize: 11,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  total citations
                </text>
                <text
                  x={cx}
                  y={cy + 34}
                  textAnchor="middle"
                  style={{
                    fontSize: 10.5,
                    fill: "var(--color-fg-muted)",
                  }}
                >
                  across {totalUnique} unique sources
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Interactive list — hovering a row pops the matching slice out
            of the donut and dims the others. Mirrors Coverage by intent. */}
        <div className="space-y-1.5">
          {slices.map((s) => {
            const isHovered = hovered === s.cat;
            const isDimmed = hovered !== null && !isHovered;
            return (
              <div
                key={s.cat}
                onMouseEnter={() => setHovered(s.cat)}
                onMouseLeave={() => setHovered(null)}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer transition-all"
                style={{
                  backgroundColor: isHovered ? "rgba(0,0,0,0.04)" : "transparent",
                  opacity: isDimmed ? 0.4 : 1,
                }}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <div className="min-w-0">
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      color: "var(--color-fg)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-[var(--color-fg-muted)] mt-0.5 truncate"
                    style={{ fontSize: 11 }}
                  >
                    {s.uniqueDomains}{" "}
                    {s.uniqueDomains === 1 ? "source" : "sources"} · {s.count}{" "}
                    citation{s.count === 1 ? "" : "s"}
                    {s.topDomain ? ` · top: ${s.topDomain} (${s.topDomainCount})` : ""}
                  </p>
                </div>
                <span
                  className="tabular-nums text-right"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                    letterSpacing: "-0.02em",
                    minWidth: 60,
                  }}
                >
                  {Math.round(s.pct)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
