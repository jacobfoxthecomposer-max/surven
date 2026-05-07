"use client";

/**
 * Intents table — visually mirrors the Tracked Prompts table on
 * /prompts: 3-column header (display title + filter pill cluster +
 * reset + Send to Tracker), sub-row with search + taxonomy filter,
 * sticky thead with per-cell sticky positioning + border-collapse:
 * separate (so the thead can't bleed underneath rows), sortable column
 * headers, hover-row treatment, and a Show 10/20/50/100/All
 * pagination footer.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { HoverHint } from "@/components/atoms/HoverHint";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  FilterX,
  Hash,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";
import type {
  Intent,
  IntentType,
  TaxonomyCategory,
  Variant,
} from "./types";
import {
  INTENT_COLOR,
  INTENT_LABEL,
  INTENT_ORDER,
} from "./taxonomy";
import { INDUSTRY_SAMPLE_PROMPTS } from "@/utils/promptCategories";

interface IntentsTableProps {
  intents: Intent[];
  onSendToTracker: (selectedIds: string[]) => void;
  /** Used to populate the personalized view's industry-specific
   *  clusters (Personal injury, Class actions, etc. for Lawyer). Same
   *  source as the personalized section on /prompts. */
  industry?: string | null;
  /** Replaces `{location}` in the sample prompt templates. */
  city?: string | null;
  /** Replaces `{state}` in the sample prompt templates. */
  state?: string | null;
}

type SortKey =
  | "canonical"
  | "intent"
  | "variants"
  | "importance";
type SortDir = "asc" | "desc";

const PAGE_OPTIONS = [10, 20, 50, 100, "all"] as const;
type PageOption = (typeof PAGE_OPTIONS)[number];

// View mode toggle — General = broad/category prompts; Personalized =
// prompts tailored to the user's business + audience (branded +
// use-case JTBD + audience/constraint modified + list recommendations).
// Mirrors the General/Personalized toggle chrome from /prompts.
type ViewMode = "general" | "personalized";

