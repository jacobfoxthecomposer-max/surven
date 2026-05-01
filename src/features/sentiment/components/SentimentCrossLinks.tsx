"use client";

import Link from "next/link";
import { ArrowRight, Quote, MessageSquare } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";

interface Props {
  totalMentions: number;
  negativeCount: number;
}

export function SentimentCrossLinks({ totalMentions, negativeCount }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Citation Insights cross-link */}
      <Link href="/citation-insights" className="block group">
        <Card className="h-full hover:border-[var(--color-border-hover)] transition-colors">
          <div className="flex items-start gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(150,162,131,0.15)" }}
            >
              <Quote className="h-4 w-4" style={{ color: SURVEN_SEMANTIC.good }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-fg)] mb-1">
                Sources driving your sentiment
              </p>
              <p className="text-xs text-[var(--color-fg-secondary)] leading-snug">
                Sentiment lives in the sources AI cites. See which domains are pushing positive vs. negative framing on your brand.
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 mt-1 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              style={{ color: SURVEN_SEMANTIC.good }}
            />
          </div>
        </Card>
      </Link>

      {/* Prompts cross-link */}
      <Link href="/prompts" className="block group">
        <Card className="h-full hover:border-[var(--color-border-hover)] transition-colors">
          <div className="flex items-start gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: negativeCount > 0 ? "rgba(181,70,49,0.12)" : "rgba(150,162,131,0.15)" }}
            >
              <MessageSquare
                className="h-4 w-4"
                style={{ color: negativeCount > 0 ? SURVEN_SEMANTIC.bad : SURVEN_SEMANTIC.good }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-fg)] mb-1">
                {negativeCount > 0 ? `${negativeCount} prompts with negative tone` : "All prompts tracked"}
              </p>
              <p className="text-xs text-[var(--color-fg-secondary)] leading-snug">
                {negativeCount > 0
                  ? `${negativeCount} of ${totalMentions} mentions use critical language. Open the prompt list to see which queries trigger them.`
                  : `Browse all ${totalMentions} prompt mentions across engines, sorted by sentiment, volume, or position.`}
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 mt-1 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              style={{ color: negativeCount > 0 ? SURVEN_SEMANTIC.bad : SURVEN_SEMANTIC.good }}
            />
          </div>
        </Card>
      </Link>
    </div>
  );
}
