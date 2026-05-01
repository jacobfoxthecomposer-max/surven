"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
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
  const { gaps, advantages, gapInsight } = useMemo(() => {
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

    const gapsList = Array.from(gapMap.values()).slice(0, 10);
    const uniqueCompetitors = [...new Set(gapsList.map((g) => g.competitor))];
    const allGapModels = [...new Set(gapsList.flatMap((g) => g.models))];

    return {
      gaps: gapsList,
      advantages: Array.from(advantageMap.values()).slice(0, 10),
      gapInsight: { uniqueCompetitors, allGapModels },
    };
  }, [results, competitors]);

  if (gaps.length === 0 && advantages.length === 0) return null;

  return (
    <section id="gaps-section">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gaps */}
        <Card className="overflow-hidden">
          <div
            className="-mx-5 -mt-5 px-5 py-4 mb-5"
            style={{ background: "linear-gradient(135deg, rgba(181,70,49,0.10), rgba(181,70,49,0.02))" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#8C3522]/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-[#8C3522]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">Gaps ({gaps.length})</h3>
              <HoverHint hint="Prompts where competitors appear but you don't. Focus here to improve.">
                <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
              </HoverHint>
            </div>
          </div>
          {gaps.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">No gaps found — you're keeping up.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {gaps.map((gap, i) => (
                <motion.div
                  key={`${gap.competitor}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-3 rounded-lg bg-[#B54631]/5 border border-[#B54631]/20"
                >
                  <p className="text-xs font-medium text-[var(--color-fg)] mb-1 leading-snug">
                    "{gap.prompt}"
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-[#8C3522] font-medium">
                      {gap.competitor} ranks here
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {gap.models.map((m) => (
                        <span
                          key={m}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[#B54631]/10 text-[#8C3522] font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Action insight — fills remaining space */}
              <div className="mt-auto pt-3 border-t border-[var(--color-border)]">
                <p className="text-[11px] font-medium text-[var(--color-fg-muted)] uppercase tracking-wide mb-1.5">How to close {gaps.length === 1 ? "this gap" : "these gaps"}</p>
                <p className="text-xs text-[var(--color-fg-secondary)] leading-relaxed">
                  Publish content that directly answers {gaps.length === 1 ? "this prompt" : `these ${gaps.length} prompts`}.
                  {gapInsight.uniqueCompetitors.length > 0 && (
                    <> {gapInsight.uniqueCompetitors.join(", ")} {gapInsight.uniqueCompetitors.length === 1 ? "appears" : "appear"} on {gapInsight.allGapModels.length} AI {gapInsight.allGapModels.length === 1 ? "platform" : "platforms"} for {gaps.length === 1 ? "this query" : "these queries"}.</>
                  )}
                </p>
                {gapInsight.allGapModels.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {gapInsight.allGapModels.map((m) => (
                      <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-[#B54631]/10 text-[#8C3522] font-medium">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Advantages */}
        <Card className="overflow-hidden">
          <div
            className="-mx-5 -mt-5 px-5 py-4 mb-5"
            style={{ background: "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#96A283]/20 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-[#566A47]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">Advantages ({advantages.length})</h3>
              <HoverHint hint="Prompts where you appear but competitors don't. Keep building on these strengths.">
                <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
              </HoverHint>
            </div>
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
