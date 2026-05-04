"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { AIOverview } from "@/components/atoms/AIOverview";
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
import { WhatsNextCard } from "@/components/organisms/WhatsNextCard";
import { exportScanResultsAsCsv } from "@/utils/csvExport";
import { Button } from "@/components/atoms/Button";
import { Download } from "lucide-react";
import type { ScanResult } from "@/types/database";


const MODEL_LABELS: Record<ScanResult["model_name"], string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

function buildDashboardInsight(results: ScanResult[]): string | null {
  if (results.length === 0) return null;
  const byEngine = new Map<ScanResult["model_name"], { mentioned: number; total: number }>();
  for (const r of results) {
    const e = byEngine.get(r.model_name) ?? { mentioned: 0, total: 0 };
    e.total += 1;
    if (r.business_mentioned) e.mentioned += 1;
    byEngine.set(r.model_name, e);
  }
  const ranked = [...byEngine.entries()]
    .map(([model, s]) => ({ model, ...s, rate: s.total ? s.mentioned / s.total : 0 }))
    .sort((a, b) => b.rate - a.rate);
  if (ranked.length === 0) return null;
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  if (ranked.length === 1) {
    return `${MODEL_LABELS[best.model]} mentioned your business in ${best.mentioned} of ${best.total} prompts.`;
  }
  return `${MODEL_LABELS[best.model]} mentioned your business in ${best.mentioned} of ${best.total} prompts — your strongest engine. ${MODEL_LABELS[worst.model]} was lowest at ${worst.mentioned} of ${worst.total}.`;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, history, scanning, isLoading: scanLoading, runScan } = useScan(
    business,
    competitors
  );
  const { toast } = useToast();
  const firstScanTriggered = useRef(false);

  function handleExport() {
    if (!latestScan || !business) return;
    exportScanResultsAsCsv(latestScan, business.name);
  }

  async function handleRunScan() {
    toast("Scan started — querying AI models...", "info");
    try {
      await runScan();
      toast("Scan complete!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Scan failed. Please try again.", "error");
    }
  }

  // Auto-run first scan after onboarding (?firstScan=1).
  useEffect(() => {
    if (firstScanTriggered.current) return;
    if (searchParams?.get("firstScan") !== "1") return;
    if (!business || scanning || scanLoading) return;
    if (latestScan) {
      router.replace("/dashboard");
      return;
    }
    firstScanTriggered.current = true;
    toast("Running your first scan — querying AI models...", "info");
    runScan()
      .then(() => toast("Scan complete!", "success"))
      .catch((err) =>
        toast(err instanceof Error ? err.message : "Scan failed.", "error"),
      )
      .finally(() => router.replace("/dashboard"));
  }, [business, latestScan, scanning, scanLoading, searchParams, router, runScan, toast]);

  // Auth protection
  if (!user && !authLoading) {
    router.push("/login");
    return null;
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
    router.push("/onboarding");
    return null;
  }

  const score = latestScan?.visibility_score ?? 0;
  const results = latestScan?.results ?? [];
  const competitorNames = competitors.map((c) => c.name);
  const insight = buildDashboardInsight(results);

  const ease = [0.16, 1, 0.3, 1] as const;
  const reveal = {
    initial: { opacity: 0, y: 28, filter: "blur(4px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.65, ease },
  } as const;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-10 min-w-0">
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

        {/* 2: AI Overview — data-derived summary of strongest engine */}
        {insight && (
          <motion.div {...reveal}>
            <AIOverview text={insight} size="md" />
          </motion.div>
        )}

        {/* 3: AI Model Breakdown */}
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

        {/* Right rail — sticks while the main column scrolls */}
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <WhatsNextCard />
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
