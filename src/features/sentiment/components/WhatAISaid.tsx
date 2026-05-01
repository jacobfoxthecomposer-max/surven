"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { AIOverview } from "@/components/atoms/AIOverview";
import { cn } from "@/utils/cn";
import type { ScanResult, ModelName } from "@/types/database";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

const SENTIMENT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: "bg-[#96A283]/15", text: "text-[#566A47]", label: "Positive" },
  neutral:  { bg: "bg-[var(--color-surface-alt)]", text: "text-[var(--color-fg-muted)]", label: "Neutral" },
  negative: { bg: "bg-[#B54631]/10", text: "text-[#8C3522]", label: "Negative" },
};

const MODEL_COLOR: Record<ModelName, string> = {
  chatgpt:  "#10a37f",
  claude:   "#cc785c",
  gemini:   "#4285f4",
  google_ai: "#fbbc05",
};

interface Props {
  results: ScanResult[];
  businessName: string;
}

export function WhatAISaid({ results, businessName }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mentioned = results.filter((r) => r.business_mentioned && r.response_text);

  if (mentioned.length === 0) return null;

  const negativeCount = mentioned.filter((r) => r.sentiment === "negative").length;
  const positiveCount = mentioned.filter((r) => r.sentiment === "positive").length;
  const insight = negativeCount > 0
    ? `${negativeCount} of ${mentioned.length} mention${mentioned.length !== 1 ? "s" : ""} contain negative language — expand those rows to see exactly what AI said.`
    : `All ${mentioned.length} mention${mentioned.length !== 1 ? "s" : ""} are positive or neutral. Expand any row to read the full AI response.`;

  return (
    <Card>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)", marginBottom: 4 }}>What AI Said About You</h3>
      <p className="text-xs text-[var(--color-fg-muted)] mb-3">
        Actual responses from AI models that mentioned {businessName}.
      </p>
      <div className="mb-4"><AIOverview text={insight} size="sm" /></div>

      <div className="space-y-2">
        {mentioned.map((r, i) => {
          const id = `${r.scan_id}-${i}`;
          const isOpen = expandedId === id;
          const badge = r.sentiment ? SENTIMENT_BADGE[r.sentiment] : SENTIMENT_BADGE.neutral;

          return (
            <div
              key={id}
              className="border border-[var(--color-border)] rounded-lg overflow-hidden"
            >
              {/* Header row */}
              <button
                onClick={() => setExpandedId(isOpen ? null : id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium shrink-0"
                    style={{ color: MODEL_COLOR[r.model_name] }}
                  >
                    <EngineIcon id={r.model_name} size={12} />
                    {MODEL_LABELS[r.model_name]}
                  </span>
                  <span className="text-sm text-[var(--color-fg)] truncate">{r.prompt_text}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.sentiment && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {/* Expanded response text */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                  <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed whitespace-pre-wrap">
                    {r.response_text}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
