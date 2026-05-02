"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Modal } from "@/components/molecules/Modal";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import { AI_MODELS } from "@/utils/constants";
import {
  AUTHORITY_LABEL,
  CATEGORY_LABEL,
  getAuthority,
  getCategory,
} from "@/utils/citationAuthority";
import type { ScanResult, ModelName } from "@/types/database";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

// Per-engine source-influence lever — what shifts citations on each engine.
const ENGINE_LEVERS: Record<ModelName, string> = {
  chatgpt:
    "ChatGPT pulls heavily from Reddit threads, Wikipedia, and editorial articles. To increase its source pool, get yourself referenced in a couple of category-specific Reddit threads and pitch one or two niche publications — those are the surfaces it weights highest.",
  claude:
    "Claude favors long-form articles, official sites, and structured documentation. Publish a thorough piece — buyer's guide, comparison post, or detailed how-to — on a domain Claude already trusts (industry publications, established blogs).",
  gemini:
    "Gemini leans on Google Search, Google reviews, and Google Maps. A clean Google Business Profile, fresh reviews on Google specifically, and ranking in organic search for the prompt's keywords moves Gemini fastest.",
  google_ai:
    "Google AI Overview reads the top-ranked organic search results. Earn the source diversity by ranking the page that directly answers each prompt — schema markup, FAQ sections, and answer-first copy on the page targeting that keyword.",
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
}

