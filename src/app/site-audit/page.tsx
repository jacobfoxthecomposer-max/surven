"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { AeoAuditSection } from "@/features/aeo-audit/AeoAuditSection";

export default function SiteAuditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, isLoading: bizLoading } = useBusiness();
  const { plan, isLoading: profileLoading } = useUserProfile();

  if (!user && !authLoading) {
    router.push("/login");
    return null;
  }

  if (authLoading || bizLoading || profileLoading) {
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
      <AeoAuditSection plan={plan} businessName={business.name} />
    </DashboardLayout>
  );
}
