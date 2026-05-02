"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { Layers, Info, ArrowRight } from "lucide-react";
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

export function SourceCategoryBreakdown({ results }: SourceCategoryBreakdownProps) {
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
  if (total === 0) return null;

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
        <span className="ml-auto text-xs text-[var(--color-fg-muted)] tabular-nums">
          {total} citations
        </span>
        <Link
          href="/competitor-comparison"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Compare <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-surface-alt)] mb-5">
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

      <div className="space-y-3">
        {data.map((d, i) => (
          <motion.div
            key={d.cat}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-center gap-3"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-fg)]">
                  {d.label}
                </span>
                <span className="text-[11px] text-[var(--color-fg-muted)]">
                  {d.uniqueDomains}{" "}
                  {d.uniqueDomains === 1 ? "source" : "sources"}
                </span>
              </div>
              {d.topDomain && (
                <p className="text-[11px] text-[var(--color-fg-muted)] truncate mt-0.5">
                  Top: {d.topDomain} ({d.topDomainCount})
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-[var(--color-fg)] tabular-nums">
                {d.count}
              </p>
              <p className="text-[11px] text-[var(--color-fg-muted)] tabular-nums">
                {Math.round(d.pct)}%
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Stacked bar (top)",
            body: "All your citations grouped by source type — directories, social, news, wiki, your own site, industry, other. Always sums to 100%.",
          },
          {
            label: "Rows below",
            body: "One row per category showing top-cited domain, total source count, citation count, and percentage share.",
          },
          {
            label: "Colors",
            body: "Visual differentiation between source types only. Sage marks your own site as the anchor — other colors don't indicate good or bad.",
          },
          {
            label: "What to look for",
            body: "Healthy mixes have your site, directories, and a couple of authoritative sources (news, wiki). If 'Other' dominates, AI is pulling from low-quality long-tail sources.",
          },
        ]}
        tip="Hover the stacked bar for raw counts per category."
      />
    </Card>
  );
}
