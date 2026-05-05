"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  MessageSquare,
  Link2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { Modal } from "@/components/molecules/Modal";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ScanResult, ModelName } from "@/types/database";

const COLORS = {
  primary: "#96A283",
  primaryHover: "#7D8E6C",
};

// Visual rhythm cribbed from Code Scanner's `TopFixesPanel`. Sage→amber→rust
// gradient header band + status-tile / title / body rows + sage `+N` pill on
// the right when the action carries a numeric magnitude.

const ACTION_META: Record<
  string,
  { Icon: LucideIcon; tint: string; iconColor: string }
> = {
  engine: {
    Icon: Cpu,
    tint: "rgba(150,162,131,0.18)",
    iconColor: "#5E7250",
  },
  prompts: {
    Icon: MessageSquare,
    tint: "rgba(201,123,69,0.16)",
    iconColor: "#A06210",
  },
  sources: {
    Icon: Link2,
    tint: "rgba(184,160,48,0.18)",
    iconColor: "#7E6B17",
  },
  defend: {
    Icon: ShieldCheck,
    tint: "rgba(150,162,131,0.18)",
    iconColor: "#5E7250",
  },
};

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
  key: keyof typeof ACTION_META;
  headline: string;
  oneLiner: string;
  modalBody: string;
  /** Optional magnitude pill rendered on the right of the row. */
  metric?: string;
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
          metric: `${worstEngineGap}% gap`,
          modalBody: `${worstEngineCompetitor} appears on ${worstEngineCompScore}% of ${MODEL_LABELS[worstEngine]} prompts. ${businessName} is at ${worstEngineYourScore}%.\n\n${ENGINE_LEVERS[worstEngine]}\n\nCheck the Top Cited Domains card below — match the sources ${worstEngineCompetitor} appears on and visibility usually closes within 2–4 weeks.`,
        }
      : {
          key: "engine",
          headline: "You're not trailing on any single engine",
          oneLiner: `${businessName} matches or beats every competitor on every engine.`,
          modalBody: `No competitor outpaces ${businessName} on any engine in this scan. Run a fresh scan in 7–14 days to confirm the lead is holding.`,
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
          metric: `${totalGapPrompts} prompt${totalGapPrompts === 1 ? "" : "s"}`,
          modalBody: `Prompts ${businessName} is missing:\n\n${promptList}\n\nWrite a page that restates each prompt in the title and first paragraph — AI pulls copy from pages that match the prompt almost verbatim. For "best/top" prompts, add 5–10 named-customer reviews on the page; AI weights real names higher than generic marketing copy.`,
        }
      : {
          key: "prompts",
          headline: "No prompts where competitors solo-rank above you",
          oneLiner: `${businessName} is at least matching every competitor where they appear.`,
          modalBody: `Every prompt where a competitor was mentioned, ${businessName} was also mentioned. Keep scanning weekly to catch new gap prompts as competitors publish content.`,
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
          metric: `${topCitationGaps.length} source${topCitationGaps.length === 1 ? "" : "s"}`,
          modalBody: `Sources powering competitor visibility but ignoring ${businessName}:\n\n${sourceList}\n\nDirectories (Yelp, BBB, industry-specific) usually accept free listings — claim yours. Editorial mentions need a story pitch or customer-led intro. Reddit happens when real customers recommend you in real threads.\n\nStart with ${topCitationGaps[0].domain} — one placement on the highest-cited source moves more visibility than five on weak ones.`,
        }
      : {
          key: "sources",
          headline: "Match competitors on the citation sources they use",
          oneLiner: `${businessName} is showing up on the same sources competitors are — keep that parity.`,
          modalBody: `AI isn't citing any sources for competitors that aren't also citing ${businessName}. Watch Citation Insights for new gaps as competitors get listed on new platforms.`,
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
          metric: `${totalAdvantagePrompts} solo win${totalAdvantagePrompts === 1 ? "" : "s"}`,
          modalBody: `Solo wins — prompts where AI mentions ${businessName} and no competitor:\n\n${advList}\n\nThree moves to hold them:\n\n1. Find the source AI is reading (check Citation Insights for the cited domains).\n2. Refresh that page every 60–90 days — AI weights freshness heavily.\n3. Add depth: named customers, dated outcomes, specific numbers. Concrete pages are harder to dislodge.`,
        }
      : {
          key: "defend",
          headline: `Build solo-win prompts ${businessName} can own`,
          oneLiner: `${businessName} doesn't currently solo-rank on any prompt — every win is shared.`,
          modalBody: `Every prompt mentioning ${businessName} also mentions a competitor — every win is shared. Pick your most specific category prompt (not "best plumber" but "best emergency plumber for older homes in [city]") and write a page that answers it better than any competitor. Specificity is the lever — generic answers stay shared, specific answers get owned. You'll usually see solo-wins appear within 2–3 scans.`,
        };

    return [engineAction, promptAction, sourceAction, defendAction];
  }, [results, businessName, competitors]);

  const open = actions.find((a) => a.key === openKey) ?? null;

  return (
    <>
      <div
        className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] flex flex-col h-full"
        style={{ borderColor: "rgba(150,162,131,0.45)" }}
      >
        {/* Header band — same 3-stop sage→amber→rust gradient as the Code
            Scanner "Fix these first" panel. */}
        <div
          className="rounded-t-[var(--radius-lg)] px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(150,162,131,0.22)" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: COLORS.primary }} />
            </div>
            <SectionHeading
              text="Ways to take the lead"
              info="The highest-impact moves for closing the gap on your competitors, derived from your scan."
            />
          </div>
          <p
            className="text-[var(--color-fg-secondary)]"
            style={{ fontSize: 13.5 }}
          >
            Specific to your scan.{" "}
            <span style={{ color: COLORS.primary, fontWeight: 600 }}>
              Tap any row
            </span>{" "}
            for the playbook.
          </p>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          {actions.map((a) => {
            const meta = ACTION_META[a.key];
            const Icon = meta.Icon;
            return (
              <button
                key={a.key}
                onClick={() => setOpenKey(a.key)}
                className="w-full text-left rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 px-5 py-4 flex items-start gap-4 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-alt)] hover:-translate-y-px transition-all group"
              >
                <span
                  className="inline-flex items-center justify-center rounded-[var(--radius-md)] shrink-0 mt-0.5"
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: meta.tint,
                    color: meta.iconColor,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p
                    className="text-[var(--color-fg)]"
                    style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}
                  >
                    {a.headline}
                  </p>
                  <p
                    className="text-[var(--color-fg-secondary)]"
                    style={{ fontSize: 14, lineHeight: 1.5 }}
                  >
                    {a.oneLiner}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  {a.metric && (
                    <span
                      className="rounded-full px-3 py-1 font-semibold tabular-nums"
                      style={{
                        fontSize: 13,
                        backgroundColor: `${COLORS.primary}1f`,
                        color: COLORS.primaryHover,
                      }}
                    >
                      {a.metric}
                    </span>
                  )}
                  <ArrowRight
                    className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                    style={{ color: COLORS.primary }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
