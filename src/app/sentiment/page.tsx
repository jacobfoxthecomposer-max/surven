"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { Calendar } from "lucide-react";
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
import { AI_MODELS } from "@/utils/constants";

type TimeRange = "14d" | "30d" | "90d" | "ytd" | "all";
const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease },
} as const;

export default function SentimentPage() {
  const router = useRouter();

  // Filter state — must be before early returns
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    () => new Set(AI_MODELS.map((m) => m.id))
  );

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

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one selected
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allResults = latestScan?.results ?? [];

  // Apply model filter
  const results = selectedModels.size === AI_MODELS.length
    ? allResults
    : allResults.filter((r) => selectedModels.has(r.model_name));

  // Apply time range filter to history
  const now = new Date();
  const filteredHistory = (() => {
    if (timeRange === "14d") return sentimentHistory.slice(-14);
    if (timeRange === "30d") return sentimentHistory.slice(-30);
    if (timeRange === "90d") return sentimentHistory.slice(-90);
    if (timeRange === "ytd") {
      const jan1 = new Date(now.getFullYear(), 0, 1).toISOString();
      return sentimentHistory.filter((d) => d.date >= jan1);
    }
    return sentimentHistory;
  })();

  const competitorNames = competitors.map((c) => c.name);

  // Derive dominant sentiment for headline
  const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const r of mentioned) {
    if (r.sentiment) sentimentCounts[r.sentiment as keyof typeof sentimentCounts]++;
  }
  const dominant = mentioned.length > 0
    ? (Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0][0] as "positive" | "neutral" | "negative")
    : null;
  const sentimentWord  = dominant === "positive" ? "Positive" : dominant === "negative" ? "Negative" : "Neutral";
  const sentimentColor = dominant === "positive" ? "#7D8E6C" : dominant === "negative" ? "#B54631" : "#A09890";

  return (
    <DashboardLayout>
      <div className="space-y-5 w-full">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 4vw, 52px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--color-fg)",
            }}
          >
            Your brand sentiment is{" "}
            {dominant ? (
              <span style={{ color: sentimentColor, fontStyle: "italic" }}>{sentimentWord}</span>
            ) : (
              <span style={{ color: "var(--color-fg-muted)", fontStyle: "italic" }}>unknown</span>
            )}
            .
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1.5">
            How AI models perceive and describe {business.name} across platforms.
          </p>
        </motion.div>

        {/* ── Global filter bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease }}
          className="flex flex-wrap items-center gap-2 pb-4 border-b border-[var(--color-border)]"
        >
          {/* Time range pills */}
          <div className="flex items-center gap-1">
            {TIME_RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: timeRange === key ? "var(--color-fg)" : "var(--color-surface-alt)",
                  color:      timeRange === key ? "var(--color-bg)" : "var(--color-fg-muted)",
                }}
              >
                {label}
              </button>
            ))}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ml-0.5 transition-colors"
              style={{ background: "var(--color-surface-alt)", color: "var(--color-fg-muted)" }}
              title="Custom date range (coming soon)"
            >
              <Calendar className="h-3 w-3" />
              Custom
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--color-border)]" />

          {/* AI engine toggles — all same sage green when active */}
          <span className="text-xs text-[var(--color-fg-muted)] shrink-0">AI engines:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {AI_MODELS.map((m) => {
              const active = selectedModels.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? "var(--color-primary)" : "var(--color-surface-alt)",
                    color:      active ? "white" : "var(--color-fg-muted)",
                  }}
                >
                  <EngineIcon id={m.id} size={12} />
                  {m.name}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Content ── */}
        {scanLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        ) : allResults.length === 0 ? (
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
            <motion.div {...reveal}>
              <SentimentInsights results={results} sentimentHistory={filteredHistory} />
            </motion.div>

            <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SentimentDonut results={results} />
              <SentimentByPlatform results={results} />
            </motion.div>

            <motion.div {...reveal}>
              <SentimentOverTime data={filteredHistory} isLoading={historyLoading} />
            </motion.div>

            <motion.div {...reveal}>
              <SentimentByFeature results={results} businessName={business.name} competitors={competitorNames} />
            </motion.div>

            <motion.div {...reveal}>
              <SentimentDrivers results={results} businessName={business.name} />
            </motion.div>

            <motion.div {...reveal}>
              <WhatAISaid results={results} businessName={business.name} />
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
