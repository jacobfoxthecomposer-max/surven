"use client";

/**
 * Cited Domains table — visually mirrors the Tracked Prompts table on
 * /prompts: 3-column header (display title + filter pill cluster +
 * reset), uppercase tracked-wide column heads with sort, hover-row
 * treatment, and a Show 20/50/100/All pagination footer. Data stays
 * domain-centric: per-domain authority tier, category, citation count,
 * which engines cited it, and Listed-vs-Gap status.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  FilterX,
  RotateCcw,
} from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import {
  AUTHORITY_LABEL,
  CATEGORY_COLOR,
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
type SortDir = "asc" | "desc";

const AUTHORITY_RANK: Record<AuthorityTier, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const SAGE = "#5E7250";
const RUST = "#B54631";
const AMBER = "#A06210";

// Authority pill palette — mirrors the same sage/amber/neutral story
// used on the Citation Gap Analysis card.
const AUTHORITY_TOK: Record<
  AuthorityTier,
  { color: string; bg: string }
> = {
  high: { color: SAGE, bg: "rgba(150,162,131,0.18)" },
  medium: { color: AMBER, bg: "rgba(184,160,48,0.16)" },
  low: { color: "#6B6D6B", bg: "rgba(60,62,60,0.10)" },
};

const STATUS_FILTERS = ["all", "listed", "gap"] as const;
const AUTH_FILTER_TIERS: AuthorityTier[] = ["high", "medium", "low"];
const PAGE_OPTIONS = [10, 20, 50, 100, "all"] as const;
type PageOption = (typeof PAGE_OPTIONS)[number];

const ENGINE_IDS: ModelName[] = [
  "chatgpt",
  "claude",
  "gemini",
  "google_ai",
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function CitedDomainsTable({ results }: CitedDomainsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("all");
  // Multi-select authority filter — empty Set means "no filter, show
  // all authorities". Each High / Med / Low pill toggles its tier in
  // and out of the set independently.
  const [authFilters, setAuthFilters] = useState<Set<AuthorityTier>>(
    () => new Set(),
  );
  // Multi-select category filter — empty Set = show all categories.
  // Mirrors the IntentFilterHeader pattern from /prompts; lives in the
  // Category column header dropdown.
  const [categoryFilters, setCategoryFilters] = useState<Set<SourceCategory>>(
    () => new Set(),
  );
  const [pageSize, setPageSize] = useState<PageOption>(10);

  function toggleAuthFilter(tier: AuthorityTier) {
    setAuthFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }

  const rows = useMemo<DomainRow[]>(() => {
    const map = new Map<
      string,
      { count: number; engines: Set<ModelName>; listed: boolean }
    >();
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        const ex =
          map.get(d) ?? {
            count: 0,
            engines: new Set<ModelName>(),
            listed: false,
          };
        ex.count++;
        ex.engines.add(r.model_name as ModelName);
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

  const filtered = useMemo(() => {
    let out = rows;
    if (statusFilter === "listed") out = out.filter((r) => r.listed);
    else if (statusFilter === "gap") out = out.filter((r) => !r.listed);
    // Empty set = no filter (show all authority tiers).
    if (authFilters.size > 0) {
      out = out.filter((r) => authFilters.has(r.authority));
    }
    if (categoryFilters.size > 0) {
      out = out.filter((r) => categoryFilters.has(r.category));
    }
    return out;
  }, [rows, statusFilter, authFilters, categoryFilters]);

  // Categories actually present in the data — drives the category
  // filter dropdown options so users only see the buckets that exist.
  const availableCategories = useMemo(() => {
    const set = new Set<SourceCategory>();
    for (const r of rows) set.add(r.category);
    // Stable display order — match the SourceCategoryBreakdown order.
    const ORDER: SourceCategory[] = [
      "directory",
      "social",
      "news",
      "wiki",
      "your_site",
      "industry",
      "other",
    ];
    return ORDER.filter((c) => set.has(c));
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = filtered.slice();
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "domain") cmp = a.domain.localeCompare(b.domain);
      else if (sortKey === "count") cmp = a.count - b.count;
      else if (sortKey === "authority")
        cmp = AUTHORITY_RANK[a.authority] - AUTHORITY_RANK[b.authority];
      else if (sortKey === "category")
        cmp = a.category.localeCompare(b.category);
      else if (sortKey === "listed")
        cmp = (a.listed ? 1 : 0) - (b.listed ? 1 : 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const visible = pageSize === "all" ? sorted : sorted.slice(0, pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "domain" || key === "category" ? "asc" : "desc");
    }
  }

  const isDefaultSort = sortKey === "count" && sortDir === "desc";
  const hasActiveFilters =
    statusFilter !== "all" || authFilters.size > 0 || categoryFilters.size > 0;

  function handleResetSort() {
    setSortKey("count");
    setSortDir("desc");
  }
  function handleResetFilters() {
    setStatusFilter("all");
    setAuthFilters(new Set());
    setCategoryFilters(new Set());
  }

  if (rows.length === 0) return null;

  return (
    <section
      id="cited-domains-table"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] scroll-mt-6"
    >
      {/* 3-column header — mirrors PromptsTable: title (+info) on the
          left, filter pill cluster centered, reset cluster on the right. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-3 px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              fontWeight: 500,
              color: "var(--color-fg)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            All Cited Domains
          </h2>
          <SectionHeading
            text=""
            info="Every domain AI engines cited in responses about your business. Sort by Authority desc + Status = Gap to surface the highest-leverage listings to claim next."
          />
        </div>

        {/* Filter pill cluster — Status (All / Listed / Gap) + Authority
            (All / High / Med / Low). Same Cormorant pill style as the
            Tracked Prompts table. */}
        <div className="justify-self-center inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-1 gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f;
            const label = f === "all" ? "All" : f === "listed" ? "Listed" : "Gap";
            return (
              <motion.button
                key={f}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.15, ease: EASE }}
                onClick={() => setStatusFilter(f)}
                aria-pressed={active}
                className={
                  "px-3 py-1 rounded-[var(--radius-md)] transition-colors whitespace-nowrap " +
                  (active
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                }
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                {label}
              </motion.button>
            );
          })}
          <span
            aria-hidden
            className="self-stretch w-px mx-0.5"
            style={{ backgroundColor: "var(--color-border)" }}
          />
          {/* Multi-select authority pills — High / Med / Low each toggle
              their tier in/out. Empty selection = show all authorities,
              so there's no separate "All" pill. */}
          {AUTH_FILTER_TIERS.map((tier) => {
            const active = authFilters.has(tier);
            const label =
              tier === "high" ? "High" : tier === "medium" ? "Med" : "Low";
            return (
              <HoverHint
                key={tier}
                hint={`${active ? "Hide" : "Show only"} ${label.toLowerCase()}-authority sources. Deselect every tier to show all.`}
              >
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  onClick={() => toggleAuthFilter(tier)}
                  aria-pressed={active}
                  className={
                    "px-3 py-1 rounded-[var(--radius-md)] transition-colors whitespace-nowrap " +
                    (active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{
                    fontSize: 18,
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  {label}
                </motion.button>
              </HoverHint>
            );
          })}
        </div>

        <div className="justify-self-end inline-flex items-center gap-2">
          {!isDefaultSort && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={handleResetSort}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] transition-all"
              style={{ fontSize: 12, fontFamily: "var(--font-sans)", fontWeight: 500 }}
              title="Reset to default sort (Citations, highest first)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset sort
            </motion.button>
          )}
          <HoverHint hint="Reset all filters — clears Status + Authority pills.">
            <motion.button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              animate={{ opacity: hasActiveFilters ? 1 : 0.5 }}
              transition={{ duration: 0.2, ease: EASE }}
              whileTap={hasActiveFilters ? { scale: 0.95 } : undefined}
              className={
                "inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border whitespace-nowrap transition-all " +
                (hasActiveFilters
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:brightness-110 hover:shadow-md cursor-pointer"
                  : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] cursor-default")
              }
              style={{
                fontSize: 14,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
              aria-label="Reset all filters"
            >
              <FilterX className="h-4 w-4" />
              Reset filters
            </motion.button>
          </HoverHint>
        </div>
      </div>

      {/* Branded callout area placeholder — kept consistent with
          PromptsTable spacing rhythm. */}
      <div className="px-6 pt-4 pb-1">
        <p
          className="text-[var(--color-fg-muted)]"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {sorted.length} of {rows.length} domain
          {rows.length === 1 ? "" : "s"} shown
          {hasActiveFilters ? " (filtered)" : ""}.
        </p>
      </div>

      <div
        className="px-6 pb-4 overflow-y-auto overflow-x-auto"
        style={{ maxHeight: 760 }}
      >
        <table
          className="w-full"
          style={{
            fontSize: 13,
            tableLayout: "fixed",
            // border-collapse: collapse (Tailwind default) lets row
            // cell borders share with the sticky thead, which is why
            // scrolling rows were bleeding through. `separate` gives
            // each cell its own owned border + background, so the
            // sticky thead can be fully opaque.
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <colgroup>
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          {/* Sticky thead — every <th> carries its own sticky positioning
              + opaque bg + bottom border so each cell individually pins
              itself to the top of the scroll area. Doing it per-th
              (rather than on the parent thead/tr) is the only reliable
              cross-browser pattern for sticky table headers. */}
          <thead>
            <tr>
              <SortableHeader
                label="Domain"
                column="domain"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="left"
              />
              <SortableHeader
                label="Authority"
                column="authority"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="left"
              />
              <CategoryFilterHeader
                allCategories={availableCategories}
                selected={categoryFilters}
                onApply={(next) => setCategoryFilters(next)}
              />
              <SortableHeader
                label="Citations"
                column="count"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <th
                className="py-3 px-4 text-center"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--color-surface)",
                  boxShadow: "inset 0 -2px 0 rgba(60,62,60,0.22)",
                }}
              >
                <span
                  className="inline-flex items-center font-semibold uppercase text-[var(--color-fg-muted)]"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Engines
                </span>
              </th>
              <SortableHeader
                label="Status"
                column="listed"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <th
                className="py-3 px-4 text-right"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--color-surface)",
                  boxShadow: "inset 0 -2px 0 rgba(60,62,60,0.22)",
                }}
              >
                <span
                  className="inline-flex items-center font-semibold uppercase text-[var(--color-fg-muted)]"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Action
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-[var(--color-fg-muted)] py-10"
                  style={{ fontSize: 13 }}
                >
                  No domains match the current filters.
                </td>
              </tr>
            ) : (
              visible.map((row, idx) => {
                const auth = AUTHORITY_TOK[row.authority];
                return (
                  <motion.tr
                    key={row.domain}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.3,
                      ease: EASE,
                      delay: Math.min(idx * 0.02, 0.25),
                    }}
                    className="hover:bg-[var(--color-surface-alt)]/40 transition-colors [&>td]:[border-bottom:1.5px_solid_rgba(60,62,60,0.18)]"
                  >
                    {/* Domain */}
                    <td className="py-2.5 px-5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <a
                          href={`https://${row.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-fg)] truncate hover:underline font-semibold"
                          style={{ fontSize: 13 }}
                          title={`Visit ${row.domain}`}
                        >
                          {row.domain}
                        </a>
                        <ExternalLink className="h-3 w-3 text-[var(--color-fg-muted)] shrink-0" />
                      </div>
                    </td>
                    {/* Authority pill */}
                    <td className="py-2.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 whitespace-nowrap"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: auth.color,
                          backgroundColor: auth.bg,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        <span
                          className="rounded-full shrink-0"
                          style={{
                            width: 5,
                            height: 5,
                            backgroundColor: auth.color,
                          }}
                        />
                        {AUTHORITY_LABEL[row.authority]}
                      </span>
                    </td>
                    {/* Category — colored chip matching the colors used
                        in the Source Categories donut at the bottom of
                        the page (CATEGORY_COLOR). Same dot + label
                        treatment so the two surfaces read as one. */}
                    <td className="py-2.5 px-4">
                      {(() => {
                        const cColor = CATEGORY_COLOR[row.category];
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 whitespace-nowrap"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: cColor,
                              backgroundColor: `${cColor}1F`,
                            }}
                          >
                            <span
                              className="rounded-full shrink-0"
                              style={{
                                width: 6,
                                height: 6,
                                backgroundColor: cColor,
                              }}
                            />
                            {CATEGORY_LABEL[row.category]}
                          </span>
                        );
                      })()}
                    </td>
                    {/* Citations count */}
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className="tabular-nums text-[var(--color-fg)]"
                        style={{ fontSize: 13, fontWeight: 600 }}
                      >
                        {row.count.toLocaleString()}
                      </span>
                    </td>
                    {/* Engines — per-engine dot row, mirrors the prompts
                        table Status column treatment. Sage if the engine
                        cited this domain, faded grey otherwise. */}
                    <td className="py-2.5 px-4">
                      <div className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-full w-full">
                        {ENGINE_IDS.map((e) => {
                          const hit = row.engines.includes(e);
                          return (
                            <span
                              key={e}
                              className="inline-flex items-center"
                              style={{ opacity: hit ? 1 : 0.3 }}
                              title={`${e === "chatgpt" ? "ChatGPT" : e === "claude" ? "Claude" : e === "gemini" ? "Gemini" : "Google AI"}: ${hit ? "cited" : "not cited"}`}
                            >
                              <EngineIcon id={e} size={12} />
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    {/* Status pill (Listed / Gap) */}
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 whitespace-nowrap"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: row.listed ? SAGE : RUST,
                          backgroundColor: row.listed
                            ? "rgba(150,162,131,0.18)"
                            : "rgba(181,70,49,0.12)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {row.listed ? "Listed" : "Gap"}
                      </span>
                    </td>
                    {/* Action — Compare for listed domains, Get listed for
                        gap domains. Soft client nav via Link. */}
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={
                          row.listed ? "/competitor-comparison" : "/audit#fix-these-first"
                        }
                        className="group inline-flex items-center gap-1 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
                        style={{
                          fontSize: 12,
                          color: row.listed ? SAGE : RUST,
                        }}
                      >
                        {row.listed ? "Compare" : "Get listed"}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — page-size cluster mirrors PromptsTable */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[var(--color-border)]">
        <p
          className="text-[var(--color-fg-muted)] tabular-nums"
          style={{ fontSize: 12 }}
        >
          Showing{" "}
          <span className="font-semibold text-[var(--color-fg)]">
            {visible.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[var(--color-fg)]">
            {sorted.length}
          </span>{" "}
          domain{sorted.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.08em" }}
          >
            Show
          </span>
          <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5 gap-0.5">
            {PAGE_OPTIONS.map((opt) => {
              const active = pageSize === opt;
              const label = opt === "all" ? "All" : String(opt);
              return (
                <button
                  key={String(opt)}
                  onClick={() => setPageSize(opt)}
                  className={
                    "px-2.5 py-0.5 rounded transition-colors font-medium " +
                    (active
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                  }
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-sans)",
                    cursor: active ? "default" : "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Sortable column header — mirrors the prompts table header treatment
// (uppercase tracked-wide label + ↑/↓ indicator on the active column).
function SortableHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align: "left" | "right" | "center";
}) {
  const active = sortKey === column;
  const Arrow = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={
        "py-3 px-4 " +
        (align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left")
      }
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backgroundColor: "var(--color-surface)",
        boxShadow: "inset 0 -2px 0 rgba(60,62,60,0.22)",
      }}
    >
      <button
        onClick={() => onSort(column)}
        className={
          "inline-flex items-center gap-1 uppercase font-semibold transition-colors " +
          (active
            ? "text-[var(--color-fg)]"
            : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)]")
        }
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
        <Arrow
          className={"h-3 w-3 " + (active ? "opacity-100" : "opacity-50")}
        />
      </button>
    </th>
  );
}

// Category column header — replaces sort with a multi-select filter
// dropdown (mirrors IntentFilterHeader on /prompts). Sort makes no
// sense across discrete category buckets, but filtering does. Portal-
// rendered popover with "All / None" + checkbox list + Apply footer.
function CategoryFilterHeader({
  allCategories,
  selected,
  onApply,
}: {
  allCategories: SourceCategory[];
  selected: Set<SourceCategory>;
  onApply: (next: Set<SourceCategory>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<SourceCategory>>(selected);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Sync draft from committed state every time we open the dropdown.
  useEffect(() => {
    if (open) setDraft(new Set(selected));
  }, [open, selected]);

  // Recompute popover position when opening / on resize / scroll.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 6, left: rect.left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Click-outside to dismiss without applying.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !popoverRef.current?.contains(t)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const isFiltered = selected.size > 0 && selected.size < allCategories.length;

  function toggle(cat: SourceCategory) {
    setDraft((prev) => {
      // Smart "filter to only this" — if every category is currently
      // selected (or none, which means "show all"), clicking one row
      // narrows to ONLY that category. Matches the IntentFilterHeader
      // pattern from /prompts.
      if (prev.size === 0 || prev.size === allCategories.length) {
        return new Set([cat]);
      }
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      // Empty draft = treat as reset (otherwise apply silently re-shows
      // everything which is confusing).
      if (next.size === 0) return new Set(allCategories);
      return next;
    });
  }

  function apply() {
    // Selecting all = no filter (Set semantics on the parent).
    if (draft.size === allCategories.length) onApply(new Set());
    else onApply(new Set(draft));
    setOpen(false);
  }

  function selectAll() {
    setDraft(new Set(allCategories));
  }

  function clearAll() {
    setDraft(new Set());
  }

  return (
    <th
      className="py-3 px-4 text-left"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        backgroundColor: "var(--color-surface)",
        boxShadow: "inset 0 -2px 0 rgba(60,62,60,0.22)",
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 group"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <span
          className="font-semibold uppercase text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}
        >
          Category
        </span>
        {isFiltered && (
          <span
            className="inline-flex items-center justify-center rounded-full tabular-nums"
            style={{
              minWidth: 16,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              backgroundColor: "var(--color-primary)",
              color: "white",
              padding: "0 4px",
            }}
          >
            {selected.size}
          </span>
        )}
        <ChevronDown
          className={
            "h-3 w-3 text-[var(--color-fg-muted)] transition-transform " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open && mounted && pos &&
        createPortal(
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="rounded-md shadow-lg overflow-hidden"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: 220,
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
              <span
                className="font-semibold uppercase text-[var(--color-fg-muted)]"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                Filter by category
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                  style={{ fontSize: 11 }}
                >
                  All
                </button>
                <span className="text-[var(--color-border)]">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                  style={{ fontSize: 11 }}
                >
                  None
                </button>
              </div>
            </div>

            <div className="py-1.5">
              {allCategories.map((cat) => {
                const checked = draft.has(cat);
                const c = CATEGORY_COLOR[cat];
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(cat)}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
                    />
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{
                        width: 9,
                        height: 9,
                        backgroundColor: c,
                      }}
                    />
                    <span
                      className="flex-1"
                      style={{
                        fontSize: 13,
                        color: "var(--color-fg)",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {CATEGORY_LABEL[cat]}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="px-3 py-2 border-t border-[var(--color-border)] flex justify-end">
              <motion.button
                type="button"
                onClick={apply}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15, ease: EASE }}
                className="rounded-[var(--radius-sm)] font-semibold transition-colors"
                style={{
                  fontSize: 12,
                  padding: "5px 14px",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                }}
              >
                Apply
              </motion.button>
            </div>
          </motion.div>,
          document.body,
        )}
    </th>
  );
}
