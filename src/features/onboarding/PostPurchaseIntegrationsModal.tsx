"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Spinner } from "@/components/atoms/Spinner";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useSiteConnections } from "@/features/crawlability/hooks/useSiteConnections";
import { SiteConnectionCard } from "@/features/crawlability/components/SiteConnectionCard";
import type { Platform } from "@/features/crawlability/hooks/useSiteConnections";

const PLATFORMS: Platform[] = [
  "github",
  "vercel",
  "wordpress",
  "shopify",
  "wix",
  "webflow",
];

export function PostPurchaseIntegrationsModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trigger = searchParams.get("show_integrations");

  const [open, setOpen] = useState(trigger === "true");

  const { business, isLoading: bizLoading } = useBusiness();
  const { connections, loading, connect, disconnect } = useSiteConnections(
    business?.id,
  );

  useEffect(() => {
    setOpen(trigger === "true");
  }, [trigger]);

  function close() {
    setOpen(false);
    if (trigger === "true") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("show_integrations");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl"
          >
            <button
              type="button"
              onClick={close}
              title="Do it in settings"
              aria-label="Close (you can finish this in Settings later)"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-fg)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15">
                  <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-[var(--color-fg)]">
                    Welcome to Premium — connect your site
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                    Pick where your site lives so we can apply crawlability
                    fixes directly. You can do this later from Settings →
                    Integrations.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {bizLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner size="md" />
                  </div>
                ) : !business ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      Set up your business first, then come back to connect a
                      site.
                    </p>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {PLATFORMS.map((platform) => (
                      <SiteConnectionCard
                        key={platform}
                        platform={platform}
                        businessId={business.id}
                        connection={connections.find(
                          (c) => c.platform === platform,
                        )}
                        onConnect={connect}
                        onDisconnect={disconnect}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
