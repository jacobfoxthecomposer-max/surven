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

  return (
    <DashboardLayout>
      <PromptsSection data={data ?? undefined} />
    </DashboardLayout>
  );
}
