"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/atoms/Card";
import { ExternalLink } from "lucide-react";
import type { ScanResult } from "@/types/database";

interface CitationGapSectionProps {
  results: ScanResult[];
  businessName: string;
}

interface DomainStat {
  domain: string;
  count: number;
  models: string[];
  mentionedWithBusiness: boolean;
}

export function CitationGapSection({ results, businessName }: CitationGapSectionProps) {
  const { domainStats, total } = useMemo(() => {
    const map = new Map<string, { count: number; models: Set<string>; mentionedWithBusiness: boolean }>();

    for (const r of results) {
      if (!r.citations || r.citations.length === 0) continue;
      for (const domain of r.citations) {
        const existing = map.get(domain) ?? { count: 0, models: new Set<string>(), mentionedWithBusiness: false };
        existing.count++;
        existing.models.add(r.model_name);
        if (r.business_mentioned) existing.mentionedWithBusiness = true;
        map.set(domain, existing);
      }
    }

    const stats: DomainStat[] = Array.from(map.entries())
      .map(([domain, { count, models, mentionedWithBusiness }]) => ({
        domain,
        count,
        models: Array.from(models),
        mentionedWithBusiness,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { domainStats: stats, total: map.size };
  }, [results]);

  if (domainStats.length === 0) return null;

  const maxCount = domainStats[0]?.count ?? 1;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-1">Citation Gap Analysis</h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Domains cited by AI models — gaps show where {businessName} is missing from key sources.
      </p>
      <Card>
        <div className="space-y-3">
          {domainStats.map((stat, i) => {
            const pct = Math.round((stat.count / maxCount) * 100);
            const isGap = !stat.mentionedWithBusiness;
            return (
              <motion.div
                key={stat.domain}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="flex items-center gap-3"
              >
                {/* Domain name + link */}
                <div className="flex items-center gap-1 w-36 shrink-0">
                  <span className="text-xs text-[var(--color-fg)] truncate">{stat.domain}</span>
                  <a
                    href={`https://${stat.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors shrink-0"
                    aria-label={`Visit ${stat.domain}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Bar */}
                <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)]">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: isGap ? "var(--color-danger)" : "var(--color-success)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                {/* Count */}
                <span className="text-xs text-[var(--color-fg-muted)] w-6 text-right shrink-0">
                  {stat.count}
                </span>

                {/* Gap badge */}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium w-14 text-center shrink-0 ${
                    isGap
                      ? "bg-[var(--color-danger)]/15 text-[#8C3522]"
                      : "bg-[var(--color-success)]/15 text-[#566A47]"
                  }`}
                >
                  {isGap ? "Gap" : "Listed"}
                </span>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-[var(--color-fg-muted)] mt-4">
          <span className="text-[#566A47] font-medium">Listed</span> = {businessName} appeared in responses that cited this domain. &nbsp;
          <span className="text-[#8C3522] font-medium">Gap</span> = domain cited but {businessName} never mentioned — consider getting listed there.
        </p>
      </Card>
    </section>
  );
}