const PERSONALIZED_TAXONOMIES: ReadonlyArray<TaxonomyCategory> = [
  "branded_defensive",
  "branded_informational",
  "use_case_jtbd",
  "audience_modified",
  "constraint_modified",
  "list_recommendation",
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function IntentsTable({
  intents,
  onSendToTracker,
  industry,
  city,
  state,
}: IntentsTableProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("general");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("importance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState<PageOption>(10);
  // Multi-select intent-type filter — empty Set = show all types.
  // Mirrors the IntentFilterHeader pattern from /prompts; lives in the
  // Intent type column header dropdown.
  const [intentTypeFilters, setIntentTypeFilters] = useState<Set<IntentType>>(
    () => new Set(),
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return intents.filter((i) => {
      // Personalized view = only intents in the personalized
      // taxonomies (branded + use-case JTBD + audience/constraint
      // modified + list recommendation). General view shows everything.
      if (
        viewMode === "personalized" &&
        !PERSONALIZED_TAXONOMIES.includes(i.taxonomy)
      )
        return false;
      if (intentTypeFilters.size > 0 && !intentTypeFilters.has(i.intentType)) return false;
      if (q && !i.canonical.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [intents, search, viewMode, intentTypeFilters]);

  // Intent types actually present in the data — drives the filter
  // dropdown options so users only see the buckets that exist.
  const availableIntentTypes = useMemo(() => {
    const set = new Set<IntentType>();
    for (const i of intents) set.add(i.intentType);
    return INTENT_ORDER.filter((t) => set.has(t));
  }, [intents]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "canonical":
          return a.canonical.localeCompare(b.canonical) * dir;
        case "intent":
          return a.intentType.localeCompare(b.intentType) * dir;
        case "variants":
          return (a.variants.length - b.variants.length) * dir;
        case "importance":
          return (a.importance - b.importance) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const visible = pageSize === "all" ? sorted : sorted.slice(0, pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "canonical" || key === "intent" ? "asc" : "desc",
      );
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    visible.length > 0 && visible.every((i) => selected.has(i.id));

  const toggleAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const i of visible) next.delete(i.id);
        return next;
      }
      const next = new Set(prev);
      for (const i of visible) next.add(i.id);
      return next;
    });
  };

  const handleSend = () => {
    if (selected.size === 0) return;
    onSendToTracker(Array.from(selected));
    setSelected(new Set());
  };

  const isDefaultSort = sortKey === "importance" && sortDir === "desc";
  const hasActiveFilters =
    search.trim() !== "" || intentTypeFilters.size > 0;

  function handleResetSort() {
    setSortKey("importance");
    setSortDir("desc");
  }
  function handleResetFilters() {
    setSearch("");
    setIntentTypeFilters(new Set());
  }

  return (
    <section
      id="intents-table"
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] scroll-mt-6"
    >
      {/* 3-column header — mirrors PromptsTable: title (+info) on the
          left, status filter pill cluster centered, reset cluster +
          Send to Tracker on the right. */}
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
            Recommended Prompts
          </h2>
          <SectionHeading
            text=""
            info="Every prompt intent we've researched. Each row is one intent with N paraphrased variants. Check the rows you want, then click Send to Tracker to lock them into your weekly scan."
          />
        </div>

        {/* General ↔ Personalized view toggle — exact chrome match to
            the Tracked Prompts table on /prompts so the two pages share
            the same toggle. Personalized pill carries a sage→gold→amber
            gradient + glow to hint "this is the AI-personalized view." */}
        <div className="justify-self-center inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-1 gap-1">
          <HoverHint hint="Broad category prompts customers ask AI in your industry — research candidates that aren't tailored to your specific business yet.">
            <button
              type="button"
              onClick={() => setViewMode("general")}
              aria-pressed={viewMode === "general"}
              className={
                "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] transition-colors capitalize whitespace-nowrap " +
                (viewMode === "general"
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
              General
            </button>
          </HoverHint>
          <HoverHint hint="Personalized recommended prompts — branded, use-case, audience-specific, and list/recommendation phrasings tailored to your business.">
            <button
              type="button"
              onClick={() => setViewMode("personalized")}
              aria-pressed={viewMode === "personalized"}
              className={
                "inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] capitalize whitespace-nowrap transition-all " +
                (viewMode === "personalized" ? "text-white" : "")
              }
              style={{
                fontSize: 18,
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                letterSpacing: "0.01em",
                background:
                  viewMode === "personalized"
                    ? "linear-gradient(135deg, #96A283 0%, #B8A030 55%, #C97B45 100%)"
                    : "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(184,160,48,0.18) 55%, rgba(201,123,69,0.18) 100%)",
                color: viewMode === "personalized" ? "#fff" : "#5E7250",
                boxShadow:
                  viewMode === "personalized"
                    ? "0 0 22px -2px rgba(150,162,131,0.85), 0 0 8px rgba(184,160,48,0.55), 0 0 0 1px rgba(150,162,131,0.45) inset"
                    : "0 0 12px -2px rgba(150,162,131,0.45), 0 0 0 1px rgba(150,162,131,0.35) inset",
              }}
              onMouseEnter={(e) => {
                if (viewMode !== "personalized") {
                  e.currentTarget.style.boxShadow =
                    "0 0 18px -2px rgba(150,162,131,0.75), 0 0 0 1px rgba(150,162,131,0.55) inset";
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== "personalized") {
                  e.currentTarget.style.boxShadow =
                    "0 0 12px -2px rgba(150,162,131,0.45), 0 0 0 1px rgba(150,162,131,0.35) inset";
                }
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  background:
                    viewMode === "personalized"
                      ? "#fff"
                      : "linear-gradient(135deg, #96A283, #C97B45)",
                  boxShadow:
                    viewMode === "personalized"
                      ? "0 0 8px rgba(255,255,255,0.9), 0 0 14px rgba(255,255,255,0.5)"
                      : "0 0 8px rgba(150,162,131,0.85)",
                }}
                aria-hidden
              />
              Personalized
            </button>
          </HoverHint>
        </div>

        <div className="justify-self-end inline-flex items-center gap-2 flex-wrap">
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
              title="Reset to default sort (Importance, highest first)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset sort
            </motion.button>
          )}
          <HoverHint hint="Reset all filters — clears Search, Taxonomy, and Tracked status.">
            <motion.button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              animate={{ opacity: hasActiveFilters ? 1 : 0.5 }}
              transition={{ duration: 0.2, ease: EASE }}
              whileTap={hasActiveFilters ? { scale: 0.95 } : undefined}
              className={
                "inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border whitespace-nowrap transition-all " +
                (hasActiveFilters
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:brightness-110 hover:shadow-md cursor-pointer"
                  : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] cursor-default")
              }
              style={{
                fontSize: 13,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
              aria-label="Reset all filters"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset filters
            </motion.button>
          </HoverHint>
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={selected.size === 0}
            whileTap={selected.size > 0 ? { scale: 0.95 } : undefined}
            transition={{ duration: 0.15, ease: EASE }}
            className={
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] font-semibold transition-all whitespace-nowrap " +
              (selected.size === 0
                ? "bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] border border-[var(--color-border)] cursor-not-allowed"
                : "bg-[#5E7250] text-white hover:brightness-110 hover:shadow-md cursor-pointer")
            }
            style={{
              fontSize: 13,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.01em",
            }}
          >
            <Send className="h-3.5 w-3.5" />
            Send to Tracker
            {selected.size > 0 && (
              <span className="ml-0.5 opacity-90 tabular-nums">
                ({selected.size})
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Sub-row — search input. Sits between the header and the table
          the same way the BrandedCallout row does on PromptsTable. */}
      <div className="px-6 pt-4 pb-1 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search intents..."
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)]"
            style={{ fontSize: 13 }}
          />
        </div>
        <p
          className="text-[var(--color-fg-muted)] ml-auto"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {sorted.length} of {intents.length} intent
          {intents.length === 1 ? "" : "s"} shown
          {hasActiveFilters ? " (filtered)" : ""}.
        </p>
      </div>

      {/* Personalized view — same clustered chrome as PromptsByCluster
          on /prompts. Each cluster is a collapsible card showing up to
          5 recommended intents. Mirrors the # heading + accent stripe
          + count pill + chevron pattern exactly. */}
      {viewMode === "personalized" ? (
        <PersonalizedClusterView
          industry={industry}
          city={city}
          state={state}
          selected={selected}
          onToggleOne={toggleOne}
        />
      ) : (
      <div
        className="px-6 pb-4 overflow-y-auto overflow-x-auto"
        style={{ maxHeight: 760 }}
      >
        <table
          className="w-full"
          style={{
            fontSize: 13,
            tableLayout: "fixed",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <colgroup>
            <col style={{ width: 36 }} />
            <col />
            <col style={{ width: 150 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 90 }} />
          </colgroup>
          <thead>
            <tr>
              <th
                className="py-3 px-3 text-left"
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  backgroundColor: "var(--color-surface)",
                  boxShadow: "inset 0 -2px 0 rgba(60,62,60,0.22)",
                }}
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  className="cursor-pointer accent-[var(--color-primary)]"
                  aria-label="Select all visible intents"
                />
              </th>
              <SortableHeader
                label="Intent"
                column="canonical"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                align="left"
              />
              <IntentTypeFilterHeader
                allTypes={availableIntentTypes}
                selected={intentTypeFilters}
                onApply={(next) => setIntentTypeFilters(next)}
              />
              <SortableHeader
                label="Importance"
                column="importance"
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
                  Tracked
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-[var(--color-fg-muted)] py-10"
                  style={{ fontSize: 13 }}
                >
                  No intents match these filters.
                </td>
              </tr>
            ) : (
              visible.map((i, idx) => {
                const isSelected = selected.has(i.id);
                const isExpanded = expanded.has(i.id);
                const cov = i.overallCoverage;
                const covColor =
                  cov >= 60 ? "#7D8E6C" : cov >= 30 ? "#B8A030" : "#B54631";
                return (
                  <Fragment key={i.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.3,
                        ease: EASE,
                        delay: Math.min(idx * 0.02, 0.25),
                      }}
                      className={
                        "transition-colors [&>td]:[border-bottom:1.5px_solid_rgba(60,62,60,0.18)] " +
                        (isSelected
                          ? "bg-[var(--color-primary)]/5 "
                          : "hover:bg-[var(--color-surface-alt)]/40 ") +
                        (isExpanded ? "bg-[var(--color-surface-alt)]/30 " : "")
                      }
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(i.id)}
                          className="cursor-pointer accent-[var(--color-primary)]"
                          aria-label={`Select ${i.canonical}`}
                        />
                      </td>
                      {/* Intent + inline Variants pill — mirrors the
                          personalized cluster row layout where the
                          variants pill sits directly to the right of the
                          prompt text. */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="truncate text-[var(--color-fg)] font-semibold"
                            style={{ fontSize: 13, minWidth: 0 }}
                            title={i.canonical}
                          >
                            &ldquo;{i.canonical}&rdquo;
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpand(i.id)}
                            className="inline-flex items-center gap-1.5 rounded-full tabular-nums shrink-0"
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: "#5E7250",
                              backgroundColor: "rgba(125,142,108,0.15)",
                              border: "1px solid rgba(125,142,108,0.45)",
                              padding: "3px 9px",
                              letterSpacing: "0.02em",
                              boxShadow: "0 0 0 rgba(125,142,108,0)",
                              cursor: "pointer",
                              transition: "all 180ms ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#5E7250";
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.borderColor = "#5E7250";
                              e.currentTarget.style.boxShadow =
                                "0 0 18px rgba(125,142,108,0.65), 0 0 32px rgba(125,142,108,0.35), 0 2px 8px rgba(94,114,80,0.45)";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(125,142,108,0.15)";
                              e.currentTarget.style.color = "#5E7250";
                              e.currentTarget.style.borderColor =
                                "rgba(125,142,108,0.45)";
                              e.currentTarget.style.boxShadow =
                                "0 0 0 rgba(125,142,108,0)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded ? "Hide variants" : "Show variants"
                            }
                            title={
                              isExpanded ? "Hide variants" : "See all variants"
                            }
                          >
                            <Layers className="h-3 w-3" style={{ color: "currentColor" }} />
                            {i.variants.length}
                            <span
                              className="uppercase font-bold"
                              style={{ fontSize: 9, letterSpacing: "0.08em" }}
                            >
                              variants
                            </span>
                            {/* Standard expand/collapse affordance —
                                ChevronDown when collapsed (click to drop
                                the variant list down) flips 180° to point
                                up when the list is open (click to roll it
                                back up). Bumped from h-3 to h-3.5 + bold
                                strokeWidth so the rotation is unmissable. */}
                            <ChevronDown
                              className="h-3.5 w-3.5 transition-transform duration-200"
                              strokeWidth={2.5}
                              style={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                color: "currentColor",
                              }}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {(() => {
                          const iColor = INTENT_COLOR[i.intentType];
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap"
                              style={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: iColor,
                                backgroundColor: `${iColor}26`,
                              }}
                            >
                              <span
                                className="rounded-full shrink-0"
                                style={{
                                  width: 5,
                                  height: 5,
                                  backgroundColor: iColor,
                                }}
                              />
                              {INTENT_LABEL[i.intentType]}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className="tabular-nums text-[var(--color-fg)]"
                          style={{ fontSize: 13, fontWeight: 600 }}
                        >
                          {i.importance}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {i.inTracker ? (
                          <CheckCircle2
                            className="h-4 w-4 inline-block"
                            style={{ color: "#5E7250" }}
                          />
                        ) : (
                          <span
                            className="text-[var(--color-fg-muted)] opacity-60"
                            style={{ fontSize: 13 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </motion.tr>
                    {isExpanded && (
                      <tr
                        className="[&>td]:[border-bottom:1.5px_solid_rgba(60,62,60,0.18)]"
                        style={{
                          backgroundColor: "rgba(150,162,131,0.06)",
                        }}
                      >
                        <td colSpan={5} className="py-3 px-5">
                          <VariantList
                            variants={i.variants}
                            selected={selected}
                            onToggle={toggleOne}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Footer — page-size cluster mirrors PromptsTable + CitedDomainsTable.
          Suppressed in personalized cluster view since clusters paginate
          at the cluster level (5 per cluster) rather than rows. */}
      {viewMode !== "personalized" && (
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
          intent{sorted.length === 1 ? "" : "s"}
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
      )}
    </section>
  );
}

// Intent type column header — replaces sort with a multi-select filter
// dropdown (mirrors IntentFilterHeader on /prompts + CategoryFilterHeader
// on the All Cited Domains table). Sort makes no sense across discrete
// type buckets, but filtering does. Portal-rendered popover with
// All/None + checkbox list + Apply footer.
// ─── PERSONALIZED CLUSTER VIEW ─────────────────────────────────────────────
// Mirrors the PromptsByCluster chrome from /prompts: each personalized
// taxonomy renders as a collapsible card with # accent stripe + Hash
// icon + cluster name + count + chevron. Body shows up to 5
// recommended intents per cluster, each row clickable to add/remove
// from the multi-select Send-to-Tracker queue.

// Industry-cluster accents — same palette as PromptsByCluster on
// /prompts. Each cluster gets a stable hue keyed by its label so the
// two pages match visually. Falls back through the palette by index
// for clusters not in the explicit map.
const CLUSTER_ACCENT_FALLBACK = [
  "#C97B45", // terracotta
  "#7D8E6C", // sage
  "#A06210", // amber
  "#B8A030", // gold
  "#9B7EC8", // purple
  "#B54631", // rust
  "#5BAF92", // teal
];

const CLUSTER_ACCENTS: Record<string, string> = {
  // Lawyer
  "Personal injury": "#C97B45",
  "Class actions": "#5BAF92",
  "Workers' comp": "#A06210",
  "Mass torts": "#B8A030",
  "Medical malpractice": "#9B7EC8",
  "Wrongful death": "#7D8E6C",
  // Restaurant
  "Menu items": "#C97B45",
  "Dietary restrictions": "#5BAF92",
  "Reservations": "#9B7EC8",
  "Atmosphere": "#B8A030",
  "Service quality": "#7D8E6C",
  // Plumber
  "Emergency repair": "#B54631",
  "Installation": "#7D8E6C",
  "Drain cleaning": "#5BAF92",
  "Water heater": "#C97B45",
  "Maintenance": "#B8A030",
  // shared
  Pricing: "#A06210",
};

// Generic recommendation set used when the user's industry doesn't
// have an explicit dictionary in INDUSTRY_SAMPLE_PROMPTS yet. Same
// shape as the per-industry clusters so the renderer doesn't care.
const GENERIC_SAMPLE_PROMPTS: Record<string, string[]> = {
  Pricing: [
    "Average cost of {industry} services in {location}",
    "Best affordable {industry} in {location}",
    "Free consultation {industry} {location}",
    "How much does {industry} cost in {state}",
    "Cheap {industry} near me",
  ],
  Quality: [
    "Top rated {industry} in {location}",
    "Best {industry} reviews {location}",
    "Highest rated {industry} near me",
    "Premium {industry} services {location}",
    "Award winning {industry} in {state}",
  ],
  Reviews: [
    "{industry} reviews {location}",
    "Best reviewed {industry} near me",
    "{industry} testimonials {location}",
    "5 star {industry} {location}",
    "Most trusted {industry} in {state}",
  ],
  Location: [
    "{industry} near me",
    "Best {industry} in {location}",
    "Local {industry} {location}",
    "{industry} open now near me",
    "Closest {industry} in {location}",
  ],
  Service: [
    "Best customer service {industry} {location}",
    "Reliable {industry} near me",
    "Trustworthy {industry} in {location}",
    "Top {industry} for support in {state}",
    "{industry} same-day service {location}",
  ],
  Comparisons: [
    "Best {industry} alternatives {location}",
    "{industry} vs competitors in {location}",
    "Compare top {industry} firms in {state}",
    "Which {industry} is best in {location}",
    "Top 3 {industry} in {location}",
  ],
};

interface RecommendedRow {
  /** Stable synthetic ID — `recommended:{cluster}:{index}` */
  id: string;
  text: string;
}

interface RecommendedCluster {
  cluster: string;
  rows: RecommendedRow[];
}

function fillTemplate(
  text: string,
  industry: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
): string {
  return text
    .replace(/\{location\}/g, city || "your area")
    .replace(/\{state\}/g, state || "your state")
    .replace(/\{industry\}/g, (industry || "service").toLowerCase());
}

function PersonalizedClusterView({
  industry,
  city,
  state,
  selected,
  onToggleOne,
}: {
  industry: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
}) {
  // Pull the industry-specific cluster dictionary from the same source
  // PromptsByCluster on /prompts uses (INDUSTRY_SAMPLE_PROMPTS). Falls
  // back to the generic set when the industry isn't in the map.
  const grouped = useMemo<RecommendedCluster[]>(() => {
    const dict =
      (industry && INDUSTRY_SAMPLE_PROMPTS[industry]) ||
      GENERIC_SAMPLE_PROMPTS;
    return Object.entries(dict).map(([cluster, prompts]) => ({
      cluster,
      rows: prompts.slice(0, 5).map((text, idx) => ({
        id: `recommended:${cluster}:${idx}`,
        text: fillTemplate(text, industry, city, state),
      })),
    }));
  }, [industry, city, state]);

  // First cluster open by default; rest collapsed (matches
  // PromptsByCluster's default behavior on /prompts).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const allClusters = grouped.map((g) => g.cluster);
  const isExpanded = (cluster: string, idx: number) => {
    const v = collapsed[cluster];
    return v === undefined ? idx === 0 : !v;
  };
  const anyExpanded = allClusters.some((c, i) => isExpanded(c, i));
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    for (const c of allClusters) next[c] = anyExpanded ? true : false;
    setCollapsed(next);
  };

  if (grouped.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p
          className="text-[var(--color-fg-muted)]"
          style={{ fontSize: 13 }}
        >
          No personalized clusters available for this industry yet.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-5 space-y-3">
      {/* Top-row: meta + Expand/Collapse all toggle */}
      <div className="flex items-center justify-between gap-2 pt-2 pb-1">
        <p
          className="text-[var(--color-fg-muted)]"
          style={{ fontSize: 12 }}
        >
          <span className="font-semibold text-[var(--color-fg)]">
            {grouped.length}
          </span>{" "}
          personalized {industry ?? "industry"} cluster
          {grouped.length === 1 ? "" : "s"} · top 5 recommended per cluster
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--color-surface-alt)] text-[var(--color-fg-secondary)]"
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          {anyExpanded ? (
            <>
              <Minus className="h-3 w-3" />
              Collapse all
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" />
              Expand all
            </>
          )}
        </button>
      </div>

      {grouped.map((g, idx) => {
        const accent =
          CLUSTER_ACCENTS[g.cluster] ??
          CLUSTER_ACCENT_FALLBACK[idx % CLUSTER_ACCENT_FALLBACK.length];
        const expanded = isExpanded(g.cluster, idx);
        return (
          <div
            key={g.cluster}
            className="rounded-[var(--radius-md)] border bg-[var(--color-bg)] overflow-hidden"
            style={{
              borderColor: `${accent}55`,
              borderLeftWidth: 3,
              borderLeftColor: accent,
            }}
          >
            <header
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [g.cluster]: expanded }))
              }
              className="flex items-center justify-between gap-3 px-4 py-1.5 cursor-pointer select-none"
              style={{
                background: `linear-gradient(90deg, ${accent}1F 0%, ${accent}08 60%, transparent 100%)`,
              }}
              role="button"
              aria-expanded={expanded}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <h3
                  className="truncate"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 19,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                    lineHeight: 1.2,
                  }}
                >
                  {g.cluster}
                </h3>
                <span
                  className="text-[var(--color-fg-muted)] tabular-nums shrink-0"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {g.rows.length} prompt{g.rows.length === 1 ? "" : "s"}
                </span>
              </div>
              <ChevronDown
                className={
                  "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200 " +
                  (expanded ? "rotate-180" : "")
                }
              />
            </header>

            {expanded && (
              <ul className="divide-y divide-[var(--color-border)]">
                {g.rows.map((row, rowIdx) => {
                  const isSelected = selected.has(row.id);
                  // Variant count is synthesized deterministically from
                  // the row index + cluster so it stays stable across
                  // re-renders (no flicker on every render).
                  const variantCount =
                    5 + ((rowIdx * 3 + g.cluster.length) % 7);
                  return (
                    <li
                      key={row.id}
                      className={
                        "flex items-center gap-3 px-4 py-2.5 transition-colors " +
                        (isSelected
                          ? "bg-[var(--color-primary)]/5"
                          : "hover:bg-[var(--color-surface-alt)]/40")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleOne(row.id)}
                        className="cursor-pointer accent-[var(--color-primary)]"
                        aria-label={`Select ${row.text}`}
                      />
                      <span
                        className="truncate text-[var(--color-fg)] font-medium"
                        style={{ fontSize: 13, maxWidth: 460, minWidth: 0 }}
                        title={row.text}
                      >
                        &ldquo;{row.text}&rdquo;
                      </span>
                      {/* Variants pill — sits directly right of the
                          prompt text (capped via maxWidth above) so the
                          variants visually anchor to the prompt instead
                          of being shoved to the row's right edge. On
                          hover: solid accent bg + white text + accent
                          glow shadow so the cursor target lights up. */}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full whitespace-nowrap shrink-0 tabular-nums"
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: accent,
                          backgroundColor: `${accent}1F`,
                          border: `1px solid ${accent}55`,
                          padding: "3px 8px",
                          letterSpacing: "0.02em",
                          boxShadow: `0 0 0 ${accent}00`,
                          cursor: "pointer",
                          transition: "all 180ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = accent;
                          e.currentTarget.style.color = "#ffffff";
                          e.currentTarget.style.borderColor = accent;
                          e.currentTarget.style.boxShadow = `0 0 18px ${accent}A6, 0 0 32px ${accent}59, 0 2px 8px ${accent}73`;
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${accent}1F`;
                          e.currentTarget.style.color = accent;
                          e.currentTarget.style.borderColor = `${accent}55`;
                          e.currentTarget.style.boxShadow = `0 0 0 ${accent}00`;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        title={`${variantCount} paraphrasings tested per scan`}
                      >
                        <Layers
                          className="h-3 w-3"
                          style={{ color: "currentColor" }}
                        />
                        {variantCount}
                        <span
                          className="uppercase font-bold"
                          style={{ fontSize: 9, letterSpacing: "0.08em" }}
                        >
                          variants
                        </span>
                      </button>
                      {/* Spacer pushes any future right-side controls
                          (or just empty space) to the row's right edge,
                          keeping the prompt + variants cluster anchored
                          to the left half. */}
                      <div className="flex-1" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IntentTypeFilterHeader({
  allTypes,
  selected,
  onApply,
}: {
  allTypes: IntentType[];
  selected: Set<IntentType>;
  onApply: (next: Set<IntentType>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<IntentType>>(selected);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setDraft(new Set(selected));
  }, [open, selected]);

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

  const isFiltered = selected.size > 0 && selected.size < allTypes.length;

  function toggle(t: IntentType) {
    setDraft((prev) => {
      // Smart "filter to only this" — if every type is currently
      // selected (or none, which means "show all"), clicking one row
      // narrows to ONLY that type. Matches the IntentFilterHeader
      // pattern from /prompts.
      if (prev.size === 0 || prev.size === allTypes.length) {
        return new Set([t]);
      }
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) return new Set(allTypes);
      return next;
    });
  }

  function apply() {
    if (draft.size === allTypes.length) onApply(new Set());
    else onApply(new Set(draft));
    setOpen(false);
  }

  function selectAll() {
    setDraft(new Set(allTypes));
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
          Intent
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
              minWidth: 200,
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
              <span
                className="font-semibold uppercase text-[var(--color-fg-muted)]"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                Filter by intent
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
              {allTypes.map((t) => {
                const checked = draft.has(t);
                const c = INTENT_COLOR[t];
                return (
                  <label
                    key={t}
                    className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(t)}
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
                      {INTENT_LABEL[t]}
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

// Sortable column header — same chrome as CitedDomainsTable's
// SortableHeader so the two tables share the sticky thead pattern + the
// uppercase tracked-wide label + ↑/↓ indicator on the active column.
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

function VariantList({
  variants,
  selected,
  onToggle,
}: {
  variants: Variant[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (variants.length === 0) {
    return (
      <p className="text-xs text-[var(--color-fg-muted)] italic">
        No variants yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p
        className="uppercase tracking-wider font-semibold text-[var(--color-fg-muted)]"
        style={{ fontSize: 10 }}
      >
        All variants ({variants.length})
      </p>
      <ul className="space-y-1.5">
        {variants.map((v, idx) => {
          const isSelected = selected.has(v.id);
          return (
            <li
              key={v.id}
              className={
                "rounded-[var(--radius-md)] border p-2.5 flex items-center gap-3 transition-colors " +
                (isSelected
                  ? "bg-[var(--color-primary)]/5 border-[var(--color-primary)]/40"
                  : "bg-[var(--color-bg)] border-[var(--color-border)]")
              }
            >
              {/* Per-variant checkbox — same chrome as the prompt-row
                  checkboxes above. Lets the user send a single
                  paraphrasing to Tracker without picking the whole
                  intent. */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(v.id)}
                className="cursor-pointer accent-[var(--color-primary)]"
                aria-label={`Select variant ${idx + 1}: ${v.text}`}
              />
              <span
                className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] font-semibold"
                style={{ fontSize: 10 }}
              >
                {idx + 1}
              </span>
              <p
                className="flex-1 text-[var(--color-fg)] leading-snug min-w-0"
                style={{ fontSize: 13 }}
              >
                &ldquo;{v.text}&rdquo;
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