export function CitationFixActions({ results, businessName }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const actions = useMemo<FixAction[]>(() => {
    // ===== Build domain map: domain → {count, listed, engines} =====
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

    // High-authority gaps — the priority listings
    const highAuthorityGaps = domains
      .filter((d) => !d.listed && d.authority === "high")
      .sort((a, b) => b.count - a.count);
    const totalHighAuthGaps = highAuthorityGaps.length;

    // Authority breakdown of listed sources
    const listedDomains = domains.filter((d) => d.listed);
    const listedHigh = listedDomains.filter((d) => d.authority === "high").length;
    const listedLow = listedDomains.filter((d) => d.authority === "low").length;
    const totalListed = listedDomains.length;
    const lowAuthorityShare =
      totalListed > 0 ? Math.round((listedLow / totalListed) * 100) : 0;
    const highAuthorityShare =
      totalListed > 0 ? Math.round((listedHigh / totalListed) * 100) : 0;

    // Per-engine source counts
    const engineSources = new Map<ModelName, Set<string>>();
    for (const m of AI_MODELS) {
      engineSources.set(m.id as ModelName, new Set());
    }
    for (const r of results) {
      if (!r.citations) continue;
      const set = engineSources.get(r.model_name);
      if (!set) continue;
      for (const d of r.citations) set.add(d);
    }
    const engineSourceCounts = Array.from(engineSources.entries())
      .map(([id, set]) => ({ id, count: set.size }))
      .filter((e) => e.count > 0);

    const narrowestEngine =
      engineSourceCounts.length > 0
        ? engineSourceCounts.reduce((acc, e) =>
            e.count < acc.count ? e : acc,
          )
        : null;
    const broadestEngine =
      engineSourceCounts.length > 0
        ? engineSourceCounts.reduce((acc, e) =>
            e.count > acc.count ? e : acc,
          )
        : null;

    // Top cited source (your moat)
    const topCitedSource = listedDomains.sort((a, b) => b.count - a.count)[0];

    // ============== Action 1: Close high-authority citation gaps ==============
    const gapsList = highAuthorityGaps
      .slice(0, 3)
      .map(
        (g, i) =>
          `${i + 1}. ${g.domain} — ${CATEGORY_LABEL[g.category]} · cited ${g.count} time${g.count === 1 ? "" : "s"} but never naming ${businessName}.`,
      )
      .join("\n");

    const gapAction: FixAction = totalHighAuthGaps > 0
      ? {
          key: "gaps",
          headline: `Get listed on ${totalHighAuthGaps} high-authority source${totalHighAuthGaps === 1 ? "" : "s"} ignoring you`,
          oneLiner: `AI cites ${highAuthorityGaps[0].domain} ${highAuthorityGaps[0].count}× without ever mentioning ${businessName}.`,
          modalBody: `These high-authority sources are powering AI answers in your category — but none of them currently name ${businessName}:\n\n${gapsList}\n\nHow to fix it: each source has its own path. Major directories (Yelp, BBB, industry-specific) usually accept free listings — claim or create yours and fill out every field. Editorial sources (Forbes, NYT, industry publications) require either pitching a story angle, contributing a guest piece, or earning a mention through a customer or partner. Wiki sources (Wikipedia, Wikidata) require an editor with citation-worthy notability — usually third-party news coverage already pointing to you.\n\nPrioritize ${highAuthorityGaps[0].domain} first, since AI is already pulling from it ${highAuthorityGaps[0].count} time${highAuthorityGaps[0].count === 1 ? "" : "s"}. One placement on a high-citation source moves visibility more than five placements on weak sources.`,
        }
      : {
          key: "gaps",
          headline: "You're listed on every high-authority source AI cites",
          oneLiner: `${businessName} has parity with the high-authority sources powering AI answers.`,
          modalBody: `In this scan, every high-authority source AI is citing already mentions ${businessName} at least once. That's strong — most brands trail on at least one or two major directories. Keep that parity by checking back monthly: as competitors get listed on new platforms, gaps open up quickly. The Citation Insights tool tracks every cited domain in each scan so new gaps surface immediately.`,
        };

    // ============== Action 2: Reduce reliance on low-authority sources ==============
    const authorityAction: FixAction = totalListed > 0 && lowAuthorityShare > 30
      ? {
          key: "authority",
          headline: `Trade ${lowAuthorityShare}% low-authority citations for high-authority ones`,
          oneLiner: `${listedLow} of your ${totalListed} citations come from low-authority sources AI doesn't weight much.`,
          modalBody: `Right now ${lowAuthorityShare}% of the sources naming ${businessName} are low-authority — random small sites AI engines don't trust deeply. That means the work those mentions are doing for your AI presence is mostly invisible.\n\nHow to shift the mix: you don't need to remove the low-authority sources — they're harmless. You need to add high-authority ones to dilute them. Aim for the 60%+ high-authority threshold:\n\n1. Claim or refresh listings on Yelp, Google Business Profile, BBB, and one or two category-specific directories (Houzz, Angi, Tripadvisor, etc., depending on your industry).\n\n2. Pitch a guest article or get quoted in one industry publication this quarter. AI heavily weights editorial mentions on Forbes, NYT, niche trade publications — even one placement moves the needle.\n\n3. If your category supports it, get on Wikipedia or Wikidata. Wikipedia citations are among the highest-weighted by every AI engine.\n\nWithin 2-3 scans of these moves, your high-authority share should rise into the healthy range.`,
        }
      : highAuthorityShare >= 60
      ? {
          key: "authority",
          headline: `Defend your ${highAuthorityShare}% high-authority share`,
          oneLiner: `Most of your citations come from sources AI engines trust — protect that.`,
          modalBody: `${highAuthorityShare}% of the sources naming ${businessName} are high-authority — that's a strong starting position and one of the most valuable things to defend.\n\nHow to defend it: high-authority placements aren't permanent. Listings go stale, articles get updated, directories rotate featured businesses. To hold the share:\n\n1. Touch each major listing every 60–90 days. Refresh the description, add a recent photo, respond to reviews. Freshness is one of the strongest signals every AI engine uses.\n\n2. Watch for new high-authority sources entering your category. New industry publications, new directories, new comparison sites — get listed early before competitors do.\n\n3. If a listing earns a citation in this scan but didn't last scan, that's worth knowing — the source is gaining weight in AI answers and worth doubling down on (more reviews, more linked content).`,
        }
      : {
          key: "authority",
          headline: "Build a high-authority citation base",
          oneLiner: `${businessName} doesn't yet have many citations from sources AI engines weight heavily.`,
          modalBody: `Most of your citations are coming from medium- or low-authority sources, which means AI engines have less reason to surface ${businessName} confidently in answers. The fix is gradual but learnable.\n\nStart with the three highest-leverage placements every brand should hold:\n\n1. Google Business Profile — claim it, fill every field, post weekly updates. AI Overviews and Gemini both weight this heavily.\n\n2. Yelp — even if reviews aren't your category's strong suit, the listing itself feeds citations.\n\n3. One industry-specific high-authority directory (Houzz for home, Angi for service, Tripadvisor for hospitality, etc.).\n\nFrom there, pitch one industry publication per quarter and look for guest contribution opportunities. Every high-authority placement compounds — once AI starts citing a source for you, that citation usually persists scan-to-scan.`,
        };

    // ============== Action 3: Diversify a narrow engine's source pool ==============
    const engineAction: FixAction = narrowestEngine && broadestEngine && narrowestEngine.id !== broadestEngine.id
      ? {
          key: "engine",
          headline: `Broaden ${MODEL_LABELS[narrowestEngine.id]}'s source pool`,
          oneLiner: `${MODEL_LABELS[narrowestEngine.id]} pulls from only ${narrowestEngine.count} source${narrowestEngine.count === 1 ? "" : "s"} for ${businessName} — vs ${broadestEngine.count} on ${MODEL_LABELS[broadestEngine.id]}.`,
          modalBody: `Each AI engine weights sources differently. Right now ${MODEL_LABELS[narrowestEngine.id]} only sees ${businessName} through ${narrowestEngine.count} source${narrowestEngine.count === 1 ? "" : "s"} — meaning if any of those go stale, your visibility on that engine drops fast.\n\n${ENGINE_LEVERS[narrowestEngine.id]}\n\nThe goal isn't to match every engine perfectly — it's to make sure no single engine has fewer than 3-4 sources naming ${businessName}. Concentration risk on one source is the most common reason AI visibility drops between scans.`,
        }
      : {
          key: "engine",
          headline: "Keep balancing your source mix across all four engines",
          oneLiner: `${businessName} has roughly even source coverage across AI engines — keep it that way.`,
          modalBody: `In this scan, no single engine is dramatically narrower than the others. That's the right balance — every engine has multiple sources to pull from when answering questions about ${businessName}, so a single source going stale won't kill your visibility on any one engine.\n\nKeep watching engine-by-engine source counts in the 'Citations by AI Engine' card. The most common cause of an engine's source pool shrinking is a directory listing going stale or a directory rotating you out of featured placements. Refreshing major listings every 60-90 days protects against both.`,
        };

    // ============== Action 4: Defend / build your top-cited source ==============
    const defendAction: FixAction = topCitedSource
      ? {
          key: "defend",
          headline: `Defend ${topCitedSource.domain} — your top citation source`,
          oneLiner: `${topCitedSource.domain} cites ${businessName} ${topCitedSource.count} time${topCitedSource.count === 1 ? "" : "s"} across ${topCitedSource.engines.length} engine${topCitedSource.engines.length === 1 ? "" : "s"}.`,
          modalBody: `${topCitedSource.domain} is doing more for your AI visibility than any other source — it's named ${businessName} ${topCitedSource.count} time${topCitedSource.count === 1 ? "" : "s"} in this scan, on ${topCitedSource.engines.length} of the four AI engines (${topCitedSource.engines.map((e) => MODEL_LABELS[e]).join(", ")}). It's a ${AUTHORITY_LABEL[topCitedSource.authority].toLowerCase()}-authority ${CATEGORY_LABEL[topCitedSource.category].toLowerCase().replace(/s$/, "")} source.\n\nHow to defend it: top sources lose their grip when their content goes stale or competitors earn newer mentions on the same source. Three things that protect the position:\n\n1. Update the listing every 60-90 days. Even small edits — a new photo, a refreshed description, responding to recent reviews — signal freshness to every AI engine reading from this source.\n\n2. Add depth. The more concrete the listing (named customers, specific outcomes, dated examples, real photos), the harder it is for a competitor's blander listing to dislodge yours.\n\n3. Watch for competitor activity on the same source. If a competitor suddenly earns 5+ new reviews or a featured placement, expect AI to start citing them alongside or instead of you within a scan or two.\n\nTreat ${topCitedSource.domain} as your moat — every week it stays fresh is another week of AI traffic flowing through your name first.`,
        }
      : {
          key: "defend",
          headline: "Build a citation source AI consistently uses",
          oneLiner: `${businessName} doesn't have a clear go-to source AI is citing yet.`,
          modalBody: `In this scan, no single source is doing significantly more work than the others to put ${businessName} into AI answers. That's normal early on, but a strong AI presence usually rests on 1-3 anchor sources that AI cites repeatedly.\n\nHow to build one: pick the source most relevant to your category — Google Business Profile is universal, but for service businesses Yelp or Angi often outperforms; for home services, Houzz; for hospitality, Tripadvisor. Then go deep on that one listing:\n\n1. Fill every available field with specific, useful copy.\n\n2. Earn 10-20 reviews from real customers with specific outcomes named. AI weights reviews with names and outcomes much higher than generic 5-star ratings.\n\n3. Post weekly updates if the platform supports them.\n\nWithin 2-3 scans, this source should start showing up consistently in citation results — that's when it becomes your moat.`,
        };

    return [gapAction, authorityAction, engineAction, defendAction];
  }, [results, businessName]);

  const open = actions.find((a) => a.key === openKey) ?? null;

  return (
    <>
      <Card className="h-full flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldCheck
            className="h-3.5 w-3.5"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          />
          <span
            className="text-[10px] font-bold tracking-wider uppercase"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          >
            How to lift citations
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
          4 ways to strengthen your sources
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
                Don&apos;t want to do this yourself? Surven&apos;s managed plans
                handle directory listings, source outreach, and citation
                building for you.{" "}
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
