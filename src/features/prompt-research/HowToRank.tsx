"use client";

import Link from "next/link";
import {
  BookOpen,
  Building2,
  FileText,
  Quote,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { COLORS } from "@/utils/constants";

interface Tactic {
  Icon: typeof BookOpen;
  title: string;
  body: string;
  accent: string;
  cta?: { label: string; href: string };
}

const TACTICS: Tactic[] = [
  {
    Icon: Building2,
    title: "Get listed where AI looks",
    body:
      "Most of what AI cites about your business isn't your website — it's Yelp, Google Maps, BBB, Reddit, industry directories, and big news mentions. Pick the top 5 directories in your category and get a clean, consistent listing on each (same name, address, phone everywhere). Single biggest lever, and most businesses skip it.",
    accent: COLORS.primary,
    cta: { label: "Open Citation Insights", href: "/citation-insights" },
  },
  {
    Icon: FileText,
    title: "Make your site easy for AI to extract",
    body:
      "AI grabs answer-shaped content: FAQ blocks, comparison tables, direct answers in the first 1-2 sentences of a section, clear headings every 200 words. Add a real FAQ section on your homepage. Use comparison tables instead of paragraphs when comparing options. Put the answer first, the explanation second.",
    accent: COLORS.scoreYellow,
    cta: { label: "Run a website audit", href: "/audit" },
  },
  {
    Icon: Quote,
    title: "Get mentioned alongside your category",
    body:
      "AI learns that your brand belongs to your category by seeing them mentioned together repeatedly across the web. Guest posts, industry listicles ('Top 10 plumbers in Denver'), podcast appearances, and press mentions all count. One mention in a real publication is worth more than fifty mentions on your own blog.",
    accent: COLORS.warning,
  },
  {
    Icon: ShieldCheck,
    title: "Fix what AI gets wrong about you",
    body:
      "If AI is hallucinating facts about your business — wrong founder, wrong year, wrong pricing, made-up features — those errors live in the training data and get repeated. Publish corrections in citation-friendly places: a clear About page, a Wikipedia entry if you qualify, a press release through a real PR wire. Schema markup on your site helps too.",
    accent: COLORS.primary,
    cta: { label: "Open Brand Sentiment", href: "/sentiment" },
  },
  {
    Icon: BookOpen,
    title: "Write for the question, not the keyword",
    body:
      'Old SEO: "use \'best plumber denver\' 8 times in the page." Dead. New GEO: have a heading on your page that literally is the question someone asks AI ("How much does an emergency plumber cost in Denver?") and answer it cleanly underneath. The page doesn\'t need to repeat the keyword — it needs to actually answer.',
    accent: COLORS.scoreYellow,
  },
  {
    Icon: RotateCcw,
    title: "Re-check every 90 days",
    body:
      "AI models update. Retrieval indexes update. Competitors publish new content. Your standings shift. Come back to Tracker and Prompt Research on a schedule (we recommend the first week of every quarter), regenerate, see what changed, and react. The brands that compound are the ones that re-check.",
    accent: COLORS.warning,
    cta: { label: "Open Tracker", href: "/ai-visibility-tracker" },
  },
];

export function HowToRank() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] rounded-t-[var(--radius-lg)]"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.28) 0%, rgba(184,160,48,0.14) 50%, rgba(201,123,69,0.14) 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: COLORS.primary }} />
          <SectionHeading
            text="How to actually win these prompts"
            info="The plain-English playbook for getting AI to mention you. Not in priority order — most clients need a mix of all six."
          />
        </div>
      </div>

      <div className="p-4">
        <p
          className="text-[var(--color-fg-secondary)] mb-4 leading-relaxed px-1"
          style={{ fontSize: 13, maxWidth: 780 }}
        >
          Tracking is the diagnosis. These are the prescriptions. Most of GEO
          comes down to six tactics — none of them exotic, but most businesses
          skip the third-party half and wonder why their website alone isn't
          enough.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TACTICS.map(({ Icon, title, body, accent, cta }) => (
            <div
              key={title}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-[var(--color-border-hover)]"
            >
              <div className="flex items-start gap-3">
                <div
                  className="rounded-md p-1.5 shrink-0"
                  style={{ backgroundColor: `${accent}22` }}
                >
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-[var(--color-fg)] mb-1"
                    style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 600 }}
                  >
                    {title}
                  </h4>
                  <p
                    className="text-[var(--color-fg-secondary)]"
                    style={{ fontSize: 13, lineHeight: 1.55 }}
                  >
                    {body}
                  </p>
                  {cta && (
                    <Link
                      href={cta.href}
                      className="inline-flex items-center gap-1 font-medium hover:gap-1.5 hover:underline transition-all mt-2"
                      style={{ fontSize: 12, color: accent }}
                    >
                      {cta.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
