"use client";

import { Fragment, useMemo, useState } from "react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import {
  Info,
  Search,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ListChecks,
  ChevronRight,
} from "lucide-react";
import type { EngineId, Intent, TaxonomyCategory, Variant } from "./types";
import {
  TAXONOMY_LABEL,
  TAXONOMY_COLOR,
  TAXONOMY_ORDER,
  INTENT_LABEL,
} from "./taxonomy";

interface IntentsTableProps {
  intents: Intent[];
  onSendToTracker: (selectedIds: string[]) => void;
}

type SortKey = "canonical" | "taxonomy" | "intent" | "variants" | "coverage" | "importance";
type SortDir = "asc" | "desc";

export function IntentsTable({ intents, onSendToTracker }: IntentsTableProps) {
  const [search, setSearch] = useState("");
  const [taxonomyFilter, setTaxonomyFilter] = useState<TaxonomyCategory | "all">("all");
  const [trackerFilter, setTrackerFilter] = useState<"all" | "tracked" | "untracked">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("importance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
      if (taxonomyFilter !== "all" && i.taxonomy !== taxonomyFilter) return false;
      if (trackerFilter === "tracked" && !i.inTracker) return false;
      if (trackerFilter === "untracked" && i.inTracker) return false;
      if (q && !i.canonical.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [intents, search, taxonomyFilter, trackerFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "canonical":
          return a.canonical.localeCompare(b.canonical) * dir;
        case "taxonomy":
          return a.taxonomy.localeCompare(b.taxonomy) * dir;
        case "intent":
          return a.intentType.localeCompare(b.intentType) * dir;
        case "variants":
          return (a.variants.length - b.variants.length) * dir;
        case "coverage":
          return (a.overallCoverage - b.overallCoverage) * dir;
        case "importance":
          return (a.importance - b.importance) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
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
    sorted.length > 0 && sorted.every((i) => selected.has(i.id));

  const toggleAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const i of sorted) next.delete(i.id);
        return next;
      }
      const next = new Set(prev);
      for (const i of sorted) next.add(i.id);
      return next;
    });
  };

  const totalVariantsSelected = useMemo(
    () =>
      intents
        .filter((i) => selected.has(i.id))
        .reduce((acc, i) => acc + i.variants.length, 0),
    [intents, selected]
  );

  const handleSend = () => {
    if (selected.size === 0) return;
    onSendToTracker(Array.from(selected));
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="-mx-5 -mt-5 px-5 py-4 mb-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))",
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#96A283]/20 flex items-center justify-center">
              <ListChecks className="h-4 w-4 text-[#566A47]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">
              All intents
            </h3>
            <HoverHint hint="Every prompt intent we've researched. Each row is one intent with N paraphrased variants. Check the rows you want, click Send to Tracker.">
              <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
            </HoverHint>
          </div>
          <button
            onClick={handleSend}
            disabled={selected.size === 0}
            className={
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-md)] font-medium transition-colors " +
              (selected.size === 0
                ? "bg-[var(--color-surface)] text-[var(--color-fg-muted)] border border-[var(--color-border)] cursor-not-allowed opacity-60"
                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]")
            }
            style={{ fontSize: 13 }}
          >
            <Send className="h-3.5 w-3.5" />
            Send to Tracker
            {selected.size > 0 && (
              <span className="ml-0.5 opacity-90">
                ({selected.size} · {totalVariantsSelected} variants)
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search intents..."
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)]"
              style={{ fontSize: 13 }}
            />
          </div>

          <select
            value={taxonomyFilter}
            onChange={(e) =>
              setTaxonomyFilter(e.target.value as TaxonomyCategory | "all")
            }
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
            style={{ fontSize: 13 }}
          >
            <option value="all">All types</option>
            {TAXONOMY_ORDER.map((t) => (
              <option key={t} value={t}>
                {TAXONOMY_LABEL[t]}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1">
            {(["all", "untracked", "tracked"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTrackerFilter(k)}
                className={
                  "px-3 py-1.5 font-medium rounded-[var(--radius-sm)] transition-colors capitalize " +
                  (trackerFilter === k
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                }
                style={{ fontSize: 12 }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="py-2 pr-2 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="cursor-pointer accent-[var(--color-primary)]"
                  />
                </th>
                <SortHeader label="Intent" k="canonical" sortKey={sortKey} icon={sortIcon("canonical")} onClick={toggleSort} />
                <SortHeader label="Type" k="taxonomy" sortKey={sortKey} icon={sortIcon("taxonomy")} onClick={toggleSort} />
                <SortHeader label="Intent" k="intent" sortKey={sortKey} icon={sortIcon("intent")} onClick={toggleSort} />
                <SortHeader label="Variants" k="variants" sortKey={sortKey} icon={sortIcon("variants")} onClick={toggleSort} align="right" />
                <SortHeader label="Coverage" k="coverage" sortKey={sortKey} icon={sortIcon("coverage")} onClick={toggleSort} align="right" />
                <SortHeader label="Importance" k="importance" sortKey={sortKey} icon={sortIcon("importance")} onClick={toggleSort} align="right" />
                <th className="py-2 pl-2 text-right" style={{ fontSize: 11 }}>
                  Tracked
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-[var(--color-fg-muted)]"
                  >
                    No intents match these filters.
                  </td>
                </tr>
              ) : (
                sorted.map((i) => {
                  const isSelected = selected.has(i.id);
                  const isExpanded = expanded.has(i.id);
                  const coverageColor =
                    i.overallCoverage >= 60
                      ? "#7D8E6C"
                      : i.overallCoverage >= 30
                      ? "#B8A030"
                      : "#B54631";
                  return (
                    <Fragment key={i.id}>
                      <tr
                        className={
                          "border-b border-[var(--color-border)] transition-colors " +
                          (isExpanded ? "bg-[var(--color-surface-alt)]/30 " : "") +
                          (isSelected
                            ? "bg-[var(--color-primary)]/5"
                            : "hover:bg-[var(--color-surface-alt)]/50")
                        }
                      >
                        <td className="py-2.5 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(i.id)}
                            className="cursor-pointer accent-[var(--color-primary)]"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--color-fg)]">
                          <span className="block truncate max-w-[420px]" title={i.canonical}>
                            {i.canonical}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)]"
                            style={{
                              backgroundColor: `${TAXONOMY_COLOR[i.taxonomy]}1f`,
                              color: TAXONOMY_COLOR[i.taxonomy],
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {TAXONOMY_LABEL[i.taxonomy]}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--color-fg-secondary)]">
                          {INTENT_LABEL[i.intentType]}
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpand(i.id)}
                            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-fg)] transition-colors"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Hide variants" : "Show variants"}
                            title={isExpanded ? "Hide variants" : "See all variants"}
                          >
                            {i.variants.length}
                            <ChevronRight
                              className="h-3 w-3 transition-transform"
                              style={{
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              }}
                            />
                          </button>
                        </td>
                        <td
                          className="py-2.5 pr-3 text-right font-medium"
                          style={{ color: coverageColor }}
                        >
                          {i.overallCoverage}%
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[var(--color-fg-secondary)]">
                          {i.importance}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          {i.inTracker ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)] inline-block" />
                          ) : (
                            <span className="text-[var(--color-fg-muted)] opacity-60">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-[var(--color-border)] last:border-b-0 bg-[var(--color-surface-alt)]/40">
                          <td colSpan={8} className="py-3 px-3">
                            <VariantList variants={i.variants} />
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

        <p className="text-[11px] text-[var(--color-fg-muted)]">
          Showing {sorted.length} of {intents.length} intents.
        </p>

        <ChartExplainer
          blocks={[
            {
              label: "Intent",
              body: 'A researched prompt someone might ask AI. Each row is one intent — multiple paraphrasings of the same question (like three ways of asking "best plumber in Denver") roll up underneath it.',
            },
            {
              label: "Type & Intent columns",
              body: '"Type" is the prompt taxonomy (defensive, comparative, validation, and so on). "Intent" is what job the prompt is doing for the user (commercial, validation, informational). Hover the table headers to learn more.',
            },
            {
              label: "Variants & Coverage",
              body: "Variants is how many paraphrasings live under that intent. Coverage is the percent of those variants where AI mentions your brand. Coverage above 60% (sage) is strong, 30–60% (yellow) is mid-pack, under 30% (rust) is a gap.",
            },
            {
              label: "Importance & Tracked",
              body: "Importance is our 0–100 score for how much this intent matters to your business — sort by it to find the highest-leverage prompts to track first. The Tracked column shows a checkmark for prompts already running in Tracker.",
            },
          ]}
          tip="Use the search and filters above to narrow the list, check the rows you want, then click Send to Tracker."
        />
      </div>
    </Card>
  );
}

