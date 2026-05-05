"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { supabase } from "@/services/supabase";

/**
 * "First-time user" = unauthenticated visitor OR an authenticated free-plan
 * user who hasn't completed their first scan yet. Used to swap upgrade CTAs
 * between "Try Free Trial" (first time) and "Upgrade to Plus/Premium" (after).
 */
export function useIsFirstTimeUser() {
  const { user, loading: authLoading } = useAuth();
  const { plan, isLoading: planLoading } = useUserProfile();

  const userId = user?.id;
  const isPaid = plan === "plus" || plan === "premium" || plan === "admin";

  const { data: hasScans, isLoading: scansLoading } = useQuery<boolean>({
    queryKey: ["hasAnyScans", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", userId);
      if (!businesses || businesses.length === 0) return false;
      const ids = businesses.map((b) => b.id);
      const { count } = await supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .in("business_id", ids);
      return (count ?? 0) > 0;
    },
    enabled: !!userId && !isPaid,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    authLoading || (!!userId && (planLoading || scansLoading));

  if (isLoading) return { isFirstTime: true, isLoading: true };
  if (!userId) return { isFirstTime: true, isLoading: false };
  if (isPaid) return { isFirstTime: false, isLoading: false };
  return { isFirstTime: !hasScans, isLoading: false };
}
