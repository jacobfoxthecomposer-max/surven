"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Modal } from "@/components/molecules/Modal";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

interface FixAction {
  key: string;
  headline: string;
  oneLiner: string;
  modalBody: string;
}

interface Props {
  results: ScanResult[];
}

export function SentimentFixActions({ results }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const actions = useMemo<FixAction[]>(() => {
    const mentioned = results.filter((r) => r.business_mentioned && r.sentiment);
    const total = mentioned.length;
    const negativeCount = mentioned.filter((r) => r.sentiment === "negative").length;
    const positiveCount = mentioned.filter((r) => r.sentiment === "positive").length;
    const positivePct = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

    const models: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];
    const perModel = models
      .map((m) => {
        const mm = mentioned.filter((r) => r.model_name === m);
        if (mm.length === 0) return null;
        const pos = mm.filter((r) => r.sentiment === "positive").length;
        return { model: m, total: mm.length, positivePct: Math.round((pos / mm.length) * 100) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.positivePct - b.positivePct);

    const weakest = perModel[0] ?? null;
    const weakestLabel = weakest ? MODEL_LABELS[weakest.model] : null;

    const sourceAction: FixAction =
      negativeCount > 0
        ? {
            key: "sources",
            headline: "Fix the sources behind your negative mentions",
            oneLiner: `${negativeCount} negative mention${negativeCount !== 1 ? "s" : ""} all trace back to specific pages AI is reading.`,
            modalBody:
              "AI doesn't invent sentiment — it copies the tone of whatever pages it reads. Open Citation Insights to see which URLs AI is pulling from when it describes you negatively. Then either edit those pages directly if you control them, or publish stronger content elsewhere so AI prioritizes the new framing. Even one or two updated sources can shift sentiment within a scan or two.",
          }
        : positivePct < 70
        ? {
            key: "sources",
            headline: "Replace lukewarm sources with stronger framing",
            oneLiner: "Most of your mentions are neutral, not positive. The source pages aren't doing the work.",
            modalBody:
              "Neutral sentiment usually means the sources AI reads describe you accurately but blandly. Look at what's being cited under Citation Insights, then add concrete details to those pages — specific outcomes, customer names, numbers. AI lifts framing verbatim, so precise positive language beats generic praise every time.",
          }
        : {
            key: "sources",
            headline: "Lock in the sources fueling your positive sentiment",
            oneLiner: "The pages AI is citing right now are working — keep them indexed and refreshed.",
            modalBody:
              "Your positive sentiment is coming from specific sources AI trusts. Open Citation Insights to see which ones. Make sure those pages stay live, get refreshed periodically, and don't drop out of search indexes. If a key source disappears, sentiment usually follows it down within a scan or two.",
          };

    const engineAction: FixAction =
      weakest && weakest.positivePct < 70
        ? {
            key: "engine",
            headline: `Strengthen ${weakestLabel} specifically`,
            oneLiner: `${weakestLabel} is at ${weakest.positivePct}% positive — it's pulling from weaker sources than the others.`,
            modalBody: `Each AI engine has its own favorite source types. Gemini leans on Google reviews and Search results. ChatGPT weights Reddit, editorial sites, and Wikipedia. Claude favors long-form articles and official sites. To fix ${weakestLabel}, focus on the source types it prefers — get more reviews on the right platform, or publish a fresh long-form piece if it's a long-form-leaning engine.`,
          }
        : {
            key: "engine",
            headline: "Diversify your AI source coverage",
            oneLiner: "Engines pull from different mixes — make sure you're showing up in all of them.",
            modalBody:
              "Different AI engines weight different sources. If you're only on Google reviews, Gemini will know you but ChatGPT might not. Spread your presence across review platforms, niche directories, Reddit threads in your industry, and a few editorial mentions. Coverage variety insulates your sentiment from any one engine changing how it reads sources.",
          };

    const reviewAction: FixAction =
      total < 5
        ? {
            key: "reviews",
            headline: "Build mention volume first",
            oneLiner: `Only ${total} AI mention${total !== 1 ? "s" : ""} tracked — sentiment isn't reliable yet.`,
            modalBody:
              "Below 5 mentions, sentiment swings wildly with each new scan. The first move isn't tone — it's visibility. Get listed on the directories your industry uses, ask customers for reviews on Google and Yelp, and pitch one or two niche publications. Once you're consistently mentioned, sentiment work pays off; before then, it's premature.",
          }
        : positivePct < 70
        ? {
            key: "reviews",
            headline: "Push more recent positive reviews",
            oneLiner: "AI weights freshness heavily — old reviews fade out of its memory.",
            modalBody:
              "AI engines re-read sources constantly and rank recent content higher. A steady stream of new reviews — even just 5 to 10 a month on Google, Yelp, and your industry directories — will move sentiment within a few weeks. Volume and freshness matter more than perfect star ratings.",
          }
        : {
            key: "reviews",
            headline: "Keep review velocity steady",
            oneLiner: "Your sentiment is healthy — review pace is what keeps it that way.",
            modalBody:
              "Sentiment decays if review velocity drops. A brand that got 50 reviews two years ago and none since will slowly slide as AI weights newer mentions higher. Keep a routine — ask customers for reviews regularly, even when things are going well. Five fresh ones a month is enough to hold the line.",
          };

    return [sourceAction, engineAction, reviewAction];
  }, [results]);

  const open = actions.find((a) => a.key === openKey) ?? null;

  return (
    <>
      <Card className="h-full flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="h-3.5 w-3.5" style={{ color: SURVEN_SEMANTIC.goodAlt }} />
          <span
            className="text-[10px] font-bold tracking-wider uppercase"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          >
            How to improve
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "var(--color-fg)",
            marginBottom: 4,
          }}
        >
          3 ways to lift your sentiment
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">
          Tap any tip for a plain-English breakdown.
        </p>

        <div className="flex-1 flex flex-col gap-2.5">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => setOpenKey(a.key)}
              className="text-left rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-alt)]/40 transition-colors group"
              style={{ background: "var(--color-surface-alt)" }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-fg)] leading-snug mb-1">
                    {a.headline}
                  </p>
                  <p className="text-[11px] text-[var(--color-fg-secondary)] leading-snug">
                    {a.oneLiner}
                  </p>
                </div>
                <ArrowRight
                  className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  style={{ color: SURVEN_SEMANTIC.goodAlt }}
                />
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Modal
        open={open !== null}
        onClose={() => setOpenKey(null)}
        title={open?.headline}
        className="max-w-lg"
      >
        {open && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
              {open.modalBody}
            </p>

            <div
              className="rounded-[var(--radius-md)] p-3 text-xs flex items-start gap-2"
              style={{
                background: "rgba(150,162,131,0.10)",
                borderLeft: `3px solid ${SURVEN_SEMANTIC.goodAlt}`,
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: SURVEN_SEMANTIC.goodAlt }} />
              <p className="text-[var(--color-fg-secondary)] leading-snug">
                Don&apos;t want to do this yourself? Surven&apos;s managed plans handle the source rewrites, review outreach, and content publishing for you.{" "}
                <Link href="/settings/billing" className="font-semibold hover:underline" style={{ color: SURVEN_SEMANTIC.goodAlt }}>
                  See managed plans →
                </Link>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
