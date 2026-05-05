"use client";

import * as React from "react";
import { createPortal } from "react-dom";

interface HoverHintProps {
  hint: string;
  children: React.ReactNode;
  display?: "inline" | "inline-flex" | "inline-block" | "block";
  width?: number;
  className?: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export function HoverHint({
  hint,
  children,
  display = "inline-flex",
  width = 240,
  className = "",
  placement = "top",
}: HoverHintProps) {
  const [visible, setVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  const show = React.useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    switch (placement) {
      case "top":    setCoords({ x: r.left + r.width / 2, y: r.top }); break;
      case "bottom": setCoords({ x: r.left + r.width / 2, y: r.bottom }); break;
      case "left":   setCoords({ x: r.left, y: r.top + r.height / 2 }); break;
      case "right":  setCoords({ x: r.right, y: r.top + r.height / 2 }); break;
    }
    setVisible(true);
  }, [placement]);

  const hide = React.useCallback(() => setVisible(false), []);

  // Close the tooltip on scroll or resize so it never drifts away from the
  // trigger. Listening in capture phase catches scrolls inside any ancestor
  // (cards, sidebar, modals).
  React.useEffect(() => {
    if (!visible) return;
    const close = () => setVisible(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [visible]);

  const displayClass =
    display === "inline" ? "inline" :
    display === "inline-block" ? "inline-block" :
    display === "block" ? "block" : "inline-flex";

  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    width,
    maxWidth: "min(90vw, 300px)",
    pointerEvents: "none",
  };

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
  };

  switch (placement) {
    case "top":
      tooltipStyle.left = coords.x;
      tooltipStyle.top = coords.y - 10;
      tooltipStyle.transform = "translate(-50%, -100%)";
      arrowStyle.left = "50%";
      arrowStyle.top = "100%";
      arrowStyle.transform = "translateX(-50%)";
      arrowStyle.borderLeft = "5px solid transparent";
      arrowStyle.borderRight = "5px solid transparent";
      arrowStyle.borderTop = "5px solid var(--color-border)";
      break;
    case "bottom":
      tooltipStyle.left = coords.x;
      tooltipStyle.top = coords.y + 10;
      tooltipStyle.transform = "translate(-50%, 0)";
      arrowStyle.left = "50%";
      arrowStyle.bottom = "100%";
      arrowStyle.transform = "translateX(-50%)";
      arrowStyle.borderLeft = "5px solid transparent";
      arrowStyle.borderRight = "5px solid transparent";
      arrowStyle.borderBottom = "5px solid var(--color-border)";
      break;
    case "left":
      tooltipStyle.left = coords.x - 10;
      tooltipStyle.top = coords.y;
      tooltipStyle.transform = "translate(-100%, -50%)";
      arrowStyle.top = "50%";
      arrowStyle.left = "100%";
      arrowStyle.transform = "translateY(-50%)";
      arrowStyle.borderTop = "5px solid transparent";
      arrowStyle.borderBottom = "5px solid transparent";
      arrowStyle.borderLeft = "5px solid var(--color-border)";
      break;
    case "right":
      tooltipStyle.left = coords.x + 10;
      tooltipStyle.top = coords.y;
      tooltipStyle.transform = "translate(0, -50%)";
      arrowStyle.top = "50%";
      arrowStyle.right = "100%";
      arrowStyle.transform = "translateY(-50%)";
      arrowStyle.borderTop = "5px solid transparent";
      arrowStyle.borderBottom = "5px solid transparent";
      arrowStyle.borderRight = "5px solid var(--color-border)";
      break;
  }

  const tooltip = visible ? (
    <div
      role="tooltip"
      style={tooltipStyle}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] leading-snug text-[var(--color-fg-secondary)] shadow-lg whitespace-normal"
    >
      {hint}
      <span style={arrowStyle} />
    </div>
  ) : null;

  return (
    <span
      ref={triggerRef}
      className={`${displayClass} items-center ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {mounted && createPortal(tooltip, document.body)}
    </span>
  );
}
