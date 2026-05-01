"use client";

import { useMemo } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { ShieldCheck, Info } from "lucide-react";
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

interface AuthorityBreakdownProps {
  results: ScanResult[];
}

const ORDER: AuthorityTier[] = ["high", "medium", "low"];

export function AuthorityBreakdown({ results }: AuthorityBreakdownProps) {
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

  return (
    <Card className="overflow-hidden">
      <div
        className="-mx-6 -mt-6 px-6 py-4 mb-5"
        style={{ background: headerGradient }}
      >
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center`}>
            <ShieldCheck className={`h-4 w-4 ${iconColor}`} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">
            Authority Breakdown
          </h3>
          <HoverHint hint="Quality of the sources AI cites about you. High-authority sources (Yelp, Google, BBB, major news) carry more weight in AI ranking.">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
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

          <div className="pt-3 mt-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              {highPct >= 60
                ? "Strong authority mix — your citations come from trusted sources."
                : highPct >= 30
                ? "Mixed authority — some high-trust sources, room to improve."
                : "Low authority mix — focus on getting listed on high-trust directories."}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
