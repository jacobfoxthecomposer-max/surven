import Link from "next/link";
import { Puzzle, Zap, GitBranch, Eye, ArrowRight } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

const HIGHLIGHTS = [
  {
    icon: Eye,
    title: "Live page audit from any tab",
    body: "Click the extension on any webpage and get a full crawlability + GEO audit in seconds — schema gaps, missing meta, broken alt text, blocked AI bots, and more.",
  },
  {
    icon: Zap,
    title: "LLM-powered one-click fixes",
    body: "Generate AI-written meta descriptions, title tags, FAQ schema, alt text, and JSON-LD schema from your actual page content — then apply them instantly.",
  },
  {
    icon: GitBranch,
    title: "Auto-deploy to GitHub and WordPress",
    body: "Fixes commit directly to your GitHub repo or WordPress site. No copy-paste. No developer. Changes are live in minutes.",
  },
  {
    icon: Puzzle,
    title: "Works on any site",
    body: "Plain HTML, Next.js, WordPress, Vite — the extension detects your stack and adapts. One tool for every client site you manage.",
  },
];

export const metadata = {
  title: "Chrome Extension — Surven",
  description: "Audit and fix AI visibility issues on any page without leaving your browser.",
};

export default function ExtensionFeaturePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />

      <main className="pt-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: "rgba(150,162,131,0.15)", color: "var(--color-primary)" }}
          >
            <Puzzle className="h-3.5 w-3.5" />
            Chrome Extension
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
            Fix AI issues on any site{" "}
            <span style={{ color: "var(--color-primary)" }}>without leaving your browser</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
            The Surven Chrome Extension audits any webpage in seconds and lets you apply fixes directly — schema injection, meta rewrites, alt text, llms.txt — all auto-deployed to your site with one click.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Learn more
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] transition-colors"
            >
              Get started free
            </Link>
          </div>
        </section>

        {/* Features grid */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.title}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <h3 className="font-semibold text-[var(--color-fg)] mb-2">{h.title}</h3>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{h.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
