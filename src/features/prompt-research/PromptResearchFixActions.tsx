"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Modal } from "@/components/molecules/Modal";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { Intent } from "./types";
import { TAXONOMY_LABEL } from "./taxonomy";

interface FixAction {
  key: string;
  headline: string;
  oneLiner: string;
  modalBody: string;
}

interface Props {
  intents: Intent[];
  businessName: string;
  competitors: string[];
  onJumpToTable: () => void;
}

function weaknessAdvice(label: string, coverage: number): string {
  const cov = `${coverage}% coverage`;
  const lower = label.toLowerCase();
  if (lower.includes("validation")) {
    return `People are asking "is your brand legit / trustworthy / a scam" and AI isn't finding good answers. ${cov} means your reviews are thin. Push to 30+ reviews on Google, Yelp, and BBB, and make sure your About page has clear founder info, year founded, and any press mentions. AI cites these signals first when answering trust questions.`;
  }
  if (lower.includes("comparative")) {
    return `${cov}. AI doesn't have anything to say about you when comparing options. Build "vs" pages on your site for your top 3 competitors, get featured on at least one comparison site (G2, Capterra, or a niche comparison blog), and make sure your homepage clearly states what makes you different.`;
  }
  if (lower.includes("category")) {
    return `${cov} on the unbranded category prompts where most growth lives. Get listed on the top 5–10 directories for your category, write content that uses the category words naturally, and get mentioned in any "Best [category] in [city]" listicles you can find.`;
  }
  if (lower.includes("operational")) {
    return `${cov}. People asking "how do I book / contact / use" you aren't getting clear answers. Add an FAQ section on your homepage with 8–12 of the most common questions answered in 1–2 sentences each. Use real question phrasings as the headings — AI extracts these directly.`;
  }
  if (lower.includes("audience")) {
    return `${cov}. AI doesn't know which audiences you're a fit for. Write a "Who we're for" or "Industries we serve" page that names your target audiences explicitly ("for property managers," "for restaurants," "for first-time buyers"). Ask happy clients in each segment for testimonials that mention their industry.`;
  }
  if (lower.includes("constraint")) {
    return `${cov}. AI doesn't know where you fit on price, location, or specific features. Make your pricing, service area, and key feature claims unambiguous on your site. Use exact dollar amounts, named cities, and clear yes/no claims (not vague phrases like "competitive pricing").`;
  }
  if (lower.includes("adjacent")) {
    return `${cov}. You're not surfacing in nearby categories where you could plausibly help. Write 2–3 blog posts that bridge your core service to an adjacent topic (e.g., a plumber writing about water heater installation or septic care). Internal-link those to your main service pages.`;
  }
  if (lower.includes("negative") || lower.includes("objection")) {
    return `${cov}. People searching for problems or complaints in your category — and about you — aren't finding well-positioned answers from you. Publish honest content addressing common objections in your space ("Why our service costs what it does," "Common myths about [category]"). Owning the bear case keeps competitors from defining it for you.`;
  }
  if (lower.includes("branded")) {
    return `${cov}. People searching your name aren't getting clean, authoritative answers. Make sure your About page, founder bio, services list, and pricing are clearly stated on your own site. Claim your Google Business, Yelp, BBB, and any industry-specific listings — AI pulls branded answers from these first.`;
  }
  if (lower.includes("list") || lower.includes("recommendation")) {
    return `${cov}. AI's "top 5" or "best 10" lists don't include you. The fastest path is getting onto at least one industry listicle (search "top [category] in [city] 2025" — pitch the publishers of those articles). Listicles compound: once you're on one, AI starts pulling you into other ranked-list answers.`;
  }
  return `${cov}. The fix is the same as most weak coverage areas: get listed on more high-authority third-party sites in your category, make sure your own site clearly answers the underlying question with structured content (FAQ, comparison tables, direct answers), and ask satisfied customers to leave reviews that mention specifics.`;
}

