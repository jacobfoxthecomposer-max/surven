"use client";

import { useMemo } from "react";
import { ModelBreakdownCard } from "@/components/organisms/ModelBreakdownCard";
import type { ScanResult, ModelName, ModelBreakdown } from "@/types/database";

const MODELS: ModelName[] = ["chatgpt", "claude", "gemini", "google_search"];

interface ModelBreakdownSectionProps {
  results: ScanResult[];
}

export function ModelBreakdownSection({ results }: ModelBreakdownSectionProps) {
  const breakdowns = useMemo<ModelBreakdown[]>(() => {
    return MODELS.map((model) => {
      const modelResults = results.filter((r) => r.model_name === model);
      const mentioned = modelResults.filter((r) => r.business_mentioned).length;
      return { model, mentioned, total: modelResults.length };
    });
  }, [results]);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">AI Model Breakdown</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {breakdowns.map((b, i) => (
          <ModelBreakdownCard
            key={b.model}
            model={b.model}
            mentioned={b.mentioned}
            total={b.total}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
