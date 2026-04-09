"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";
import { getCompetitors } from "@/features/business/services/businessService";
import type { Competitor } from "@/types/database";

export function useBusiness() {
  const { activeBusiness, isLoading: bizLoading } = useActiveBusiness();

  const competitorsQuery = useQuery<Competitor[]>({
    queryKey: ["competitors", activeBusiness?.id],
    queryFn: () => getCompetitors(activeBusiness!.id),
    enabled: !!activeBusiness,
    staleTime: 5 * 60 * 1000,
  });

  return {
    business: activeBusiness ?? null,
    competitors: competitorsQuery.data ?? [],
    isLoading: bizLoading,
    isFetching: competitorsQuery.isFetching,
    error: competitorsQuery.error,
  };
}
