"use client";

/**
 * Compressed time-range selector — single button + dropdown menu with the
 * 14d/30d/90d/YTD/All presets and a Custom-range sub-form. Locked visual
 * pattern lifted from the Competitor Comparison page so every dashboard
 * page uses the same component.
 *
 * Controlled. Pass the active range key + (optional) custom-range dates;
 * changes bubble out through `onChange`. Custom dates are exchanged as
 * ISO yyyy-mm-dd strings so callers using Date objects just convert at
 * the boundary.
 */
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type TimeRangeKey = "14d" | "30d" | "90d" | "ytd" | "all" | "custom";

const PRESETS: { key: Exclude<TimeRangeKey, "custom">; label: string }[] = [
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtCustomDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

interface Props {
  value: TimeRangeKey;
  onChange: (
    key: TimeRangeKey,
    customFromISO?: string,
    customToISO?: string,
  ) => void;
  /** ISO yyyy-mm-dd. Used to seed and apply the Custom-range sub-form. */
  customFrom?: string;
  customTo?: string;
}

export function TimeRangeDropdown({
  value,
  onChange,
  customFrom,
  customTo,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string>(customFrom ?? "");
  const [draftTo, setDraftTo] = useState<string>(customTo ?? todayIso());
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Keep draft dates in sync when the external custom range changes.
  useEffect(() => {
    if (customFrom !== undefined) setDraftFrom(customFrom);
  }, [customFrom]);
  useEffect(() => {
    if (customTo !== undefined) setDraftTo(customTo);
  }, [customTo]);

  // Close on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCustomFormOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const buttonLabel =
    value === "custom" && customFrom && customTo
      ? `${fmtCustomDate(customFrom)} – ${fmtCustomDate(customTo)}`
      : (PRESETS.find((p) => p.key === value)?.label ?? "All");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Adjust the time window for this page"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-fg-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors"
        style={{ fontSize: 14 }}
      >
        <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
        {buttonLabel}
        <ChevronDown
          className={
            "h-3.5 w-3.5 text-[var(--color-fg-muted)] transition-transform " +
            (menuOpen ? "rotate-180" : "")
          }
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 z-20 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-1"
        >
          {PRESETS.map(({ key, label }) => {
            const active = value === key;
            return (
              <button
                key={key}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(key);
                  setCustomFormOpen(false);
                  setMenuOpen(false);
                }}
                className={
                  "w-full text-left px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-colors " +
                  (active
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
                }
                style={{ fontSize: 14 }}
              >
                {label}
              </button>
            );
          })}
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            role="menuitem"
            onClick={() => setCustomFormOpen((o) => !o)}
            aria-expanded={customFormOpen}
            className={
              "w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-colors " +
              (value === "custom"
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]")
            }
            style={{ fontSize: 14 }}
          >
            <Calendar className="h-3.5 w-3.5" /> Custom range
            <ChevronDown
              className={
                "h-3.5 w-3.5 ml-auto transition-transform " +
                (customFormOpen ? "rotate-180" : "")
              }
            />
          </button>

          {customFormOpen && (
            <div className="px-2 pt-2 pb-1.5 space-y-2 border-t border-[var(--color-border)] mt-1">
              <label className="block">
                <span
                  className="block text-[var(--color-fg-muted)] mb-1 uppercase tracking-wider"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  From
                </span>
                <input
                  type="date"
                  value={draftFrom}
                  max={draftTo || todayIso()}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] tabular-nums"
                  style={{ fontSize: 13 }}
                />
              </label>
              <label className="block">
                <span
                  className="block text-[var(--color-fg-muted)] mb-1 uppercase tracking-wider"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  To
                </span>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  max={todayIso()}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] tabular-nums"
                  style={{ fontSize: 13 }}
                />
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={
                    !draftFrom ||
                    !draftTo ||
                    new Date(draftFrom) > new Date(draftTo)
                  }
                  onClick={() => {
                    onChange("custom", draftFrom, draftTo);
                    setCustomFormOpen(false);
                    setMenuOpen(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-[var(--radius-sm)] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ fontSize: 13 }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setCustomFormOpen(false)}
                  className="px-3 py-1.5 rounded-[var(--radius-sm)] font-medium text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-alt)] transition-colors"
                  style={{ fontSize: 13 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
