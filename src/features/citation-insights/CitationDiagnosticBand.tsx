"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import {
  AUTHORITY_LABEL,
  CATEGORY_LABEL,
  getAuthority,
  getCategory,
} from "@/utils/citationAuthority";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

interface CitationDiagnosticBandProps {
  results: ScanResult[];
  businessName: string;
}

interface DomainStat {
  domain: string;
  count: number;
  authority: ReturnType<typeof getAuthority>;
  category: ReturnType<typeof getCategory>;
  listed: boolean;
}

export function CitationDiagnosticBand({
  results,
  businessName,
}: CitationDiagnosticBandProps) {
  const { gapDomains, listedDomains, topGap, topListed, totalGap, totalListed } = useMemo(() => {
    const map = new Map<
      string,
      { count: number; listed: boolean }
    >();
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        const ex = map.get(d) ?? { count: 0, listed: false };
        ex.count++;
        if (r.business_mentioned) ex.listed = true;
        map.set(d, ex);
      }
    }

    const all: DomainStat[] = Array.from(map.entries()).map(([domain, v]) => ({
      domain,
      count: v.count,
      authority: getAuthority(domain),
      category: getCategory(domain),
      listed: v.listed,
    }));

    // Gaps sorted: high-authority first, then by citation count
    const authRank = { high: 3, medium: 2, low: 1 } as const;
    const gaps = all
      .filter((d) => !d.listed)
      .sort(
        (a, b) =>
          authRank[b.authority] - authRank[a.authority] || b.count - a.count,
      );
    const listed = all
      .filter((d) => d.listed)
      .sort(
        (a, b) =>
          authRank[b.authority] - authRank[a.authority] || b.count - a.count,
      );

    return {
      gapDomains: gaps.slice(0, 3),
      listedDomains: listed.slice(0, 3),
      topGap: gaps[0] ?? null,
      topListed: listed[0] ?? null,
      totalGap: gaps.length,
      totalListed: listed.length,
    };
  }, [results]);

  const total = totalGap + totalListed;
  if (total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay: 0.15 }}
      className="grid grid-cols-1 gap-4 flex-1"
    >
      {/* What to watch — citation gaps */}
      {topGap && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3"
          style={{
            borderColor: `${SURVEN_SEMANTIC.bad}40`,
            backgroundColor: `${SURVEN_SEMANTIC.bad}08`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.bad}20` }}
            >
              <AlertTriangle
                className="h-3.5 w-3.5"
                style={{ color: SURVEN_SEMANTIC.bad }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              What to watch
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--color-fg)] leading-snug">
            AI cites{" "}
            <span className="font-semibold">{topGap.domain}</span>{" "}
            <span
              className="font-semibold"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              {topGap.count} time{topGap.count === 1 ? "" : "s"}
            </span>{" "}
            but never connects it back to {businessName}
            {topGap.authority === "high"
              ? " — and it's a high-authority source."
              : "."}
          </p>

          {gapDomains.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: SURVEN_SEMANTIC.bad }}
              >
                Top citation gaps
              </p>
              <ul className="space-y-1">
                {gapDomains.map((g, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-[var(--color-fg-secondary)] leading-snug"
                  >
                    <span className="text-[var(--color-fg)] font-medium">
                      {g.domain}
                    </span>
                    <span className="text-[var(--color-fg-muted)]">
                      {" "}— {AUTHORITY_LABEL[g.authority]} authority ·{" "}
                      {CATEGORY_LABEL[g.category]} · {g.count} citation
                      {g.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="rounded-[var(--radius-md)] px-2.5 py-1.5"
            style={{ backgroundColor: `${SURVEN_SEMANTIC.bad}10` }}
          >
            <p className="text-[11px] text-[var(--color-fg-secondary)] leading-snug">
              <span
                className="font-semibold"
                style={{ color: SURVEN_SEMANTIC.bad }}
              >
                Quick fix:
              </span>{" "}
              Get listed on {topGap.domain}. AI is already pulling from there
              — listing puts you in the answers it builds.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 mt-auto border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              {totalGap} gap{totalGap === 1 ? "" : "s"} · {totalListed}{" "}
              listed
            </p>
            <Link
              href="/audit"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: SURVEN_SEMANTIC.bad }}
            >
              Run GEO Audit
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* What's working — top cited sources */}
      {topListed && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 flex flex-col gap-3 flex-1"
          style={{
            borderColor: `${SURVEN_SEMANTIC.good}40`,
            backgroundColor: `${SURVEN_SEMANTIC.good}08`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${SURVEN_SEMANTIC.good}20` }}
            >
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: SURVEN_SEMANTIC.good }}
              />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              What&apos;s working
            </span>
          </div>

          <p className="text-sm font-medium text-[var(--color-fg)] leading-snug">
            <span className="font-semibold">{topListed.domain}</span> cites{" "}
            <span className="font-semibold">{businessName}</span>{" "}
            <span
              className="font-semibold"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              {topListed.count} time{topListed.count === 1 ? "" : "s"}
            </span>{" "}
            — your strongest source moat.
          </p>

          {listedDomains.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: SURVEN_SEMANTIC.good }}
              >
                Sources naming you
              </p>
              <ul className="space-y-1">
                {listedDomains.map((l, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-[var(--color-fg-secondary)] leading-snug"
                  >
                    <span className="text-[var(--color-fg)] font-medium">
                      {l.domain}
                    </span>
                    <span className="text-[var(--color-fg-muted)]">
                      {" "}— {AUTHORITY_LABEL[l.authority]} authority ·{" "}
                      {CATEGORY_LABEL[l.category]} · {l.count} citation
                      {l.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="rounded-[var(--radius-md)] px-2.5 py-1.5"
            style={{ backgroundColor: `${SURVEN_SEMANTIC.good}10` }}
          >
            <p className="text-[11px] text-[var(--color-fg-secondary)] leading-snug">
              <span
                className="font-semibold"
                style={{ color: SURVEN_SEMANTIC.good }}
              >
                Source moat:
              </span>{" "}
              Keep your {topListed.domain} listing fresh. AI weights recently
              updated sources higher.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 mt-auto border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-fg-muted)]">
              {totalListed} source{totalListed === 1 ? "" : "s"} naming you
            </p>
            <Link
              href="/competitor-comparison"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: SURVEN_SEMANTIC.good }}
            >
              Compare competitors
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
