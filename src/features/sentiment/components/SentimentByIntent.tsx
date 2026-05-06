"use client";

/**
 * Sentiment by Customer Intent — small data box for the Brand Sentiment
 * page. Buckets every mentioned-with-sentiment scan result by its derived
 * customer intent (Informational / Local / Comparison / Use-case /
 * Transactional) and shows the per-intent positive / neutral / negative
 * ratio, so the user can see WHERE the framing breaks down — not just
 * that something's broken.
 *
 * Same dimensions as SentimentByPlatform so it fits cleanly into a
 * sibling 50% column on the Brand Sentiment page.
 */
import { useMemo } from "react";
import { SectionHeading } from "@/components/atoms/SectionHeading";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";
import {
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_ORDER,
  primaryIntent,
  type PromptCategoryId,
} from "@/utils/promptCategories";
import type { ScanResult } from "@/types/database";

interface IntentBucket {
  intent: PromptCategoryId;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
}

function aggregateByIntent(
  results: ScanResult[],
  brandNames: string[],
): IntentBucket[] {
  const map = new Map<PromptCategoryId, IntentBucket>();
  for (const id of PROMPT_CATEGORY_ORDER) {
    map.set(id, {
      intent: id,
      total: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      positivePct: 0,
      neutralPct: 0,
      negativePct: 0,
    });
  }
  for (const r of results) {
    if (!r.business_mentioned || !r.sentiment) continue;
    const intent = primaryIntent(r.prompt_text, brandNames);
    const b = map.get(intent)!;
    b.total += 1;
    if (r.sentiment === "positive") b.positive += 1;
    else if (r.sentiment === "negative") b.negative += 1;
    else b.neutral += 1;
  }
  for (const b of map.values()) {
    if (b.total === 0) continue;
    b.positivePct = Math.round((b.positive / b.total) * 100);
    b.negativePct = Math.round((b.negative / b.total) * 100);
    b.neutralPct = Math.max(0, 100 - b.positivePct - b.negativePct);
  }
  return PROMPT_CATEGORY_ORDER.map((id) => map.get(id)!);
}

export function SentimentByIntent({
  results,
  brandNames = [],
}: {
  results: ScanResult[];
  brandNames?: string[];
}) {
  const buckets = useMemo(
    () => aggregateByIntent(results, brandNames),
    [results, brandNames],
  );

  // Find the worst intent (lowest positive %, requires at least 1 mention)
  // so we can surface a one-line headline above the rows.
  const populated = buckets.filter((b) => b.total > 0);
  const sortedByPositive = [...populated].sort(
    (a, b) => a.positivePct - b.positivePct,
  );
  const worst = sortedByPositive[0];
  const best = sortedByPositive[sortedByPositive.length - 1];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full w-full min-w-0">
      <div className="mb-3 pb-3 border-b border-[var(--color-border)] flex items-start justify-between gap-2">
        <SectionHeading
          text="Sentiment by intent"
          info="How customers feel about your brand for each kind of question they ask AI. Comparison and Transactional prompts are the highest-leverage to fix because they're closest to a buying decision."
        />
        {worst && best && worst.intent !== best.intent && (
          <span
            className="shrink-0 text-[11px] text-[var(--color-fg-muted)] tabular-nums"
            title={`${PROMPT_CATEGORIES[worst.intent].label} is your weakest intent at ${worst.positivePct}% positive.`}
          >
            <span style={{ color: SURVEN_SEMANTIC.bad, fontWeight: 600 }}>
              {PROMPT_CATEGORIES[worst.intent].label}
            </span>{" "}
            weakest
          </span>
        )}
      </div>

      <ul className="flex-1 flex flex-col justify-between gap-3">
        {buckets.map((b) => (
          <IntentRow key={b.intent} bucket={b} />
        ))}
      </ul>
    </div>
  );
}

function IntentRow({ bucket }: { bucket: IntentBucket }) {
  const cat = PROMPT_CATEGORIES[bucket.intent];
  const isEmpty = bucket.total === 0;

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex items-center gap-2 min-w-0" style={{ width: 110 }}>
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: cat.color }}
        />
        <span
          className="text-[var(--color-fg)] truncate"
          style={{ fontSize: 12.5, fontWeight: 500 }}
          title={cat.label}
        >
          {cat.label}
        </span>
      </div>

      {isEmpty ? (
        <div
          className="h-2 rounded-full"
          style={{ background: "var(--color-surface-alt)" }}
          title="No mentions in this intent yet."
        />
      ) : (
        <div
          className="h-2 rounded-full overflow-hidden flex"
          style={{ background: "var(--color-surface-alt)" }}
          title={`${bucket.positivePct}% positive · ${bucket.neutralPct}% neutral · ${bucket.negativePct}% negative`}
        >
          {bucket.positivePct > 0 && (
            <div
              style={{
                width: `${bucket.positivePct}%`,
                backgroundColor: SURVEN_SEMANTIC.good,
                transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          )}
          {bucket.neutralPct > 0 && (
            <div
              style={{
                width: `${bucket.neutralPct}%`,
                backgroundColor: SURVEN_SEMANTIC.neutral,
                transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          )}
          {bucket.negativePct > 0 && (
            <div
              style={{
                width: `${bucket.negativePct}%`,
                backgroundColor: SURVEN_SEMANTIC.bad,
                transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0 tabular-nums" style={{ minWidth: 96, justifyContent: "flex-end" }}>
        {isEmpty ? (
          <span
            className="text-[var(--color-fg-muted)]"
            style={{ fontSize: 11 }}
          >
            No data
          </span>
        ) : (
          <>
            <span
              className="font-semibold"
              style={{
                fontSize: 13,
                color:
                  bucket.positivePct >= 60
                    ? SURVEN_SEMANTIC.good
                    : bucket.negativePct >= 40
                      ? SURVEN_SEMANTIC.bad
                      : "var(--color-fg)",
              }}
            >
              {bucket.positivePct}%
            </span>
            <span
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 10.5 }}
            >
              {bucket.total} mention{bucket.total === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>
    </li>
  );
}
