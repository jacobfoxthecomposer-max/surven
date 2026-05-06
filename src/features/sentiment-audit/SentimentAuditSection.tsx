"use client";

/**
 * Sentiment Audit — surfaces the negative-sentiment AI responses with the
 * exact passages flagged + a per-response fix path. Reads `?prompt=...`
 * out of the URL so the GapPlaybookModal CTA on the Brand Sentiment page
 * can deep-link straight to a single offending prompt.
 *
 * Plug-and-play: pulls live data from `useScan` + `useBusiness`. When real
 * scan_results land in Supabase, the existing wiring already passes them
 * through unchanged.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { EngineIcon } from "@/components/atoms/EngineIcon";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useScan } from "@/features/dashboard/hooks/useScan";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import type { ModelName, ScanResult } from "@/types/database";

const MODEL_LABELS: Record<ModelName, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  google_ai: "Google AI",
};

// Heuristic — words that almost always frame a brand negatively or
// raise doubt. Used to bold passages in the response excerpt so the
// user can scan offending phrasing fast. Lowercased match.
const NEGATIVE_TERMS = [
  "but",
  "however",
  "although",
  "concerns",
  "criticized",
  "complaints",
  "issues",
  "downsides",
  "drawbacks",
  "lacks",
  "fails",
  "missing",
  "weak",
  "poor",
  "outdated",
  "expensive",
  "limited",
  "disappointing",
  "questionable",
  "mixed reviews",
  "negative",
  "slow",
  "frustrating",
];

function highlightNegatives(text: string): React.ReactNode {
  if (!text) return text;
  const pattern = new RegExp(
    `\\b(${NEGATIVE_TERMS.map((t) => t.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})\\b`,
    "gi",
  );
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(
      <mark
        key={`m-${i++}`}
        className="rounded px-0.5 font-semibold"
        style={{
          color: SURVEN_SEMANTIC.bad,
          backgroundColor: "rgba(181,70,49,0.14)",
        }}
      >
        {m[0]}
      </mark>,
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

interface NegativeIssue {
  prompt: string;
  perEngine: { engine: ModelName; excerpt: string }[];
}

function groupNegatives(results: ScanResult[]): NegativeIssue[] {
  const map = new Map<string, NegativeIssue>();
  for (const r of results) {
    if (!r.business_mentioned || r.sentiment !== "negative") continue;
    const key = r.prompt_text.slice(0, 120);
    if (!map.has(key)) {
      map.set(key, { prompt: r.prompt_text, perEngine: [] });
    }
    map.get(key)!.perEngine.push({
      engine: r.model_name as ModelName,
      excerpt: r.response_text ?? "",
    });
  }
  return Array.from(map.values()).sort(
    (a, b) => b.perEngine.length - a.perEngine.length,
  );
}

export function SentimentAuditSection() {
  const { business, isLoading: bizLoading } = useBusiness();
  const { latestScan, isLoading: scanLoading } = useScan(business, []);
  const search = useSearchParams();
  const focusedPrompt = search.get("prompt");
  const focusRef = useRef<HTMLDivElement | null>(null);

  const issues = useMemo(
    () => groupNegatives(latestScan?.results ?? []),
    [latestScan],
  );

  // Sort the focused prompt to the top if it matches a query param.
  const ordered = useMemo(() => {
    if (!focusedPrompt) return issues;
    const idx = issues.findIndex((i) =>
      i.prompt.toLowerCase().includes(focusedPrompt.toLowerCase()),
    );
    if (idx <= 0) return issues;
    return [issues[idx], ...issues.slice(0, idx), ...issues.slice(idx + 1)];
  }, [issues, focusedPrompt]);

  // Scroll the focused prompt into view once it mounts.
  useEffect(() => {
    if (!focusedPrompt || !focusRef.current) return;
    focusRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusedPrompt, ordered]);

  if (bizLoading || scanLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Loading audit...
        </p>
      </div>
    );
  }

  const businessName = business?.name ?? "your brand";
  const totalNegative = issues.length;

  return (
    <div className="space-y-6 w-full">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 4.6vw, 60px)",
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
          }}
        >
          Your sentiment audit is{" "}
          <span
            style={{
              color:
                totalNegative === 0
                  ? SURVEN_SEMANTIC.good
                  : totalNegative >= 3
                    ? SURVEN_SEMANTIC.bad
                    : SURVEN_SEMANTIC.mid,
              fontStyle: "italic",
            }}
          >
            {totalNegative === 0
              ? "clean"
              : totalNegative >= 3
                ? "concerning"
                : "mixed"}
          </span>
          .
        </h1>
        <p
          className="text-[var(--color-fg-muted)] mt-2"
          style={{ fontSize: 15.5, lineHeight: 1.55, maxWidth: 760 }}
        >
          <strong className="text-[var(--color-fg)] font-semibold">
            Why is this important?
          </strong>{" "}
          Negative framing in AI answers steers buyers to competitors before
          they ever click your site. Below are the prompts where AI engines
          returned critical or dismissive language about {businessName} —
          plus the highlighted passages and the fix path for each.
        </p>
      </motion.div>

      {/* ── Empty state ── */}
      {totalNegative === 0 && (
        <Card className="text-center py-16 space-y-3">
          <div
            className="h-12 w-12 rounded-full mx-auto flex items-center justify-center"
            style={{ backgroundColor: "rgba(150,162,131,0.20)" }}
          >
            <CheckCircle2
              className="h-6 w-6"
              style={{ color: SURVEN_SEMANTIC.goodAlt }}
            />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            No negative sentiment to address
          </h2>
          <p
            className="text-[var(--color-fg-muted)] max-w-md mx-auto"
            style={{ fontSize: 13.5, lineHeight: 1.55 }}
          >
            Across this scan, no AI engine returned critical or dismissive
            language about {businessName}. Defend it by keeping fresh
            testimonials and case studies in your cited sources.
          </p>
          <Link
            href="/sentiment"
            className="inline-flex items-center gap-1 text-sm font-semibold mt-2 hover:underline"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          >
            Back to Brand Sentiment
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      )}

      {/* ── Issue list ── */}
      {ordered.length > 0 && (
        <div className="space-y-4">
          {ordered.map((issue, i) => {
            const isFocused = Boolean(
              focusedPrompt &&
                issue.prompt
                  .toLowerCase()
                  .includes(focusedPrompt.toLowerCase()),
            );
            return (
              <motion.div
                key={i}
                ref={isFocused && i === 0 ? focusRef : undefined}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(i * 0.05, 0.3),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <NegativeIssueCard issue={issue} highlighted={isFocused} />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Managed plans nudge ── */}
      {totalNegative > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[var(--radius-lg)] p-5 flex items-start gap-3"
          style={{
            background: `linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(150,162,131,0.04) 100%)`,
            borderLeft: `4px solid ${SURVEN_SEMANTIC.goodAlt}`,
          }}
        >
          <Sparkles
            className="h-5 w-5 mt-0.5 shrink-0"
            style={{ color: SURVEN_SEMANTIC.goodAlt }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold"
              style={{
                fontSize: 15,
                color: "var(--color-fg)",
                marginBottom: 4,
              }}
            >
              Don&apos;t want to do this yourself?
            </p>
            <p
              className="text-[var(--color-fg-secondary)]"
              style={{ fontSize: 13, lineHeight: 1.55 }}
            >
              Surven&apos;s managed plans handle the source rewrites,
              review-platform outreach, and reputation-correcting content for
              you — so the framing flips without you sinking hours into
              comment threads.
            </p>
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-1 mt-2 font-semibold hover:underline"
              style={{ fontSize: 13, color: SURVEN_SEMANTIC.goodAlt }}
            >
              See managed plans
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── One negative-sentiment prompt card ───────────────────────────────────

function NegativeIssueCard({
  issue,
  highlighted,
}: {
  issue: NegativeIssue;
  highlighted: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden"
      style={{
        borderColor: highlighted
          ? SURVEN_SEMANTIC.bad
          : "var(--color-border)",
        boxShadow: highlighted
          ? "0 0 0 1px rgba(181,70,49,0.45), 0 8px 24px -8px rgba(181,70,49,0.25)"
          : undefined,
      }}
    >
      {/* Header strip */}
      <div
        className="px-5 py-3 border-b border-[var(--color-border)] flex items-start justify-between gap-3"
        style={{
          background: `linear-gradient(135deg, rgba(181,70,49,0.12) 0%, rgba(181,70,49,0.03) 100%)`,
        }}
      >
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle
            className="h-4 w-4 mt-1 shrink-0"
            style={{ color: SURVEN_SEMANTIC.bad }}
          />
          <div className="min-w-0">
            <p
              className="text-[var(--color-fg-muted)] uppercase tracking-wider"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                marginBottom: 2,
              }}
            >
              Prompt
            </p>
            <p
              className="text-[var(--color-fg)]"
              style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}
            >
              &ldquo;{issue.prompt}&rdquo;
            </p>
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-center text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap"
          style={{
            color: SURVEN_SEMANTIC.bad,
            backgroundColor: "rgba(181,70,49,0.12)",
          }}
        >
          {issue.perEngine.length} engine
          {issue.perEngine.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Per-engine excerpts */}
      <div className="p-5 space-y-3">
        {issue.perEngine.map((p, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
            style={{ background: "var(--color-surface-alt)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <EngineIcon id={p.engine} size={14} />
              <span
                className="font-semibold"
                style={{ fontSize: 13, color: "var(--color-fg)" }}
              >
                {MODEL_LABELS[p.engine]}
              </span>
            </div>
            <p
              className="text-[var(--color-fg-secondary)]"
              style={{ fontSize: 13, lineHeight: 1.55 }}
            >
              {highlightNegatives(p.excerpt)}
            </p>
          </div>
        ))}

        {/* Fix path */}
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p
            className="uppercase tracking-wider text-[var(--color-fg-muted)] mb-2"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}
          >
            Fix path
          </p>
          <ul className="space-y-2">
            <FixStep
              text="Identify the third-party source the AI is summarizing — usually a review, forum thread, or news piece. Search the highlighted phrase verbatim to find it."
            />
            <FixStep
              text="Choose the highest-leverage response: public reply on the source platform, refresh your own cited content with stronger counter-evidence, or request an author correction."
            />
            <FixStep
              text="New positive sources within 30-90 days usually flip the framing on the next scan."
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

function FixStep({ text }: { text: string }) {
  return (
    <li
      className="flex items-start gap-2 text-[var(--color-fg-secondary)]"
      style={{ fontSize: 12.5, lineHeight: 1.55 }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
        style={{ backgroundColor: SURVEN_SEMANTIC.bad }}
      />
      <span>{text}</span>
    </li>
  );
}

