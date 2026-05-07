"use client";

import { useMemo } from "react";
import { HelpCircle, BarChart3 } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
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
      <Card className="overflow-hidden">
        <div
          className="-mx-5 -mt-5 px-5 py-4 mb-5"
          style={{ background: "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#96A283]/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-[#566A47]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">Visibility Score by Platform</h3>
            <HoverHint hint="Your AI visibility score next to each competitor's. Aim to lead the field — being mentioned more often than rivals signals authority to AI engines.">
              <HelpCircle className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
            </HoverHint>
          </div>
        </div>
        <ComparisonChart
          businessName={businessName}
          businessScore={businessScore}
          competitors={competitorScores}
        />

        <ChartExplainer
          blocks={[
            {
              label: "Bars",
              body: "One bar per business — yours plus every competitor you've added. Bars are sorted highest to lowest visibility.",
            },
            {
              label: "Bar length",
              body: "Visibility score from 0 to 100 — the share of all prompts where the business was mentioned. Higher means AI engines surface them more often.",
            },
            {
              label: "Colors",
              body: "Sage = your business. Other bars use the categorical palette so each competitor reads as a separate bucket — those colors don't indicate good or bad.",
            },
            {
              label: "Mention count",
              body: "Score is built from mentioned-prompts ÷ total-prompts per business. A competitor with very few prompts in their column gives a less reliable score.",
            },
          ]}
        />
      </Card>
    </section>
  );
}
