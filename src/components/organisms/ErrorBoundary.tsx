"use client";

import { useEffect, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/atoms/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
    };

    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  try {
    return <>{children}</>;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    return (
      fallback?.(err, () => window.location.reload()) ?? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-[var(--color-danger)]" />
            </div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-[var(--color-fg-secondary)]">
              {err.message || "An unexpected error occurred"}
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      )
    );
  }
}
