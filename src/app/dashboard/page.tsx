"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { GaugeSection } from "@/features/dashboard/pages/GaugeSection";
import { ModelBreakdownSection } from "@/features/dashboard/pages/ModelBreakdownSection";
import { PromptResultsSection } from "@/features/dashboard/pages/PromptResultsSection";
import { ComparisonSection } from "@/features/dashboard/pages/ComparisonSection";
import { HistorySection } from "@/features/dashboard/pages/HistorySection";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading, error: bizError } = useBusiness();
  const { latestScan, history, scanning, isLoading: scanLoading, runScan } = useScan(
    business,
    competitors
  );
  const { toast } = useToast();

  // Redirect to onboarding only if business confirmed missing (no error)
  useEffect(() => {
    if (!authLoading && !bizLoading && !bizError && user && !business) {
      router.push("/onboarding");
    }
  }, [authLoading, bizLoading, bizError, user, business, router]);

  async function handleRunScan() {
    toast("Scan started — querying AI models...", "info");
    try {
      await runScan();
      toast("Scan complete!", "success");
    } catch {
      toast("Scan failed. Please try again.", "error");
    }
  }

  // Loading state
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
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <p className="text-[var(--color-fg-secondary)]">No business found.</p>
          <button
            onClick={() => router.push("/onboarding")}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm"
          >
            Set up your business
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const score = latestScan?.visibility_score ?? 0;
  const results = latestScan?.results ?? [];
  const competitorNames = competitors.map((c) => c.name);

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-10"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
        }}
      >
        {/* Section 1: Visibility Gauge */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}>
          <GaugeSection
            businessName={business.name}
            industry={business.industry}
            score={score}
            lastScanDate={latestScan?.created_at ?? null}
            scanning={scanning}
            isLoading={scanLoading}
            onRunScan={handleRunScan}
          />
        </motion.div>

        {/* Section 2: AI Model Breakdown */}
        {results.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}>
            <ModelBreakdownSection results={results} />
          </motion.div>
        )}

        {/* Section 3: Prompt Results */}
        {results.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}>
            <PromptResultsSection results={results} businessName={business.name} />
          </motion.div>
        )}

        {/* Section 4: Competitor Comparison */}
        {results.length > 0 && competitorNames.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}>
            <ComparisonSection
              results={results}
              businessScore={score}
              businessName={business.name}
              competitors={competitorNames}
            />
          </motion.div>
        )}

        {/* Section 5: History */}
        {history.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}>
            <HistorySection scans={history} />
          </motion.div>
        )}

        {/* Empty state */}
        {results.length === 0 && !scanLoading && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className="text-center py-16 space-y-3"
          >
            <p className="text-lg text-[var(--color-fg-secondary)]">
              No scan results yet
            </p>
            <p className="text-sm text-[var(--color-fg-muted)]">
              Click &quot;Run New Scan&quot; to see how visible your business is across AI models.
            </p>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
