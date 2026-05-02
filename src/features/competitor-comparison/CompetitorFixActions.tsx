"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
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

// Per-engine optimization lever — used to write engine-specific advice in the
// modal body when we name a worst-performing engine.
const ENGINE_LEVERS: Record<ModelName, string> = {
  chatgpt:
    "ChatGPT leans on Reddit threads, Wikipedia, and editorial articles. Get yourself mentioned on a couple of high-traffic Reddit threads in your category and pitch one or two niche publications — those are the sources it weights highest.",
  claude:
    "Claude favors long-form articles, official sites, and structured documentation. Publish (or commission) a thorough piece — a comparison guide, a buyer's guide, or a definitive how-to — on a domain Claude already trusts.",
  gemini:
    "Gemini pulls heavily from Google Search, Google reviews, and Google Maps. Cleaning up your Google Business Profile, getting fresh reviews on Google specifically, and ensuring your site ranks for the prompt's keywords moves Gemini fastest.",
  google_ai:
    "Google AI Overview reads the top organic search results for the prompt. Win this engine by ranking the page that directly answers the query — schema markup, an FAQ section, and clear answer-first copy on the page that targets that keyword.",
};

interface FixAction {
  key: string;
  headline: string;
  oneLiner: string;
  modalBody: string;
}

interface Props {
  results: ScanResult[];
  businessName: string;
  competitors: string[];
}

function calcModelScore(
  results: ScanResult[],
  model: ModelName,
  competitor?: string,
): number | null {
  const modelResults = results.filter((r) => r.model_name === model);
  if (modelResults.length === 0) return null;
  if (!competitor) {
    const hits = modelResults.filter((r) => r.business_mentioned).length;
    return Math.round((hits / modelResults.length) * 100);
  }
  const relevant = modelResults.filter(
    (r) => r.competitor_mentions && competitor in r.competitor_mentions,
  );
  if (relevant.length === 0) return null;
  const hits = relevant.filter((r) => r.competitor_mentions[competitor]).length;
  if (hits === 0) return null;
  return Math.round((hits / relevant.length) * 100);
}