const ENGINE_LABELS: Record<EngineId, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

const ENGINE_ORDER: EngineId[] = ["chatgpt", "claude", "gemini", "google_ai"];

function coverageColor(pct: number): string {
  if (pct >= 60) return "#7D8E6C";
  if (pct >= 30) return "#B8A030";
  return "#B54631";
}

function VariantList({ variants }: { variants: Variant[] }) {
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
      <ul className="space-y-2">
        {variants.map((v, idx) => (
          <li
            key={v.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] font-semibold"
                style={{ fontSize: 10 }}
              >
                {idx + 1}
              </span>
              <p
                className="flex-1 text-[var(--color-fg)] leading-snug"
                style={{ fontSize: 13 }}
              >
                {v.text}
              </p>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
              {ENGINE_ORDER.map((engine) => {
                const pct = Math.round(v.coverage[engine] ?? 0);
                return (
                  <div key={engine} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[var(--color-fg-muted)]"
                        style={{ fontSize: 10 }}
                      >
                        {ENGINE_LABELS[engine]}
                      </span>
                      <span
                        className="font-medium"
                        style={{ fontSize: 11, color: coverageColor(pct) }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          backgroundColor: coverageColor(pct),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  icon,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  icon: React.ReactNode;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`py-2 pr-3 ${align === "right" ? "text-right" : "text-left"}`}
      style={{ fontSize: 11 }}
    >
      <button
        onClick={() => onClick(k)}
        className={
          "inline-flex items-center gap-1 uppercase tracking-wider font-semibold transition-colors " +
          (sortKey === k
            ? "text-[var(--color-fg)]"
            : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)]")
        }
      >
        {label}
        {icon}
      </button>
    </th>
  );
}