export function PromptResearchFixActions({
  intents,
  businessName,
  competitors,
  onJumpToTable,
}: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const actions = useMemo<FixAction[]>(() => {
    // ===== 1. Untracked intents =====
    const untracked = intents.filter((i) => !i.inTracker);
    const sortedUntracked = [...untracked].sort(
      (a, b) => b.importance - a.importance,
    );
    const topUntracked = sortedUntracked.slice(0, 5);
    const totalVariants = topUntracked.reduce(
      (acc, i) => acc + i.variants.length,
      0,
    );
    const untrackedList = topUntracked
      .map(
        (it, i) =>
          `${i + 1}. "${it.canonical}" — importance ${it.importance}, ${it.overallCoverage}% coverage.`,
      )
      .join("\n");

    const trackAction: FixAction =
      untracked.length > 0
        ? {
            key: "track",
            headline: `Send your top ${Math.min(untracked.length, 5)} untracked intent${Math.min(untracked.length, 5) === 1 ? "" : "s"} to Tracker`,
            oneLiner: `${untracked.length} researched prompt${untracked.length === 1 ? " is" : "s are"} sitting outside Tracker — start watching them this week.`,
            modalBody: `These are the highest-importance intents you aren't yet tracking:\n\n${untrackedList}\n\nWhy it matters: an untracked intent is one we know your customers ask AI but you have no visibility into how you're doing on it. Each one rolls up multiple paraphrasings (${totalVariants} variants total across the top ${topUntracked.length}), so you'll get a real signal — not a single shaky reading.\n\nHow to send them: scroll to the All intents table below, sort by Importance (default), check the rows you want, and click Send to Tracker. They'll start producing weekly performance data on the Prompts page within a week.`,
          }
        : {
            key: "track",
            headline: "Re-mine your prompts every 90 days",
            oneLiner: `${businessName} is already tracking everything we've researched. Refresh quarterly to catch new phrasings.`,
            modalBody: `You're already watching every intent we've surfaced. Good baseline — most clients miss 40%+ of what we research.\n\nWhy keep refreshing: the way people talk to AI changes. New phrasings show up, old ones fade, and AI models update their training and retrieval. New high-importance intents will appear over time — especially validation-style ("is X legit"), operational ("how do I book X"), and audience-modified ("best X for [segment]") prompts.\n\nWhat to do: come back to this page once a quarter (we recommend the first week of every quarter), regenerate the research, and check for new intents flagged with importance ≥ 70 that aren't in Tracker yet.`,
          };

    // ===== 2. Weakest taxonomy =====
    const byTax = new Map<string, { count: number; covSum: number; intents: Intent[] }>();
    for (const i of intents) {
      const prev = byTax.get(i.taxonomy) ?? { count: 0, covSum: 0, intents: [] };
      byTax.set(i.taxonomy, {
        count: prev.count + 1,
        covSum: prev.covSum + i.overallCoverage,
        intents: [...prev.intents, i],
      });
    }

    let weakestTax: string | null = null;
    let weakestAvg = 101;
    let weakestIntents: Intent[] = [];
    for (const [tax, v] of byTax.entries()) {
      const avg = v.covSum / v.count;
      if (avg < weakestAvg) {
        weakestAvg = avg;
        weakestTax = tax;
        weakestIntents = [...v.intents]
          .sort((a, b) => a.overallCoverage - b.overallCoverage)
          .slice(0, 3);
      }
    }
    const weakestLabel = weakestTax
      ? TAXONOMY_LABEL[weakestTax as keyof typeof TAXONOMY_LABEL]
      : null;
    const weakestPromptList = weakestIntents
      .map(
        (it, i) =>
          `${i + 1}. "${it.canonical}" — ${it.overallCoverage}% coverage.`,
      )
      .join("\n");

    const taxonomyAction: FixAction = weakestLabel
      ? {
          key: "taxonomy",
          headline: `Fix your weakest territory: ${weakestLabel.toLowerCase()}`,
          oneLiner: `${Math.round(weakestAvg)}% average coverage across ${weakestIntents.length === 1 ? "this intent" : `${byTax.get(weakestTax!)!.count} intents`}.`,
          modalBody: `Your weakest taxonomy is ${weakestLabel} at ${Math.round(weakestAvg)}% average coverage. Lowest-coverage intents in this group:\n\n${weakestPromptList}\n\n${weaknessAdvice(weakestLabel, Math.round(weakestAvg))}\n\nMost businesses see meaningful movement within 30–60 days of the right source change. The Citation Insights page shows which exact domains AI is reading for these prompts — start by getting listed on the ones it's already citing for competitors.`,
        }
      : {
          key: "taxonomy",
          headline: "Coverage is balanced across taxonomies",
          oneLiner: `${businessName} doesn't have one obviously weak territory — keep watching all of them.`,
          modalBody: `In this scan, no single taxonomy is dramatically below the others. That's a good baseline — most brands have at least one territory at <30% coverage.\n\nKeep an eye on it: weak territories tend to surface as your competitors publish new content. Run weekly scans, and the moment one taxonomy drops below 40% average coverage, treat it as the priority to fix. Citation Insights will tell you which exact domains AI is missing you on.`,
        };

    // ===== 3. Underbuilt intent types (informational / transactional gaps) =====
    const informationalIntents = intents.filter((i) => i.intentType === "informational");
    const transactionalIntents = intents.filter(
      (i) => i.intentType === "transactional",
    );
    const infoCount = informationalIntents.length;
    const txCount = transactionalIntents.length;
    const infoAvg =
      infoCount > 0
        ? Math.round(
            informationalIntents.reduce((acc, i) => acc + i.overallCoverage, 0) /
              infoCount,
          )
        : 0;
    const txAvg =
      txCount > 0
        ? Math.round(
            transactionalIntents.reduce((acc, i) => acc + i.overallCoverage, 0) /
              txCount,
          )
        : 0;

    // Pick the thinner / weaker of the two intent types
    const infoThin = infoCount < 4 || infoAvg < 35;
    const txThin = txCount < 4 || txAvg < 35;
    const focusOnInfo = infoThin && (!txThin || infoAvg <= txAvg);

    let intentTypeAction: FixAction;
    if (focusOnInfo && infoThin) {
      intentTypeAction = {
        key: "intent-type",
        headline: `Strengthen your informational prompts (${infoAvg}% coverage)`,
        oneLiner: `${infoCount} informational intent${infoCount === 1 ? "" : "s"} researched — these include "is X legit / trustworthy" trust checks and category-explainer questions.`,
        modalBody: `Informational prompts are how AI answers trust and explainer questions about you — "is ${businessName} legit," "${businessName} reviews," "what does ${businessName} do," "can I trust ${businessName}." You're at ${infoAvg}% average coverage on these, which means AI doesn't yet have strong, structured signals to confirm trust or describe you clearly.\n\nWhy it matters: informational prompts (especially trust-flavored ones) tend to be the last question a buyer asks before converting. If AI can't reassure them, they bounce. Fixing these usually moves leads more than fixing pure category prompts.\n\nHow to fix: push your review count to 30+ on Google, Yelp, and BBB. Make sure your About page lists founder info, year founded, certifications, and any press mentions in plain text (not just images). If you've been featured in any local or industry publication, link it from your homepage. AI weights these trust signals heavily.`,
      };
    } else if (txThin) {
      intentTypeAction = {
        key: "intent-type",
        headline: `Add depth to your transactional prompts (${txAvg}% coverage)`,
        oneLiner: `${txCount} transactional intent${txCount === 1 ? "" : "s"} researched — these are "how do I book / contact / buy" action-taking questions.`,
        modalBody: `Transactional prompts are how AI helps customers actually act on your business — "how do I book ${businessName}," "${businessName} hours," "does ${businessName} offer same-day service." You're at ${txAvg}% average coverage on these.\n\nWhy it matters: transactional prompts come from people already convinced you might be the answer. If AI can't tell them how to take the next step, they go to a competitor whose info is clearer.\n\nHow to fix: add a real FAQ section on your homepage with 8–12 of the most common questions, answered in 1–2 sentences each. Use the actual question phrasings as the headings ("How do I book a same-day appointment?" — not "Booking"). AI extracts these directly. Make sure your hours, service area, and how-to-reach-you info are written out in clean text, not buried in images or contact forms.`,
      };
    } else {
      intentTypeAction = {
        key: "intent-type",
        headline: "Informational + transactional coverage looks healthy",
        oneLiner: `${businessName} is at ${infoAvg}% on informational and ${txAvg}% on transactional prompts.`,
        modalBody: `Informational ("is X legit," "what does X do") and transactional ("how do I book X") prompts are the two highest-converting categories of GEO research, and yours look balanced. Most brands underbuild one or both.\n\nKeep watching: as you scale customer volume, both sets of prompts get noisier — more reviews, more questions, more variation. Re-check this section every quarter. If either drops below 40% coverage or below 4 researched intents, it's time to invest in that area.\n\nWhat to do next: focus your effort on comparison and use-case prompts where the volume opportunity is highest, since trust + how-to are already in good shape.`,
      };
    }

    // ===== 4. Beat a competitor (or generic) =====
    const topCompetitor = competitors[0] ?? null;
    const competitorAction: FixAction = topCompetitor
      ? {
          key: "competitor",
          headline: `Build a comparison page targeting ${topCompetitor}`,
          oneLiner: `Comparison prompts ("${topCompetitor} vs you" or "alternatives to ${topCompetitor}") are the fastest way to siphon mindshare.`,
          modalBody: `${topCompetitor} is one of your direct competitors and AI is currently choosing between you on comparative prompts. The fastest way to take traffic from them is a clean "vs" page on your own site.\n\nHow to build it: title it exactly "${businessName} vs ${topCompetitor}." Lead with a comparison table covering pricing, service area, response time, what's included, and one or two genuine differentiators. Don't trash ${topCompetitor} — AI down-weights pages that read as hostile. State the real differences plainly.\n\nThen pitch the page to industry comparison sites (G2, Capterra, niche comparison blogs in your space). AI weights third-party comparison content heavily on prompts like "best alternatives to ${topCompetitor}" and "${topCompetitor} competitors." One placement on a real comparison site usually moves visibility within 30–45 days.`,
        }
      : {
          key: "competitor",
          headline: "Get listed on 5 high-authority directories",
          oneLiner: "Listings drive AI visibility for almost every category prompt — pick the top 5 in your space.",
          modalBody: `When AI answers questions in your category, it cites Yelp, Google Maps, BBB, and 2–3 industry-specific directories first. Most of what AI says about your business doesn't come from your website — it comes from these third-party sources.\n\nHow to do it: pick the top 5 directories in your category. For service businesses, that's almost always Yelp, Google Business Profile, Better Business Bureau, plus 2 industry-specific ones (Angi for home services, Healthgrades for medical, Avvo for legal, etc.).\n\nGet a clean, consistent listing on each: identical name, address, phone (NAP consistency), accurate hours, real photos, and a clear category. AI penalizes inconsistency between sources. Within 30–60 days of getting clean on the top 5, you'll typically see AI start pulling you into more category answers.`,
        };

    return [trackAction, taxonomyAction, intentTypeAction, competitorAction];
  }, [intents, businessName, competitors]);

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
            How to win these prompts
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
          4 ways to expand coverage
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mb-4">
          Specific to your researched intents. Tap any tip for a plain-English playbook.
        </p>

        <div className="flex-1 flex flex-col gap-2.5">
          {actions.map((a) => {
            const isTrack = a.key === "track";
            return (
              <button
                key={a.key}
                onClick={() => {
                  if (isTrack) onJumpToTable();
                  setOpenKey(a.key);
                }}
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
            );
          })}
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
                handle the prompt research, source outreach, and content
                publishing for you.{" "}
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
