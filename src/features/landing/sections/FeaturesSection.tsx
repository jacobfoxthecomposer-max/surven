"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import { Radar } from "@/components/ui/radar-effect";
import { Eye, Bot, Search, TrendingUp, Zap, BarChart3, Link2 } from "lucide-react";

const features = [
  {
    key: "mention",
    icon: Eye,
    text: "Mention Tracking",
    tooltip:
      "We ask AI chatbots questions about your industry and see if they bring up your business. It's like Googling yourself — but for AI. You'll know exactly when and where your name shows up.",
  },
  {
    key: "multimodel",
    icon: Bot,
    text: "Multi-Model",
    tooltip:
      "We check every major AI tool — ChatGPT, Claude, Gemini, and Google AI — all at once. Different AI tools give different answers, so we cover all of them so nothing slips through.",
  },
  {
    key: "prompts",
    icon: Search,
    text: "Real Prompts",
    tooltip:
      "We use the same questions your real customers type — things like \"best dentist near me\" or \"top accountant in Austin.\" This gives you honest results, not made-up test scenarios.",
  },
  {
    key: "trends",
    icon: TrendingUp,
    text: "Trend Analysis",
    tooltip:
      "We save your score every time we run a scan, so you can see a graph of whether you're improving or slipping. Like a weekly report card for your AI visibility.",
  },
  {
    key: "autoscans",
    icon: Zap,
    text: "Auto Scans",
    tooltip:
      "We run a fresh check every week automatically — no button-clicking needed. You just log in and your latest results are already there waiting for you.",
  },
  {
    key: "competitor",
    icon: BarChart3,
    text: "Competitor Bench",
    tooltip:
      "See exactly how you compare to your competitors in AI results. Find out if a rival down the street is showing up more than you — and in which AI tools — so you know where to focus.",
  },
  {
    key: "citations",
    icon: Link2,
    text: "Citation Gaps",
    tooltip:
      "AI tools trust certain websites when recommending businesses — like Yelp or TripAdvisor. We show you which ones you're missing from, so you know exactly where to list your business next.",
  },
];

const rows = [features.slice(0, 3), features.slice(3, 5), features.slice(5, 7)];

function FeatureIcon({
  feat,
  isOpen,
  onToggle,
}: {
  feat: (typeof features)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = feat.icon;

  return (
    <div className="relative z-50 flex flex-col items-center justify-center">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-full mb-3 w-56 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 shadow-[var(--shadow-md)] text-left pointer-events-none"
            style={{ zIndex: 100 }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-3 h-3 rotate-45 border-r border-b border-[var(--color-border)] bg-[var(--color-bg)]" />
            <p className="text-xs font-semibold text-[var(--color-fg)] mb-1">{feat.text}</p>
            <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">{feat.tooltip}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onToggle}
        className="flex flex-col items-center space-y-2 group focus:outline-none"
        aria-expanded={isOpen}
        aria-label={`Learn about ${feat.text}`}
      >
        <motion.div
          animate={{ scale: isOpen ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-surface-alt)] transition-colors duration-200"
        >
          <Icon className="h-5 w-5 text-[var(--color-primary)]" />
        </motion.div>
        <span className="hidden text-center text-xs font-medium text-[var(--color-fg-muted)] md:block group-hover:text-[var(--color-fg)] transition-colors">
          {feat.text}
        </span>
      </button>
    </div>
  );
}

export function FeaturesSection() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <section className="py-24 px-4 bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
            What we track
          </span>
        </ScrollReveal>
        <ScrollReveal className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Complete AI visibility{" "}
            <em className="italic font-normal text-[var(--color-primary)]">intelligence</em>
          </h2>
          <p className="mt-4 text-[var(--color-fg-secondary)] max-w-xl mx-auto text-sm sm:text-base">
            Surven monitors every signal that determines whether AI recommends your business.{" "}
            <span className="text-[var(--color-fg)] font-medium">Tap any icon to learn more.</span>
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div
            ref={sectionRef}
            className="relative flex h-[420px] w-full flex-col items-center justify-center space-y-8 overflow-visible"
          >
            {/* Row 1 — 3 icons */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex w-full items-center justify-center space-x-10 md:justify-between md:space-x-0">
                {rows[0].map((feat) => (
                  <FeatureIcon
                    key={feat.key}
                    feat={feat}
                    isOpen={openKey === feat.key}
                    onToggle={() => toggle(feat.key)}
                  />
                ))}
              </div>
            </div>

            {/* Row 2 — 2 icons */}
            <div className="mx-auto w-full max-w-md">
              <div className="flex w-full items-center justify-center space-x-10 md:justify-between md:space-x-0">
                {rows[1].map((feat) => (
                  <FeatureIcon
                    key={feat.key}
                    feat={feat}
                    isOpen={openKey === feat.key}
                    onToggle={() => toggle(feat.key)}
                  />
                ))}
              </div>
            </div>

            {/* Row 3 — 2 icons */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex w-full items-center justify-center space-x-10 md:justify-between md:space-x-0">
                {rows[2].map((feat) => (
                  <FeatureIcon
                    key={feat.key}
                    feat={feat}
                    isOpen={openKey === feat.key}
                    onToggle={() => toggle(feat.key)}
                  />
                ))}
              </div>
            </div>

            {/* Radar — top half only, clipped at center */}
            <div
              className="absolute bottom-0 left-0 right-0 flex justify-center overflow-hidden pointer-events-none"
              style={{ height: "320px" }}
            >
              <div style={{ position: "absolute", bottom: "-40px" }}>
                <Radar />
              </div>
            </div>
            <div className="absolute bottom-0 z-[41] h-px w-full" style={{ background: "linear-gradient(to right, transparent, rgba(150,162,131,0.4), transparent)" }} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
