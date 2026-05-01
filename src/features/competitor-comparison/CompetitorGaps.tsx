"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { AlertTriangle, ArrowRight, CheckCircle, Info } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
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
        const modelLabel = MODEL_LABELS[r.model_name] ?? r.model_name;

        if (competitorMentioned && !clientMentioned) {
          const existing = gapMap.get(key);
          if (existing) {
            if (!existing.models.includes(modelLabel)) {
              existing.models.push(modelLabel);
            }
          } else {
            gapMap.set(key, {
              prompt: r.prompt_text,
              competitor,
              models: [modelLabel],
            });
          }
        }

        if (clientMentioned && !competitorMentioned) {
          const existing = advantageMap.get(key);
          if (existing) {
            if (!existing.models.includes(modelLabel)) {
              existing.models.push(modelLabel);
            }
          } else {
            advantageMap.set(key, {
              prompt: r.prompt_text,
              competitor,
              models: [modelLabel],
            });
          }
        }
      }
    }

    return {
      gaps: Array.from(gapMap.values()).slice(0, 8),
      advantages: Array.from(advantageMap.values()).slice(0, 8),
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
            style={{
              background:
                "linear-gradient(135deg, rgba(181,70,49,0.10), rgba(181,70,49,0.02))",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${SURVEN_SEMANTIC.bad}20` }}
                >
                  <AlertTriangle
                    className="h-4 w-4"
                    style={{ color: SURVEN_SEMANTIC.bad }}
                  />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                  Gaps ({gaps.length})
                </h3>
                <HoverHint hint="Prompts where a competitor appears in the AI response and you don't. Closing these is the highest-leverage Optimizer work.">
                  <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                </HoverHint>
              </div>
              <Link
                href="/audit"
                className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: SURVEN_SEMANTIC.bad }}
              >
                Run GEO audit <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {gaps.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">
              No gaps found — you&apos;re keeping up with every competitor on
              every prompt.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {gaps.map((gap, i) => (
                <motion.div
                  key={`${gap.competitor}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: `${SURVEN_SEMANTIC.bad}08`,
                    borderColor: `${SURVEN_SEMANTIC.bad}30`,
                  }}
                >
                  <p className="text-xs font-medium text-[var(--color-fg)] mb-1.5 leading-snug">
                    &ldquo;{gap.prompt}&rdquo;
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: SURVEN_SEMANTIC.bad }}
                    >
                      {gap.competitor} ranks here
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex gap-1 flex-wrap">
                        {gap.models.map((m) => (
                          <span
                            key={m}
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: `${SURVEN_SEMANTIC.bad}15`,
                              color: SURVEN_SEMANTIC.bad,
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/prompts"
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold ml-1 transition-opacity hover:opacity-70"
                        style={{ color: SURVEN_SEMANTIC.bad }}
                      >
                        Prompts <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <ChartExplainer
            blocks={[
              {
                label: "Each row",
                body: "One prompt where a competitor was mentioned by an AI engine and you weren't. Up to 8 most-impactful gaps shown.",
              },
              {
                label: "Engine pills",
                body: "Which AI engines (ChatGPT, Claude, Gemini, Google AI) the competitor was named on for that prompt. More pills = wider gap.",
              },
            ]}
            tip="Click 'Prompts' on any row to see the full response and the surrounding context."
          />
        </Card>

        {/* Advantages */}
        <Card className="overflow-hidden">
          <div
            className="-mx-5 -mt-5 px-5 py-4 mb-5"
            style={{
              background:
                "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${SURVEN_SEMANTIC.goodAlt}33` }}
                >
                  <CheckCircle
                    className="h-4 w-4"
                    style={{ color: "#566A47" }}
                  />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                  Advantages ({advantages.length})
                </h3>
                <HoverHint hint="Prompts where you appear in the AI response but the named competitor doesn't. Defend and amplify these positions.">
                  <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
                </HoverHint>
              </div>
              <Link
                href="/citation-insights"
                className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: SURVEN_SEMANTIC.good }}
              >
                Citation Insights <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {advantages.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">
              No clear advantages yet — keep building visibility on category
              prompts.
            </p>
          ) : (
            <div className="space-y-2.5">
              {advantages.map((adv, i) => (
                <motion.div
                  key={`${adv.competitor}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: `${SURVEN_SEMANTIC.goodAlt}14`,
                    borderColor: `${SURVEN_SEMANTIC.goodAlt}40`,
                  }}
                >
                  <p className="text-xs font-medium text-[var(--color-fg)] mb-1.5 leading-snug">
                    &ldquo;{adv.prompt}&rdquo;
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: "#566A47" }}
                    >
                      You rank, {adv.competitor} doesn&apos;t
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex gap-1 flex-wrap">
                        {adv.models.map((m) => (
                          <span
                            key={m}
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: `${SURVEN_SEMANTIC.goodAlt}25`,
                              color: "#566A47",
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <ChartExplainer
            blocks={[
              {
                label: "Each row",
                body: "One prompt where you were mentioned by an AI engine and the named competitor wasn't. Up to 8 strongest advantages shown.",
              },
              {
                label: "Engine pills",
                body: "Which AI engines surfaced you over that competitor for the prompt. More pills = stronger lead to defend.",
              },
            ]}
            tip="Use 'Citation Insights' to see which sources are powering these wins so you can double down."
          />
        </Card>
      </div>
    </section>
  );
}
