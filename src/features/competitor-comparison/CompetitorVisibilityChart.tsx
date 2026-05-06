"use client";

/**
 * AI-visibility-over-time chart cloned from the AI Visibility Tracker
 * (`ChartCard` in VisibilityScannerSection). Reuses the existing mock-data
 * generator + canonical Treatment styling so this is visually identical to
 * the source. Will switch to real time-series data when Surven persists
 * per-brand mention rates over scan history.
 */
import { useMemo } from "react";
import {
  ChartCard,
  MOCK_BRANDS,
  MOCK_DATES,
  TREATMENT_STANDARD_LABEL,
  useScannerData,
} from "@/features/dashboard/pages/VisibilityScannerSection";

export function CompetitorVisibilityChart() {
  const enabledEngines = useMemo(
    () =>
      new Set([
        "chatgpt",
        "claude",
        "gemini",
        "google_ai",
      ]),
    [],
  );
  const data = useScannerData(
    MOCK_BRANDS,
    MOCK_DATES,
    MOCK_DATES.length,
    enabledEngines,
  );
  // Show every brand line — you + every competitor — so the chart reads as
  // a "you-vs-them" comparison instead of just your trend.
  const enabledBrandIds = useMemo(
    () => new Set(MOCK_BRANDS.map((b) => b.id)),
    [],
  );

  // Byte-for-byte identical to the AI Visibility Tracker's "Your AI
  // visibility over time" chart card — same chartHeight (260), same
  // ModeToggle, same delta pill, and (via the default `showOptimization
  // Markers={true}`) the same colored optimization-event markers on the
  // YOU line that document the strategies shipped during the period.
  // The ONLY differences from the source are the title/titleInfo copy
  // and `defaultMode="full"` (so the chart lands showing every brand
  // line out of the gate, since this is the competitor-vs-you view).
  return (
    <ChartCard
      data={data}
      treatment={TREATMENT_STANDARD_LABEL}
      enabledBrandIds={enabledBrandIds}
      title="Competitors' visibility over time vs you"
      titleInfo="Daily mention rate for you and every tracked competitor across all AI tools. Higher = more visibility."
      chartHeight={260}
      showModeToggle
      defaultMode="full"
      delta={data.youDelta}
    />
  );
}
