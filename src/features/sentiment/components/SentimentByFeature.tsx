"use client";

import { useMemo } from "react";
import { HelpCircle } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
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

function truncatePrompt(prompt: string, max = 95): string {
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sentiment by Feature */}
      <Card className="overflow-x-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}>Sentiment by Prompt</h3>
          <HoverHint hint="For each customer question, the percentage of AI responses that mention your brand positively. Color scale runs red (0–19%) → green (80–100%).">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
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

        <ChartExplainer
          blocks={[
            {
              label: "Rows",
              body: "Each row is one prompt that was sent to AI engines during the scan.",
            },
            {
              label: "Columns",
              body: "Your business column shows positive sentiment %; competitor columns show plain mention counts (we don't compute sentiment for competitors).",
            },
            {
              label: "Cell value",
              body: "Your column: percentage of AI mentions that were positive (e.g., 80% means 4 of 5 mentions used favorable language). Em dash means no mentions.",
            },
            {
              label: "Colors",
              body: "Five-step thermal scale — rust = critical (0–19%), orange = mostly negative, mustard = mixed (40–59%), sage = mostly positive, dark green = excellent (80%+).",
            },
          ]}
          tip="Hover any cell for the full prompt text."
        />
      </Card>

      {/* Mentions by Feature */}
      <Card className="overflow-x-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--color-fg)" }}>Mentions by Prompt</h3>
          <HoverHint hint="How many AI models mentioned your brand (or each competitor) for each customer question. Darker blue = more models mentioned them.">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
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

        <ChartExplainer
          blocks={[
            {
              label: "Rows",
              body: "Same prompts as the Sentiment table on the left, in the same order. Easy to scan side-by-side.",
            },
            {
              label: "Cell value",
              body: "Number of AI engines (out of 4) that mentioned the entity for that prompt. Em dash means no engine mentioned them.",
            },
            {
              label: "Colors",
              body: "Blue density scale — lighter blue means few engines mentioned the entity, darker blue means many. Blue here is a count gradient, it doesn't indicate good or bad.",
            },
            {
              label: "Why two tables",
              body: "Sentiment table tells you what AI engines said about you. Mentions table tells you how often they said anything at all — competitors with high mentions but no sentiment data are appearing more than you.",
            },
          ]}
        />
      </Card>
      </div>
    </div>
  );
}
