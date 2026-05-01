"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";
import type { SentimentDataPoint } from "@/features/sentiment/hooks/useSentimentHistory";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface Diagnostic {
  title: string;
  body: string;
  href: string;
  cta: string;
}

interface Props {
  results: ScanResult[];
  history: SentimentDataPoint[];
}

export function SentimentDiagnostic({ results, history }: Props) {
  const { wins, leaks } = useMemo(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    const wins: Diagnostic[] = [];
    const leaks: Diagnostic[] = [];

    if (total === 0) return { wins, leaks };

    // Per-engine positive rate
    const models: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    const perModel = models.map((m) => {
      const mm = mentioned.filter((r) => r.model_name === m);
      const t = mm.length;
      if (t === 0) return null;
      const pos = mm.filter((r) => r.sentiment === "positive").length;
      const neg = mm.filter((r) => r.sentiment === "negative").length;
      return { model: m, total: t, positivePct: Math.round((pos / t) * 100), negativeCount: neg };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    const sortedByPositive = [...perModel].sort((a, b) => b.positivePct - a.positivePct);
    const best = sortedByPositive[0];
    const worst = sortedByPositive.length > 1 ? sortedByPositive[sortedByPositive.length - 1] : null;

    // WIN: strongest engine
    if (best && best.positivePct >= 60) {
      wins.push({
        title: `${MODEL_LABELS[best.model]} is your strongest engine`,
        body: `${best.positivePct}% positive across ${best.total} mention${best.total !== 1 ? "s" : ""}. Use this engine's framing as the template for content rewrites elsewhere.`,
        href: "/prompts",
        cta: "View prompts",
      });
    }

    // WIN: trend up
    if (history.length >= 2) {
      const delta = history[history.length - 1].positivePct - history[history.length - 2].positivePct;
      if (delta >= 5) {
        wins.push({
          title: `Positive sentiment up ${delta}% this period`,
          body: `Recent scan landed at ${history[history.length - 1].positivePct}% positive — the biggest jump in your last few scans. Whatever you shipped is moving the needle.`,
          href: "/citation-insights",
          cta: "See citation sources",
        });
      }
    }

    // WIN: zero negatives
    const totalNegatives = mentioned.filter((r) => r.sentiment === "negative").length;
    if (totalNegatives === 0 && total >= 5) {
      wins.push({
        title: "Zero negative mentions",
        body: `All ${total} AI mentions describe your brand in positive or neutral terms. Nothing critical surfacing across any engine.`,
        href: "/prompts",
        cta: "Browse mentions",
      });
    }

    // WIN: high overall positive rate
    const overallPositive = Math.round((mentioned.filter((r) => r.sentiment === "positive").length / total) * 100);
    if (overallPositive >= 70 && wins.length < 3) {
      wins.push({
        title: `Overall sentiment at ${overallPositive}% positive`,
        body: `Across all engines you're well above the 70% benchmark. Most AI tools describe your brand favorably when they mention you.`,
        href: "/prompts",
        cta: "Audit prompts",
      });
    }

    // LEAK: weakest engine
    if (worst && worst.positivePct < 50 && worst.model !== best?.model) {
      leaks.push({
        title: `${MODEL_LABELS[worst.model]} is bleeding sentiment`,
        body: `Only ${worst.positivePct}% positive across ${worst.total} mention${worst.total !== 1 ? "s" : ""}${worst.negativeCount > 0 ? `, with ${worst.negativeCount} negative` : ""}. Highest-leverage fix on this page.`,
        href: "/audit",
        cta: "Run audit",
      });
    }

    // LEAK: trend down
    if (history.length >= 2) {
      const delta = history[history.length - 1].positivePct - history[history.length - 2].positivePct;
      if (delta <= -5) {
        leaks.push({
          title: `Sentiment dropped ${Math.abs(delta)}% this period`,
          body: `Recent scan landed at ${history[history.length - 1].positivePct}% positive — down from ${history[history.length - 2].positivePct}%. Check what content shifted in the last 2 weeks.`,
          href: "/citation-insights",
          cta: "Review citations",
        });
      }
    }

    // LEAK: any negatives at all
    if (totalNegatives > 0) {
      const negativePct = Math.round((totalNegatives / total) * 100);
      leaks.push({
        title: `${totalNegatives} negative mention${totalNegatives !== 1 ? "s" : ""} (${negativePct}%)`,
        body: `${totalNegatives} of ${total} AI responses use critical or dismissive language. Each one is a specific prompt + engine combo to neutralize via content correction.`,
        href: "/prompts",
        cta: "View negatives",
      });
    }

    // LEAK: low coverage signal
    if (total < 5) {
      leaks.push({
        title: "Low mention volume",
        body: `Only ${total} AI mention${total !== 1 ? "s" : ""} this period — sentiment signal is unreliable below 5 mentions. Push for more visibility before optimizing tone.`,
        href: "/prompts",
        cta: "View prompts",
      });
    }

    return { wins: wins.slice(0, 3), leaks: leaks.slice(0, 3) };
  }, [results, history]);

  if (wins.length === 0 && leaks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* WHAT'S WORKING */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-3.5 w-3.5" style={{ color: SURVEN_SEMANTIC.goodAlt }} />
          <span
            className="text-[10px] font-bold tracking-wider uppercase"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          >
            What&apos;s working
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "var(--color-fg)",
            marginBottom: 4,
          }}
        >
          {wins.length > 0 ? `${wins.length} win${wins.length !== 1 ? "s" : ""} this period` : "Nothing standout yet"}
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">
          Patterns where your sentiment is outperforming — keep the pressure on.
        </p>

        {wins.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)] py-6 text-center">
            Run more scans to surface positive patterns.
          </p>
        ) : (
          <div className="space-y-3">
            {wins.map((w, i) => (
              <DiagnosticItem key={i} item={w} accent={SURVEN_SEMANTIC.goodAlt} />
            ))}
          </div>
        )}
      </Card>

      {/* WHAT TO WATCH */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: SURVEN_SEMANTIC.bad }} />
          <span
            className="text-[10px] font-bold tracking-wider uppercase"
            style={{ color: SURVEN_SEMANTIC.bad }}
          >
            What to watch
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "var(--color-fg)",
            marginBottom: 4,
          }}
        >
          {leaks.length > 0 ? `${leaks.length} leak${leaks.length !== 1 ? "s" : ""} costing sentiment` : "All clear for now"}
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">
          Highest-leverage fixes — these are where sentiment is bleeding.
        </p>

        {leaks.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)] py-6 text-center">
            No critical leaks detected. Sentiment is healthy across the board.
          </p>
        ) : (
          <div className="space-y-3">
            {leaks.map((l, i) => (
              <DiagnosticItem key={i} item={l} accent={SURVEN_SEMANTIC.bad} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DiagnosticItem({ item, accent }: { item: Diagnostic; accent: string }) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
      style={{ background: "var(--color-surface-alt)" }}
    >
      <p className="text-sm font-semibold text-[var(--color-fg)] mb-1">{item.title}</p>
      <p className="text-xs text-[var(--color-fg-secondary)] leading-snug mb-2">{item.body}</p>
      <Link
        href={item.href}
        className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
        style={{ color: accent }}
      >
        <span>{item.cta}</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
