import * as React from "react";
import { Info } from "lucide-react";

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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {heading}
      <span className="relative inline-flex items-center group">
        <Info
          className="h-4 w-4 text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-secondary)] cursor-help transition-colors"
          aria-label="More info"
        />
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 translate-y-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--color-fg-secondary)] shadow-md"
          style={{ width: 260 }}
        >
          {info}
          <span
            className="absolute left-1/2 top-full -translate-x-1/2 -mt-px"
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--color-border)",
            }}
          />
        </span>
      </span>
    </div>
  );
}
