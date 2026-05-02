"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Link2,
  Pencil,
  Search,
  Globe,
  Target,
  ChevronUp,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COLORS, ANIMATION } from "@/utils/constants";

interface WhatsNextCardProps {
  /** Optional weakest-engine label, used in the FAQ schema item description. */
  weakEngineLabel?: string;
  className?: string;
}

export function WhatsNextCard({
  weakEngineLabel,
  className = "",
}: WhatsNextCardProps) {
  const PAGE_SIZE = 3;
  const CARD_H = 150;
  const GAP = 12;
  const STEP = CARD_H + GAP;
  const [startIndex, setStartIndex] = useState(0);

  const items: {
    Icon: typeof FileText;
    title: string;
    description: string;
    cta: string;
    href: string;
    accent: string;
  }[] = [
    {
      Icon: FileText,
      title: "Add FAQ schema to top service pages",
      description: weakEngineLabel
        ? `Mark up your most-visited pages with FAQ structured data. Biggest lever for getting picked up by ${weakEngineLabel}.`
        : "Mark up your most-visited pages with FAQ structured data. Biggest lever for getting picked up by AI engines.",
      cta: "Open FAQ schema tool",
      href: "/tools/faq-schema",
      accent: COLORS.primary,
    },
    {
      Icon: Link2,
      title: "Get listed on Reddit and BBB",
      description:
        "AI tools heavily cite Reddit threads and BBB profiles. A few authoritative citations on these sites lift your visibility quickly.",
      cta: "View citation finder",
      href: "/tools/citations",
      accent: COLORS.scoreYellow,
    },
    {
      Icon: Pencil,
      title: "Rewrite low-ranking page intros",
      description:
        "Move the answer to the customer's question into the first 50 words on your 5 weakest pages so AI tools can extract it cleanly.",
      cta: "Open page audit",
      href: "/tools/page-audit",
      accent: COLORS.warning,
    },
    {
      Icon: Search,
      title: "Track new prompt opportunities",
      description:
        "Discover trending customer questions in your space where competitors are showing up but you aren't.",
      cta: "View prompt explorer",
      href: "/tools/prompt-gaps",
      accent: COLORS.primary,
    },
    {
      Icon: Globe,
      title: "Optimize crawl access for AI bots",
      description:
        "Make sure ChatGPT, Claude, Perplexity, and Gemini crawlers can reach the pages you most want to be cited from.",
      cta: "View crawl health report",
      href: "/tools/crawl-health",
      accent: COLORS.scoreYellow,
    },
  ];

  const maxStart = Math.max(0, items.length - PAGE_SIZE);
  const canUp = startIndex > 0;
  const canDown = startIndex < maxStart;
  const goUp = () => setStartIndex((s) => Math.max(0, s - PAGE_SIZE));
  const goDown = () => setStartIndex((s) => Math.min(maxStart, s + PAGE_SIZE));
  const visibleH = PAGE_SIZE * CARD_H + (PAGE_SIZE - 1) * GAP;

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full ${className}`}
    >
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] rounded-t-[var(--radius-lg)]"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" style={{ color: COLORS.primary }} />
          <SectionHeading
            text="What's next?"
            info="Top recommended actions to lift your AI visibility, ordered by impact."
          />
        </div>
      </div>

      <div className="flex justify-center pt-2 pb-1">
        <button
          type="button"
          onClick={goUp}
          disabled={!canUp}
          aria-label="Show previous actions"
          className={
            "rounded-full p-1 transition-colors " +
            (canUp
              ? "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] cursor-pointer"
              : "text-[var(--color-border)] cursor-default")
          }
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-hidden px-4" style={{ height: visibleH }}>
        <motion.div
          animate={{ y: -startIndex * STEP }}
          transition={ANIMATION.springSnappy}
          style={{ display: "flex", flexDirection: "column", gap: GAP }}
        >
          {items.map((item, i) => {
            const Icon = item.Icon;
            return (
              <div
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-hover)]"
                style={{ height: CARD_H, flexShrink: 0 }}
              >
                <div className="flex items-start gap-3 h-full">
                  <div
                    className="rounded-md p-1.5 shrink-0"
                    style={{ backgroundColor: `${item.accent}22` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.accent }} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h4
                      className="text-[var(--color-fg)] mb-1"
                      style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 600 }}
                    >
                      {item.title}
                    </h4>
                    <p
                      className="text-[var(--color-fg-secondary)] mb-auto"
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.description}
                    </p>
                    <a
                      href={item.href}
                      className="inline-flex items-center gap-1 font-medium hover:gap-1.5 hover:underline transition-all mt-1.5 self-start"
                      style={{ fontSize: 12, color: item.accent }}
                    >
                      {item.cta}
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      <div className="flex-1" />

      <div className="flex justify-center pt-1 pb-2">
        <button
          type="button"
          onClick={goDown}
          disabled={!canDown}
          aria-label="Show next actions"
          className={
            "rounded-full p-1 transition-colors " +
            (canDown
              ? "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-alt)] cursor-pointer"
              : "text-[var(--color-border)] cursor-default")
          }
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
