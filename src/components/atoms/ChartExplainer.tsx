"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export interface ChartExplainerBlock {
  /** Bolded sub-heading (e.g., "Bar length", "Colors", "Intent"). */
  label: string;
  /** 2–3 line plain-English paragraph defining the term. */
  body: string;
}

interface ChartExplainerProps {
  /** Definition blocks shown in the 2-column grid. Aim for 2, 4, or 6. */
  blocks: ChartExplainerBlock[];
  /** Optional italic tip line at the bottom (e.g., interaction hint). */
  tip?: string;
  /** Whether the explainer starts open. Default false (closed). */
  defaultOpen?: boolean;
}

export function ChartExplainer({
  blocks,
  tip,
  defaultOpen = false,
}: ChartExplainerProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left cursor-pointer transition-colors group"
      >
        <h4
          className="font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors"
          style={{ fontSize: 11, letterSpacing: "0.10em" }}
        >
          How to read this chart
        </h4>
        <span
          className="text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors"
          style={{ fontSize: 11 }}
        >
          {open ? "Hide" : "Show"}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="ml-auto"
          style={{ transformOrigin: "center" }}
        >
          <ChevronDown className="h-4 w-4 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="chart-explainer-body"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <dl
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3"
              style={{ fontSize: 12, lineHeight: 1.55 }}
            >
              {blocks.map((b) => (
                <div key={b.label}>
                  <dt className="font-semibold text-[var(--color-fg)] mb-0.5">
                    {b.label}
                  </dt>
                  <dd className="text-[var(--color-fg-secondary)]">{b.body}</dd>
                </div>
              ))}
            </dl>
            {tip && (
              <p
                className="mt-3 italic text-[var(--color-fg-muted)]"
                style={{ fontSize: 11 }}
              >
                {tip}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
