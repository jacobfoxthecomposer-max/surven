"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Link2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import type { ScanResult, ModelName } from "@/types/database";

const COLORS = {
  primary: "#96A283",
};

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

// ─── Three card palettes ─────────────────────────────────────────────────
// Each mini-card uses a distinct accent + icon so the eye can scan the
// panel and see "three different action surfaces" at a glance.

const SOURCES_PALETTE = {
  accent: "#7E6B17",
  accentText: "#5C4D0E",
  gradient:
    "linear-gradient(135deg, rgba(184,160,48,0.18) 0%, rgba(184,160,48,0.03) 100%)",
  HeaderIcon: Link2,
  tag: "SOURCES TO CLAIM",
};

const ENGINES_PALETTE = {
  accent: "#C97B45",
  accentText: "#8C5A1E",
  gradient:
    "linear-gradient(135deg, rgba(199,123,69,0.20) 0%, rgba(199,123,69,0.03) 100%)",
  HeaderIcon: Cpu,
  tag: "ENGINES TO FIX",
};

const DEFEND_PALETTE = {
  accent: "#96A283",
  accentText: "#4A5E3A",
  gradient:
    "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(150,162,131,0.04) 100%)",
  HeaderIcon: ShieldCheck,
  tag: "PROMPTS TO DEFEND",
};

interface SourceGap {
  domain: string;
  competitors: string[];
  /** Total citations across competitors. */
  count: number;
}

interface EngineGap {
  engine: string;
  competitor: string;
  competitorPct: number;
  yourPct: number;
  gap: number;
}

interface DefendItem {
  prompt: string;
  engineCount: number;
}

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
}

export function CompetitorFixActions({
  results,
  businessName,
  competitors,
}: Props) {
  const { sources, engines, defends } = useMemo(() => {
    // ── 1. Citation source gaps ──────────────────────────────────────
    // Domains AI cites for at least one competitor but never for you.
    // These are the highest-ROI listings to chase next.
    const yourDomains = new Set<string>();
    const compDomainHits = new Map<string, Map<string, number>>();
    for (const r of results) {
      if (!r.citations) continue;
      for (const domain of r.citations) {
        if (r.business_mentioned) yourDomains.add(domain);
        if (r.competitor_mentions) {
          for (const c of competitors) {
            if (r.competitor_mentions[c]) {
              if (!compDomainHits.has(domain)) compDomainHits.set(domain, new Map());
              const inner = compDomainHits.get(domain)!;
              inner.set(c, (inner.get(c) ?? 0) + 1);
            }
          }
        }
      }
    }
    const sourceGapList: SourceGap[] = [];
    for (const [domain, byComp] of compDomainHits) {
      if (yourDomains.has(domain)) continue;
      const competitors = Array.from(byComp.keys());
      const count = Array.from(byComp.values()).reduce((a, b) => a + b, 0);
      sourceGapList.push({ domain, competitors, count });
    }
    sourceGapList.sort((a, b) => b.count - a.count);

    // ── 2. Engine head-to-head gaps ──────────────────────────────────
    // For each engine: your visibility vs the strongest competitor's.
    // Only surface engines where a competitor leads you.
    const engineList: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    const engineGapList: EngineGap[] = [];
    for (const m of engineList) {
      const modelResults = results.filter((r) => r.model_name === m);
      if (modelResults.length === 0) continue;
      const yourPct = Math.round(
        (modelResults.filter((r) => r.business_mentioned).length /
          modelResults.length) *
          100,
      );
      let topCompetitor: string | null = null;
      let topPct = 0;
      for (const c of competitors) {
        const relevant = modelResults.filter(
          (r) => r.competitor_mentions && c in r.competitor_mentions,
        );
        if (relevant.length === 0) continue;
        const compPct = Math.round(
          (relevant.filter((r) => r.competitor_mentions[c]).length /
            relevant.length) *
            100,
        );
        if (compPct > topPct) {
          topPct = compPct;
          topCompetitor = c;
        }
      }
      if (topCompetitor && topPct > yourPct) {
        engineGapList.push({
          engine: MODEL_LABELS[m],
          competitor: topCompetitor,
          competitorPct: topPct,
          yourPct,
          gap: topPct - yourPct,
        });
      }
    }
    engineGapList.sort((a, b) => b.gap - a.gap);

    // ── 3. Solo wins to defend ───────────────────────────────────────
    // Prompts where YOU appear and no competitor does. Highest engine
    // coverage = most exposed when a competitor publishes new content.
    const defendMap = new Map<string, Set<string>>();
    for (const r of results) {
      if (!r.business_mentioned) continue;
      if (!r.competitor_mentions) continue;
      const anyComp = competitors.some((c) => r.competitor_mentions[c]);
      if (anyComp) continue;
      if (!defendMap.has(r.prompt_text)) defendMap.set(r.prompt_text, new Set());
      defendMap.get(r.prompt_text)!.add(r.model_name);
    }
    const defendList: DefendItem[] = Array.from(defendMap.entries()).map(
      ([prompt, engines]) => ({ prompt, engineCount: engines.size }),
    );
    defendList.sort((a, b) => b.engineCount - a.engineCount);

    return {
      sources: sourceGapList.slice(0, 3),
      engines: engineGapList.slice(0, 3),
      defends: defendList.slice(0, 3),
    };
  }, [results, competitors]);

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] flex flex-col h-full overflow-hidden"
      style={{ borderColor: "rgba(150,162,131,0.45)" }}
    >
      {/* Outer panel header */}
      <div
        className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2.5"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div
          className="h-7 w-7 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />
        </div>
        <SectionHeading
          text="Ways to take the lead"
          info="Three distinct levers — citation sources, engine performance, and your defensive wins. Each links to the page where you can act on it."
        />
      </div>

      {/* Three nested mini-cards stacked, sharing the available column height */}
      <div className="p-3 flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        <SourcesCard items={sources} />
        <EnginesCard items={engines} businessName={businessName} />
        <DefendCard items={defends} businessName={businessName} />
      </div>
    </div>
  );
}

