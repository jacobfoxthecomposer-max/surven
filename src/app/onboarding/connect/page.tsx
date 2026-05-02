"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Check, Lock, Sparkles, ArrowRight, Code2, Globe } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/utils/cn";
import type { DetectionResult } from "@/utils/frameworkDetection";

type Phase = 1 | 2 | 3 | 5;

interface PlatformTile {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  matchPlatforms: string[];
  matchHosts: string[];
  routeSlug?: string;
}

const PLATFORMS: PlatformTile[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Any code-hosted site (Next.js, Astro, Hugo, Jekyll, more)",
    phase: 1,
    matchPlatforms: ["nextjs", "astro", "nuxt", "sveltekit", "remix", "gatsby", "hugo", "jekyll", "eleventy"],
    matchHosts: ["vercel", "netlify", "cloudflare"],
    routeSlug: "github",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deploy hooks + env vars for any Vercel-hosted site",
    phase: 1,
    matchPlatforms: [],
    matchHosts: ["vercel"],
    routeSlug: "vercel",
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Self-hosted WordPress with REST API",
    phase: 2,
    matchPlatforms: ["wordpress"],
    matchHosts: ["wpengine", "kinsta"],
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Online Store 2.0 themes + product SEO",
    phase: 3,
    matchPlatforms: ["shopify"],
    matchHosts: ["shopify"],
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "CMS + page settings + custom code",
    phase: 5,
    matchPlatforms: ["webflow"],
    matchHosts: [],
  },
  {
    id: "wix",
    name: "Wix",
    description: "Limited support via Wix Headless",
    phase: 5,
    matchPlatforms: ["wix"],
    matchHosts: [],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    description: "Manual instructions for code injection",
    phase: 5,
    matchPlatforms: ["squarespace"],
    matchHosts: [],
  },
];

const PHASE_AVAILABLE: Phase[] = [1];

export default function ConnectPickerPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDetect(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setDetecting(true);
    setError(null);
    try {
      const res = await fetch("/api/detect/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.result) {
        setDetection(data.result as DetectionResult);
      } else {
        setError("Could not analyze that URL. Try a platform tile below instead.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setDetecting(false);
    }
  }

  function handlePick(tile: PlatformTile) {
    if (!PHASE_AVAILABLE.includes(tile.phase) || !tile.routeSlug) return;
    router.push(`/onboarding/connect/${tile.routeSlug}`);
  }

  function isMatch(tile: PlatformTile): boolean {
    if (!detection) return false;
    return (
      tile.matchPlatforms.includes(detection.platform) ||
      tile.matchHosts.includes(detection.host)
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1
            className="text-[var(--color-fg)] mb-3"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 500, lineHeight: 1.1 }}
          >
            Connect your website
          </h1>
          <p className="text-[var(--color-fg-secondary)] text-base mb-8 max-w-xl">
            Surven needs read access to audit your site. Connect once, every audit tool — Tracker, Crawlability, Citation Insights, Chrome extension — uses it.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleDetect}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <label className="block text-sm font-medium text-[var(--color-fg)] mb-2">
            Paste your website URL — Surven detects your platform
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-secondary)]" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="acme.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <Button type="submit" loading={detecting} disabled={!url.trim()}>
              Detect
            </Button>
          </div>
          {error && <p className="text-sm text-[var(--color-danger)] mt-2">{error}</p>}
          {detection && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 flex items-start gap-3"
            >
              <Sparkles className="h-4 w-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
              <div className="text-sm text-[var(--color-fg)]">
                Detected: <strong>{detection.platform}</strong>
                {detection.host !== "unknown" && <> on <strong>{detection.host}</strong></>}
                <span className="text-[var(--color-fg-secondary)]"> · {Math.round(detection.confidence * 100)}% confidence</span>
                <div className="text-xs text-[var(--color-fg-secondary)] mt-1">
                  Recommended tiles highlighted below.
                </div>
              </div>
            </motion.div>
          )}
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-sm font-medium text-[var(--color-fg)] mb-3 uppercase tracking-wider">
            Or pick your platform
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORMS.map((tile) => {
              const available = PHASE_AVAILABLE.includes(tile.phase);
              const matched = isMatch(tile);
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handlePick(tile)}
                  disabled={!available}
                  className={cn(
                    "text-left p-4 rounded-lg border transition-all",
                    "flex items-start gap-3",
                    available
                      ? "border-[var(--color-border)] hover:border-[var(--color-primary)] cursor-pointer bg-[var(--color-surface)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]/50 cursor-not-allowed opacity-60",
                    matched && "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {tile.id === "github" ? (
                      <Github className="h-5 w-5 text-[var(--color-fg)]" />
                    ) : (
                      <Globe className="h-5 w-5 text-[var(--color-fg)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-[var(--color-fg)]">{tile.name}</span>
                      {available ? (
                        matched && <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-fg-secondary)]">
                          <Lock className="h-3 w-3" /> Phase {tile.phase}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-fg-secondary)] line-clamp-2">{tile.description}</div>
                  </div>
                  {available && (
                    <ArrowRight className="h-4 w-4 text-[var(--color-fg-secondary)] mt-1 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-10 pt-6 border-t border-[var(--color-border)] flex items-center justify-between"
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors"
          >
            Skip — set up later
          </button>
          <div className="text-xs text-[var(--color-fg-secondary)]">
            Connections live in <a href="/settings/integrations" className="underline">Settings → Integrations</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
