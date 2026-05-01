"use client";

import { motion } from "framer-motion";
import { Globe, Search, FileText, Lock, Link2 } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import type { CategoryScores } from "@/types/crawlability";

const CATEGORY_META: Array<{
  key: keyof CategoryScores;
  label: string;
  icon: typeof Globe;
  hint: string;
}> = [
  {
    key: "http",
    label: "HTTP Health",
    icon: Globe,
    hint: "How well your server responds — error rates, redirect chains, URL depth.",
  },
  {
    key: "indexability",
    label: "Indexability",
    icon: Search,
    hint: "Whether AI and search crawlers are allowed to read your pages — robots.txt, sitemap, noindex, canonicals.",
  },
  {
    key: "content",
    label: "Content Quality",
    icon: FileText,
    hint: "Meta tags, schema markup, alt text, freshness — what AI extracts to summarize your site.",
  },
  {
    key: "security",
    label: "Security",
    icon: Lock,
    hint: "HTTPS coverage. AI deprioritizes non-secure sites.",
  },
  {
    key: "links",
    label: "Link Health",
    icon: Link2,
    hint: "Broken internal links waste crawl budget and reduce trust.",
  },
];

function scoreColor(score: number): string {
  if (score < 26) return "#B54631";
  if (score < 56) return "#C97B45";
  if (score < 81) return "#96A283";
  return "#7D8E6C";
}

export function CategoryScoresBars({ scores }: { scores: CategoryScores }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 h-full">
      <div className="mb-4">
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--color-fg)",
          }}
        >
          Category Scores
        </h3>
        <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
          Where your crawlability stands by area
        </p>
      </div>

      <div className="space-y-3.5">
        {CATEGORY_META.map((cat, i) => {
          const score = scores[cat.key];
          const color = scoreColor(score);
          const Icon = cat.icon;
          return (
            <HoverHint key={cat.key} hint={cat.hint} display="block">
              <div style={{ cursor: "help" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <span className="text-sm font-medium text-[var(--color-fg)]">
                      {cat.label}
                    </span>
                  </div>
                  <span
                    className="tabular-nums font-semibold"
                    style={{ fontSize: 13, color }}
                  >
                    {score}
                    <span className="text-[var(--color-fg-muted)] font-normal text-xs">/100</span>
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-[var(--color-bg)]/60 border border-[var(--color-border)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </HoverHint>
          );
        })}
      </div>
    </div>
  );
}
