"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLatestScan,
  getScanHistory,
  createScanForBusiness,
  getScansWithResultsInRange,
} from "@/features/dashboard/services/scanService";
import { useSearchPrompts } from "@/features/business/hooks/useSearchPrompts";
import type { Business, Competitor, ScanWithResults, Scan } from "@/types/database";
import { getRangeBounds, type TimeRange } from "@/utils/timeRange";

export function useScan(business: Business | null, competitors: Competitor[]) {
  const { prompts } = useSearchPrompts(business?.id);
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const latestScanQuery = useQuery<ScanWithResults | null>({
    queryKey: ["latestScan", business?.id],
    queryFn: () => (business ? getLatestScan(business.id) : Promise.resolve(null)),
    enabled: !!business,
  });

  const historyQuery = useQuery<Scan[]>({
    queryKey: ["scanHistory", business?.id],
    queryFn: () => (business ? getScanHistory(business.id) : Promise.resolve([])),
    enabled: !!business,
  });

  const runScan = useCallback(async () => {
    if (!business || scanning) return;

    setScanning(true);
    setScanError(null);
    try {
      await createScanForBusiness(
        business.id,
        {
          businessName: business.name,
          industry: business.industry,
          city: business.city,
          state: business.state,
          competitors: competitors.map((c) => c.name),
        },
        prompts.map((p) => p.prompt_text)
      );

      // Invalidate queries to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ["latestScan", business.id] });
      await queryClient.invalidateQueries({ queryKey: ["scanHistory", business.id] });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed. Please try again.");
      throw err;
    } finally {
      setScanning(false);
    }
  }, [business, competitors, scanning, queryClient, prompts]);

  return {
    latestScan: latestScanQuery.data ?? null,
    history: historyQuery.data ?? [],
    scanning,
    scanError,
    isLoading: latestScanQuery.isLoading,
    runScan,
  };
}

export function useRangedScans(
  business: Business | null,
  range: TimeRange,
  customStart?: Date | null,
  customEnd?: Date | null,
) {
  const bounds = getRangeBounds(range, customStart, customEnd);
  const startKey = bounds.start?.toISOString() ?? null;
  const endKey = bounds.end?.toISOString() ?? null;

  const query = useQuery<ScanWithResults[]>({
    queryKey: ["rangedScans", business?.id, range, startKey, endKey],
    queryFn: () =>
      business
        ? getScansWithResultsInRange(business.id, bounds.start, bounds.end)
        : Promise.resolve([]),
    enabled: !!business,
  });

  const scans = query.data ?? [];
  const aggregatedResults = scans.flatMap((s) => s.results);

  return {
    scans,
    results: aggregatedResults,
    isLoading: query.isLoading,
  };
}