export function CompetitorFixActions({
  results,
  businessName,
  competitors,
}: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const actions = useMemo<FixAction[]>(() => {
    const models: ModelName[] = ["chatgpt", "claude", "gemini", "google_ai"];

    // ===== 1. Biggest engine gap — find the engine where competitors most outpace you =====
    let worstEngine: ModelName | null = null;
    let worstEngineYourScore = 0;
    let worstEngineCompetitor: string | null = null;
    let worstEngineCompScore = 0;
    let worstEngineGap = 0;

    for (const m of models) {
      const yourScore = calcModelScore(results, m) ?? 0;
      for (const c of competitors) {
        const compScore = calcModelScore(results, m, c) ?? 0;
        const gap = compScore - yourScore;
        if (gap > worstEngineGap) {
          worstEngineGap = gap;
          worstEngine = m;
          worstEngineYourScore = yourScore;
          worstEngineCompetitor = c;
          worstEngineCompScore = compScore;
        }
      }
    }

    // ===== 2. Gap prompts — prompts where competitors rank, you don't =====
    const gapPromptMap = new Map<string, { competitors: Set<string>; engines: Set<string> }>();
    for (const r of results) {
      if (!r.competitor_mentions) continue;
      if (r.business_mentioned) continue;
      for (const c of competitors) {
        if (r.competitor_mentions[c]) {
          if (!gapPromptMap.has(r.prompt_text)) {
            gapPromptMap.set(r.prompt_text, {
              competitors: new Set(),
              engines: new Set(),
            });
          }
          const entry = gapPromptMap.get(r.prompt_text)!;
          entry.competitors.add(c);
          entry.engines.add(r.model_name);
        }
      }
    }
    const gapPrompts = Array.from(gapPromptMap.entries()).slice(0, 3);
    const totalGapPrompts = gapPromptMap.size;
    const topGapCompetitor =
      gapPrompts.length > 0
        ? Array.from(gapPrompts[0][1].competitors)[0]
        : null;

    // ===== 3. Citation source gaps — domains AI cites for competitors but not you =====
    const yourDomains = new Set<string>();
    const competitorDomains = new Map<string, Map<string, number>>(); // domain → competitor → count

    for (const r of results) {
      if (!r.citations) continue;
      for (const domain of r.citations) {
        if (r.business_mentioned) {
          yourDomains.add(domain);
        }
        if (r.competitor_mentions) {
          for (const c of competitors) {
            if (r.competitor_mentions[c]) {
              if (!competitorDomains.has(domain)) {
                competitorDomains.set(domain, new Map());
              }
              const inner = competitorDomains.get(domain)!;
              inner.set(c, (inner.get(c) ?? 0) + 1);
            }
          }
        }
      }
    }

    const citationGaps: { domain: string; competitor: string; count: number }[] = [];
    for (const [domain, byComp] of competitorDomains) {
      if (yourDomains.has(domain)) continue;
      const top = Array.from(byComp.entries()).sort((a, b) => b[1] - a[1])[0];
      if (top) citationGaps.push({ domain, competitor: top[0], count: top[1] });
    }
    citationGaps.sort((a, b) => b.count - a.count);
    const topCitationGaps = citationGaps.slice(0, 3);

    // ===== 4. Advantage prompts — prompts where you rank, competitors don't =====
    const advantagePromptMap = new Map<string, { engines: Set<string> }>();
    for (const r of results) {
      if (!r.business_mentioned) continue;
      if (!r.competitor_mentions) continue;
      const anyCompMentioned = competitors.some((c) => r.competitor_mentions[c]);
      if (anyCompMentioned) continue;
      if (!advantagePromptMap.has(r.prompt_text)) {
        advantagePromptMap.set(r.prompt_text, { engines: new Set() });
      }
      advantagePromptMap.get(r.prompt_text)!.engines.add(r.model_name);
    }
    const advantagePrompts = Array.from(advantagePromptMap.entries()).slice(0, 3);
    const totalAdvantagePrompts = advantagePromptMap.size;

    // ============== Action 1: Close biggest engine gap ==============
    const engineAction: FixAction = worstEngine && worstEngineCompetitor
      ? {
          key: "engine",
          headline: `Close the ${worstEngineGap}% gap on ${MODEL_LABELS[worstEngine]}`,
          oneLiner: `${worstEngineCompetitor} appears ${worstEngineGap}% more often than ${businessName} on ${MODEL_LABELS[worstEngine]}.`,
          modalBody: `${worstEngineCompetitor} is currently mentioned on ${worstEngineCompScore}% of ${MODEL_LABELS[worstEngine]} prompts in your scan. ${businessName} is at ${worstEngineYourScore}%. ${MODEL_LABELS[worstEngine]} is one of the highest-traffic AI engines, so closing this gap moves the most leads.\n\nHow to close it: ${ENGINE_LEVERS[worstEngine]}\n\nMost businesses see movement within 2–4 weeks of the right source change. Look at the citation domains ${worstEngineCompetitor} is appearing on (in the 'Top Cited Domains' card below) — if you can get listed on the same ones, you'll often start matching their visibility quickly.`,
        }
      : {
          key: "engine",
          headline: "You're not trailing on any single engine",
          oneLiner: `${businessName} matches or beats every competitor on every engine.`,
          modalBody: `Across all four AI engines, no single competitor outpaces ${businessName} by a meaningful margin in this scan. Keep watching — engine gaps tend to open quietly when a competitor publishes new content or earns a high-authority citation. Run a fresh scan in 7–14 days to confirm the lead is holding.`,
        };

    // ============== Action 2: Win prompts you're losing ==============
    const promptList = gapPrompts
      .map(([p, info], i) => {
        const compsLabel = Array.from(info.competitors).join(", ");
        const enginesLabel = Array.from(info.engines)
          .map((e) => MODEL_LABELS[e as ModelName])
          .join(", ");
        return `${i + 1}. "${p}" — ${compsLabel} appears on ${enginesLabel}.`;
      })
      .join("\n");

    const promptAction: FixAction = totalGapPrompts > 0 && topGapCompetitor
      ? {
          key: "prompts",
          headline: `Win the ${totalGapPrompts} prompt${totalGapPrompts === 1 ? "" : "s"} where ${topGapCompetitor} ranks and you don't`,
          oneLiner: `${topGapCompetitor} shows up on ${totalGapPrompts} prompt${totalGapPrompts === 1 ? "" : "s"} that ${businessName} is missing entirely.`,
          modalBody: `Here are the prompts ${businessName} is missing:\n\n${promptList}\n\nHow to win them: write content that directly answers each of these prompts, in plain language, on a page indexed by Google. The page title and first paragraph should restate the prompt almost verbatim — AI engines pull copy from pages that match the prompt structure exactly. A "best [category] in [city]" prompt is won by a page titled "Best [category] in [city]," not by a generic services page.\n\nIf the prompts are review-style ("best", "top", "recommended"), aim for at least 5–10 specific named-customer review snippets on the page. AI weights social proof from real names and outcomes much higher than generic marketing copy.`,
        }
      : {
          key: "prompts",
          headline: "No prompts where competitors solo-rank above you",
          oneLiner: `${businessName} is at least matching every competitor where they appear.`,
          modalBody: `In this scan, every prompt where a competitor was mentioned, ${businessName} was also mentioned. That's a strong starting position — most brands have at least 1-2 "blind spot" prompts where competitors own the answer. Keep scanning weekly to catch new gap prompts as competitors publish content, and look at the cited domains card to see if anyone is gaining new authority sources.`,
        };

    // ============== Action 3: Steal competitor citation sources ==============
    const sourceList = topCitationGaps
      .map(
        (g, i) =>
          `${i + 1}. ${g.domain} — cited ${g.count} time${g.count === 1 ? "" : "s"} for ${g.competitor}.`,
      )
      .join("\n");

    const sourceAction: FixAction = topCitationGaps.length > 0
      ? {
          key: "sources",
          headline: `Get listed on ${topCitationGaps.length} source${topCitationGaps.length === 1 ? "" : "s"} citing your competitors`,
          oneLiner: `AI is citing ${topCitationGaps[0].domain} for ${topCitationGaps[0].competitor}, but never for ${businessName}.`,
          modalBody: `These sources are powering competitor visibility but currently ignore ${businessName}:\n\n${sourceList}\n\nHow to get listed: each source has its own path. Directories (Yelp, BBB, industry-specific) usually accept free listings — claim or create yours. Editorial sources (news sites, blogs) require either pitching a story angle or earning a mention through a customer / partner. Reddit-style sources happen when real people recommend you in real threads — encourage your best customers to drop a comment when relevant.\n\nThe order of operations matters: prioritize the source with the highest citation count first (currently ${topCitationGaps[0].domain}), since AI weights it most. One strong placement on a high-citation source moves visibility more than five placements on weak sources.`,
        }
      : {
          key: "sources",
          headline: "Match competitors on the citation sources they use",
          oneLiner: `${businessName} is showing up on the same sources competitors are — keep that parity.`,
          modalBody: `In this scan, AI doesn't appear to be citing any sources for competitors that aren't also citing ${businessName}. That's good source-level parity — most brands trail on at least one or two citation domains. Watch for new gaps as competitors get listed on new platforms; the Citation Insights tool tracks which exact domains AI references in each scan.`,
        };

    // ============== Action 4: Defend the prompts you own ==============
    const advList = advantagePrompts
      .map(([p, info], i) => {
        const enginesLabel = Array.from(info.engines)
          .map((e) => MODEL_LABELS[e as ModelName])
          .join(", ");
        return `${i + 1}. "${p}" — appearing on ${enginesLabel}.`;
      })
      .join("\n");

    const defendAction: FixAction = totalAdvantagePrompts > 0
      ? {
          key: "defend",
          headline: `Defend the ${totalAdvantagePrompts} prompt${totalAdvantagePrompts === 1 ? "" : "s"} where you alone rank`,
          oneLiner: `${businessName} owns ${totalAdvantagePrompts} prompt${totalAdvantagePrompts === 1 ? "" : "s"} where no competitor is mentioned.`,
          modalBody: `These are your solo wins — prompts where AI mentions ${businessName} and no competitor:\n\n${advList}\n\nHow to defend them: solo wins disappear quickly when a competitor earns a citation on the same source AI is reading for that prompt. To hold these positions, do three things:\n\n1. Identify the source page AI is reading (check Citation Insights for the cited domains on these prompts).\n\n2. Keep that source fresh. AI heavily weights freshness — if the page hasn't been updated in 6+ months, sentiment and visibility will fade. A small content update every 60–90 days is enough.\n\n3. Add depth to the page. The more concrete a page is (named customers, dated outcomes, specific numbers), the harder it is to dislodge.\n\nTreat solo-win prompts as your moat — every week a competitor isn't mentioned on these prompts is another week of organic AI traffic flowing only to ${businessName}.`,
        }
      : {
          key: "defend",
          headline: `Build solo-win prompts ${businessName} can own`,
          oneLiner: `${businessName} doesn't currently solo-rank on any prompt — every win is shared.`,
          modalBody: `In this scan, every prompt mentioning ${businessName} also mentions at least one competitor. That's normal early on, but solo-wins are where AI traffic actually concentrates — once you own a prompt, the click goes only to you.\n\nHow to build them: pick the most specific category prompt you currently share (e.g., not "best plumber" but "best emergency plumber for older homes in [city]"). Write a content piece that answers that exact specific prompt better than any competitor's existing content does. Specificity is the lever — generic answers stay shared, specific answers get owned.\n\nWithin 2-3 scans of publishing, you'll usually see one or two solo-wins start to show up. Each one becomes a defended position.`,
        };

    return [engineAction, promptAction, sourceAction, defendAction];
  }, [results, businessName, competitors]);

  const open = actions.find((a) => a.key === openKey) ?? null;

  return (
    <>
      <Card className="h-full flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy
            className="h-3.5 w-3.5"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          />
          <span
            className="text-[10px] font-bold tracking-wider uppercase"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          >
            How to beat competitors
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
          4 ways to take the lead
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">
          Specific to your scan results. Tap any tip for a plain-English playbook.
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
            <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed whitespace-pre-line">
              {open.modalBody}
            </p>

            <div
              className="rounded-[var(--radius-md)] p-3 text-xs flex items-start gap-2"
              style={{
                background: "rgba(150,162,131,0.10)",
                borderLeft: `3px solid ${SURVEN_SEMANTIC.goodAlt}`,
              }}
            >
              <Sparkles
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: SURVEN_SEMANTIC.goodAlt }}
              />
              <p className="text-[var(--color-fg-secondary)] leading-snug">
                Don&apos;t want to do this yourself? Surven&apos;s managed plans handle the
                directory listings, source outreach, and content publishing for you.{" "}
                <Link
                  href="/settings/billing"
                  className="font-semibold hover:underline"
                  style={{ color: SURVEN_SEMANTIC.goodAlt }}
                >
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
