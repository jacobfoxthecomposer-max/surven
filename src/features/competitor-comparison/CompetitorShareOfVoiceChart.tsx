"use client";

/**
 * Share-of-voice-over-time card cloned from the AI Visibility Tracker
 * (`ShareOfVoiceCard` in VisibilityScannerSection). Reuses the existing
 * mock-data generator + helper functions so the visual + animation are
 * identical to the source. Will switch to real time-series data when
 * Surven persists per-brand mention counts over scan history.
 */
import { useMemo } from "react";
import {
  MOCK_BRANDS,
  MOCK_DATES,
  ShareOfVoiceCard,
  buildSOVInsight,
  buildSOVStats,
  useScannerData,
} from "@/features/dashboard/pages/VisibilityScannerSection";

export function CompetitorShareOfVoiceChart() {
  // Same engine universe + range as the AI Visibility Tracker default.
  const enabledEngines = useMemo(
    () =>
      new Set([
        "chatgpt",
        "claude",
        "gemini",
        "google_ai",
        "perplexity",
        "copilot",
      ]),
    [],
  );
  const data = useScannerData(
    MOCK_BRANDS,
    MOCK_DATES,
    MOCK_DATES.length,
    enabledEngines,
  );
  const sovStats = useMemo(() => buildSOVStats(data), [data]);
  const sovInsight = useMemo(() => buildSOVInsight(sovStats), [sovStats]);

  return (
    <ShareOfVoiceCard
      data={data}
      stats={sovStats}
      insight={sovInsight}
      pieMode="donut-center"
      aiOverviewVariant="V1"
      showChart={false}
    />
  );
}
