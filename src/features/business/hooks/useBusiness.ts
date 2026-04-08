"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getBusiness, getCompetitors } from "@/features/business/services/businessService";
import type { Business, Competitor } from "@/types/database";

export function useBusiness() {
  const { user } = useAuth();

  const businessQuery = useQuery<Business | null>({
    queryKey: ["business", user?.id],
    queryFn: () => (user ? getBusiness(user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  const competitorsQuery = useQuery<Competitor[]>({
    queryKey: ["competitors", businessQuery.data?.id],
    queryFn: () =>
      businessQuery.data
        ? getCompetitors(businessQuery.data.id)
        : Promise.resolve([]),
    enabled: !!businessQuery.data,
  });

  return {
    business: businessQuery.data ?? null,
    competitors: competitorsQuery.data ?? [],
    isLoading: businessQuery.isLoading,
    error: businessQuery.error,
  };
}
