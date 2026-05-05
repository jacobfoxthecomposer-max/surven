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

  return (
    <ChartCard
      data={data}
      treatment={TREATMENT_STANDARD_LABEL}
      aiOverviewVariant="V1"
      enabledBrandIds={enabledBrandIds}
      title="Competitors' visibility over time vs you"
      titleInfo="Daily mention rate for you and every tracked competitor across all AI tools. Higher = more visibility."
      defaultMode="full"
      // Medium-size variant — chart canvas trimmed from the source 460px so
      // the card pairs height-wise with the leaderboard underneath. Insight
      // callout + Focus/Full toggle stay on since this is the primary
      // top-of-page chart for the comparison view. Optimization markers
      // (the colored dots on the YOU line) are off — those are scoped to
      // the AI Visibility Tracker page only.
      chartHeight={320}
      showOptimizationMarkers={false}
    />
  );
}
