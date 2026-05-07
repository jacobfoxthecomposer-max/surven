"use client";

/**
 * Per-prompt results card — the questions we tested for the user.
 * Heading inside card with bottom-border separator.
 *
 * Linda's ask: "I want to know the actual question a real person typed."
 * This card surfaces those questions with each AI's answer behind a click.
 */

import { useMemo } from "react";
import Link from "next/link";
import { ListChecks, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { PromptResultItem } from "@/components/organisms/PromptResultItem";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult } from "@/types/database";

interface PromptResultsSectionProps {
  results: ScanResult[];
  businessName: string;
}

export function PromptResultsSection({
  results,
  businessName,
}: PromptResultsSectionProps) {
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
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <SectionHeading
            text="Questions we tested for you"
            info="The exact questions we asked each AI tool. Click a row to see how each one answered."
          />
        </div>
        <Link
          href="/prompts"
          className="inline-flex items-center gap-1 font-semibold opacity-70 hover:opacity-100 hover:gap-1.5 transition-all shrink-0"
          style={{ fontSize: 11.5, color: SURVEN_SEMANTIC.good }}
        >
          Manage tracked prompts
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

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
    </div>
  );
}
