"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSearchPrompts,
  addSearchPrompt,
  deleteSearchPrompt,
} from "@/features/business/services/promptService";
import type { SearchPrompt } from "@/types/database";

export function useSearchPrompts(businessId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["searchPrompts", businessId];

  const query = useQuery<SearchPrompt[]>({
    queryKey,
    queryFn: () => getSearchPrompts(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (promptText: string) => addSearchPrompt(businessId!, promptText),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (promptId: string) => deleteSearchPrompt(promptId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    prompts: query.data ?? [],
    isLoading: query.isLoading,
    addPrompt: addMutation.mutateAsync,
    deletePrompt: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
