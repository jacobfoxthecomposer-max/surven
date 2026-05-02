"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AeoAuditSection } from "@/features/aeo-audit/AeoAuditSection";

export default function SiteAuditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  if (!user && !authLoading) {
    router.push("/login");
    return null;
  }

  if (authLoading) {
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
      <AeoAuditSection />
    </DashboardLayout>
  );
}
