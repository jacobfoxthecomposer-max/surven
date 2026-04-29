"use client";

import { useMemo } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import type { ScanResult, ModelName } from "@/types/database";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface Props {
  results: ScanResult[];
  businessName: string;
}

export function SentimentDrivers({ results, businessName }: Props) {
  const { strengths, improvements } = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned);

    // Group positive mentions by prompt — top drivers of good sentiment
    const positiveByPrompt: Record<string, { prompt: string; models: ModelName[] }> = {};
    for (const r of mentioned.filter((r) => r.sentiment === "positive")) {
      if (!positiveByPrompt[r.prompt_text]) {
        positiveByPrompt[r.prompt_text] = { prompt: r.prompt_text, models: [] };
      }
      if (!positiveByPrompt[r.prompt_text].models.includes(r.model_name)) {
        positiveByPrompt[r.prompt_text].models.push(r.model_name);
      }
    }

    // Group negative/neutral mentions by prompt
    const negByPrompt: Record<string, { prompt: string; models: ModelName[] }> = {};
    for (const r of mentioned.filter((r) => r.sentiment === "negative")) {
      if (!negByPrompt[r.prompt_text]) {
        negByPrompt[r.prompt_text] = { prompt: r.prompt_text, models: [] };
      }
      if (!negByPrompt[r.prompt_text].models.includes(r.model_name)) {
        negByPrompt[r.prompt_text].models.push(r.model_name);
      }
    }

    // Prompts where business is NOT mentioned — signals gap
    const notMentioned = results.filter((r) => !r.business_mentioned);
    const gapByPrompt: Record<string, Set<ModelName>> = {};
    for (const r of notMentioned) {
      if (!gapByPrompt[r.prompt_text]) gapByPrompt[r.prompt_text] = new Set();
      gapByPrompt[r.prompt_text].add(r.model_name);
    }

    const strengths = Object.values(positiveByPrompt)
      .sort((a, b) => b.models.length - a.models.length)
      .slice(0, 5)
      .map((s) => ({
        text: s.prompt,
        detail: `${businessName} mentioned positively on ${s.models.map((m) => MODEL_LABELS[m]).join(", ")}`,
        strength: s.models.length,
      }));

    const improvements: Array<{ text: string; detail: string; type: "negative" | "gap" }> = [
      ...Object.values(negByPrompt).slice(0, 3).map((n) => ({
        text: n.prompt,
        detail: `Negative sentiment on ${n.models.map((m) => MODEL_LABELS[m]).join(", ")}`,
        type: "negative" as const,
      })),
      ...Object.entries(gapByPrompt)
        .sort(([, a], [, b]) => b.size - a.size)
        .slice(0, 3)
        .map(([prompt, models]) => ({
          text: prompt,
          detail: `Not mentioned on ${Array.from(models).map((m) => MODEL_LABELS[m]).join(", ")}`,
          type: "gap" as const,
        })),
    ].slice(0, 5);

    return { strengths, improvements };
  }, [results, businessName]);

  if (strengths.length === 0 && improvements.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-[#96A283]/15 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-[#566A47]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Brand Strengths</h3>
        </div>
        {strengths.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">Run a scan to see strength signals.</p>
        ) : (
          <div className="space-y-3">
            {strengths.map((s, i) => (
              <div key={i} className="bg-[#96A283]/10 rounded-lg px-3 py-2.5">
                <p className="text-sm text-[var(--color-fg)] leading-snug line-clamp-2">{s.text}</p>
                <p className="text-xs text-[#566A47] mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Improvements */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-[#B54631]/10 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-[#8C3522]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Areas for Improvement</h3>
        </div>
        {improvements.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">No risk signals found. Sentiment looks clean.</p>
        ) : (
          <div className="space-y-3">
            {improvements.map((item, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2.5 ${
                  item.type === "negative" ? "bg-[#B54631]/10" : "bg-[var(--color-surface-alt)]"
                }`}
              >
                <p className="text-sm text-[var(--color-fg)] leading-snug line-clamp-2">{item.text}</p>
                <p className={`text-xs mt-1 ${item.type === "negative" ? "text-[#8C3522]" : "text-[var(--color-fg-muted)]"}`}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
