import * as React from "react";
import { HelpCircle } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";

interface SectionHeadingProps {
  text: string;
  className?: string;
  info?: string;
}

export function SectionHeading({ text, className = "", info }: SectionHeadingProps) {
  const heading = (
    <h3
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: "var(--color-fg)",
        lineHeight: 1.2,
      }}
    >
      {text}
    </h3>
  );

  if (!info) {
    return <div className={className}>{heading}</div>;
  }

  // HoverHint portals the tooltip to document.body so it can never be
  // clipped by ancestor overflow:hidden, transforms, or stacking contexts.
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {heading}
      <HoverHint hint={info} placement="top" width={260}>
        <HelpCircle
          className="h-4 w-4 text-[var(--color-fg-muted)] hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
          aria-label="More info"
        />
      </HoverHint>
    </div>
  );
}