// ─── Card 1: Sources to claim ────────────────────────────────────────────

function SourcesCard({ items }: { items: SourceGap[] }) {
  const palette = SOURCES_PALETTE;
  return (
    <NestedShell
      palette={palette}
      title={`${items.length} ${items.length === 1 ? "source" : "sources"} to claim`}
      summary="domains citing competitors, not you"
      footerHref="/citation-insights"
      footerLabel="See all citation sources"
      empty="You appear on every source AI is citing for competitors."
    >
      {items.map((s) => (
        <Row
          key={s.domain}
          palette={palette}
          icon={Link2}
          title={s.domain}
          subtitle={`Cited for ${s.competitors.slice(0, 2).join(", ")}${s.competitors.length > 2 ? ` +${s.competitors.length - 2}` : ""}`}
          pill={`${s.count}×`}
        />
      ))}
    </NestedShell>
  );
}

// ─── Card 2: Engines to fix ──────────────────────────────────────────────

function EnginesCard({
  items,
  businessName,
}: {
  items: EngineGap[];
  businessName: string;
}) {
  const palette = ENGINES_PALETTE;
  return (
    <NestedShell
      palette={palette}
      title={`${items.length} ${items.length === 1 ? "engine" : "engines"} to fix`}
      summary="biggest competitor lead per engine"
      footerHref="/ai-visibility-tracker"
      footerLabel="View engine performance"
      empty={`No engine where a competitor outranks ${businessName}.`}
    >
      {items.map((g) => (
        <Row
          key={g.engine}
          palette={palette}
          icon={Cpu}
          title={g.engine}
          subtitle={`${g.competitor} ${g.competitorPct}% · you ${g.yourPct}%`}
          pill={`+${g.gap}%`}
        />
      ))}
    </NestedShell>
  );
}

// ─── Card 3: Prompts to defend ───────────────────────────────────────────

