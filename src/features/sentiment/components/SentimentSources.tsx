"use client";

/**
 * Sources driving your sentiment — expanded view of which third-party
 * domains are shaping the AI verdict on the brand. Each row groups
 * results by citation domain, computes a pos / neu / neg sentiment
 * split, surfaces the most representative excerpt, and color-codes the
 * row based on the net sentiment so the user can scan top offenders +
 * top advocates at a glance.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Quote } from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult } from "@/types/database";

interface Props {
  results: ScanResult[];
}

interface SourceAggregate {
  domain: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  /** Most representative excerpt — picks a result where the sentiment
   *  matches the dominant tone for this domain, falling back to the
   *  longest excerpt available. */
  excerpt: string | null;
  excerptSentiment: "positive" | "neutral" | "negative" | null;
}

function netVerdict(s: SourceAggregate): {
  word: string;
  tone: "positive" | "neutral" | "negative";
  color: string;
  bg: string;
} {
  if (s.positivePct >= 60)
    return {
      word: "Positive",
      tone: "positive",
      color: SURVEN_SEMANTIC.good,
      bg: "rgba(150,162,131,0.18)",
    };
  if (s.negativePct >= 40)
    return {
      word: "Negative",
      tone: "negative",
      color: SURVEN_SEMANTIC.bad,
      bg: "rgba(181,70,49,0.14)",
    };
  if (s.positivePct >= s.negativePct)
    return {
      word: "Mixed",
      tone: "neutral",
      color: "#7E6B17",
      bg: "rgba(184,160,48,0.18)",
    };
  return {
    word: "Mixed",
    tone: "neutral",
    color: "#7E6B17",
    bg: "rgba(184,160,48,0.18)",
  };
}

function aggregateSources(results: ScanResult[]): SourceAggregate[] {
  type Bucket = {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    excerpts: { sentiment: ScanResult["sentiment"]; text: string }[];
  };
  const map = new Map<string, Bucket>();
  for (const r of results) {
    if (!r.business_mentioned || !r.citations || r.citations.length === 0)
      continue;
    for (const raw of r.citations) {
      const domain = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      const b: Bucket =
        map.get(domain) ?? {
          total: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
          excerpts: [],
        };
      b.total += 1;
      if (r.sentiment === "positive") b.positive += 1;
      else if (r.sentiment === "negative") b.negative += 1;
      else if (r.sentiment === "neutral") b.neutral += 1;
      if (r.response_text) {
        b.excerpts.push({
          sentiment: r.sentiment,
          text: r.response_text,
        });
      }
      map.set(domain, b);
    }
  }
  const sources: SourceAggregate[] = [];
  for (const [domain, b] of map.entries()) {
    if (b.total === 0) continue;
    const positivePct = Math.round((b.positive / b.total) * 100);
    const negativePct = Math.round((b.negative / b.total) * 100);
    const neutralPct = Math.max(0, 100 - positivePct - negativePct);
    const dominant: ScanResult["sentiment"] =
      b.positive >= b.negative && b.positive >= b.neutral
        ? "positive"
        : b.negative >= b.neutral
          ? "negative"
          : "neutral";
    const matchingExcerpts = b.excerpts.filter(
      (e) => e.sentiment === dominant,
    );
    const pickFrom = matchingExcerpts.length > 0 ? matchingExcerpts : b.excerpts;
    const best = pickFrom.reduce(
      (longest, cur) => (cur.text.length > longest.text.length ? cur : longest),
      pickFrom[0],
    );
    sources.push({
      domain,
      total: b.total,
      positive: b.positive,
      neutral: b.neutral,
      negative: b.negative,
      positivePct,
      neutralPct,
      negativePct,
      excerpt: best?.text ?? null,
      excerptSentiment: best?.sentiment ?? null,
    });
  }
  return sources.sort((a, b) => b.total - a.total);
}

