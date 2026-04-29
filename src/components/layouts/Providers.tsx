"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/molecules/Toast";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ActiveBusinessProvider } from "@/features/business/hooks/useActiveBusiness";
import { SidebarProvider } from "@/features/sidebar/context/SidebarContext";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveBusinessProvider>
          <SidebarProvider>
            <ToastProvider>{children}</ToastProvider>
          </SidebarProvider>
        </ActiveBusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
