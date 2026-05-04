"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import {
  VisibilityScannerSection,
  genLine,
  buildDates,
  MOCK_N,
  type MockBrand,
} from "@/features/dashboard/pages/VisibilityScannerSection";
import { COLORS } from "@/utils/constants";
import type { Business, Competitor } from "@/types/database";

const COMPETITOR_PALETTE = ["#C97B45", "#B8A030", "#6BA3F5", "#5BAF92", "#B54631"];

function domainFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "your-business"}.com`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildBrandsForScan(
  business: Business,
  competitors: Competitor[],
  scanSeed: string
): MockBrand[] {
  const baseSeed = hashSeed(`${business.id}-${scanSeed}`);
  const rng = (mul: number) => ((baseSeed * mul) % 1000) / 1000 + 0.5;

  const youBase = 35 + Math.round(rng(7) * 30);
  const youTrend = 0.05 + rng(11) * 0.2;

  const you: MockBrand = {
    id: "you",
    name: business.name,
    domain: domainFromName(business.name),
    color: COLORS.primary,
    isYou: true,
    mentions: 1500 + Math.round(rng(3) * 2500),
    data: genLine(youBase, youTrend, 2.6, MOCK_N, baseSeed % 1000 || 1),
  };

  const comps: MockBrand[] = competitors.slice(0, 5).map((c, i) => {
    const compSeed = hashSeed(`${baseSeed}-${c.id}`);
    const cRng = (mul: number) => ((compSeed * mul) % 1000) / 1000 + 0.5;
    const base = 20 + Math.round(cRng(13 + i) * 45);
    const trend = 0.03 + cRng(17 + i) * 0.12;
    return {
      id: c.id || `c${i + 1}`,
      name: c.name,
      domain: domainFromName(c.name),
      color: COMPETITOR_PALETTE[i % COMPETITOR_PALETTE.length],
      isYou: false,
      mentions: 800 + Math.round(cRng(19 + i) * 2200),
      data: genLine(base, trend, 2.4, MOCK_N, (compSeed % 1000) + i + 1),
    };
  });

  return [you, ...comps];
}

export default function AIVisibilityTrackerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);

  const brandsAndDates = useMemo(() => {
    if (!business) return null;
    const scanSeed = latestScan?.id ?? "noscan";
    return {
      brands: buildBrandsForScan(business, competitors, scanSeed),
      dates: buildDates(MOCK_N),
    };
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

  return (
    <DashboardLayout>
      <VisibilityScannerSection
        brands={brandsAndDates?.brands}
        dates={brandsAndDates?.dates}
      />
    </DashboardLayout>
  );
}
