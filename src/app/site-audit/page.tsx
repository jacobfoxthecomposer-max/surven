"use client";

import { useEffect } from "react";
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

  // Redirects must run after render — calling router.push() during the
  // render phase triggers React 19's "setState during render" warning.
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && !bizLoading && user && !business) {
      router.push("/onboarding");
    }
  }, [user, authLoading, business, bizLoading, router]);

  if (authLoading || bizLoading || profileLoading || !user || !business) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AeoAuditSection
        plan={plan}
        businessName={business.name}
        // TODO: thread the website URL through from the Business record
        // once onboarding captures it. Until then the section auto-loads
        // the mock result.
      />
    </DashboardLayout>
  );
}
