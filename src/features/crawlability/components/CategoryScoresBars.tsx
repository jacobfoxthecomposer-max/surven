"use client";

import { motion } from "framer-motion";
import { Globe, Search, FileText, Lock, Link2 } from "lucide-react";
import { HoverHint } from "@/components/atoms/HoverHint";
import { ChartExplainer } from "@/components/atoms/ChartExplainer";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
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

// Crawlability is a semantic metric — sage means healthy, rust means concerning.
// Thresholds: 81+ excellent (good), 56–80 healthy (goodAlt), 26–55 watch (mid), <26 critical (bad).
function scoreColor(score: number): string {
  if (score < 26) return SURVEN_SEMANTIC.bad;
  if (score < 56) return SURVEN_SEMANTIC.mid;
  if (score < 81) return SURVEN_SEMANTIC.goodAlt;
  return SURVEN_SEMANTIC.good;
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

      <ChartExplainer
        blocks={[
          {
            label: "Rows",
            body: "Five crawlability categories — HTTP health, indexability, content quality, security, and link health. Each is its own independent score.",
          },
          {
            label: "Bar length",
            body: "Score from 0 to 100. The bar fills proportionally — a full bar means a perfect score, a short bar means most checks are failing.",
          },
          {
            label: "Colors",
            body: "Semantic — sage = excellent (81+), lighter sage = healthy (56–80), gold = watch (26–55), rust = critical (under 26).",
          },
          {
            label: "Why these five",
            body: "Together they cover every signal AI engines use to decide whether to trust your site as a citation source. Failing one drags your overall crawlability score down.",
          },
        ]}
        tip="Hover any row for what that category measures. The lowest-scoring category is usually the highest-leverage thing to fix first."
      />
    </div>
  );
}
