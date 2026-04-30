"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, GitCompare } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { Button } from "@/components/atoms/Button";
import { Card } from "@/components/atoms/Card";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { ComparisonSection } from "@/features/dashboard/pages/ComparisonSection";
import { CompetitorHeatmap } from "@/features/competitor-comparison/CompetitorHeatmap";
import { CompetitorGaps } from "@/features/competitor-comparison/CompetitorGaps";
import { CompetitorCitedDomains } from "@/features/competitor-comparison/CompetitorCitedDomains";
import { ExportModal } from "@/features/competitor-comparison/ExportModal";

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 28, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease },
} as const;

export default function CompetitorComparisonPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);
  const [exportOpen, setExportOpen] = useState(false);

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

  const results = latestScan?.results ?? [];
  const score = latestScan?.visibility_score ?? 0;
  const competitorNames = competitors.map((c) => c.name);
  const hasResults = results.length > 0 && competitorNames.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-10" id="competitor-dashboard">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitCompare className="h-5 w-5 text-[var(--color-primary)]" />
              <h1 className="text-xl font-semibold text-[var(--color-fg)]">
                Competitor Analysis
              </h1>
            </div>
            <p className="text-sm text-[var(--color-fg-muted)]">
              {hasResults
                ? `Comparing ${business.name} against ${competitorNames.length} competitor${competitorNames.length !== 1 ? "s" : ""} · Last scan ${latestScan?.created_at
                    ? new Date(latestScan.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}`
                : "Run a scan from the Dashboard to see competitor data."}
            </p>
          </div>

          {hasResults && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="shrink-0"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </motion.div>

        {/* No competitors state */}
        {competitorNames.length === 0 && !bizLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="text-center py-16 space-y-2">
              <GitCompare className="h-8 w-8 text-[var(--color-fg-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-fg-secondary)] font-medium">No competitors added</p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Add competitors in Settings to see how you compare across AI platforms.
              </p>
            </Card>
          </motion.div>
        )}

        {/* No scan results state */}
        {competitorNames.length > 0 && results.length === 0 && !scanLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="text-center py-16 space-y-2">
              <p className="text-[var(--color-fg-secondary)] font-medium">No scan data yet</p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                Run a scan from the Dashboard — competitor data will appear here automatically.
              </p>
            </Card>
          </motion.div>
        )}

        {/* Loading scan */}
        {scanLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {/* Main content */}
        {hasResults && (
          <>
            {/* 1: AI Visibility Score comparison bar chart */}
            <motion.div {...reveal} id="scores-section">
              <ComparisonSection
                results={results}
                businessScore={score}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>

            {/* 2: Platform heatmap */}
            <motion.div {...reveal}>
              <CompetitorHeatmap
                results={results}
                businessName={business.name}
                businessScore={score}
                competitors={competitorNames}
              />
            </motion.div>

            {/* 3: Competitive gaps & advantages */}
            <motion.div {...reveal}>
              <CompetitorGaps
                results={results}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>

            {/* 4: Cited domains per competitor */}
            <motion.div {...reveal}>
              <CompetitorCitedDomains
                results={results}
                businessName={business.name}
                competitors={competitorNames}
              />
            </motion.div>
          </>
        )}
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        businessName={business.name}
        scanDate={latestScan?.created_at ?? null}
      />
    </DashboardLayout>
  );
}
