"use client";

import { Building2, type LucideIcon } from "lucide-react";
import { AI_MODELS, COMPETITOR_PALETTE } from "@/utils/constants";

export { COMPETITOR_PALETTE };

export interface BrandDef {
  id: string;
  label: string;
  color: string;
  icon?: LucideIcon;
}

export const AI_BRAND_DEFS: BrandDef[] = AI_MODELS.map((m) => ({
  id: m.id,
  label: m.name,
  color: m.color,
}));

export function getBrandDef(
  id: string,
  knownDefs: BrandDef[] = AI_BRAND_DEFS
): BrandDef {
  return (
    knownDefs.find((d) => d.id === id) ?? {
      id,
      label: id,
      color: COMPETITOR_PALETTE[
        Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
          COMPETITOR_PALETTE.length
      ],
    }
  );
}

export function buildCompetitorDef(name: string, index: number): BrandDef {
  return {
    id: name,
    label: name,
    color: COMPETITOR_PALETTE[index % COMPETITOR_PALETTE.length],
    icon: Building2,
  };
}

interface BrandChipProps {
  brand: BrandDef;
  /** show just the dot without label text */
  chipOnly?: boolean;
  size?: "sm" | "md";
  /** present for API compatibility; ignored — single dot+text style */
  isYou?: boolean;
}

export function BrandChip({ brand, chipOnly = false, size = "md" }: BrandChipProps) {
  const dotSize = size === "sm" ? 6 : 8;
  const labelSize = size === "sm" ? "text-[11px]" : "text-[13px]";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="rounded-full shrink-0"
        style={{ width: dotSize, height: dotSize, backgroundColor: brand.color }}
      />
      {!chipOnly && (
        <span className={`${labelSize} font-medium text-[var(--color-fg)]`}>
          {brand.label}
        </span>
      )}
    </span>
  );
}
