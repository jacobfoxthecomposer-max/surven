"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { AIOverview } from "@/components/atoms/AIOverview";
import type { ScanResult } from "@/types/database";

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
}

function sentimentColor(pct: number | null): string {
  if (pct === null) return "bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)]";
  if (pct >= 80) return "bg-[#2d6a35] text-white";
  if (pct >= 60) return "bg-[#96A283] text-white";
  if (pct >= 40) return "bg-[#c4a44a] text-white";
  if (pct >= 20) return "bg-[#C97B45] text-white";
  return "bg-[#B54631] text-white";
}

function mentionColor(count: number, max: number): string {
  if (max === 0 || count === 0) return "bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)]";
  const ratio = count / max;
  if (ratio >= 0.8) return "bg-[#1d4ed8] text-white";
  if (ratio >= 0.55) return "bg-[#3b82f6] text-white";
  if (ratio >= 0.35) return "bg-[#60a5fa] text-white";
  if (ratio >= 0.15) return "bg-[#93c5fd] text-[#1e3a5f]";
  return "bg-[#dbeafe] text-[#1e3a5f]";
}

function truncatePrompt(prompt: string, max = 60): string {
  return prompt.length > max ? prompt.slice(0, max) + "…" : prompt;
}

export function SentimentByFeature({ results, businessName, competitors }: Props) {
  const { rows, allEntities, maxMentions } = useMemo(() => {
    // Group results by prompt_text
    const promptSet = [...new Set(results.map((r) => r.prompt_text))];
    const allEntities = [businessName, ...competitors.slice(0, 4)];

    let maxMentions = 0;

    const rows = promptSet.map((prompt) => {
      const promptResults = results.filter((r) => r.prompt_text === prompt);

      // Business sentiment %
      const bizMentioned = promptResults.filter((r) => r.business_mentioned);
      const bizSentimentPct = bizMentioned.length > 0
        ? Math.round((bizMentioned.filter((r) => r.sentiment === "positive").length / bizMentioned.length) * 100)
        : null;
      const bizMentionCount = bizMentioned.length;

      // Competitor mention counts (we don't have per-competitor sentiment)
      const compData = competitors.slice(0, 4).map((comp) => {
        const count = promptResults.filter((r) => r.competitor_mentions?.[comp]).length;
        if (count > maxMentions) maxMentions = count;
        return { name: comp, count, sentimentPct: null as number | null };
      });
      if (bizMentionCount > maxMentions) maxMentions = bizMentionCount;

      return {
        prompt,
        biz: { sentimentPct: bizSentimentPct, mentionCount: bizMentionCount },
        comps: compData,
      };
    });

    return { rows, allEntities, maxMentions };
  }, [results, businessName, competitors]);

  if (rows.length === 0) return null;

  const hasCompetitors = competitors.length > 0;

  // Derive best and worst sentiment prompts for the callout
  const withSentiment = rows.filter((r) => r.biz.sentimentPct !== null);
  const bestRow  = withSentiment.length > 0 ? withSentiment.reduce((a, b) => (a.biz.sentimentPct ?? 0) >= (b.biz.sentimentPct ?? 0) ? a : b) : null;
  const worstRow = withSentiment.length > 1 ? withSentiment.reduce((a, b) => (a.biz.sentimentPct ?? 100) <= (b.biz.sentimentPct ?? 100) ? a : b) : null;
  const featureInsight = bestRow && worstRow && bestRow.prompt !== worstRow.prompt
    ? `Strongest on "${bestRow.prompt.slice(0, 50)}…" (${bestRow.biz.sentimentPct}% positive). Most opportunity on "${worstRow.prompt.slice(0, 50)}…" (${worstRow.biz.sentimentPct}%).`
    : bestRow
    ? `Best performance on "${bestRow.prompt.slice(0, 60)}…" at ${bestRow.biz.sentimentPct}% positive.`
    : null;

  return (
    <div className="space-y-3">
      {featureInsight && <AIOverview text={featureInsight} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sentiment by Feature */}
      <Card className="overflow-x-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Sentiment by Prompt</h3>
          <HoverHint hint="For each customer question, the percentage of AI responses that mention your brand positively. Color scale runs red (0–19%) → green (80–100%).">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">% of positive AI mentions per prompt</p>

        <table className="w-full text-xs border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="text-left text-[var(--color-fg-muted)] font-medium pb-2 pr-3 w-auto">Prompt</th>
              <th className="text-center text-[var(--color-fg-muted)] font-medium pb-2 px-1 min-w-[56px]">
                {businessName.split(" ")[0]}
              </th>
              {hasCompetitors && competitors.slice(0, 4).map((c) => (
                <th key={c} className="text-center text-[var(--color-fg-muted)] font-medium pb-2 px-1 min-w-[56px]">
                  {c.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.prompt}>
                <td className="pr-3 py-0.5">
                  <span className="text-[var(--color-fg-secondary)] leading-tight block" title={row.prompt}>
                    {truncatePrompt(row.prompt)}
                  </span>
                </td>
                <td className="px-1 py-0.5 text-center">
                  <span className={`inline-block rounded px-2 py-1 font-semibold min-w-[44px] text-center ${sentimentColor(row.biz.sentimentPct)}`}>
                    {row.biz.sentimentPct !== null ? `${row.biz.sentimentPct}%` : "—"}
                  </span>
                </td>
                {hasCompetitors && row.comps.map((c) => (
                  <td key={c.name} className="px-1 py-0.5 text-center">
                    <span className="inline-block rounded px-2 py-1 text-[var(--color-fg-muted)] bg-[var(--color-surface-alt)] min-w-[44px] text-center">
                      {c.count > 0 ? `${c.count}` : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Color scale legend */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center gap-1 flex-wrap">
          <span className="text-xs text-[var(--color-fg-muted)] mr-1">Sentiment:</span>
          {[
            { color: "bg-[#B54631]", label: "0–19%" },
            { color: "bg-[#C97B45]", label: "20–39%" },
            { color: "bg-[#c4a44a]", label: "40–59%" },
            { color: "bg-[#96A283]", label: "60–79%" },
            { color: "bg-[#2d6a35]", label: "80–100%" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={`h-3 w-3 rounded ${l.color}`} />
              <span className="text-xs text-[var(--color-fg-muted)]">{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Mentions by Feature */}
      <Card className="overflow-x-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Mentions by Prompt</h3>
          <HoverHint hint="How many AI models mentioned your brand (or each competitor) for each customer question. Darker blue = more models mentioned them.">
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">How often each prompt mentions your brand vs competitors</p>

        <table className="w-full text-xs border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="text-left text-[var(--color-fg-muted)] font-medium pb-2 pr-3 w-auto">Prompt</th>
              <th className="text-center text-[var(--color-fg-muted)] font-medium pb-2 px-1 min-w-[56px]">
                {businessName.split(" ")[0]}
              </th>
              {hasCompetitors && competitors.slice(0, 4).map((c) => (
                <th key={c} className="text-center text-[var(--color-fg-muted)] font-medium pb-2 px-1 min-w-[56px]">
                  {c.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.prompt}>
                <td className="pr-3 py-0.5">
                  <span className="text-[var(--color-fg-secondary)] leading-tight block" title={row.prompt}>
                    {truncatePrompt(row.prompt)}
                  </span>
                </td>
                <td className="px-1 py-0.5 text-center">
                  <span className={`inline-block rounded px-2 py-1 font-semibold min-w-[44px] text-center ${mentionColor(row.biz.mentionCount, maxMentions)}`}>
                    {row.biz.mentionCount > 0 ? row.biz.mentionCount : "—"}
                  </span>
                </td>
                {hasCompetitors && row.comps.map((c) => (
                  <td key={c.name} className="px-1 py-0.5 text-center">
                    <span className={`inline-block rounded px-2 py-1 font-semibold min-w-[44px] text-center ${mentionColor(c.count, maxMentions)}`}>
                      {c.count > 0 ? c.count : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Color scale legend */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center gap-1 flex-wrap">
          <span className="text-xs text-[var(--color-fg-muted)] mr-1">Mentions:</span>
          {[
            { color: "bg-[#dbeafe]", label: "Few" },
            { color: "bg-[#93c5fd]", label: "" },
            { color: "bg-[#60a5fa]", label: "" },
            { color: "bg-[#3b82f6]", label: "" },
            { color: "bg-[#1d4ed8]", label: "Many" },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`h-3 w-3 rounded ${l.color}`} />
              {l.label && <span className="text-xs text-[var(--color-fg-muted)]">{l.label}</span>}
            </div>
          ))}
        </div>
      </Card>
      </div>
    </div>
  );
}
