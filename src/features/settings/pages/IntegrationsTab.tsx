"use client";

import Link from "next/link";
import { Clock, Lock, Crown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";
import { Spinner } from "@/components/atoms/Spinner";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useSiteConnections } from "@/features/crawlability/hooks/useSiteConnections";
import { SiteConnectionCard } from "@/features/crawlability/components/SiteConnectionCard";
import type { Platform } from "@/features/crawlability/hooks/useSiteConnections";

const PLATFORMS: Platform[] = ["github", "vercel", "wordpress", "wix", "webflow"];

const futureIntegrations = [
  {
    name: "Google Stitch",
    description: "Automated data warehousing of scan results",
  },
  {
    name: "21st.dev",
    description: "Competitor enrichment and discovery",
  },
];

export function IntegrationsTab() {
  const { business, isLoading: bizLoading } = useBusiness();
  const { plan, isLoading: profileLoading } = useUserProfile();
  const { connections, loading, connect, disconnect } = useSiteConnections(business?.id);

  const isPremium = plan === "premium" || plan === "admin";

  if (bizLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Site Connections section (Premium) */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[var(--color-fg)]">
            Site Connections
          </h2>
          <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
            Connect your site so Surven can apply crawlability fixes directly. Premium plan only.
          </p>
        </div>

        {!isPremium ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
              >
                <Lock className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm font-semibold text-[var(--color-fg)]">
                  Site Connections is a Premium feature
                </p>
                <p className="text-xs text-[var(--color-fg-secondary)] leading-relaxed">
                  Connect GitHub, Vercel, WordPress, or Webflow to apply crawlability fixes
                  automatically — no copy-pasting required.
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm shadow-md transition-colors"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Premium
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : !business ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-fg-muted)]">
              Set up your business first to connect a site.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {PLATFORMS.map((platform) => (
              <SiteConnectionCard
                key={platform}
                platform={platform}
                businessId={business.id}
                connection={connections.find((c) => c.platform === platform)}
                onConnect={connect}
                onDisconnect={disconnect}
              />
            ))}
          </div>
        )}
      </section>

      {/* Future integrations */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[var(--color-fg)]">
            Coming Soon
          </h2>
          <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
            Additional integrations on our roadmap.
          </p>
        </div>
        <div className="space-y-2.5">
          {futureIntegrations.map((integration) => (
            <div
              key={integration.name}
              className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                    {integration.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                    {integration.description}
                  </p>
                </div>
                <Badge variant="info">
                  <Clock className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
