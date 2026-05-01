"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, AlertCircle, Target } from "lucide-react";
import Link from "next/link";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult } from "@/types/database";

const ease = [0.16, 1, 0.3, 1] as const;

interface FooterDiagnosticProps {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
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

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

function buildDiagnostics(
  results: ScanResult[],
  businessName: string,
  competitors: string[],
): Diagnostic {
  const working: DiagItem[] = [];
  const watching: DiagItem[] = [];
  const next: DiagItem[] = [];

  // 1. Find prompts where you appear but no competitor does (advantages)
  const advantagePrompts = new Set<string>();
  // 2. Find prompts where competitors appear but you don't (gaps)
  const gapPromptsByComp = new Map<string, Set<string>>();
  // 3. Engine-level wins/losses
  const engineCompetitorWins = new Map<string, Map<string, number>>();
  const engineYourWins = new Map<string, number>();
  const engineYourLosses = new Map<string, number>();

  for (const r of results) {
    if (!r.competitor_mentions) continue;
    const youMentioned = r.business_mentioned;
    const compsMentioned = competitors.filter(
      (c) => r.competitor_mentions[c] === true,
    );

    if (youMentioned && compsMentioned.length === 0) {
      advantagePrompts.add(r.prompt_text);
      engineYourWins.set(
        r.model_name,
        (engineYourWins.get(r.model_name) ?? 0) + 1,
      );
    }
    if (!youMentioned && compsMentioned.length > 0) {
      engineYourLosses.set(
        r.model_name,
        (engineYourLosses.get(r.model_name) ?? 0) + 1,
      );
      for (const c of compsMentioned) {
        if (!gapPromptsByComp.has(c)) gapPromptsByComp.set(c, new Set());
        gapPromptsByComp.get(c)!.add(r.prompt_text);
        if (!engineCompetitorWins.has(r.model_name))
          engineCompetitorWins.set(r.model_name, new Map());
        const inner = engineCompetitorWins.get(r.model_name)!;
        inner.set(c, (inner.get(c) ?? 0) + 1);
      }
    }
  }

  // What's working
  if (advantagePrompts.size > 0) {
    working.push({
      text: `You alone rank on ${advantagePrompts.size} prompt${advantagePrompts.size === 1 ? "" : "s"}.`,
      href: "/prompts",
      cta: "View prompts",
    });
  }
  const bestEngine = [...engineYourWins.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (bestEngine) {
    working.push({
      text: `${ENGINE_LABELS[bestEngine[0]] ?? bestEngine[0]} cites you on ${bestEngine[1]} solo prompt${bestEngine[1] === 1 ? "" : "s"}.`,
      href: "/citation-insights",
      cta: "See citations",
    });
  }
  if (working.length === 0) {
    working.push({
      text: "Run more scans to surface advantages.",
      href: "/dashboard",
      cta: "Run scan",
    });
  }

  // What to watch
  const topGapComp = [...gapPromptsByComp.entries()].sort(
    (a, b) => b[1].size - a[1].size,
  )[0];
  if (topGapComp) {
    watching.push({
      text: `${topGapComp[0]} ranks on ${topGapComp[1].size} prompt${topGapComp[1].size === 1 ? "" : "s"} you don't.`,
      href: "/prompts",
      cta: "See prompts",
    });
  }
  const worstEngine = [...engineYourLosses.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (worstEngine) {
    watching.push({
      text: `Lowest visibility on ${ENGINE_LABELS[worstEngine[0]] ?? worstEngine[0]} (${worstEngine[1]} missed prompt${worstEngine[1] === 1 ? "" : "s"}).`,
      href: "/ai-visibility-tracker",
      cta: "Tracker detail",
    });
  }
  if (watching.length === 0) {
    watching.push({
      text: "No major gaps detected.",
      href: "/prompts",
      cta: "Browse prompts",
    });
  }

  // What to do next
  if (topGapComp) {
    next.push({
      text: `Audit ${businessName} for missing schema and citations.`,
      href: "/audit",
      cta: "Run GEO audit",
    });
  }
  if (gapPromptsByComp.size > 0) {
    next.push({
      text: "Find authority sources competitors use that you don't.",
      href: "/citation-insights",
      cta: "Citation gaps",
    });
  }
  next.push({
    text: "Compare crawlability against ranking competitors.",
    href: "/crawlability-audit",
    cta: "Crawlability",
  });

  return { working: working.slice(0, 2), watching: watching.slice(0, 2), next: next.slice(0, 2) };
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

export function FooterDiagnostic({
  results,
  businessName,
  competitors,
}: FooterDiagnosticProps) {
  if (results.length === 0 || competitors.length === 0) return null;

  const diag = buildDiagnostics(results, businessName, competitors);

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
