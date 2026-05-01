"use client";

import { useMemo } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
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
} from "./taxonomy";

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
                tick={{ fontSize: 11, fill: "var(--color-fg-secondary)" }}
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
      </div>
    </Card>
  );
}
