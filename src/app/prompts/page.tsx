"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { PromptsSection } from "@/features/dashboard/pages/PromptsSection";
import { generatePromptsData } from "@/features/dashboard/services/promptsMockData";
import { AISummaryGenerator } from "@/components/atoms/AISummaryGenerator";

export default function PromptsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);

  const data = useMemo(() => {
    if (!business) return null;
    const scanSeed = latestScan?.id ?? "noscan";
    return generatePromptsData(business, competitors, scanSeed);
  }, [business, competitors, latestScan?.id]);

  // Auth + onboarding redirects must run as side effects, not during render.
  // React 19 / Next.js 16 errors out when router.push() fires inside the
  // render body ("Cannot update a component while rendering a different one").
  // Same pattern already applied on /site-audit.
  const needsLoginRedirect = !user && !authLoading;
  const needsOnboardingRedirect =
    !!user && !authLoading && !bizLoading && !business;
  useEffect(() => {
    if (needsLoginRedirect) router.push("/login");
    else if (needsOnboardingRedirect) router.push("/onboarding");
  }, [needsLoginRedirect, needsOnboardingRedirect, router]);

  if (needsLoginRedirect) return null;

  if (authLoading || bizLoading || scanLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) return null;

  const buildAISummary = (): string => {
    if (!data) {
      return `No prompt data yet for ${business.name}. Once a scan runs, this panel surfaces which questions AI engines are answering well and where you're missing from the answers entirely.`;
    }
    const branded = data.brandedVisibility;
    const unbranded = data.unbrandedVisibility;
    const linkRate = data.linkCitationRate;
    const linkDelta = data.linkCitationDelta;
    // Sandwich structure: GOOD → BAD → GOOD. Lead with the strongest of
    // branded coverage / link rate trend, middle with the unbranded gap
    // (the highest-leverage opportunity), close with another positive.
    const s1 = branded >= 90
      ? `Branded queries are landing at ${branded}% — when customers search by name, AI consistently surfaces ${business.name}, which is the foundation everything else compounds on top of.`
      : linkDelta > 0
        ? `Link citation rate is climbing to ${linkRate}% (+${linkDelta.toFixed(1)}% this period) — the answer-capsule and schema work you've shipped is paying off in the metric that actually drives traffic.`
        : `You're tracking ${data.promptsTracked} prompts with ${branded}% branded coverage and ${unbranded}% unbranded — meaningful surface area to optimize against, not a cold start.`;
    const s2 = unbranded < 60
      ? `Unbranded coverage, however, sits at ${unbranded}% — AI is answering category questions without naming you, which means buyers are reaching alternatives without ever seeing your brand. Highest-leverage gap on the page.`
      : linkRate < 40
        ? `Link citation rate is just ${linkRate}%, so your brand is being mentioned but not linked — AI awareness isn't translating into clicks. Push answer-capsule formats on your highest-volume prompts to flip that.`
        : `Branded coverage at ${branded}% means even people searching your name aren't always seeing you cited — defending those queries is table stakes before unbranded growth is durable.`;
    const s3 = linkDelta > 0
      ? `Link citation rate is also up ${linkDelta.toFixed(1)}% this period — momentum is on your side, so the same template applied to your weakest prompts will compound the gain.`
      : branded >= 95
        ? `Branded coverage stays healthy at ${branded}%, so every customer asking AI about you by name is seeing you in the answer — a defensible base for the unbranded expansion ahead.`
        : `${data.promptsTracked} prompts tracked across all 4 engines gives you a clear feedback loop — every fix shows up in the next scan instead of disappearing into a black box.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (!data) {
      return { label: "Optimize to start tracking prompts", href: "/site-audit" };
    }
    if (data.brandedVisibility < 95) {
      return { label: "Optimize to defend your branded queries", href: "/site-audit" };
    }
    return { label: "Optimize to win unbranded prompts", href: "/site-audit" };
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 w-full">
        <AISummaryGenerator getSummary={buildAISummary} getCTA={buildAICTA} />
        <PromptsSection data={data ?? undefined} />
      </div>
    </DashboardLayout>
  );
}
