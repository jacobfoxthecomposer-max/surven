"use client";

import { useState } from "react";
import type { CrawlabilityResult } from "@/types/crawlability";

interface ScanError {
  message: string;
  code?: "upgrade_required" | "ssrf_blocked" | "scan_in_progress" | "network" | "unknown";
}

export function useCrawlabilityAudit() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CrawlabilityResult | null>(null);
  const [error, setError] = useState<ScanError | null>(null);

  async function runScan(opts: {
    businessId: string;
    siteUrl: string;
    force?: boolean;
  }): Promise<CrawlabilityResult | null> {
    setScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/crawlability/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = (data?.error as string) || "unknown";
        const message =
          code === "upgrade_required"
            ? "This feature requires the Plus or Premium plan."
            : code === "ssrf_blocked"
            ? "That URL isn't allowed for security reasons."
            : code === "scan_in_progress"
            ? "A scan was just run. Please wait a few minutes before retrying."
            : data?.error || "Scan failed. Please try again.";

        setError({
          message,
          code: code as ScanError["code"],
        });
        return null;
      }

      setResult(data as CrawlabilityResult);
      return data as CrawlabilityResult;
    } catch {
      setError({ message: "Network error. Please try again.", code: "network" });
      return null;
    } finally {
      setScanning(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return {
    scanning,
    result,
    error,
    runScan,
    reset,
  };
}
