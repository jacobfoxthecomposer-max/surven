"use client";

import { useState, useEffect, useCallback } from "react";

export type Platform = "github" | "vercel" | "wordpress" | "webflow" | "wix" | "shopify";

export interface SiteConnection {
  id: string;
  platform: Platform;
  repo?: string;
  branch?: string;
  site_id?: string;
  site_url?: string;
  status: "active" | "error" | "revoked";
  last_verified_at?: string;
  created_at: string;
}

export type ConnectPayload =
  | { platform: "github"; businessId: string; token: string; repo: string; branch?: string }
  | { platform: "vercel"; businessId: string; token: string; projectId: string }
  | { platform: "wordpress"; businessId: string; siteUrl: string; username: string; applicationPassword: string }
  | { platform: "webflow"; businessId: string; token: string; siteId: string }
  | { platform: "wix"; businessId: string; apiKey: string; siteId: string; accountId: string; siteUrl: string }
  | { platform: "shopify"; businessId: string; shopDomain: string; clientId: string; clientSecret: string };

export function useSiteConnections(businessId: string | undefined) {
  const [connections, setConnections] = useState<SiteConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/status?businessId=${businessId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to load connections");
        return;
      }
      setConnections(data.connections ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) refresh();
  }, [businessId, refresh]);

  async function connect(payload: ConnectPayload): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error:
            data?.message ??
            (data?.error === "premium_required"
              ? "Upgrade to Premium to connect a site."
              : data?.error === "validation_failed"
              ? "Could not verify credentials."
              : "Connection failed."),
        };
      }
      await refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  async function disconnect(platform: Platform): Promise<{ ok: boolean; error?: string }> {
    if (!businessId) return { ok: false, error: "No business selected" };
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error ?? "Disconnect failed" };
      }
      await refresh();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  return { connections, loading, error, connect, disconnect, refresh };
}
