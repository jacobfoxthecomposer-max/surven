"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { supabase } from "@/services/supabase";
import type { UserProfile } from "@/types/database";

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

const MOCK_PROFILE: UserProfile = {
  user_id: "local-dev-user",
  plan: "admin",
  created_at: new Date().toISOString(),
};

export function useUserProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (SUPABASE_UNCONFIGURED) return MOCK_PROFILE;
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
