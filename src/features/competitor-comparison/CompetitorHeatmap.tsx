"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Info, Zap } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import type { ScanResult, ModelName } from "@/types/database";

const MODELS: { id: ModelName; label: string }[] = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "google_ai", label: "Google AI" },
];

interface HeatmapRow {
  name: string;
  isYou: boolean;
  scores: Record<ModelName, number | null>;
}

interface CompetitorHeatmapProps {
  results: ScanResult[];
  businessName: string;
  businessScore: number;
  competitors: string[];
}

function calcModelScore(
  results: ScanResult[],
  model: ModelName,
  competitor?: string
): number | null {
  const modelResults = results.filter((r) => r.model_name === model);
  if (modelResults.length === 0) return null;

  if (!competitor) {
    const hits = modelResults.filter((r) => r.business_mentioned).length;
    return Math.round((hits / modelResults.length) * 100);
  }

  const relevant = modelResults.filter(
    (r) => r.competitor_mentions && competitor in r.competitor_mentions
  );
  if (relevant.length === 0) return null;

  const hits = relevant.filter((r) => r.competitor_mentions[competitor]).length;
  if (hits === 0) return null;
  return Math.round((hits / relevant.length) * 100);
}

function scoreToColor(score: number | null): string {
  if (score === null) return "transparent";
  if (score === 0) return "transparent";
  if (score < 10) return "rgba(150, 162, 131, 0.15)";
  if (score < 25) return "rgba(150, 162, 131, 0.3)";
  if (score < 50) return "rgba(150, 162, 131, 0.5)";
  if (score < 75) return "rgba(150, 162, 131, 0.72)";
  return "rgba(150, 162, 131, 0.95)";
}

function scoreToTextColor(score: number | null): string {
  if (score === null || score === 0) return "var(--color-fg-muted)";
  if (score >= 50) return "#1A1C1A";
  return "var(--color-fg)";
}

export function CompetitorHeatmap({
  results,
  businessName,
  businessScore,
  competitors,
}: CompetitorHeatmapProps) {
  const rows = useMemo<HeatmapRow[]>(() => {
    const clientRow: HeatmapRow = {
      name: businessName,
      isYou: true,
      scores: {
        chatgpt: calcModelScore(results, "chatgpt"),
        claude: calcModelScore(results, "claude"),
        gemini: calcModelScore(results, "gemini"),
        google_ai: calcModelScore(results, "google_ai"),
      },
    };

    const competitorRows: HeatmapRow[] = competitors.map((name) => ({
      name,
      isYou: false,
      scores: {
        chatgpt: calcModelScore(results, "chatgpt", name),
        claude: calcModelScore(results, "claude", name),
        gemini: calcModelScore(results, "gemini", name),
        google_ai: calcModelScore(results, "google_ai", name),
      },
    }));

    return [clientRow, ...competitorRows];
  }, [results, businessName, competitors]);

  return (
    <section id="heatmap-section">
      <Card className="overflow-x-auto overflow-hidden">
        <div
          className="-mx-5 -mt-5 px-5 py-4 mb-5"
          style={{ background: "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#96A283]/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-[#566A47]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">AI Platform Visibility Heatmap</h3>
            <HoverHint hint="Visibility score per AI platform. Darker shades indicate higher presence and mentions.">
              <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
            </HoverHint>
          </div>
        </div>
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-[var(--color-fg-muted)] pb-3 pr-4 w-40">
                Competitor
              </th>
              {MODELS.map((m) => (
                <th
                  key={m.id}
                  className="text-center text-xs font-semibold text-[var(--color-fg-muted)] pb-3 px-2"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <EngineIcon id={m.id} size={12} />
                    {m.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-1">
            {rows.map((row, rowIdx) => (
              <motion.tr
                key={row.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: rowIdx * 0.05 }}
                className={row.isYou ? "border-t border-[var(--color-border)]" : ""}
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm truncate max-w-[140px] ${
                        row.isYou
                          ? "font-semibold text-[var(--color-fg)]"
                          : "text-[var(--color-fg-secondary)]"
                      }`}
                    >
                      {row.name}
                    </span>
                    {row.isYou && (
                      <span className="text-[10px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        You
                      </span>
                    )}
                  </div>
                </td>
                {MODELS.map((m) => {
                  const score = row.scores[m.id];
                  const bg = scoreToColor(score);
                  const textColor = scoreToTextColor(score);
                  return (
                    <td key={m.id} className="py-2 px-2 text-center">
                      <div
                        className="inline-flex items-center justify-center rounded-md text-xs font-semibold w-16 h-7 transition-colors"
                        style={{
                          backgroundColor: bg,
                          color: textColor,
                          border:
                            score === null || score === 0
                              ? "1px solid var(--color-border)"
                              : "none",
                        }}
                      >
                        {score === null || score === 0 ? "—" : `${score}%`}
                      </div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-fg-muted)]">Visibility:</span>
          {[
            { label: "Low", bg: "rgba(150,162,131,0.3)" },
            { label: "Med", bg: "rgba(150,162,131,0.5)" },
            { label: "High", bg: "rgba(150,162,131,0.72)" },
            { label: "Top", bg: "rgba(150,162,131,0.95)" },
          ].map(({ label, bg }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="h-3 w-5 rounded-sm"
                style={{ backgroundColor: bg }}
              />
              <span className="text-xs text-[var(--color-fg-muted)]">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <div
              className="h-3 w-5 rounded-sm border border-[var(--color-border)]"
              style={{ backgroundColor: "transparent" }}
            />
            <span className="text-xs text-[var(--color-fg-muted)]">No mentions</span>
          </div>
        </div>
      </Card>
    </section>
  );
}
