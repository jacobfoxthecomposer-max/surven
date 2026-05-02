"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { Cpu, Info, ExternalLink, ArrowRight } from "lucide-react";
import { AI_MODELS } from "@/utils/constants";
import type { ScanResult, ModelName } from "@/types/database";

interface CitationsByEngineProps {
  results: ScanResult[];
}

interface EngineStat {
  id: ModelName;
  name: string;
  totalCitations: number;
  uniqueDomains: number;
  topDomains: { domain: string; count: number }[];
}

export function CitationsByEngine({ results }: CitationsByEngineProps) {
  const stats = useMemo<EngineStat[]>(() => {
    return AI_MODELS.map((model) => {
      const modelResults = results.filter((r) => r.model_name === model.id);
      const domainCounts = new Map<string, number>();
      let totalCitations = 0;
      for (const r of modelResults) {
        if (!r.citations) continue;
        for (const d of r.citations) {
          domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
          totalCitations++;
        }
      }
      const topDomains = Array.from(domainCounts.entries())
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      return {
        id: model.id as ModelName,
        name: model.name,
        totalCitations,
        uniqueDomains: domainCounts.size,
        topDomains,
      };
    }).filter((s) => s.totalCitations > 0);
  }, [results]);

  if (stats.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Cpu className="h-4 w-4 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">
          Citations by AI Engine
        </h3>
        <HoverHint hint="Each AI model cites different sources. See which engines are pulling from which domains for your business.">
          <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
        </HoverHint>
        <Link
          href="/ai-visibility-tracker"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Full tracker <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <EngineIcon id={s.id} size={14} />
              <span className="text-sm font-semibold text-[var(--color-fg)]">
                {s.name}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mb-3">
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: "var(--color-fg)",
                  }}
                >
                  {s.uniqueDomains}
                </p>
                <p className="text-[11px] text-[var(--color-fg-muted)]">
                  Sources
                </p>
              </div>
              <div className="ml-auto">
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: "var(--color-fg)",
                  }}
                >
                  {s.totalCitations}
                </p>
                <p className="text-[11px] text-[var(--color-fg-muted)]">
                  Citations
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-[var(--color-border)]">
              {s.topDomains.map((d) => (
                <div key={d.domain} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-fg-secondary)] truncate flex-1">
                    {d.domain}
                  </span>
                  <a
                    href={`https://${d.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] shrink-0"
                    aria-label={`Visit ${d.domain}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-xs font-semibold text-[var(--color-fg)] tabular-nums w-6 text-right">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/prompts"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              See {s.name} prompts <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>
        ))}
      </div>

      <ChartExplainer
        blocks={[
          {
            label: "Cards",
            body: "One card per AI engine that returned citations during the scan — ChatGPT, Claude, Gemini, Google AI. Engines with zero citations are hidden.",
          },
          {
            label: "Sources",
            body: "Number of unique domains the engine cited when answering prompts about you.",
          },
          {
            label: "Citations",
            body: "Total citation count — a single domain cited across many prompts counts each time. So citations are usually higher than sources.",
          },
          {
            label: "Top domains",
            body: "The 4 most-cited domains for that engine, with a click-through to open them. The number on the right is how many times that engine cited that domain.",
          },
        ]}
        tip="Compare cards side-by-side — if one engine pulls heavily from low-authority sources and others pull from authoritative ones, that engine is your weakest link."
      />
    </Card>
  );
}
