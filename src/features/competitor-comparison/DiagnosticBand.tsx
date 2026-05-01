"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

// Engine traffic weights (ChatGPT dominates AI traffic)
const ENGINE_WEIGHTS: Record<string, number> = {
  chatgpt: 0.50,
  gemini: 0.20,
  google_ai: 0.20,
  claude: 0.10,
};

interface DiagnosticBandProps {
  businessName: string;
  results: ScanResult[];
  competitors: string[];
}

interface EngineGap {
  engineId: string;
  engineName: string;
  yourScore: number;
  worstCompetitor: string;
  compScore: number;
  gap: number;
  weightedGap: number;
}

interface EngineAdvantage {
  engineId: string;
  engineName: string;
  yourScore: number;
  bestCompetitor: string;
  compScore: number;
  margin: number;
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

function calcEntityScore(
  results: ScanResult[],
  model: string,
  competitor?: string,
): number {
  const modelResults = results.filter((r) => r.model_name === model);
  if (modelResults.length === 0) return 0;
  if (!competitor) {
    return Math.round(
      (modelResults.filter((r) => r.business_mentioned).length /
        modelResults.length) *
        100,
    );
  }
  const relevant = modelResults.filter(
    (r) => r.competitor_mentions && competitor in r.competitor_mentions,
  );
  if (relevant.length === 0) return 0;
  return Math.round(
    (relevant.filter((r) => r.competitor_mentions[competitor]).length /
      relevant.length) *
      100,
  );
}

function computeDiagnostics(
  results: ScanResult[],
  competitors: string[],
): { gaps: EngineGap[]; advantages: EngineAdvantage[] } {
  const engineIds = Object.keys(ENGINE_WEIGHTS);
  const gaps: EngineGap[] = [];
  const advantages: EngineAdvantage[] = [];

  for (const engineId of engineIds) {
    const yourScore = calcEntityScore(results, engineId);

    // Find the competitor that beats you most on this engine
    let worstComp = "";
    let worstCompScore = 0;
    for (const comp of competitors) {
      const cs = calcEntityScore(results, engineId, comp);
      if (cs > worstCompScore) {
        worstCompScore = cs;
        worstComp = comp;
      }
    }

    const rawGap = worstCompScore - yourScore;
    if (rawGap > 0 && worstComp) {
      gaps.push({
        engineId,
        engineName: ENGINE_LABELS[engineId] ?? engineId,
        yourScore,
        worstCompetitor: worstComp,
        compScore: worstCompScore,
        gap: rawGap,
        weightedGap: rawGap * (ENGINE_WEIGHTS[engineId] ?? 0.1),
      });
    }

    // Find where you have your biggest margin over all competitors
    const allCompScores = competitors.map((c) =>
      calcEntityScore(results, engineId, c),
    );
    const avgCompScore =
      allCompScores.length > 0
        ? Math.round(
            allCompScores.reduce((a, b) => a + b, 0) / allCompScores.length,
          )
        : 0;

    const margin = yourScore - avgCompScore;
    if (margin > 0) {
      // Find the competitor you beat by the most
      let bestComp = competitors[0] ?? "";
      let bestCompScore = 0;
      for (const comp of competitors) {
        const cs = calcEntityScore(results, engineId, comp);
        if (cs > bestCompScore) {
          bestCompScore = cs;
          bestComp = comp;
        }
      }
      advantages.push({
        engineId,
        engineName: ENGINE_LABELS[engineId] ?? engineId,
        yourScore,
        bestCompetitor: bestComp,
        compScore: avgCompScore,
        margin,
      });
    }
  }

  gaps.sort((a, b) => b.weightedGap - a.weightedGap);
  advantages.sort((a, b) => b.margin - a.margin);

  return { gaps, advantages };
}

export function DiagnosticBand({
  businessName,
  results,
  competitors,
}: DiagnosticBandProps) {
  if (results.length === 0 || competitors.length === 0) return null;

  const { gaps, advantages } = computeDiagnostics(results, competitors);
  const topGap = gaps[0] ?? null;
  const topAdvantage = advantages[0] ?? null;

  if (!topGap && !topAdvantage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.15 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* What to watch */}
      {topGap && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 space-y-3"
          style={{
            borderColor: `${SURVEN_SEMANTIC.bad}40`,
            backgroundColor: `${SURVEN_SEMANTIC.bad}08`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.bad}20` }}
            >
              <AlertTriangle
                className="h-3.5 w-3.5"
                style={{ color: SURVEN_SEMANTIC.bad }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              What to watch
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--color-fg)] leading-snug">
            <span className="font-semibold">{topGap.worstCompetitor}</span>{" "}
            appears{" "}
            <span
              className="font-semibold"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              {topGap.gap}% more often
            </span>{" "}
            than you on{" "}
            <span className="inline-flex items-center gap-1 font-semibold">
              <EngineIcon id={topGap.engineId} size={12} />
              {topGap.engineName}
            </span>
            {" "}— your highest-traffic engine.
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              You: {topGap.yourScore}% · {topGap.worstCompetitor}:{" "}
              {topGap.compScore}%
            </p>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              Fix with GEO Audit
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* What's working */}
      {topAdvantage && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 space-y-3"
          style={{
            borderColor: `${SURVEN_SEMANTIC.good}40`,
            backgroundColor: `${SURVEN_SEMANTIC.good}08`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.good}20` }}
            >
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: SURVEN_SEMANTIC.good }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              What&apos;s working
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--color-fg)] leading-snug">
            <span className="font-semibold">{businessName}</span> outpaces
            competitors by{" "}
            <span
              className="font-semibold"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              +{topAdvantage.margin}%
            </span>{" "}
            on{" "}
            <span className="inline-flex items-center gap-1 font-semibold">
              <EngineIcon id={topAdvantage.engineId} size={12} />
              {topAdvantage.engineName}
            </span>
            . Keep building citations here.
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              You: {topAdvantage.yourScore}% · Competitor avg:{" "}
              {topAdvantage.compScore}%
            </p>
            <Link
              href="/citation-insights"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              Citation Insights
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
