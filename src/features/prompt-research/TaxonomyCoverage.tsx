"use client";

import { useMemo } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { Info, Layers } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import type { Intent, TaxonomyCategory } from "./types";
import {
  TAXONOMY_LABEL,
  TAXONOMY_COLOR,
  TAXONOMY_ORDER,
  TAXONOMY_DESCRIPTION,
} from "./taxonomy";

const LABEL_TO_DESCRIPTION: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const cat of TAXONOMY_ORDER) {
    m[TAXONOMY_LABEL[cat]] = TAXONOMY_DESCRIPTION[cat];
  }
  return m;
})();

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

const LABEL_W = 165;
const LABEL_H = 24;

function CategoryTick({ x = 0, y = 0, payload }: TickProps) {
  const label = payload?.value ?? "";
  const description = LABEL_TO_DESCRIPTION[label] ?? "";
  return (
    <foreignObject
      x={x - LABEL_W - 4}
      y={y - LABEL_H / 2}
      width={LABEL_W}
      height={LABEL_H}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <HoverHint hint={description} placement="top">
          <span
            style={{
              fontSize: 11,
              color: "var(--color-fg-secondary)",
              cursor: "help",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </HoverHint>
      </div>
    </foreignObject>
  );
}

interface TaxonomyCoverageProps {
  intents: Intent[];
}

export function TaxonomyCoverage({ intents }: TaxonomyCoverageProps) {
  const data = useMemo(() => {
    const byCat = new Map<TaxonomyCategory, { count: number; coverageSum: number }>();
    for (const i of intents) {
      const prev = byCat.get(i.taxonomy) ?? { count: 0, coverageSum: 0 };
      byCat.set(i.taxonomy, {
        count: prev.count + 1,
        coverageSum: prev.coverageSum + i.overallCoverage,
      });
    }
    return TAXONOMY_ORDER
      .filter((cat) => byCat.has(cat))
      .map((cat) => {
        const v = byCat.get(cat)!;
        return {
          cat,
          label: TAXONOMY_LABEL[cat],
          count: v.count,
          coverage: Math.round(v.coverageSum / v.count),
          color: TAXONOMY_COLOR[cat],
        };
      });
  }, [intents]);

  if (data.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div
        className="-mx-5 -mt-5 px-5 py-4 mb-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#96A283]/20 flex items-center justify-center">
            <Layers className="h-4 w-4 text-[#566A47]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">
            Coverage by prompt type
          </h3>
          <HoverHint hint="How well your brand surfaces across each prompt taxonomy — defensive, category, comparative, validation, and so on. Low bars are gaps to attack.">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 6, right: 30, left: 8, bottom: 6 }}
              barSize={18}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--color-fg-muted)" }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={170}
                interval={0}
                tick={<CategoryTick />}
              />
              <Tooltip
                cursor={{ fill: "rgba(150,162,131,0.08)" }}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--color-fg)",
                }}
                formatter={(_value, _name, item) => {
                  const d = item.payload as (typeof data)[number];
                  return [`${d.coverage}% coverage · ${d.count} intents`, d.label];
                }}
                labelFormatter={() => ""}
              />
              <Bar dataKey="coverage" radius={[0, 6, 6, 0]}>
                {data.map((d) => (
                  <Cell key={d.cat} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ChartExplainer
          blocks={[
            {
              label: "Intent",
              body: 'A researched prompt someone might ask AI. Each intent rolls up 5–11 paraphrased variants — three different ways of asking "best plumber in Denver" all live under one intent.',
            },
            {
              label: "Coverage %",
              body: "The percent of variants where AI mentions your brand in its answer. 100% means every phrasing surfaces you. Higher is better.",
            },
            {
              label: "Bar length",
              body: "Average coverage across every intent in that category. Under 30% is a gap to attack. Over 60% is an area of strength.",
            },
            {
              label: "Colors",
              body: "Visual differentiation between prompt types only. They don't indicate good or bad — sage isn't better than rust here.",
            },
          ]}
          tip="Hover any prompt-type label on the left to see what it means."
        />
      </div>
    </Card>
  );
}
