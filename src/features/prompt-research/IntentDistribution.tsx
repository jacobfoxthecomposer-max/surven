"use client";

import { useMemo } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { HelpCircle, PieChart as PieIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Intent, IntentType } from "./types";
import { INTENT_LABEL, INTENT_COLOR, INTENT_ORDER } from "./taxonomy";

interface IntentDistributionProps {
  intents: Intent[];
}

export function IntentDistribution({ intents }: IntentDistributionProps) {
  const data = useMemo(() => {
    const counts = new Map<IntentType, number>();
    for (const i of intents) {
      counts.set(i.intentType, (counts.get(i.intentType) ?? 0) + 1);
    }
    const total = intents.length;
    return INTENT_ORDER
      .filter((t) => counts.has(t))
      .map((t) => {
        const count = counts.get(t)!;
        return {
          type: t,
          label: INTENT_LABEL[t],
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
          color: INTENT_COLOR[t],
        };
      });
  }, [intents]);

  if (data.length === 0) return null;

  const total = data.reduce((acc, d) => acc + d.count, 0);
  const top = data[0];

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
            <PieIcon className="h-4 w-4 text-[#566A47]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Intent mix</h3>
          <HoverHint hint="What kind of work each prompt is doing — buying, learning, validating trust, asking how-to. Lopsided mixes mean blind spots.">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <div className="h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="var(--color-bg)"
                  strokeWidth={2}
                >
                  {data.map((d) => (
                    <Cell key={d.type} fill={d.color} />
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
                  formatter={(_v, _n, item) => {
                    const d = item.payload as (typeof data)[number];
                    return [`${d.count} intents · ${d.pct}%`, d.label];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: "var(--color-fg)",
                }}
              >
                {total}
              </p>
              <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">intents</p>
            </div>
          </div>

          <div className="space-y-2">
            {data.map((d) => (
              <div key={d.type} className="flex items-center gap-3">
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-sm text-[var(--color-fg-secondary)] flex-1">
                  {d.label}
                </span>
                <span className="text-sm font-medium text-[var(--color-fg)]">
                  {d.count}
                </span>
                <span className="text-xs text-[var(--color-fg-muted)] w-10 text-right">
                  {d.pct}%
                </span>
              </div>
            ))}
            <p className="text-[11px] text-[var(--color-fg-muted)] pt-2 leading-snug">
              Top mix:{" "}
              <span className="text-[var(--color-fg-secondary)] font-medium">
                {top.label}
              </span>{" "}
              at {top.pct}%.
            </p>
          </div>
        </div>

        <ChartExplainer
          blocks={[
            {
              label: "Intent type",
              body: 'What job each prompt is doing. "Commercial" means someone deciding what to buy. "Validation" means someone checking if you\'re legit. "Operational" means someone asking how to use you. Each intent type matters at a different stage of a customer\'s decision.',
            },
            {
              label: "Slice size",
              body: "What share of all your researched prompts fall into that intent. Bigger slice = more prompts of that type. The center number is your total intent count.",
            },
            {
              label: "What's healthy",
              body: "A balanced mix usually beats a lopsided one. If you're 80% commercial and 0% validation, people asking 'is your brand legit' aren't seeing you — that's a blind spot, even if your buying-intent prompts look great.",
            },
            {
              label: "Colors",
              body: "Visual differentiation between intent types only. They don't indicate good or bad — sage isn't better than rust here.",
            },
          ]}
          tip="Hover any slice to see its exact count and percentage."
        />
      </div>
    </Card>
  );
}
