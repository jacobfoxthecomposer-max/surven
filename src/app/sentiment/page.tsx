"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { useSentimentHistory } from "@/features/sentiment/hooks/useSentimentHistory";
import { SentimentInsights } from "@/features/sentiment/components/SentimentInsights";
import { SentimentDonut } from "@/features/sentiment/components/SentimentDonut";
import { SentimentByPlatform } from "@/features/sentiment/components/SentimentByPlatform";
import { SentimentDrivers } from "@/features/sentiment/components/SentimentDrivers";
import { SentimentOverTime } from "@/features/sentiment/components/SentimentOverTime";
import { WhatAISaid } from "@/features/sentiment/components/WhatAISaid";
import { SentimentByFeature } from "@/features/sentiment/components/SentimentByFeature";

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease },
} as const;

export default function SentimentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { business, competitors, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, competitors);
  const { data: sentimentHistory = [], isLoading: historyLoading } = useSentimentHistory(business?.id);

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
  const competitorNames = competitors.map((c) => c.name);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h1 className="text-2xl font-semibold text-[var(--color-fg)]">Brand Sentiment</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1">
            How AI models perceive and describe {business.name} across platforms.
          </p>
        </motion.div>

        {scanLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : results.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="text-center py-20"
          >
            <p className="text-lg text-[var(--color-fg-secondary)]">No scan data yet</p>
            <p className="text-sm text-[var(--color-fg-muted)] mt-2">
              Run a scan from the Dashboard to see brand sentiment analysis.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Insight cards */}
            <motion.div {...reveal}>
              <SentimentInsights results={results} />
            </motion.div>

            {/* Donut + Platform breakdown */}
            <motion.div {...reveal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <SentimentDonut results={results} />
              </div>
              <div className="md:col-span-2">
                <SentimentByPlatform results={results} />
              </div>
            </motion.div>

            {/* Sentiment over time */}
            <motion.div {...reveal}>
              <SentimentOverTime data={sentimentHistory} isLoading={historyLoading} />
            </motion.div>

            {/* Sentiment + Mentions by Feature (prompt) */}
            <motion.div {...reveal}>
              <SentimentByFeature results={results} businessName={business.name} competitors={competitorNames} />
            </motion.div>

            {/* Strength / improvement drivers */}
            <motion.div {...reveal}>
              <SentimentDrivers results={results} businessName={business.name} />
            </motion.div>

            {/* What AI actually said */}
            <motion.div {...reveal}>
              <WhatAISaid results={results} businessName={business.name} />
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
