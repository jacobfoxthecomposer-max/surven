import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateBusiness, getBusiness } from "@/features/business/services/businessService";
import { updatePassword, deleteAccount, getUser } from "@/features/auth/services/authService";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const businessQuery = useQuery({
    queryKey: ["business", user?.id],
    queryFn: () => (user?.id ? getBusiness(user.id) : null),
    enabled: !!user?.id,
  });

  const updateBusinessMutation = useMutation({
    mutationFn: ({
      businessId,
      data,
    }: {
      businessId: string;
      data: Parameters<typeof updateBusiness>[1];
    }) => updateBusiness(businessId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", user?.id] });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (password: string) => updatePassword(password),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteAccount(),
  });

  return {
    business: businessQuery.data,
    isLoading: businessQuery.isLoading,
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
      businessQuery.error ||
      updateBusinessMutation.error ||
      updatePasswordMutation.error ||
      deleteAccountMutation.error,
  };
}
