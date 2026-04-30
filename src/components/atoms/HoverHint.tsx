"use client";

import * as React from "react";

type Placement = "top" | "left" | "right" | "bottom";

interface HoverHintProps {
  hint: string;
  children: React.ReactNode;
  /** Optional inline display style for the wrapper. Defaults to inline-flex. */
  display?: "inline" | "inline-flex" | "inline-block" | "block";
  /** Tooltip width in px. Defaults to 240. */
  width?: number;
  /** Wrapper className passthrough. */
  className?: string;
  /** Where the tooltip appears relative to the trigger. Defaults to "top". */
  placement?: Placement;
}

const PLACEMENT_TOOLTIP: Record<Placement, string> = {
  top: "left-1/2 bottom-full mb-2 -translate-x-1/2 translate-y-1 group-hover:translate-y-0",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2 -translate-y-1 group-hover:translate-y-0",
  left: "right-full top-1/2 mr-2 -translate-y-1/2 translate-x-1 group-hover:translate-x-0",
  right: "left-full top-1/2 ml-2 -translate-y-1/2 -translate-x-1 group-hover:translate-x-0",
};

const PLACEMENT_ARROW: Record<Placement, { className: string; style: React.CSSProperties }> = {
  top: {
    className: "left-1/2 top-full -translate-x-1/2 -mt-px",
    style: {
      width: 0,
      height: 0,
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderTop: "5px solid var(--color-border)",
    },
  },
  bottom: {
    className: "left-1/2 bottom-full -translate-x-1/2 -mb-px",
    style: {
      width: 0,
      height: 0,
      borderLeft: "5px solid transparent",
      borderRight: "5px solid transparent",
      borderBottom: "5px solid var(--color-border)",
    },
  },
  left: {
    className: "top-1/2 left-full -translate-y-1/2 -ml-px",
    style: {
      width: 0,
      height: 0,
      borderTop: "5px solid transparent",
      borderBottom: "5px solid transparent",
      borderLeft: "5px solid var(--color-border)",
    },
  },
  right: {
    className: "top-1/2 right-full -translate-y-1/2 -mr-px",
    style: {
      width: 0,
      height: 0,
      borderTop: "5px solid transparent",
      borderBottom: "5px solid transparent",
      borderRight: "5px solid var(--color-border)",
    },
  },
};

/**
 * Wraps any element. On hover, shows a small description tooltip
 * with a smooth fade-and-slide animation. Defaults to appearing above the trigger.
 */
export function HoverHint({
  hint,
  children,
  display = "inline-flex",
  width = 240,
  className = "",
  placement = "top",
}: HoverHintProps) {
  const displayClass =
    display === "inline"
      ? "inline"
      : display === "inline-block"
      ? "inline-block"
      : display === "block"
      ? "block"
      : "inline-flex";

  const positionClass = PLACEMENT_TOOLTIP[placement];
  const arrow = PLACEMENT_ARROW[placement];

  return (
    <span className={`relative ${displayClass} group ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 ${positionClass} opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--color-fg-secondary)] shadow-md whitespace-normal`}
        style={{ width }}
      >
        {hint}
        <span className={`absolute ${arrow.className}`} style={arrow.style} />
      </span>
    </span>
  );
}
