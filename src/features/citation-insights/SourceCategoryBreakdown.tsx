"use client";

import { useMemo } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { Layers, Info } from "lucide-react";
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

export function SourceCategoryBreakdown({ results }: SourceCategoryBreakdownProps) {
  const data = useMemo(() => {
    const counts = new Map<SourceCategory, number>();
    for (const cat of ORDER) counts.set(cat, 0);
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        const cat = getCategory(d);
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    return ORDER.map((cat) => {
      const count = counts.get(cat) ?? 0;
      return {
        cat,
        label: CATEGORY_LABEL[cat],
        color: CATEGORY_COLOR[cat],
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      };
    }).filter((d) => d.count > 0);
  }, [results]);

  const total = data.reduce((a, b) => a + b.count, 0);
  if (total === 0) return null;

  const top = data.slice().sort((a, b) => b.count - a.count)[0];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Layers className="h-4 w-4 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">
          Source Categories
        </h3>
        <HoverHint hint="Where AI is finding information about you — directories, social platforms, news, wikis, or industry sites.">
          <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
        </HoverHint>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-surface-alt)] mb-4">
        {data.map((d) => (
          <div
            key={d.cat}
            className="h-full transition-all"
            style={{
              width: `${d.pct}%`,
              backgroundColor: d.color,
            }}
            title={`${d.label}: ${d.count}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map((d) => (
          <div key={d.cat} className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-[var(--color-fg-secondary)] truncate flex-1">
              {d.label}
            </span>
            <span className="text-xs font-semibold text-[var(--color-fg)] tabular-nums">
              {Math.round(d.pct)}%
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--color-fg-muted)] mt-4">
        {top.label} account for the largest share of your citations ({Math.round(top.pct)}%).
      </p>
    </Card>
  );
}
