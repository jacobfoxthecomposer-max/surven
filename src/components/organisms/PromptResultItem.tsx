"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, X } from "lucide-react";

const SENTIMENT_STYLES = {
  positive: "bg-emerald-500/15 text-emerald-400",
  neutral:  "bg-slate-500/15 text-slate-400",
  negative: "bg-red-500/15 text-red-400",
} as const;
import { cn } from "@/utils/cn";
import type { ScanResult, ModelName } from "@/types/database";

const MODEL_ORDER: ModelName[] = ["chatgpt", "claude", "gemini", "google_search"];
const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  google_search: "Google",
};

interface PromptResultItemProps {
  promptText: string;
  results: ScanResult[];
  businessName: string;
  index?: number;
}

export function PromptResultItem({
  promptText,
  results,
  businessName,
  index = 0,
}: PromptResultItemProps) {
  const [expanded, setExpanded] = useState(false);

  const resultsByModel = new Map<ModelName, ScanResult>();
  for (const r of results) {
    resultsByModel.set(r.model_name, r);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer",
          "hover:bg-[var(--color-surface-alt)] transition-colors duration-[var(--duration-micro)]"
        )}
        aria-expanded={expanded}
      >
        <span className="flex-1 text-sm text-[var(--color-fg)]">{promptText}</span>

        {/* Model indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {MODEL_ORDER.map((model) => {
            const result = resultsByModel.get(model);
            const mentioned = result?.business_mentioned ?? false;
            return (
              <div
                key={model}
                className="flex items-center gap-1"
                title={`${MODEL_LABELS[model]}: ${mentioned ? "Mentioned" : "Not found"}`}
              >
                <span className="text-xs text-[var(--color-fg-muted)]">
                  {MODEL_LABELS[model]}
                </span>
                {mentioned ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <X className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>
            );
          })}
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)]">
              {MODEL_ORDER.map((model) => {
                const result = resultsByModel.get(model);
                if (!result) return null;
                return (
                  <div key={model} className="pt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-[var(--color-fg-secondary)]">
                        {MODEL_LABELS[model]}
                      </span>
                      {result.business_mentioned ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-red-400" />
                      )}
                      {result.business_mentioned && result.sentiment && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                          SENTIMENT_STYLES[result.sentiment]
                        )}>
                          {result.sentiment}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed whitespace-pre-line">
                      {highlightBusiness(result.response_text, businessName)}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function highlightBusiness(text: string, businessName: string): React.ReactNode {
  if (!businessName) return text;

  const parts = text.split(new RegExp(`(${escapeRegex(businessName)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === businessName.toLowerCase() ? (
      <span
        key={i}
        className="bg-emerald-500/20 text-emerald-300 px-1 rounded font-medium"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
