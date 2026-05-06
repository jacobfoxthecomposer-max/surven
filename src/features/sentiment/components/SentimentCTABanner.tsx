"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";

interface Props {
  negativeCount: number;
}

export function SentimentCTABanner({ negativeCount }: Props) {
  const hasNegatives = negativeCount > 0;
  const accent = hasNegatives ? SURVEN_SEMANTIC.bad : SURVEN_SEMANTIC.good;

  return (
    <Card
      className="flex items-center gap-4"
      style={{
        background: hasNegatives
          ? "linear-gradient(135deg, rgba(181,70,49,0.06), rgba(181,70,49,0.02))"
          : "linear-gradient(135deg, rgba(150,162,131,0.10), rgba(150,162,131,0.03))",
        borderColor: hasNegatives ? "rgba(181,70,49,0.25)" : "rgba(150,162,131,0.30)",
      }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: hasNegatives ? "rgba(181,70,49,0.12)" : "rgba(150,162,131,0.18)" }}
      >
        <Sparkles className="h-4 w-4" style={{ color: accent }} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-bold tracking-wider uppercase mb-1"
          style={{ color: accent }}
        >
          {hasNegatives ? "Ready to fix the gaps?" : "Keep the momentum going"}
        </p>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            lineHeight: 1.2,
            color: "var(--color-fg)",
          }}
        >
          {hasNegatives
            ? "Run a website audit and we'll write the rewrites for you."
            : "Run a website audit to lock in your positive framing."}
        </h3>
      </div>

      <Link
        href="/audit"
        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ background: accent }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Start website audit</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}
