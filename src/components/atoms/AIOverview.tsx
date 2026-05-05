"use client";

import { Sparkles } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { COLORS } from "@/utils/constants";

interface AIOverviewProps {
  text: string;
  size?: "sm" | "md";
  /** Opt-in subtle sage gradient so the callout reads as a separate surface
   *  from rows directly underneath (used in the leaderboard cards). */
  gradient?: boolean;
}

export function AIOverview({
  text,
  size = "md",
  gradient = false,
}: AIOverviewProps) {
  const padX = size === "sm" ? 12 : 18;
  const padY = size === "sm" ? 8 : 12;
  const fs   = size === "sm" ? 12 : 13;
  const iconCls = size === "sm" ? "h-4 w-4" : "h-4 w-4";

  // Flat sage tint by default; a subtle sage→cream diagonal when `gradient`.
  const background = gradient
    ? "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.06) 100%)"
    : "rgba(150,162,131,0.10)";

  return (
    <div
      className="rounded-[var(--radius-lg)] border-l-4"
      style={{
        borderLeftColor: COLORS.primary,
        background,
        padding: `${padY}px ${padX}px`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <HoverHint hint="AI-generated summary of what this data means for your brand.">
          <Sparkles
            className={`shrink-0 ${iconCls} cursor-help`}
            style={{ color: COLORS.primary, marginTop: 1 }}
          />
        </HoverHint>
        <p
          className="text-[var(--color-fg)]"
          style={{ fontSize: fs, lineHeight: 1.5, fontWeight: 500 }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
