"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BrandChip, buildCompetitorDef } from "@/components/atoms/BrandChip";
import type { ScanResult, ModelName } from "@/types/database";

const YOU_DEF = { id: "you", label: "You", color: "#96A283" };

const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Goog",
};

interface CompetitorBenchmarkSectionProps {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
  businessScore: number;
}

interface ModelHeadToHead {
  model: ModelName;
  yourScore: number;
  theirScore: number;
  delta: number;
}

interface CompetitorBenchmark {
  name: string;
  yourOverall: number;
  theirOverall: number;
  delta: number;
  perModel: ModelHeadToHead[];
}

function calcScore(results: ScanResult[], key: "business_mentioned" | string, competitor?: string): number {
  const relevant = results.filter((r) =>
    competitor ? (r.competitor_mentions && competitor in r.competitor_mentions) : true
  );
  if (relevant.length === 0) return 0;
  const hits = relevant.filter((r) =>
    competitor ? r.competitor_mentions[competitor] : r.business_mentioned
  ).length;
  return Math.round((hits / relevant.length) * 100);
}

function calcModelScore(results: ScanResult[], model: ModelName, competitor?: string): number {
  const modelResults = results.filter((r) => r.model_name === model);
  return calcScore(modelResults, competitor ? competitor : "business_mentioned", competitor);
}

export function CompetitorBenchmarkSection({
  results,
  businessName,
  competitors,
  businessScore,
}: CompetitorBenchmarkSectionProps) {
  const benchmarks = useMemo<CompetitorBenchmark[]>(() => {
    return competitors.map((name) => {
      const theirOverall = calcScore(results, name, name);
      const delta = businessScore - theirOverall;

      const perModel: ModelHeadToHead[] = MODELS.map((model) => {
        const yourScore = calcModelScore(results, model);
        const theirScore = calcModelScore(results, model, name);
        return { model, yourScore, theirScore, delta: yourScore - theirScore };
      });

      return { name, yourOverall: businessScore, theirOverall, delta, perModel };
    });
  }, [results, competitors, businessScore]);

  if (competitors.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">Competitor Benchmarking</h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Head-to-head visibility vs each competitor, broken down by AI model.
      </p>
      <div className="space-y-4">
        {benchmarks.map((bench, i) => (
          <motion.div
            key={bench.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card>
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-fg-muted)]">vs</span>
                  <BrandChip brand={buildCompetitorDef(bench.name, i)} />
                </div>
                <OverallDeltaBadge delta={bench.delta} yourScore={bench.yourOverall} theirScore={bench.theirOverall} />
              </div>

              {/* Per-model rows */}
              <div className="space-y-3">
                {bench.perModel.map((m) => (
                  <div key={m.model} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-fg-muted)]">{MODEL_LABELS[m.model]}</span>
                      <DeltaLabel delta={m.delta} />
                    </div>
                    <DualBar
                      yourScore={m.yourScore}
                      theirScore={m.theirScore}
                      competitorIndex={i}
                      competitorName={bench.name}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function OverallDeltaBadge({
  delta,
  yourScore,
  theirScore,
}: {
  delta: number;
  yourScore: number;
  theirScore: number;
}) {
  const winning = delta > 0;
  const tied = delta === 0;
  return (
    <div className={`flex flex-col items-end gap-0.5`}>
      <div className={`flex items-center gap-1 text-sm font-semibold ${
        tied ? "text-[var(--color-fg-muted)]" : winning ? "text-[#7D8E6C]" : "text-[#B54631]"
      }`}>
        {tied ? <Minus className="h-4 w-4" /> : winning ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {tied ? "Tied" : `${winning ? "+" : ""}${delta}%`}
      </div>
      <p className="text-xs text-[var(--color-fg-muted)]">{yourScore}% vs {theirScore}%</p>
    </div>
  );
}

function DeltaLabel({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[var(--color-fg-muted)]">Tied</span>;
  const winning = delta > 0;
  return (
    <span className={winning ? "text-[#7D8E6C]" : "text-[#B54631]"}>
      {winning ? "+" : ""}{delta}%
    </span>
  );
}

function DualBar({
  yourScore,
  theirScore,
  competitorIndex,
  competitorName,
}: {
  yourScore: number;
  theirScore: number;
  competitorIndex: number;
  competitorName: string;
}) {
  const compDef = buildCompetitorDef(competitorName, competitorIndex);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-24 shrink-0">
          <BrandChip brand={YOU_DEF} size="sm" isYou />
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)]">
          <motion.div
            className="h-1.5 rounded-full"
            style={{ backgroundColor: YOU_DEF.color }}
            initial={{ width: 0 }}
            animate={{ width: `${yourScore}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-[10px] text-[var(--color-fg-muted)] w-8 text-right shrink-0">{yourScore}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 shrink-0">
          <BrandChip brand={compDef} size="sm" />
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)]">
          <motion.div
            className="h-1.5 rounded-full"
            style={{ backgroundColor: compDef.color }}
            initial={{ width: 0 }}
            animate={{ width: `${theirScore}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-[10px] text-[var(--color-fg-muted)] w-8 text-right shrink-0">{theirScore}%</span>
      </div>
    </div>
  );
}
