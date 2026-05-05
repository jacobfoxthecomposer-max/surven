import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

export const metadata = {
  title: "What is GEO? — Surven",
  description: "Generative Engine Optimization explained: how AI engines decide what to cite and how your business can rank higher on ChatGPT, Claude, and Gemini.",
};

const SECTIONS = [
  {
    title: "SEO got you on Google. GEO gets you on AI.",
    body: "For years, SEO meant ranking on Google's blue links. But your customers aren't just searching Google anymore — they're asking ChatGPT, Claude, Gemini, and Google AI Overview. And those engines don't return a list of links. They return a single answer. Either your business is in that answer, or it isn't.",
  },
  {
    title: "How AI engines decide what to cite",
    body: "AI engines pull from three sources: what they learned during training (parametric memory), real-time web searches (retrieval), and tool integrations. Businesses that appear on high-authority directories, have well-structured websites, and publish clear authoritative content get cited far more often. It's not about keywords — it's about trust signals and entity recognition.",
  },
  {
    title: "Why GEO is different from SEO",
    body: "SEO optimizes for crawlers and ranking algorithms. GEO optimizes for language models that synthesize answers. The signals are different: citation sources, schema markup, content structure, directory presence, and content freshness matter far more than backlink counts or keyword density. A business with 30 authoritative directory listings will outrank a competitor with a polished website but no AI-readable signals.",
  },
  {
    title: "What GEO looks like in practice",
    body: "GEO means making sure your business appears on the directories AI engines trust most (Yelp, Google Business, industry-specific listings), structuring your website so AI can extract answers from it, keeping your content fresh so AI models prefer it over stale competitors, and tracking your AI visibility score over time so you know if your presence is growing.",
  },
];

export default function WhatIsGeoPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />

      <main className="pt-16">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-12 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: "rgba(150,162,131,0.15)", color: "var(--color-primary)" }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            GEO Explained
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 62px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-fg)",
            }}
          >
            What is Generative Engine{" "}
            <span style={{ color: "var(--color-primary)" }}>Optimization?</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--color-fg-muted)] leading-relaxed">
            GEO is the practice of making your business visible on AI platforms like ChatGPT, Claude, Gemini, and Google AI — the same way SEO made you visible on Google.
          </p>
        </section>

        {/* Content */}
        <section className="max-w-2xl mx-auto px-6 pb-16 space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.title} className="border-l-2 pl-6" style={{ borderColor: "var(--color-primary)" }}>
              <h2
                className="font-semibold text-lg mb-2"
                style={{ color: "var(--color-fg)" }}
              >
                {s.title}
              </h2>
              <p className="text-[var(--color-fg-muted)] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="max-w-2xl mx-auto px-6 pb-24">
          <div
            className="rounded-2xl p-8 text-center border"
            style={{
              backgroundColor: "rgba(150,162,131,0.08)",
              borderColor: "rgba(150,162,131,0.3)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 600,
                color: "var(--color-fg)",
              }}
            >
              See your AI visibility score
            </h2>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)] leading-relaxed">
              Run a free scan and find out exactly where your business shows up — or doesn&apos;t — on ChatGPT, Claude, Gemini, and Google AI.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
