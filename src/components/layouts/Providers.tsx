"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
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
      {/* reducedMotion="user" makes every framer-motion animation honor the
          OS-level "Reduce Motion" preference. CSS animations are already
          handled by the prefers-reduced-motion media query in globals.css. */}
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ActiveBusinessProvider>
            <SidebarProvider>
              <ToastProvider>{children}</ToastProvider>
            </SidebarProvider>
          </ActiveBusinessProvider>
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
