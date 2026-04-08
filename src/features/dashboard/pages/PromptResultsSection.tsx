"use client";

import { useMemo } from "react";
import { PromptResultItem } from "@/components/organisms/PromptResultItem";
import type { ScanResult } from "@/types/database";

interface PromptResultsSectionProps {
  results: ScanResult[];
  businessName: string;
}

export function PromptResultsSection({ results, businessName }: PromptResultsSectionProps) {
  // Group results by prompt text
  const groupedByPrompt = useMemo(() => {
    const map = new Map<string, ScanResult[]>();
    for (const r of results) {
      const existing = map.get(r.prompt_text) ?? [];
      existing.push(r);
      map.set(r.prompt_text, existing);
    }
    return Array.from(map.entries());
  }, [results]);

  if (groupedByPrompt.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Prompt Results</h2>
      <div className="space-y-2">
        {groupedByPrompt.map(([prompt, promptResults], i) => (
          <PromptResultItem
            key={prompt}
            promptText={prompt}
            results={promptResults}
            businessName={businessName}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
