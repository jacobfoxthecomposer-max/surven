"use client";

/**
 * Visibility-vs-competitors comparison card. Heading inside card with the
 * canonical sage gradient banner. Drops the prior 4-block ChartExplainer
 * (wall-of-text Linda hates) and replaces it with a single data-derived
 * AIOverview line that names the leading competitor.
 */

import { useMemo } from "react";
import { BarChart3, Info } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { AIOverview } from "@/components/atoms/AIOverview";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ComparisonChart } from "@/components/organisms/ComparisonChart";
import type { ScanResult, CompetitorScore } from "@/types/database";

interface ComparisonSectionProps {
  results: ScanResult[];
  businessScore: number;
  businessName: string;
  competitors: string[];
}

export function ComparisonSection({
  results,
  businessScore,
  businessName,
  competitors,
}: ComparisonSectionProps) {
  const competitorScores = useMemo<CompetitorScore[]>(() => {
    return competitors.map((name) => {
      let mentioned = 0;
      let total = 0;

      for (const r of results) {
        if (r.competitor_mentions && name in r.competitor_mentions) {
          total++;
          if (r.competitor_mentions[name]) mentioned++;
        }
      }

      const score = total > 0 ? Math.round((mentioned / total) * 100) : 0;
      return { name, score, mentionedCount: mentioned, totalPrompts: total };
    });
  }, [results, competitors]);

  const insight = useMemo(() => {
    if (competitorScores.length === 0) return null;
    const ranked = [
      { name: businessName, score: businessScore, isYou: true },
      ...competitorScores.map((c) => ({ name: c.name, score: c.score, isYou: false })),
    ].sort((a, b) => b.score - a.score);
    const yourRank = ranked.findIndex((r) => r.isYou) + 1;
    const top = ranked[0];
    if (top.isYou) {
      return `You lead the field at ${top.score}% — defend the gap before competitors close in.`;
    }
    return `${top.name} leads at ${top.score}%; you sit at #${yourRank} of ${ranked.length} with ${businessScore}%.`;
  }, [businessName, businessScore, competitorScores]);

  if (competitors.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div
        className="-mx-5 -mt-5 px-5 py-4 mb-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#96A283]/20 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-[#566A47]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">
            How you rank against competitors
          </h3>
          <HoverHint hint="Your AI visibility next to each named competitor's. Sage bar = you. Higher = mentioned more often by AI tools.">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>
      </div>

      {insight && (
        <div className="mb-4">
          <AIOverview text={insight} size="sm" />
        </div>
      )}

      <ComparisonChart
        businessName={businessName}
        businessScore={businessScore}
        competitors={competitorScores}
      />
    </Card>
  );
}
