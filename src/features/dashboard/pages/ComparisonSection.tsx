"use client";

import { useMemo } from "react";
import { Card } from "@/components/atoms/Card";
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

  if (competitors.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Competitor Comparison</h2>
      <Card>
        <ComparisonChart
          businessName={businessName}
          businessScore={businessScore}
          competitors={competitorScores}
        />
      </Card>
    </section>
  );
}
