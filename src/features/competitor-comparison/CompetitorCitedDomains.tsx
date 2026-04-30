"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { ExternalLink } from "lucide-react";
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

const MODEL_COLORS: Record<string, string> = {
  chatgpt: "#5BAF92",
  claude: "#D4943A",
  gemini: "#6BA3F5",
  google_ai: "#5CBF74",
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
      <h2 className="text-lg font-semibold mb-1">Top Cited Domains</h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Domains AI models cite in responses where each business is mentioned.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {entities.map((entity, entityIdx) => {
          const maxCount = entity.domains[0]?.count ?? 1;
          return (
            <motion.div
              key={entity.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: entityIdx * 0.07 }}
            >
              <Card className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-[var(--color-fg)] truncate">
                    {entity.name}
                  </h3>
                  {entity.isClient && (
                    <span className="text-[10px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      You
                    </span>
                  )}
                </div>

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
                          <div className="h-1.5 rounded-full bg-[var(--color-surface-alt)]">
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
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