export function SentimentSources({ results }: Props) {
  const sources = useMemo(() => aggregateSources(results), [results]);

  // Bucket + rank: strengthening = positive ≥ negative, ranked by raw
  // positive citations (top advocates first). Hurting = negative > positive,
  // ranked by raw negative citations (worst offenders first). Each side is
  // capped at the top 3; the "View all cited sources" footer covers the
  // rest. Empty slots stay empty so the box doesn't pad with filler.
  const strengthening = useMemo(
    () =>
      sources
        .filter((s) => s.positive >= s.negative)
        .sort((a, b) => b.positive - a.positive || b.total - a.total)
        .slice(0, 3),
    [sources],
  );
  const hurting = useMemo(
    () =>
      sources
        .filter((s) => s.negative > s.positive)
        .sort((a, b) => b.negative - a.negative || b.total - a.total)
        .slice(0, 3),
    [sources],
  );

  if (sources.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col items-center text-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(150,162,131,0.18)" }}
        >
          <Quote
            className="h-5 w-5"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          />
        </div>
        <h3
          className="text-[var(--color-fg)]"
          style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600 }}
        >
          No cited sources yet
        </h3>
        <p
          className="text-[var(--color-fg-muted)] max-w-md"
          style={{ fontSize: 13, lineHeight: 1.55 }}
        >
          AI engines aren&apos;t pulling third-party citations on the prompts
          they answered about your brand this scan. Once they do,
          you&apos;ll see the domains driving each verdict here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <SourcesPanel
        variant="positive"
        title="Sources strengthening your sentiment"
        info="Domains where AI is pulling positive framing about your brand. Keep these sources fresh — every new positive review or article on these domains compounds your authority."
        sources={strengthening}
        emptyMessage="No domains are leaning positive on your brand yet — earning placements on review sites and editorial pieces is the fastest way to seed this list."
      />
      <SourcesPanel
        variant="negative"
        title="Sources hurting your sentiment"
        info="Domains where AI is pulling critical or dismissive framing. These are the highest-leverage sources to address — a public reply, a content refresh, or an author correction here usually flips the verdict on the next scan."
        sources={hurting}
        emptyMessage="Nothing flagged — no cited domain is pushing negative framing on your brand right now."
      />
    </div>
  );
}

// ─── One side of the split (strengthening vs. hurting) ────────────────────

