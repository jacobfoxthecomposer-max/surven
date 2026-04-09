"use client";

import { useRouter } from "next/navigation";
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
import { CompetitorBenchmarkSection } from "@/features/dashboard/pages/CompetitorBenchmarkSection";
import { HistorySection } from "@/features/dashboard/pages/HistorySection";
import { SentimentSection } from "@/features/dashboard/pages/SentimentSection";
import { CitationGapSection } from "@/features/dashboard/pages/CitationGapSection";
import { exportScanResultsAsCsv } from "@/utils/csvExport";
import { Button } from "@/components/atoms/Button";
import { Download } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, history, scanning, isLoading: scanLoading, runScan } = useScan(
    business,
    competitors
  );
  const { toast } = useToast();

  function handleExport() {
    if (!latestScan || !business) return;
    exportScanResultsAsCsv(latestScan, business.name);
  }

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

  const ease = [0.16, 1, 0.3, 1] as const;
  const reveal = {
    initial: { opacity: 0, y: 28, filter: "blur(4px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.65, ease },
  } as const;

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* 1: Visibility Gauge — animates on mount (first thing visible) */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <GaugeSection
            businessName={business.name}
            industry={business.industry}
            score={score}
            lastScanDate={latestScan?.created_at ?? null}
            scanType={latestScan?.scan_type}
            scanning={scanning}
            isLoading={scanLoading}
            onRunScan={handleRunScan}
          />
        </motion.div>

        {/* 2: AI Model Breakdown */}
        {results.length > 0 && (
          <motion.div {...reveal}>
            <ModelBreakdownSection results={results} />
          </motion.div>
        )}

        {/* 3: Brand Sentiment */}
        {results.length > 0 && (
          <motion.div {...reveal}>
            <SentimentSection results={results} />
          </motion.div>
        )}

        {/* 4: Prompt Results */}
        {results.length > 0 && (
          <motion.div {...reveal}>
            <PromptResultsSection results={results} businessName={business.name} />
          </motion.div>
        )}

        {/* 5: Competitor Comparison */}
        {results.length > 0 && competitorNames.length > 0 && (
          <motion.div {...reveal}>
            <ComparisonSection
              results={results}
              businessScore={score}
              businessName={business.name}
              competitors={competitorNames}
            />
          </motion.div>
        )}

        {/* 6: Competitor Benchmarking */}
        {results.length > 0 && competitorNames.length > 0 && (
          <motion.div {...reveal}>
            <CompetitorBenchmarkSection
              results={results}
              businessScore={score}
              businessName={business.name}
              competitors={competitorNames}
            />
          </motion.div>
        )}

        {/* 7: Citation Gap Analysis */}
        {results.length > 0 && (
          <motion.div {...reveal}>
            <CitationGapSection results={results} businessName={business.name} />
          </motion.div>
        )}

        {/* 8: History */}
        {history.length > 0 && (
          <motion.div {...reveal}>
            <HistorySection scans={history} />
          </motion.div>
        )}

        {/* 9: Export CSV */}
        {results.length > 0 && (
          <motion.div
            {...reveal}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-end"
          >
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </motion.div>
        )}

        {/* Empty state */}
        {results.length === 0 && !scanLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
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
      </div>
    </DashboardLayout>
  );
}
