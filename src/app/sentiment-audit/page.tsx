"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { SentimentAuditSection } from "@/features/sentiment-audit/SentimentAuditSection";
import { BetaFeedbackFooter } from "@/components/organisms/BetaFeedbackFooter";

export default function SentimentAuditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, isLoading: bizLoading } = useBusiness();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && !bizLoading && user && !business) {
      router.push("/onboarding");
    }
  }, [user, authLoading, business, bizLoading, router]);

  if (authLoading || bizLoading || !user || !business) {
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
      <div className="space-y-6">
        {/* Suspense boundary — SentimentAuditSection reads from
            useSearchParams to focus the deep-linked prompt, which Next
            requires inside a Suspense boundary at the route level. */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[40vh]">
              <Spinner size="lg" />
            </div>
          }
        >
          <SentimentAuditSection />
        </Suspense>
        <BetaFeedbackFooter />
      </div>
    </DashboardLayout>
  );
}
