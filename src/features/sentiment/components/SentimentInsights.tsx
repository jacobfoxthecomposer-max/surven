"use client";

import { useMemo } from "react";
import { TrendingUp, AlertTriangle, Cpu } from "lucide-react";
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
}

export function SentimentInsights({ results }: Props) {
  const insights = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned);
    const total = mentioned.length;
    if (total === 0) return null;

    const positiveCount = mentioned.filter((r) => r.sentiment === "positive").length;
    const negativeCount = mentioned.filter((r) => r.sentiment === "negative").length;
    const positivePct = Math.round((positiveCount / total) * 100);

    // Best platform by positive sentiment rate
    const models: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    let bestModel: ModelName | null = null;
    let bestRate = -1;
    for (const m of models) {
      const modelMentions = mentioned.filter((r) => r.model_name === m);
      if (modelMentions.length === 0) continue;
      const rate = modelMentions.filter((r) => r.sentiment === "positive").length / modelMentions.length;
      if (rate > bestRate) { bestRate = rate; bestModel = m; }
    }

    // Risk signal
    const riskPrompts = mentioned
      .filter((r) => r.sentiment === "negative")
      .map((r) => r.prompt_text)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 1);

    return { positivePct, negativeCount, total, bestModel, bestRate, riskPrompts };
  }, [results]);

  if (!insights) return null;

  const cards = [
    {
      icon: TrendingUp,
      iconColor: "text-[#96A283]",
      bg: "bg-[#96A283]/10",
      label: "Overall Sentiment",
      value: `${insights.positivePct}% Positive`,
      sub: `across ${insights.total} AI mention${insights.total !== 1 ? "s" : ""}`,
    },
    {
      icon: Cpu,
      iconColor: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary)]/10",
      label: "Strongest Platform",
      value: insights.bestModel ? MODEL_LABELS[insights.bestModel] : "—",
      sub: insights.bestModel ? `${Math.round(insights.bestRate * 100)}% positive rate` : "No data",
    },
    {
      icon: AlertTriangle,
      iconColor: insights.negativeCount > 0 ? "text-[#B54631]" : "text-[#96A283]",
      bg: insights.negativeCount > 0 ? "bg-[#B54631]/10" : "bg-[#96A283]/10",
      label: "Risk Signals",
      value: insights.negativeCount > 0 ? `${insights.negativeCount} Negative` : "None Found",
      sub: insights.negativeCount > 0 ? "mentions needing attention" : "sentiment is clean",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="flex items-center gap-4 p-5">
            <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${c.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-fg-muted)] mb-0.5">{c.label}</p>
              <p className="text-base font-semibold text-[var(--color-fg)] truncate">{c.value}</p>
              <p className="text-xs text-[var(--color-fg-muted)]">{c.sub}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
