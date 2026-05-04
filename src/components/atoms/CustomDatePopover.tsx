"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

interface CustomDatePopoverProps {
  open: boolean;
  onClose: () => void;
  initialStart: Date;
  initialEnd: Date;
  minDate?: Date;
  maxDate?: Date;
  onApply: (start: Date, end: Date) => void;
}

export function CustomDatePopover({
  open,
  onClose,
  initialStart,
  initialEnd,
  minDate,
  maxDate,
  onApply,
}: CustomDatePopoverProps) {
  const [start, setStart] = useState(toIsoDate(initialStart));
  const [end, setEnd] = useState(toIsoDate(initialEnd));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStart(toIsoDate(initialStart));
    setEnd(toIsoDate(initialEnd));
  }, [open, initialStart, initialEnd]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleApply = () => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
    onApply(s <= e ? s : e, s <= e ? e : s);
    onClose();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-full left-0 mt-2 z-50 w-80 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]"
    >
      <p className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-3">
        Custom Range
      </p>
      <div className="space-y-3 mb-4">
        <label className="block">
          <span className="block text-xs text-[var(--color-fg-secondary)] mb-1">
            Start date
          </span>
          <input
            type="date"
            value={start}
            min={minDate ? toIsoDate(minDate) : undefined}
            max={maxDate ? toIsoDate(maxDate) : undefined}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-[var(--color-fg-secondary)] mb-1">
            End date
          </span>
          <input
            type="date"
            value={end}
            min={minDate ? toIsoDate(minDate) : undefined}
            max={maxDate ? toIsoDate(maxDate) : undefined}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface-alt)]"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="px-3 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
        >
          Apply
        </button>
      </div>
    </motion.div>
  );
}
