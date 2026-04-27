"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { AuditPage } from "@/features/dashboard/pages/AuditPage";

export default function AuditRoute() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, isLoading: bizLoading } = useBusiness();

  if (!user && !authLoading) {
    router.push("/login");
    return null;
  }

  if (authLoading || bizLoading) {
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
      <AuditPage businessId={business.id} businessName={business.name} />
    </DashboardLayout>
  );
}
