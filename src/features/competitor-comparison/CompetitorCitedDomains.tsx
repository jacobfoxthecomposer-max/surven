"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { ArrowRight, ExternalLink, Info, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC, SURVEN_CATEGORICAL } from "@/utils/brandColors";
import type { ScanResult } from "@/types/database";

interface DomainStat {
  domain: string;
  count: number;
  models: string[];
}

interface CompetitorCitedDomainsProps {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
}

function getDomainsForEntity(
  results: ScanResult[],
  isClient: boolean,
  competitor?: string
): DomainStat[] {
  const map = new Map<string, { count: number; models: Set<string> }>();

  for (const r of results) {
    if (!r.citations || r.citations.length === 0) continue;

    const entityMentioned = isClient
      ? r.business_mentioned
      : competitor
      ? r.competitor_mentions?.[competitor] === true
      : false;

    if (!entityMentioned) continue;

    for (const domain of r.citations) {
      const existing = map.get(domain) ?? { count: 0, models: new Set<string>() };
      existing.count++;
      existing.models.add(r.model_name);
      map.set(domain, existing);
    }
  }

  return Array.from(map.entries())
    .map(([domain, { count, models }]) => ({
      domain,
      count,
      models: Array.from(models),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// Engine identity is categorical — each engine maps to a stable categorical
// slot so the same dot color always means the same AI engine across the page.
const MODEL_COLORS: Record<string, string> = {
  chatgpt: SURVEN_CATEGORICAL[2], // blue
  claude: SURVEN_CATEGORICAL[3], // gold
  gemini: SURVEN_CATEGORICAL[4], // purple
  google_ai: SURVEN_CATEGORICAL[5], // teal
};

export function CompetitorCitedDomains({
  results,
  businessName,
  competitors,
}: CompetitorCitedDomainsProps) {
  const entities = useMemo(() => {
    const all = [
      { name: businessName, isClient: true, domains: getDomainsForEntity(results, true) },
      ...competitors.map((name) => ({
        name,
        isClient: false,
        domains: getDomainsForEntity(results, false, name),
      })),
    ];
    return all.filter((e) => e.domains.length > 0);
  }, [results, businessName, competitors]);

  if (entities.length === 0) return null;

  return (
    <section id="citations-section">
      <Card className="overflow-hidden">
        {/* Gradient header */}
        <div
          className="-mx-5 -mt-5 px-5 py-4 mb-5"
          style={{ background: "linear-gradient(135deg, rgba(150,162,131,0.18), rgba(150,162,131,0.04))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${SURVEN_SEMANTIC.goodAlt}33` }}
              >
                <LinkIcon className="h-4 w-4" style={{ color: "#566A47" }} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                Top Cited Domains
              </h3>
              <HoverHint hint="Domains AI engines cite when mentioning each business. Use it to spot authority sources competitors use that you don't.">
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {entities.map((entity, entityIdx) => {
            const maxCount = entity.domains[0]?.count ?? 1;
            return (
              <motion.div
                key={entity.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: entityIdx * 0.07 }}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden"
              >
                <div
                  className="px-4 py-2.5"
                  style={{ background: "linear-gradient(135deg, rgba(150,162,131,0.10), rgba(150,162,131,0.02))" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-fg)] truncate">
                      {entity.name}
                    </span>
                    {entity.isClient && (
                      <span className="text-[10px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        You
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {entity.domains.length === 0 ? (
                    <p className="text-xs text-[var(--color-fg-muted)]">No citations found.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {entity.domains.map((stat, i) => {
                        const pct = Math.round((stat.count / maxCount) * 100);
                        return (
                          <div key={stat.domain}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-xs text-[var(--color-fg)] truncate max-w-[140px]">
                                  {stat.domain}
                                </span>
                                <a
                                  href={`https://${stat.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div className="flex gap-1 shrink-0 ml-2">
                                {stat.models.map((m) => (
                                  <span
                                    key={m}
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: MODEL_COLORS[m] ?? "#888" }}
                                    title={m}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-[var(--color-border)]">
                              <motion.div
                                className="h-1.5 rounded-full bg-[var(--color-primary)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <ChartExplainer
          blocks={[
            {
              label: "Cards",
              body: "One card per entity — your business is marked with a 'You' badge. Each card shows the top 6 domains AI engines cited when mentioning that entity.",
            },
            {
              label: "Bar length",
              body: "Relative citation count within the card — the longest bar is the most-cited domain for that entity. Lengths are scaled per card, so a long bar in one card may equal a short one in another.",
            },
            {
              label: "Colored dots",
              body: "Each dot is one AI engine that cited that domain — ChatGPT, Claude, Gemini, Google AI. More dots means broader engine coverage.",
            },
            {
              label: "External link",
              body: "Click any domain to open it in a new tab. Useful when you spot a competitor citation source you want to investigate.",
            },
          ]}
          tip="Compare your top domains to a competitor's — if they have a high-authority source you don't, that's a target for outreach or content placement."
        />
      </Card>
    </section>
  );
}
