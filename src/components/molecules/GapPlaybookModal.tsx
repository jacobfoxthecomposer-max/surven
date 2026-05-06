"use client";

/**
 * Centered playbook modal — opened from a Gaps-to-fill or What-needs-attention
 * sub-card to show the user exactly what the issue is, how to fix it, and an
 * optional "Don't want to do this yourself?" managed-plans nudge at the
 * bottom. Visually matches the Citation Insights playbook pattern: scrim
 * blur backdrop, cream rounded card, sage footer callout.
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";

export interface GapPlaybook {
  title: string;
  /** Body paragraphs (string with `\n\n` separators OR ReactNode). */
  body: ReactNode;
  /** Sage footer "Don't want to do this yourself?" copy. Optional — when
   *  omitted the footer is suppressed. */
  managedPlansCopy?: string;
  /** Override the footer link target. Defaults to /settings/billing. */
  managedPlansHref?: string;
  /** Primary "go fix it" CTA shown above the managed-plans nudge.
   *  Defaults to "Open Website Audit" → /audit. Pass `null` to suppress. */
  actionCta?: { label: string; href: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  playbook: GapPlaybook | null;
}

const SAGE = "#5E7250";
const SAGE_BG = "rgba(150,162,131,0.15)";
const RUST = "#B54631";

export function GapPlaybookModal({ open, onClose, playbook }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Lock body scroll while open so the page underneath doesn't move
    // when the user swipes inside the dialog.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  // Portal to <body> so the dialog escapes any ancestor that has a
  // transform / filter / contain / will-change CSS property — those
  // create a containing block for `position: fixed`, which is exactly
  // why the dialog was rendering scoped to the SentimentHero card and
  // leaving the rest of the page unblurred.
  return createPortal(
    <AnimatePresence>
      {open && playbook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Scrim — z-[100] sits above the sidebar (z-30) and header
              (z-40) so the entire viewport (including the left rail)
              gets blurred behind the dialog. backdrop-blur-md gives a
              noticeably blurred look without obscuring the page entirely. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={playbook.title}
            className="relative z-[101] w-full max-w-md max-h-[85vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "var(--color-fg)",
                  letterSpacing: "-0.01em",
                }}
              >
                {playbook.title}
              </h2>
              <button
                onClick={onClose}
                className="shrink-0 -mt-1 -mr-1 p-1 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="text-[var(--color-fg-secondary)] space-y-3"
              style={{ fontSize: 13.5, lineHeight: 1.55 }}
            >
              {typeof playbook.body === "string"
                ? playbook.body
                    .split(/\n\n+/)
                    .map((p, i) => <p key={i}>{p}</p>)
                : playbook.body}
            </div>

            {/* Primary "go fix it" CTA. Defaults to the Website Audit
                page; per-playbook callers can override or set null to
                suppress (e.g. when there's no fix surface yet). */}
            {playbook.actionCta !== null && (
              <Link
                href={playbook.actionCta?.href ?? "/audit"}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: RUST, fontSize: 13.5 }}
              >
                {playbook.actionCta?.label ?? "Open Website Audit to make the fixes"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {playbook.managedPlansCopy && (
              <div
                className="mt-3 rounded-[var(--radius-md)] p-3 flex items-start gap-2"
                style={{
                  background: SAGE_BG,
                  borderLeft: `3px solid ${SAGE}`,
                }}
              >
                <Sparkles
                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                  style={{ color: SAGE }}
                />
                <p
                  className="text-[var(--color-fg-secondary)] leading-snug"
                  style={{ fontSize: 12.5 }}
                >
                  Don&apos;t want to do this yourself? Surven&apos;s managed
                  plans {playbook.managedPlansCopy}{" "}
                  <Link
                    href={playbook.managedPlansHref ?? "/settings/billing"}
                    className="font-semibold hover:underline whitespace-nowrap"
                    style={{ color: SAGE }}
                  >
                    See managed plans →
                  </Link>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