function SourcesPanel({
  variant,
  title,
  info,
  sources,
  emptyMessage,
}: {
  variant: "positive" | "negative";
  title: string;
  info: string;
  sources: SourceAggregate[];
  emptyMessage: string;
}) {
  const accent =
    variant === "positive" ? SURVEN_SEMANTIC.good : SURVEN_SEMANTIC.bad;
  const accentBg =
    variant === "positive"
      ? "rgba(150,162,131,0.18)"
      : "rgba(181,70,49,0.14)";
  const headerGradient =
    variant === "positive"
      ? "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)"
      : "linear-gradient(135deg, rgba(181,70,49,0.16) 0%, rgba(181,70,49,0.03) 100%)";

  const [expanded, setExpanded] = useState<string | null>(
    sources[0]?.domain ?? null,
  );

  const totalCitations = sources.reduce((s, x) => s + x.total, 0);

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] flex flex-col overflow-hidden"
      style={{
        borderColor: "var(--color-border)",
        borderTop: `4px solid ${accent}`,
      }}
    >
      <div
        className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-start justify-between gap-3"
        style={{
          background: headerGradient,
          borderTopLeftRadius: "calc(var(--radius-lg) - 4px)",
          borderTopRightRadius: "calc(var(--radius-lg) - 4px)",
        }}
      >
        <div className="flex items-start gap-2 min-w-0">
          <Quote
            className="h-4 w-4 mt-1 shrink-0"
            style={{ color: accent }}
          />
          <SectionHeading text={title} info={info} />
        </div>
        <span
          className="shrink-0 inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
          style={{ color: accent, backgroundColor: accentBg }}
        >
          {sources.length} {sources.length === 1 ? "domain" : "domains"}
          {totalCitations > 0 && ` · ${totalCitations} cite${totalCitations === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="flex-1 flex flex-col">
        {sources.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-5 py-8">
            <p
              className="text-[var(--color-fg-muted)] max-w-[280px]"
              style={{ fontSize: 12.5, lineHeight: 1.55 }}
            >
              {emptyMessage}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] flex-1">
          {sources.map((s) => {
            const verdict = netVerdict(s);
            const isExpanded = expanded === s.domain;
            return (
              <li key={s.domain}>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((cur) => (cur === s.domain ? null : s.domain))
                  }
                  className="w-full text-left px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_auto] gap-x-3 gap-y-2 items-center hover:bg-[var(--color-surface-alt)]/40 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="min-w-0">
                    <p
                      className="text-[var(--color-fg)] truncate"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {s.domain}
                    </p>
                    <p
                      className="text-[var(--color-fg-muted)] mt-0.5"
                      style={{ fontSize: 11.5 }}
                    >
                      Cited{" "}
                      <span className="font-semibold text-[var(--color-fg)]">
                        {s.total}
                      </span>{" "}
                      time{s.total === 1 ? "" : "s"} ·{" "}
                      <span style={{ color: SURVEN_SEMANTIC.good }}>
                        {s.positive} pos
                      </span>{" "}
                      ·{" "}
                      <span style={{ color: SURVEN_SEMANTIC.neutral }}>
                        {s.neutral} neu
                      </span>{" "}
                      ·{" "}
                      <span style={{ color: SURVEN_SEMANTIC.bad }}>
                        {s.negative} neg
                      </span>
                    </p>
                  </div>
                  <div className="w-full">
                    <SentimentBar source={s} />
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <span
                      className="inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
                      style={{
                        color: verdict.color,
                        backgroundColor: verdict.bg,
                      }}
                    >
                      {verdict.word}
                    </span>
                    <ChevronDown
                      className={
                        "h-4 w-4 transition-transform " +
                        (isExpanded ? "rotate-180" : "")
                      }
                      style={{ color: "var(--color-fg-muted)" }}
                    />
                  </div>
                </button>

                {isExpanded && s.excerpt && (
                  <div className="px-5 pb-4 -mt-1">
                    <div
                      className="rounded-[var(--radius-md)] border p-3 flex items-start gap-2.5"
                      style={{
                        borderColor:
                          s.excerptSentiment === "negative"
                            ? "rgba(181,70,49,0.30)"
                            : s.excerptSentiment === "positive"
                              ? "rgba(150,162,131,0.35)"
                              : "var(--color-border)",
                        background:
                          s.excerptSentiment === "negative"
                            ? "rgba(181,70,49,0.04)"
                            : s.excerptSentiment === "positive"
                              ? "rgba(150,162,131,0.06)"
                              : "var(--color-surface-alt)",
                      }}
                    >
                      <Quote
                        className="h-3.5 w-3.5 mt-1 shrink-0"
                        style={{
                          color:
                            s.excerptSentiment === "negative"
                              ? SURVEN_SEMANTIC.bad
                              : s.excerptSentiment === "positive"
                                ? SURVEN_SEMANTIC.good
                                : "var(--color-fg-muted)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[var(--color-fg)] italic"
                          style={{ fontSize: 13, lineHeight: 1.55 }}
                        >
                          &ldquo;
                          {s.excerpt.length > 320
                            ? s.excerpt.slice(0, 320) + "…"
                            : s.excerpt}
                          &rdquo;
                        </p>
                        <Link
                          href="/citation-insights"
                          className="inline-flex items-center gap-1 mt-2 font-semibold hover:underline"
                          style={{
                            fontSize: 12,
                            color:
                              s.excerptSentiment === "negative"
                                ? SURVEN_SEMANTIC.bad
                                : SURVEN_SEMANTIC.good,
                          }}
                        >
                          See all citations from {s.domain}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          </ul>
        )}
        {/* Footer CTA — always present so users can dive into the full
            citation universe regardless of whether this panel has 0, 1,
            2, or 3 rows above. */}
        <div className="mt-auto px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-end">
          <Link
            href="/citation-insights"
            className="inline-flex items-center gap-1 font-semibold hover:underline transition-opacity hover:opacity-80"
            style={{ fontSize: 12.5, color: accent }}
          >
            View all cited sources
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SentimentBar({ source }: { source: SourceAggregate }) {
  return (
    <div
      className="h-2 rounded-full overflow-hidden flex"
      style={{ background: "var(--color-surface-alt)" }}
      title={`${source.positivePct}% positive · ${source.neutralPct}% neutral · ${source.negativePct}% negative`}
    >
      {source.positivePct > 0 && (
        <div
          style={{
            width: `${source.positivePct}%`,
            backgroundColor: SURVEN_SEMANTIC.good,
            transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      )}
      {source.neutralPct > 0 && (
        <div
          style={{
            width: `${source.neutralPct}%`,
            backgroundColor: SURVEN_SEMANTIC.neutral,
            transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      )}
      {source.negativePct > 0 && (
        <div
          style={{
            width: `${source.negativePct}%`,
            backgroundColor: SURVEN_SEMANTIC.bad,
            transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      )}
    </div>
  );
}
