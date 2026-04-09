import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBusiness } from "@/features/business/services/businessService";
import { updatePassword, deleteAccount, getUser } from "@/features/auth/services/authService";
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

  const updatePasswordMutation = useMutation({
    mutationFn: (password: string) => updatePassword(password),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteAccount(),
  });

  return {
    business: activeBusiness,
    isLoading: false,
    updateBusiness: updateBusinessMutation.mutate,
    updateBusinessAsync: updateBusinessMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutate,
    updatePasswordAsync: updatePasswordMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutate,
    deleteAccountAsync: deleteAccountMutation.mutateAsync,
    isPending:
      updateBusinessMutation.isPending ||
      updatePasswordMutation.isPending ||
      deleteAccountMutation.isPending,
    error:
      updateBusinessMutation.error ||
      updatePasswordMutation.error ||
      deleteAccountMutation.error,
  };
}