function DefendCard({
  items,
  businessName,
}: {
  items: DefendItem[];
  businessName: string;
}) {
  const palette = DEFEND_PALETTE;
  return (
    <NestedShell
      palette={palette}
      title={`${items.length} ${items.length === 1 ? "prompt" : "prompts"} to defend`}
      summary="solo wins competitors could chase"
      footerHref="/prompts"
      footerLabel="Watch in Prompt Tracker"
      empty={`${businessName} doesn't currently solo-rank — every win is shared.`}
    >
      {items.map((d, i) => (
        <Row
          key={i}
          palette={palette}
          icon={CheckCircle2}
          title={`"${d.prompt}"`}
          subtitle={`Solo on ${d.engineCount}/4 engines`}
          pill={`${d.engineCount}/4`}
          titleIsPrompt
        />
      ))}
    </NestedShell>
  );
}

// ─── Shared shell (header + scrollable rows + footer CTA) ────────────────

interface Palette {
  accent: string;
  accentText: string;
  gradient: string;
  HeaderIcon: typeof Sparkles;
  tag: string;
}

function NestedShell({
  palette,
  title,
  summary,
  footerHref,
  footerLabel,
  empty,
  children,
}: {
  palette: Palette;
  title: string;
  summary: string;
  footerHref: string;
  footerLabel: string;
  empty: string;
  children: React.ReactNode;
}) {
  const HeaderIcon = palette.HeaderIcon;
  const isEmpty = Array.isArray(children) && children.length === 0;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden flex-1 min-h-0">
      {/* Mini header */}
      <div
        className="px-3 py-2"
        style={{
          background: palette.gradient,
          borderLeft: `3px solid ${palette.accent}`,
        }}
      >
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <HeaderIcon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: palette.accent }}
            />
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15.5,
                fontWeight: 500,
                color: "var(--color-fg)",
                letterSpacing: "-0.005em",
                lineHeight: 1.15,
              }}
            >
              {title}
            </h3>
          </div>
          <p
            className="text-[var(--color-fg-muted)]"
            style={{ fontSize: 10.5, lineHeight: 1.3 }}
          >
            {summary}
          </p>
        </div>
      </div>

      {/* Rows */}
      {isEmpty ? (
        <p
          className="text-[var(--color-fg-muted)] p-3 text-center"
          style={{ fontSize: 11.5 }}
        >
          {empty}
        </p>
      ) : (
        <div className="px-2 pt-1.5 pb-1.5 flex-1 flex flex-col gap-1.5 min-h-0">
          {children}
        </div>
      )}

      {/* Footer CTA — links to the page where the user can act on this card */}
      <Link
        href={footerHref}
        className="group px-3 py-2 border-t border-[var(--color-border)] mt-auto inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
        style={{ fontSize: 12, color: palette.accentText }}
      >
        {footerLabel}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}

// ─── Single row used by all three card variants ──────────────────────────

function Row({
  palette,
  icon: Icon,
  title,
  subtitle,
  pill,
  titleIsPrompt = false,
}: {
  palette: Palette;
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  pill?: string;
  /** Use display font + subtle italics for prompt text. */
  titleIsPrompt?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 flex items-start gap-2 hover:bg-[var(--color-surface-alt)]/40 transition-colors flex-1 min-h-0"
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0 mt-0.5"
        style={{ color: palette.accent }}
      />
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className="leading-snug truncate"
            style={
              titleIsPrompt
                ? {
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--color-fg)",
                    letterSpacing: "-0.005em",
                    lineHeight: 1.2,
                  }
                : {
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                    lineHeight: 1.2,
                  }
            }
          >
            {title}
          </p>
          {pill && (
            <span
              className="rounded-full px-1.5 py-0.5 font-bold tabular-nums shrink-0"
              style={{
                fontSize: 10,
                backgroundColor: `${palette.accent}1F`,
                color: palette.accentText,
              }}
            >
              {pill}
            </span>
          )}
        </div>
        <p
          className="text-[var(--color-fg-muted)]"
          style={{ fontSize: 11, lineHeight: 1.35 }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
