"use client";

/**
 * Competitor-page wrapper around `CompetitorRankAndSoVBlock` from the
 * AI Visibility Tracker. Reuses the same mock-data hook + brand
 * universe as the other cloned competitor charts (CompetitorVisibilityChart,
 * CompetitorShareOfVoiceChart) so the four cards inside read identically
 * to the source on /ai-visibility-tracker — same numbers, same delta
 * pills, same hover correlation. Will switch to real time-series data
 * when Surven persists per-brand mention rates over scan history.
 */
import { useMemo } from "react";
import {
  CompetitorRankAndSoVBlock,
  MOCK_BRANDS,
  MOCK_DATES,
  useScannerData,
} from "@/features/dashboard/pages/VisibilityScannerSection";

export function CompetitorRankAndSoVRow() {
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

  return <CompetitorRankAndSoVBlock data={data} />;
}
