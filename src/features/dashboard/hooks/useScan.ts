"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLatestScan,
  getScanHistory,
  createScanForBusiness,
} from "@/features/dashboard/services/scanService";
import type { Business, Competitor, ScanWithResults, Scan } from "@/types/database";

export function useScan(business: Business | null, competitors: Competitor[]) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);

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
    try {
      await createScanForBusiness(business.id, {
        businessName: business.name,
        industry: business.industry,
        city: business.city,
        state: business.state,
        competitors: competitors.map((c) => c.name),
      });

      // Invalidate queries to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ["latestScan", business.id] });
      await queryClient.invalidateQueries({ queryKey: ["scanHistory", business.id] });
    } finally {
      setScanning(false);
    }
  }, [business, competitors, scanning, queryClient]);

  return {
    latestScan: latestScanQuery.data ?? null,
    history: historyQuery.data ?? [],
    scanning,
    isLoading: latestScanQuery.isLoading,
    runScan,
  };
}
