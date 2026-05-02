"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, AlertCircle, Target } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import {
  AUTHORITY_LABEL,
  CATEGORY_LABEL,
  getAuthority,
  getCategory,
} from "@/utils/citationAuthority";
import { AI_MODELS } from "@/utils/constants";
import type { ScanResult, ModelName } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface CitationFooterDiagnosticProps {
  results: ScanResult[];
  businessName: string;
}

interface DiagItem {
  text: string;
  href: string;
  cta: string;
}

interface Diagnostic {
  working: DiagItem[];
  watching: DiagItem[];
  next: DiagItem[];
}

function buildDiagnostics(
  results: ScanResult[],
  businessName: string,
): Diagnostic {
  const working: DiagItem[] = [];
  const watching: DiagItem[] = [];
  const next: DiagItem[] = [];

  // Build domain map
  const domainMap = new Map<
    string,
    { count: number; listed: boolean; engines: Set<ModelName> }
  >();
  for (const r of results) {
    if (!r.citations) continue;
    for (const d of r.citations) {
      const ex = domainMap.get(d) ?? {
        count: 0,
        listed: false,
        engines: new Set<ModelName>(),
      };
      ex.count++;
      ex.engines.add(r.model_name);
      if (r.business_mentioned) ex.listed = true;
      domainMap.set(d, ex);
    }
  }

  const domains = Array.from(domainMap.entries()).map(([domain, v]) => ({
    domain,
    count: v.count,
    authority: getAuthority(domain),
    category: getCategory(domain),
    engines: Array.from(v.engines),
    listed: v.listed,
  }));

  const listed = domains.filter((d) => d.listed);
  const gaps = domains.filter((d) => !d.listed);
  const highAuthListed = listed.filter((d) => d.authority === "high");
  const highAuthGaps = gaps
    .filter((d) => d.authority === "high")
    .sort((a, b) => b.count - a.count);
  const topListed = listed.sort((a, b) => b.count - a.count)[0];

  // Per-engine source breadth
  const engineSources = new Map<ModelName, number>();
  for (const m of AI_MODELS) {
    engineSources.set(m.id as ModelName, 0);
  }
  const engineDomainSet = new Map<ModelName, Set<string>>();
  for (const m of AI_MODELS) {
    engineDomainSet.set(m.id as ModelName, new Set());
  }
  for (const r of results) {
    if (!r.citations) continue;
    const set = engineDomainSet.get(r.model_name);
    if (!set) continue;
    for (const d of r.citations) set.add(d);
  }
  for (const [id, set] of engineDomainSet) {
    engineSources.set(id, set.size);
  }
  const engineEntries = Array.from(engineSources.entries()).filter(
    ([, c]) => c > 0,
  );
  const broadest = engineEntries.sort((a, b) => b[1] - a[1])[0];
  const narrowest = engineEntries.slice().sort((a, b) => a[1] - b[1])[0];

  // ===== What's working =====
  if (topListed) {
    working.push({
      text: `${topListed.domain} cites ${businessName} ${topListed.count}× across ${topListed.engines.length} engine${topListed.engines.length === 1 ? "" : "s"}.`,
      href: "/competitor-comparison",
      cta: "Compare moat",
    });
  }
  if (highAuthListed.length > 0) {
    working.push({
      text: `${highAuthListed.length} high-authority source${highAuthListed.length === 1 ? "" : "s"} already naming you.`,
      href: "/ai-visibility-tracker",
      cta: "Tracker detail",
    });
  }
  if (broadest && broadest[1] >= 3) {
    working.push({
      text: `${MODEL_LABELS[broadest[0]]} pulls from ${broadest[1]} sources for you — broadest coverage.`,
      href: "/prompts",
      cta: "See prompts",
    });
  }
  if (working.length === 0) {
    working.push({
      text: "Run more scans to surface citation strengths.",
      href: "/dashboard",
      cta: "Run scan",
    });
  }

  // ===== What to watch =====
  if (highAuthGaps.length > 0) {
    const top = highAuthGaps[0];
    watching.push({
      text: `${top.domain} cites your category ${top.count}× but never names ${businessName}.`,
      href: "/audit",
      cta: "Run audit",
    });
  }
  if (narrowest && broadest && narrowest[1] < broadest[1] / 2 && narrowest[1] > 0) {
    watching.push({
      text: `${MODEL_LABELS[narrowest[0]]} only sees ${narrowest[1]} source${narrowest[1] === 1 ? "" : "s"} for you — concentration risk.`,
      href: "/ai-visibility-tracker",
      cta: "Engine view",
    });
  }
  const lowAuthShare =
    listed.length > 0
      ? (listed.filter((d) => d.authority === "low").length / listed.length) *
        100
      : 0;
  if (lowAuthShare > 40) {
    watching.push({
      text: `${Math.round(lowAuthShare)}% of your citations come from low-authority sources.`,
      href: "/competitor-comparison",
      cta: "See competitors",
    });
  }
  if (watching.length === 0) {
    watching.push({
      text: "No major citation gaps detected this scan.",
      href: "/audit",
      cta: "Run audit anyway",
    });
  }

  // ===== What to do next =====
  if (highAuthGaps.length > 0) {
    next.push({
      text: `Get listed on ${highAuthGaps[0].domain} (${AUTHORITY_LABEL[highAuthGaps[0].authority]} ${CATEGORY_LABEL[highAuthGaps[0].category].toLowerCase().replace(/s$/, "")}).`,
      href: "/audit",
      cta: "GEO audit",
    });
  }
  next.push({
    text: "Compare your citation mix to your top competitors.",
    href: "/competitor-comparison",
    cta: "Compare",
  });
  if (topListed) {
    next.push({
      text: `Refresh your ${topListed.domain} listing every 60–90 days.`,
      href: "/crawlability-audit",
      cta: "Crawl audit",
    });
  }

  return {
    working: working.slice(0, 2),
    watching: watching.slice(0, 2),
    next: next.slice(0, 2),
  };
}

function DiagColumn({
  title,
  icon: Icon,
  color,
  items,
}: {
  title: string;
  icon: typeof CheckCircle2;
  color: string;
  items: DiagItem[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {title}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 pb-2.5 border-b border-[var(--color-border)] last:border-b-0 last:pb-0"
          >
            <p className="text-xs text-[var(--color-fg-secondary)] leading-snug flex-1">
              {item.text}
            </p>
            <Link
              href={item.href}
              className="inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap transition-opacity hover:opacity-70 shrink-0 mt-0.5"
              style={{ color }}
            >
              {item.cta}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CitationFooterDiagnostic({
  results,
  businessName,
}: CitationFooterDiagnosticProps) {
  const diag = useMemo(
    () => buildDiagnostics(results, businessName),
    [results, businessName],
  );

  if (results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
    >
      <div className="mb-5">
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(20px, 2vw, 26px)",
            fontWeight: 600,
            lineHeight: 1.2,
            color: "var(--color-fg)",
          }}
        >
          Where to focus next
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">
          Specific signals from this scan, with the right tool to act on each.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DiagColumn
          title="What's working"
          icon={CheckCircle2}
          color={SURVEN_SEMANTIC.good}
          items={diag.working}
        />
        <DiagColumn
          title="What to watch"
          icon={AlertCircle}
          color={SURVEN_SEMANTIC.bad}
          items={diag.watching}
        />
        <DiagColumn
          title="What to do next"
          icon={Target}
          color={SURVEN_SEMANTIC.mid}
          items={diag.next}
        />
      </div>
    </motion.div>
  );
}
