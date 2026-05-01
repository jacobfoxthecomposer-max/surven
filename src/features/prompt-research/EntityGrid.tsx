"use client";

import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { Building2, Swords, Compass, Users, Info } from "lucide-react";
import type { EntityGridData } from "./types";

interface EntityGridProps {
  data: EntityGridData;
}

const COLUMNS = [
  {
    key: "brand" as const,
    label: "Brand",
    Icon: Building2,
    accent: "var(--color-primary)",
    hint: "Your brand entity. The thing the AI needs to learn to recommend.",
  },
  {
    key: "competitors" as const,
    label: "Competitors",
    Icon: Swords,
    accent: "#C97B45",
    hint: "Who you're competing against in AI recommendations. Drives comparison and gap prompts.",
  },
  {
    key: "adjacent" as const,
    label: "Adjacent",
    Icon: Compass,
    accent: "#6BA3F5",
    hint: "Nearby categories where your brand could plausibly surface. Sneaky-good growth.",
  },
  {
    key: "audience" as const,
    label: "Audience",
    Icon: Users,
    accent: "#9B7EC8",
    hint: "Who you're built for. Drives audience-modified prompts.",
  },
];

export function EntityGrid({ data }: EntityGridProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">Entity grid</h3>
        <HoverHint hint="The recipe behind every prompt — your brand, who you compete with, what's adjacent, and who you're for.">
          <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
        </HoverHint>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(({ key, label, Icon, accent, hint }) => {
          const items = key === "brand" ? [data.brand] : data[key];
          return (
            <div
              key={key}
              className="rounded-[var(--radius-md)] p-4"
              style={{
                backgroundColor: "var(--color-surface)",
                borderLeft: `3px solid ${accent}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accent}1f` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-secondary)]">
                  {label}
                </p>
                <HoverHint hint={hint}>
                  <Info className="h-3 w-3 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                </HoverHint>
              </div>
              <div className="space-y-1">
                {items.length === 0 ? (
                  <p className="text-xs italic text-[var(--color-fg-muted)]">None set</p>
                ) : (
                  items.map((name) => (
                    <p
                      key={name}
                      className="text-sm text-[var(--color-fg)] truncate"
                      title={name}
                    >
                      {name}
                    </p>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
