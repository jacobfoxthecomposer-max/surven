"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { ScanResult } from "@/types/database";

interface GapItem {
  prompt: string;
  competitor: string;
  models: string[];
}

interface AdvantageItem {
  prompt: string;
  competitor: string;
  models: string[];
}

interface CompetitorGapsProps {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
}

const MODEL_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

export function CompetitorGaps({
  results,
  businessName,
  competitors,
}: CompetitorGapsProps) {
  const { gaps, advantages } = useMemo(() => {
    const gapMap = new Map<string, GapItem>();
    const advantageMap = new Map<string, AdvantageItem>();

    for (const r of results) {
      if (!r.competitor_mentions) continue;

      for (const competitor of competitors) {
        const competitorMentioned = r.competitor_mentions[competitor] === true;
        const clientMentioned = r.business_mentioned;

        const key = `${competitor}||${r.prompt_text}`;

        if (competitorMentioned && !clientMentioned) {
          const existing = gapMap.get(key);
          if (existing) {
            if (!existing.models.includes(MODEL_LABELS[r.model_name] ?? r.model_name)) {
              existing.models.push(MODEL_LABELS[r.model_name] ?? r.model_name);
            }
          } else {
            gapMap.set(key, {
              prompt: r.prompt_text,
              competitor,
              models: [MODEL_LABELS[r.model_name] ?? r.model_name],
            });
          }
        }

        if (clientMentioned && !competitorMentioned) {
          const existing = advantageMap.get(key);
          if (existing) {
            if (!existing.models.includes(MODEL_LABELS[r.model_name] ?? r.model_name)) {
              existing.models.push(MODEL_LABELS[r.model_name] ?? r.model_name);
            }
          } else {
            advantageMap.set(key, {
              prompt: r.prompt_text,
              competitor,
              models: [MODEL_LABELS[r.model_name] ?? r.model_name],
            });
          }
        }
      }
    }

    return {
      gaps: Array.from(gapMap.values()).slice(0, 10),
      advantages: Array.from(advantageMap.values()).slice(0, 10),
    };
  }, [results, competitors]);

  if (gaps.length === 0 && advantages.length === 0) return null;

  return (
    <section id="gaps-section">
      <h2 className="text-lg font-semibold mb-1">Competitive Gaps & Advantages</h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Prompts where competitors outrank you (gaps) or where you outrank them (advantages).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gaps */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">
              Gaps ({gaps.length})
            </h3>
          </div>
          {gaps.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">No gaps found — you're keeping up.</p>
          ) : (
            <div className="space-y-3">
              {gaps.map((gap, i) => (
                <motion.div
                  key={`${gap.competitor}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-3 rounded-lg bg-red-500/5 border border-red-500/15"
                >
                  <p className="text-xs font-medium text-[var(--color-fg)] mb-1 leading-snug">
                    "{gap.prompt}"
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-red-400 font-medium">
                      {gap.competitor} ranks here
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {gap.models.map((m) => (
                        <span
                          key={m}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Advantages */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400">
              Advantages ({advantages.length})
            </h3>
          </div>
          {advantages.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">No advantages yet — keep building visibility.</p>
          ) : (
            <div className="space-y-3">
              {advantages.map((adv, i) => (
                <motion.div
                  key={`${adv.competitor}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15"
                >
                  <p className="text-xs font-medium text-[var(--color-fg)] mb-1 leading-snug">
                    "{adv.prompt}"
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-emerald-400 font-medium">
                      You rank, {adv.competitor} doesn't
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {adv.models.map((m) => (
                        <span
                          key={m}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
