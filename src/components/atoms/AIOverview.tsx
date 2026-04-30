"use client";

import { Sparkles } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { COLORS } from "@/utils/constants";

interface AIOverviewProps {
  text: string;
  size?: "sm" | "md";
}

export function AIOverview({ text, size = "md" }: AIOverviewProps) {
  const padX = size === "sm" ? 12 : 18;
  const padY = size === "sm" ? 8 : 12;
  const fs   = size === "sm" ? 12 : 13;
  const iconCls = size === "sm" ? "h-4 w-4" : "h-4 w-4";

  return (
    <div
      className="rounded-[var(--radius-lg)] border-l-4"
      style={{
        borderLeftColor: COLORS.primary,
        backgroundColor: "rgba(150,162,131,0.10)",
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
