"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { Crown, ExternalLink } from "lucide-react";
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
  share: number;
  topDomains: { domain: string; count: number }[];
}

// On-brand palette — sage / rust / slate / gold pulled from
// SURVEN_CATEGORICAL (citationAuthority.ts) so engine colors fit the
// earthy site palette instead of using each engine's loud OEM brand
// hue. Engines stay distinct + the cards rhyme with every other chart.
const MODEL_COLOR: Record<ModelName, string> = {
  chatgpt: "#7D8E6C",
  claude: "#B54631",
  gemini: "#5B7BAB",
  google_ai: "#C9A95B",
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function CitationsByEngine({ results }: CitationsByEngineProps) {
  const stats = useMemo<EngineStat[]>(() => {
    const built = AI_MODELS.map((model) => {
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
        .slice(0, 3);
      return {
        id: model.id as ModelName,
        name: model.name,
        totalCitations,
        uniqueDomains: domainCounts.size,
        topDomains,
        share: 0,
      };
    });
    const grandTotal = built.reduce((acc, s) => acc + s.totalCitations, 0);
    return built
      .map((s) => ({
        ...s,
        share:
          grandTotal > 0
            ? Math.round((s.totalCitations / grandTotal) * 100)
            : 0,
      }))
      .filter((s) => s.totalCitations > 0);
  }, [results]);

  if (stats.length === 0) return null;

  const grandTotal = stats.reduce((a, b) => a + b.totalCitations, 0);
  const grandUnique = stats.reduce((a, b) => a + b.uniqueDomains, 0);
  // Engine sorted by citations — leader first.
  const sorted = stats.slice().sort((a, b) => b.totalCitations - a.totalCitations);

  // Global top-cited domain across ALL engines — sums each domain's
  // citation count across every engine that cited it. The featured
  // "Most cited" strip surfaces this so users instantly see the single
  // source carrying the most weight, plus how many engines reinforce it.
  const globalTopDomain = (() => {
    // Re-derive directly from results — stats.topDomains is sliced to
    // 3 per engine so we'd miss domains beyond that cap.
    const totals = new Map<string, { count: number; engines: Set<ModelName> }>();
    for (const r of results) {
      if (!r.citations) continue;
      for (const d of r.citations) {
        const ex = totals.get(d) ?? { count: 0, engines: new Set<ModelName>() };
        ex.count++;
        ex.engines.add(r.model_name as ModelName);
        totals.set(d, ex);
      }
    }
    let best: { domain: string; count: number; engines: ModelName[] } | null = null;
    for (const [domain, v] of totals) {
      if (!best || v.count > best.count) {
        best = { domain, count: v.count, engines: Array.from(v.engines) };
      }
    }
    return best;
  })();

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full">
      {/* Header — matches Source Categories rhythm */}
      <div className="mb-4 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SectionHeading
            text="Citations by AI Engine"
            info="Each AI model cites different sources. See which engines are pulling from which domains for your business — and which engine is doing the most for your visibility."
          />
          <span
            className="text-[var(--color-fg-muted)] shrink-0"
            style={{ fontSize: 12 }}
          >
            {grandTotal} citations · {grandUnique} sources
          </span>
        </div>
      </div>

      {/* Engine share-of-voice bar — compact stacked bar with inline
          legend on a single line below so the half-width slot stays
          tight. Replaces the full leader-vs-leader strip per engine
          card (which is now redundant with this top bar). */}
      <div className="mb-4">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--color-border)]">
          {sorted.map((s) => (
            <div
              key={s.id}
              className="h-full transition-all"
              style={{
                width: `${s.share}%`,
                backgroundColor: MODEL_COLOR[s.id],
              }}
              title={`${s.name}: ${s.totalCitations} citations (${s.share}%)`}
            />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {sorted.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm shrink-0"
                style={{ backgroundColor: MODEL_COLOR[s.id] }}
              />
              <span
                className="text-[var(--color-fg)] font-medium"
                style={{ fontSize: 11 }}
              >
                {s.name}
              </span>
              <span
                className="text-[var(--color-fg-muted)] tabular-nums"
                style={{ fontSize: 10.5 }}
              >
                {s.share}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Most-cited source strip — surfaces the single global top
          domain across every engine, with the engines that reinforce
          it. Sage-tinted to match the brand "anchor" treatment used
          on other dashboards. */}
      {globalTopDomain && (
        <div
          className="rounded-[var(--radius-md)] border px-3 py-2.5 mb-3 flex items-center gap-3"
          style={{
            borderColor: "rgba(125,142,108,0.35)",
            backgroundColor: "rgba(125,142,108,0.08)",
          }}
        >
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(125,142,108,0.22)" }}
          >
            <Crown className="h-3.5 w-3.5" style={{ color: "#5E7250" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="uppercase tracking-wider font-semibold text-[var(--color-fg-muted)]"
              style={{ fontSize: 9.5, letterSpacing: "0.08em" }}
            >
              Most cited source
            </p>
            <div className="flex items-center gap-1.5 min-w-0">
              <a
                href={`https://${globalTopDomain.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-fg)] truncate hover:underline font-semibold"
                style={{ fontSize: 13 }}
                title={`Visit ${globalTopDomain.domain}`}
              >
                {globalTopDomain.domain}
              </a>
              <ExternalLink className="h-3 w-3 text-[var(--color-fg-muted)] shrink-0" />
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span
              className="tabular-nums font-bold rounded-full px-2 py-0.5"
              style={{
                fontSize: 11,
                color: "#5E7250",
                backgroundColor: "rgba(125,142,108,0.18)",
              }}
              title={`${globalTopDomain.count} citations across ${globalTopDomain.engines.length} engine${globalTopDomain.engines.length === 1 ? "" : "s"}`}
            >
              {globalTopDomain.count}× cited
            </span>
            <div className="flex items-center gap-1">
              {globalTopDomain.engines.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: `${MODEL_COLOR[e]}26`,
                  }}
                  title={`Cited by ${AI_MODELS.find((m) => m.id === e)?.name ?? e}`}
                >
                  <EngineIcon id={e} size={10} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-engine cards — 2×2 grid for the half-width slot, compact
          chrome (smaller header strip + smaller stats + 3 top sources
          as horizontal mini-bars). Bottom leader strip + per-card
          "See engine prompts" link were dropped (redundant with the
          top share bar + page-level Full tracker link). */}
      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {sorted.map((s, i) => {
          const accent = MODEL_COLOR[s.id];
          const engineTopMax = s.topDomains[0]?.count ?? 1;
          const accentTint = `${accent}1F`; // ~12% alpha
          const accentTintStrong = `${accent}33`; // ~20% alpha

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
              className="rounded-[var(--radius-md)] border bg-[var(--color-bg)] overflow-hidden flex flex-col"
              style={{
                borderColor: accentTintStrong,
                borderTopWidth: 3,
                borderTopColor: accent,
              }}
            >
              {/* Compact header strip — icon + name + share % */}
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${accentTint}, transparent 80%)`,
                }}
              >
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accentTintStrong }}
                >
                  <EngineIcon id={s.id} size={12} />
                </div>
                <span
                  className="font-semibold text-[var(--color-fg)] flex-1 truncate"
                  style={{ fontSize: 12.5 }}
                >
                  {s.name}
                </span>
                <span
                  className="tabular-nums font-bold rounded-full px-1.5 py-0.5"
                  style={{
                    fontSize: 10.5,
                    color: accent,
                    backgroundColor: accentTint,
                  }}
                >
                  {s.share}%
                </span>
              </div>

              <div className="p-3 pt-2.5 flex flex-col flex-1">
                {/* Sources / Citations stats — single inline row at the
                    smaller font, since the half-width box doesn't have
                    room for the original 26px display values. */}
                <div className="flex items-baseline gap-3 mb-2.5">
                  <div className="flex items-baseline gap-1">
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: accent,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.uniqueDomains}
                    </span>
                    <span
                      className="text-[var(--color-fg-muted)] uppercase"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.06em",
                      }}
                    >
                      sources
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 ml-auto">
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: accent,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.totalCitations}
                    </span>
                    <span
                      className="text-[var(--color-fg-muted)] uppercase"
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.06em",
                      }}
                    >
                      cites
                    </span>
                  </div>
                </div>

                {/* Top 3 sources as horizontal mini-bars */}
                <div
                  className="space-y-2 pt-2.5 border-t flex-1"
                  style={{ borderColor: accentTintStrong }}
                >
                  {s.topDomains.map((d) => {
                    const widthPct = Math.max(8, (d.count / engineTopMax) * 100);
                    return (
                      <div key={d.domain}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <a
                            href={`https://${d.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] truncate flex-1 hover:underline"
                            style={{ fontSize: 11, fontWeight: 500 }}
                            title={`Visit ${d.domain}`}
                          >
                            {d.domain}
                          </a>
                          <ExternalLink className="h-2.5 w-2.5 text-[var(--color-fg-muted)] shrink-0" />
                          <span
                            className="font-semibold text-[var(--color-fg)] tabular-nums shrink-0"
                            style={{ fontSize: 11 }}
                          >
                            {d.count}
                          </span>
                        </div>
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{ backgroundColor: "var(--color-border)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: accent,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
