"use client";

import { useMemo } from "react";
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

  if (!user && !authLoading) {
    router.push("/login");
    return null;
  }

  if (authLoading || bizLoading || scanLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) {
    router.push("/onboarding");
    return null;
  }

  const buildAISummary = (): string => {
    if (!data) {
      return `No prompt data yet for ${business.name}. Once a scan runs, this panel surfaces which questions AI engines are answering well and where you're missing from the answers entirely.`;
    }
    const branded = data.brandedVisibility;
    const unbranded = data.unbrandedVisibility;
    const linkRate = data.linkCitationRate;
    const linkDelta = data.linkCitationDelta;
    const s1 = `Branded queries land at ${branded}% coverage; unbranded sits at ${unbranded}% — the gap between those two numbers is where competitors quietly take warm leads from you.`;
    const s2 = linkDelta > 0
      ? `Citation rate is climbing to ${linkRate}% (+${linkDelta.toFixed(1)}% this period) — momentum is on your side, but answer-capsule formats on your highest-volume informational and transactional prompts will compound the gain fastest.`
      : `Citation rate sits at ${linkRate}% — push answer-capsule formats on your highest-volume informational and transactional prompts to push that number up before the next scan.`;
    const s3 = unbranded < 60
      ? `Watch unbranded coverage closely: AI is answering questions about your category without naming you, which means buyers are reaching alternatives without ever seeing your brand.`
      : branded < 95
        ? `One thing to watch: branded coverage below 95% means even people searching your name aren't always seeing you cited — defending those queries is table stakes.`
        : `One bright spot: branded coverage is healthy — every customer asking AI about you by name is seeing you in the answer.`;
    return `${s1} ${s2} ${s3}`;
  };

  const buildAICTA = (): { label: string; href: string } => {
    if (!data) {
      return { label: "Run a site audit to start tracking prompts", href: "/site-audit" };
    }
    if (data.brandedVisibility < 95) {
      return { label: "Run a site audit to defend your branded queries", href: "/site-audit" };
    }
    return { label: "Run a site audit to win unbranded prompts", href: "/site-audit" };
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
