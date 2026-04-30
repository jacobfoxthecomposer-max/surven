"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/services/supabase";

const PAID_PLANS = ["plus", "premium", "admin"];

export function ApiKeysTab() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    fetchUserPlan();
  }, []);

  async function fetchUserPlan() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setPlan(data?.plan || "free");
    } catch (err) {
      console.error("Failed to fetch plan:", err);
      setPlan("free");
    } finally {
      setPlanLoading(false);
    }
  }

  async function generateApiKey() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/api/generate-extension-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: "Chrome Extension" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to generate API key");
        return;
      }

      setApiKey(data.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (planLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Chrome Extension API Key</h2>
        </div>
        <div className="h-24 bg-[var(--color-surface)] animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!PAID_PLANS.includes(plan)) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Chrome Extension API Key</h2>
          <p className="text-[var(--color-fg-secondary)]">
            Upgrade to premium to use the Surven Chrome Extension and generate API keys.
          </p>
        </div>

        <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
          <p className="text-sm text-[var(--color-fg-secondary)]">
            Premium users can audit websites directly from their browser with the Surven Auditor extension.
          </p>
        </div>

        <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity">
          Upgrade to Premium
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Chrome Extension API Key</h2>
        <p className="text-[var(--color-fg-secondary)]">
          Generate an API key to use with the Surven Chrome Extension.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {apiKey ? (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            <p className="text-xs font-semibold text-[var(--color-fg-secondary)] mb-2">Your API Key</p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-sm font-mono bg-[var(--color-bg)] p-3 rounded border border-[var(--color-border)] overflow-x-auto select-none"
                style={{ filter: revealed ? "none" : "blur(6px)", transition: "filter 0.2s" }}
              >
                {apiKey}
              </code>
              <button
                onClick={() => setRevealed((r) => !r)}
                className="p-2 hover:bg-[var(--color-bg)] rounded transition-colors"
                title={revealed ? "Hide key" : "Show key"}
              >
                {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-[var(--color-bg)] rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Save your key safely.</strong> You'll only see it once. If lost, generate a new one.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">How to use:</h3>
            <ol className="text-sm text-[var(--color-fg-secondary)] space-y-2 list-decimal list-inside">
              <li>Open the Surven Auditor extension settings</li>
              <li>Paste this API key into the "API Key" field</li>
              <li>Set API URL to: <code className="bg-[var(--color-surface)] px-2 py-1 rounded text-xs">https://surven.vercel.app/api/audit/run</code></li>
              <li>Save settings and start auditing</li>
            </ol>
          </div>
        </div>
      ) : (
        <button
          onClick={generateApiKey}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Generating..." : "Generate API Key"}
        </button>
      )}

      <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
        <h3 className="font-semibold text-sm mb-4">Need the extension?</h3>
        <a
          href="https://chromewebstore.google.com/detail/surven-auditor/..."
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] hover:underline text-sm"
        >
          Install from Chrome Web Store →
        </a>
      </div>
    </div>
  );
}
