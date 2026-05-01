"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { Database, Info, ExternalLink, ArrowUpDown } from "lucide-react";
import {
  AUTHORITY_COLOR,
  AUTHORITY_LABEL,
  CATEGORY_LABEL,
  getAuthority,
  getCategory,
  type AuthorityTier,
  type SourceCategory,
} from "@/utils/citationAuthority";
import type { ScanResult, ModelName } from "@/types/database";

interface CitedDomainsTableProps {
  results: ScanResult[];
}

interface DomainRow {
  domain: string;
  count: number;
  authority: AuthorityTier;
  category: SourceCategory;
  engines: ModelName[];
  listed: boolean;
}

type SortKey = "domain" | "count" | "authority" | "category" | "listed";

const AUTHORITY_RANK: Record<AuthorityTier, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function CitedDomainsTable({ results }: CitedDomainsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo<DomainRow[]>(() => {
    const map = new Map<string, { count: number; engines: Set<ModelName>; listed: boolean }>();
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        const ex = map.get(d) ?? { count: 0, engines: new Set<ModelName>(), listed: false };
        ex.count++;
        ex.engines.add(r.model_name);
        if (r.business_mentioned) ex.listed = true;
        map.set(d, ex);
      }
    }
    return Array.from(map.entries()).map(([domain, v]) => ({
      domain,
      count: v.count,
      authority: getAuthority(domain),
      category: getCategory(domain),
      engines: Array.from(v.engines),
      listed: v.listed,
    }));
  }, [results]);

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "domain") cmp = a.domain.localeCompare(b.domain);
      else if (sortKey === "count") cmp = a.count - b.count;
      else if (sortKey === "authority") cmp = AUTHORITY_RANK[a.authority] - AUTHORITY_RANK[b.authority];
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else if (sortKey === "listed") cmp = (a.listed ? 1 : 0) - (b.listed ? 1 : 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "domain" || key === "category" ? "asc" : "desc");
    }
  };

  if (rows.length === 0) return null;

  const headers: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "domain", label: "Domain", align: "left" },
    { key: "authority", label: "Authority", align: "left" },
    { key: "category", label: "Category", align: "left" },
    { key: "count", label: "Citations", align: "right" },
    { key: "listed", label: "Status", align: "right" },
  ];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Database className="h-4 w-4 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">
          All Cited Domains
        </h3>
        <HoverHint hint="Every domain AI models cited in responses about your business. Sort by any column to find gaps and high-authority opportunities.">
          <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
        </HoverHint>
        <span className="ml-auto text-xs text-[var(--color-fg-muted)]">
          {rows.length} {rows.length === 1 ? "source" : "sources"}
        </span>
      </div>

      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`px-3 py-2 text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wide ${
                    h.align === "right" ? "text-right" : "text-left"
                  } ${h.key === "domain" ? "pl-6" : ""}`}
                >
                  <button
                    onClick={() => toggleSort(h.key)}
                    className={`inline-flex items-center gap-1 hover:text-[var(--color-fg)] transition-colors ${
                      sortKey === h.key ? "text-[var(--color-fg)]" : ""
                    }`}
                  >
                    {h.label}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 pr-6 text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wide text-right">
                Engines
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.domain}
                className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-alt)]/40 transition-colors"
              >
                <td className="px-3 py-2.5 pl-6">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[var(--color-fg)] truncate">
                      {row.domain}
                    </span>
                    <a
                      href={`https://${row.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] shrink-0"
                      aria-label={`Visit ${row.domain}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: AUTHORITY_COLOR[row.authority] }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: AUTHORITY_COLOR[row.authority] }}
                    />
                    {AUTHORITY_LABEL[row.authority]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-[var(--color-fg-secondary)]">
                  {CATEGORY_LABEL[row.category]}
                </td>
                <td className="px-3 py-2.5 text-right text-[var(--color-fg)] tabular-nums font-semibold">
                  {row.count}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      row.listed
                        ? "bg-[var(--color-success)]/15 text-[#566A47]"
                        : "bg-[var(--color-danger)]/15 text-[#8C3522]"
                    }`}
                  >
                    {row.listed ? "Listed" : "Gap"}
                  </span>
                </td>
                <td className="px-3 py-2.5 pr-6 text-right">
                  <div className="inline-flex items-center gap-1">
                    {row.engines.map((e) => (
                      <span
                        key={e}
                        className="inline-flex items-center justify-center text-[var(--color-fg-secondary)]"
                        title={e}
                      >
                        <EngineIcon id={e} size={12} />
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "One row per unique cited domain across all engines. Same domain cited many times = one row with a higher Citations count.",
          },
          {
            label: "Authority",
            body: "Sage = high (Yelp, Google, BBB, Wikipedia, major news), gold = medium (Facebook, Reddit, mid-tier directories), rust = low (everything else).",
          },
          {
            label: "Status",
            body: "Listed (sage) = your business was mentioned in at least one response that cited this domain. Gap (rust) = engines pull from this domain but never connect it back to you.",
          },
          {
            label: "Engines column",
            body: "Which AI engines cited this domain. More icons = broader coverage. Two engines citing the same source is a stronger signal than one.",
          },
        ]}
        tip="Sort by Authority desc, then Status = Gap → that's your priority list of high-authority sources to get listed on."
      />
    </Card>
  );
}
