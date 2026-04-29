"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { supabase } from "@/services/supabase";
import type { UserProfile } from "@/types/database";

export function useUserProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) {
        console.error("Failed to fetch user profile:", error);
        return null;
      }
      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    profile,
    isLoading,
    plan: profile?.plan ?? "free",
  };
}
