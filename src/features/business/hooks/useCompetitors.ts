"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCompetitors,
  addCompetitor,
  deleteCompetitor,
} from "@/features/business/services/businessService";
import type { Competitor } from "@/types/database";

export function useCompetitors(businessId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["competitors", businessId];

  const query = useQuery<Competitor[]>({
    queryKey,
    queryFn: () => getCompetitors(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => addCompetitor(businessId!, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (competitorId: string) => deleteCompetitor(competitorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    competitors: query.data ?? [],
    isLoading: query.isLoading,
    addCompetitor: addMutation.mutateAsync,
    deleteCompetitor: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
