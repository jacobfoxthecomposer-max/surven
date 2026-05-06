"use client";

/**
 * Two stacked cards for the Competitor Comparison page right rail:
 *   1. GapsToFillCard  — rust theme, fixable gaps from this scan.
 *   2. WinsToWidenCard — sage theme, mirror chrome, positive wins to defend.
 *
 * Both are the EXACT same components used on the AI Visibility Tracker —
 * not clones, not reskins. They share the same mock-data hook + brand
 * universe as the other cloned competitor charts so the "this scan" facts
 * inside (engine names, leader brand, period delta) read consistently
 * across the page until real per-brand time-series data lands.
 */
import { useMemo } from "react";
import {
  GapsToFillCard,
  WinsToWidenCard,
  MOCK_BRANDS,
  MOCK_DATES,
  useScannerData,
} from "@/features/dashboard/pages/VisibilityScannerSection";

export function CompetitorGapsAndWinsStack() {
  const enabledEngines = useMemo(
    () => new Set(["chatgpt", "claude", "gemini", "google_ai"]),
    [],
  );
  const data = useScannerData(
    MOCK_BRANDS,
    MOCK_DATES,
    MOCK_DATES.length,
    enabledEngines,
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 min-h-0 flex">
        <GapsToFillCard data={data} />
      </div>
      <div className="flex-1 min-h-0 flex">
        <WinsToWidenCard data={data} />
      </div>
    </div>
  );
}
