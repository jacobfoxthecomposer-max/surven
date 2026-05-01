"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Send, Target, Swords, ArrowRight, ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COLORS } from "@/utils/constants";
import type { Intent } from "./types";
import { TAXONOMY_LABEL } from "./taxonomy";

const EASE = [0.16, 1, 0.3, 1] as const;

interface NextMovesProps {
  intents: Intent[];
  weakestTaxonomy: string | null;
  weakestCoverage: number;
  competitorName: string | null;
}

export function NextMoves({
  intents,
  weakestTaxonomy,
  weakestCoverage,
  competitorName,
}: NextMovesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const untrackedCount = intents.filter((i) => !i.inTracker).length;
  const topUntracked = intents
    .filter((i) => !i.inTracker)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10).length;

  const weakestLabel = weakestTaxonomy
    ? TAXONOMY_LABEL[weakestTaxonomy as keyof typeof TAXONOMY_LABEL]
    : null;

  const moves = buildMoves({
    untrackedCount,
    topUntracked,
    weakestLabel,
    weakestCoverage,
    competitorName,
  });

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="next-moves-body"
        className={
          "w-full px-5 py-3 flex items-center gap-3 text-left transition-all hover:brightness-[1.04] cursor-pointer " +
          (isOpen ? "border-b border-[var(--color-border)]" : "")
        }
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <Target className="h-5 w-5 shrink-0" style={{ color: COLORS.primary }} />
        <div className="flex-1 min-w-0">
          <SectionHeading text="Your next moves" />
        </div>
        <span
          className="px-2.5 py-1 rounded-full font-semibold whitespace-nowrap"
          style={{
            backgroundColor: "rgba(150,162,131,0.30)",
            color: "#3F5230",
            fontSize: 11,
            letterSpacing: "0.02em",
          }}
        >
          {moves.length} action{moves.length === 1 ? "" : "s"}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="shrink-0"
          style={{ transformOrigin: "center" }}
        >
          <ChevronDown className="h-5 w-5 text-[var(--color-fg-secondary)]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="next-moves-body"
            key="next-moves-body"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div className="p-4 space-y-3">
              {moves.map((m, i) => {
                const Icon = m.Icon;
                return (
                  <div
                    key={i}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-hover)]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="rounded-md p-1.5 shrink-0"
                        style={{ backgroundColor: `${m.accent}22` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: m.accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-[var(--color-fg)] mb-1"
                          style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 600 }}
                        >
                          {m.title}
                        </h4>
                        <p
                          className="text-[var(--color-fg-secondary)]"
                          style={{ fontSize: 13, lineHeight: 1.55 }}
                        >
                          {m.body}
                        </p>
                        {m.cta && (
                          <Link
                            href={m.cta.href}
                            className="inline-flex items-center gap-1 font-medium hover:gap-1.5 hover:underline transition-all mt-2"
                            style={{ fontSize: 12, color: m.accent }}
                          >
                            {m.cta.label}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Move {
  Icon: typeof Send;
  title: string;
  body: string;
  accent: string;
  cta?: { label: string; href: string };
}

function buildMoves({
  untrackedCount,
  topUntracked,
  weakestLabel,
  weakestCoverage,
  competitorName,
}: {
  untrackedCount: number;
  topUntracked: number;
  weakestLabel: string | null;
  weakestCoverage: number;
  competitorName: string | null;
}): Move[] {
  const moves: Move[] = [];

  // Move 1 — start tracking the untracked
  if (untrackedCount > 0) {
    moves.push({
      Icon: Send,
      title: `Send your top ${topUntracked} intents to Tracker`,
      body: `We found ${untrackedCount} prompts you aren't watching yet. Scroll to the All intents table below, sort by Importance (default), check the top ${topUntracked} rows, and click Send to Tracker. You'll see them on the Prompts page within a week with real performance data.`,
      accent: COLORS.primary,
      cta: { label: "Jump to intents table", href: "#intents-table" },
    });
  } else {
    moves.push({
      Icon: Send,
      title: "Re-mine your prompts every 90 days",
      body: "You're already tracking everything we've researched. The way people talk to AI changes — new phrasings show up, old ones fade. Come back to this page once a quarter, regenerate, and check for new high-importance intents.",
      accent: COLORS.primary,
      cta: { label: "Open Tracker", href: "/ai-visibility-tracker" },
    });
  }

  // Move 2 — fix weakest taxonomy
  if (weakestLabel) {
    moves.push({
      Icon: Target,
      title: `Fix your weakest territory: ${weakestLabel.toLowerCase()}`,
      body: weaknessAdvice(weakestLabel, weakestCoverage),
      accent: COLORS.scoreYellow,
      cta: { label: "Open Citation Insights", href: "/citation-insights" },
    });
  }

  // Move 3 — beat a competitor / generic
  if (competitorName) {
    moves.push({
      Icon: Swords,
      title: `Build a comparison page targeting ${competitorName}`,
      body: `Comparison prompts ("${competitorName} vs you" or "alternatives to ${competitorName}") are the fastest way to siphon their AI mindshare. Build a clear "vs" page on your site with a comparison table, then pitch it to industry comparison sites (G2, Capterra, niche comparison blogs). AI tends to cite those when answering side-by-side prompts.`,
      accent: COLORS.warning,
      cta: { label: "Open Competitor Comparison", href: "/competitor-comparison" },
    });
  } else {
    moves.push({
      Icon: Swords,
      title: "Get listed on 5 high-authority directories",
      body: "When AI answers questions in your category, it cites Yelp, Google Maps, BBB, and 2-3 industry-specific directories first. Pick the top 5 in your space, get a clean listing on each (consistent name, address, phone), and AI starts pulling you into more answers within 30-60 days.",
      accent: COLORS.warning,
      cta: { label: "Open Citation Insights", href: "/citation-insights" },
    });
  }

  return moves;
}

function weaknessAdvice(label: string, coverage: number): string {
  const cov = `${coverage}% coverage`;
  if (label.toLowerCase().includes("validation")) {
    return `People are asking "is your brand legit / trustworthy / a scam" and AI isn't finding good answers. ${cov} means your reviews are thin. Push to 30+ reviews on Google, Yelp, and BBB, and make sure your About page has clear founder info, year founded, and any press mentions. AI cites these signals first when answering trust questions.`;
  }
  if (label.toLowerCase().includes("comparative")) {
    return `${cov}. AI doesn't have anything to say about you when comparing options. Build "vs" pages on your site for your top 3 competitors, get featured on at least one comparison site (G2, Capterra, or a niche comparison blog), and make sure your homepage clearly states what makes you different.`;
  }
  if (label.toLowerCase().includes("category")) {
    return `${cov} on the unbranded category prompts where most growth lives. Get listed on the top 5-10 directories for your category, write content that uses the category words naturally, and get mentioned in any "Best [category] in [city]" listicles you can find.`;
  }
  if (label.toLowerCase().includes("operational")) {
    return `${cov}. People asking "how do I book / contact / use" you aren't getting clear answers. Add an FAQ section on your homepage with 8-12 of the most common questions answered in 1-2 sentences each. Use real question phrasings as the headings — AI extracts these directly.`;
  }
  if (label.toLowerCase().includes("audience")) {
    return `${cov}. AI doesn't know which audiences you're a fit for. Write a "Who we're for" or "Industries we serve" page that names your target audiences explicitly ("for property managers," "for restaurants," "for first-time buyers"). Ask happy clients in each segment for testimonials that mention their industry.`;
  }
  if (label.toLowerCase().includes("constraint")) {
    return `${cov}. AI doesn't know where you fit on price, location, or specific features. Make your pricing, service area, and key feature claims unambiguous on your site. Use exact dollar amounts, named cities, and clear yes/no claims (not vague phrases like "competitive pricing").`;
  }
  if (label.toLowerCase().includes("adjacent")) {
    return `${cov}. You're not surfacing in nearby categories where you could plausibly help. Write 2-3 blog posts that bridge your core service to an adjacent topic (e.g., a plumber writing about water heater installation or septic care). Internal-link those to your main service pages.`;
  }
  if (
    label.toLowerCase().includes("negative") ||
    label.toLowerCase().includes("objection")
  ) {
    return `${cov}. People searching for problems or complaints in your category — and about you — aren't finding well-positioned answers from you. Publish honest content addressing common objections in your space ("Why our service costs what it does," "Common myths about [category]"). Owning the bear case keeps competitors from defining it for you.`;
  }
  return `${cov}. The fix here is the same as most weak coverage areas: get listed on more high-authority third-party sites in your category, make sure your own site clearly answers the underlying question with structured content (FAQ, comparison tables, direct answers), and ask satisfied customers to leave reviews that mention specifics.`;
}
