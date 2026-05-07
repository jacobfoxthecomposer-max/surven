"use client";

/**
 * Visibility-over-time card. Heading inside card with bottom-border
 * separator (canonical Surven section pattern).
 */

import { Clock } from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { HistoryChart } from "@/components/organisms/HistoryChart";
import type { Scan } from "@/types/database";

interface HistorySectionProps {
  scans: Scan[];
}

export function HistorySection({ scans }: HistorySectionProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <SectionHeading
            text="Visibility over time"
            info="Your AI visibility score across every scan we've run for you. Trending up means you're appearing more often."
          />
        </div>
      </div>
      <HistoryChart scans={scans} />
    </div>
  );
}
