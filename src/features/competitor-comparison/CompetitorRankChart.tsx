"use client";

/**
 * Average-rank-when-mentioned chart cloned from the AI Visibility Tracker
 * (`RankSeriesCard` in VisibilityScannerSection). Reuses the existing
 * mock-data generator + helper functions so the visual + animation are
 * identical to the source. Will be wired to real scan-history data when
 * Surven persists time-series competitor positions.
 */
import { useMemo } from "react";
import {
  MOCK_BRANDS,
  MOCK_DATES,
  RankSeriesCard,
  buildPositionInsight,
  buildPositionStats,
  useScannerData,
} from "@/features/dashboard/pages/VisibilityScannerSection";

export function CompetitorRankChart() {
  // Same engine universe + range as the AI Visibility Tracker default
  // (all engines on, all dates).
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
  const positionStats = useMemo(() => buildPositionStats(data), [data]);
  const positionInsight = useMemo(
    () => buildPositionInsight(positionStats),
    [positionStats],
  );

  return (
    <RankSeriesCard
      title="Average rank when mentioned"
      titleInfo="Your typical position when AI tools mention you. Lower is better."
      data={data}
      stats={positionStats}
      insight={positionInsight}
      mode="position"
      layout="list-left"
      density="mini"
      listWidthPx={220}
      chartHeightPx={200}
      aiOverviewVariant="V1"
    />
  );
}
