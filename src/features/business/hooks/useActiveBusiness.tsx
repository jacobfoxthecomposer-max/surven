"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAllBusinesses } from "@/features/business/services/businessService";
import type { Business } from "@/types/database";

const STORAGE_KEY = "surven_active_business_id";

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

const MOCK_BUSINESS: Business = {
  id: "local-dev-business",
  user_id: "local-dev-user",
  name: "Surven Local Dev",
  industry: "Software",
  city: "Austin",
  state: "TX",
  created_at: new Date().toISOString(),
};

interface ActiveBusinessContextValue {
  businesses: Business[];
  activeBusiness: Business | null;
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string) => void;
  isLoading: boolean;
  refetchBusinesses: () => void;
}

const ActiveBusinessContext = createContext<ActiveBusinessContextValue | null>(null);

export function ActiveBusinessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const { data: businesses = [], isLoading, refetch } = useQuery<Business[]>({
    queryKey: ["businesses", user?.id],
    queryFn: () =>
      SUPABASE_UNCONFIGURED ? Promise.resolve([MOCK_BUSINESS]) : getAllBusinesses(user!.id),
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Once businesses load, ensure active ID is valid; default to first
  useEffect(() => {
    if (businesses.length === 0) return;
    const valid = businesses.find((b) => b.id === activeBusinessId);
    if (!valid) {
      const id = businesses[0].id;
      setActiveBusinessIdState(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [businesses, activeBusinessId]);

  function setActiveBusinessId(id: string) {
    setActiveBusinessIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    // Invalidate scan/competitor data so dashboard reloads for new client
    queryClient.invalidateQueries({ queryKey: ["competitors", id] });
    queryClient.invalidateQueries({ queryKey: ["scans"] });
  }

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) ?? businesses[0] ?? null;

  return (
    <ActiveBusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        activeBusinessId: activeBusiness?.id ?? null,
        setActiveBusinessId,
        isLoading: authLoading || isLoading,
        refetchBusinesses: refetch,
      }}
    >
      {children}
    </ActiveBusinessContext.Provider>
  );
}

export function useActiveBusiness() {
  const ctx = useContext(ActiveBusinessContext);
  if (!ctx) throw new Error("useActiveBusiness must be used inside ActiveBusinessProvider");
  return ctx;
}
