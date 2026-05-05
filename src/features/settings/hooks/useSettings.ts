import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBusiness } from "@/features/business/services/businessService";
import { deleteAccount } from "@/features/auth/services/authService";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";

export function useSettings() {
  const { activeBusiness } = useActiveBusiness();
  const queryClient = useQueryClient();

  const updateBusinessMutation = useMutation({
    mutationFn: ({
      businessId,
      data,
    }: {
      businessId: string;
      data: Parameters<typeof updateBusiness>[1];
    }) => updateBusiness(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteAccount(),
  });

  return {
    business: activeBusiness,
    isLoading: false,
    updateBusiness: updateBusinessMutation.mutate,
    updateBusinessAsync: updateBusinessMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutate,
    deleteAccountAsync: deleteAccountMutation.mutateAsync,
    isPending:
      updateBusinessMutation.isPending ||
      deleteAccountMutation.isPending,
    error:
      updateBusinessMutation.error ||
      deleteAccountMutation.error,
  };
}
