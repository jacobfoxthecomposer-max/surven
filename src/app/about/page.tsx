import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

export const metadata = {
  title: "About — Surven",
  description: "Our story and why we built Surven.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />

      <main className="pt-16">
        <section className="max-w-2xl mx-auto px-6 pt-24 pb-24">
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-fg)",
            }}
          >
            Built for the businesses{" "}
            <span style={{ color: "var(--color-primary)" }}>AI is leaving behind</span>
          </h1>

          <div className="mt-10 space-y-6 text-[var(--color-fg-muted)] leading-relaxed">
            <p>
              When AI search took off, big brands adapted fast. They had SEO teams, agencies, and budgets to figure it out. The local dentist, the restaurant owner, the independent law firm — they didn&apos;t. Their businesses were invisible on the platforms their customers were switching to, and nobody was building tools to help them.
            </p>
            <p>
              That&apos;s why we built Surven. We wanted to give every business — regardless of size — the ability to see where they stand on AI platforms and take action to improve it. Not with a $5,000/month agency retainer. With a tool they could actually use.
            </p>
            <p>
              Surven is built by Jake and Joey. We&apos;re focused on one thing: helping businesses show up where their customers are asking questions. Everything we build — the Tracker, the Crawlability Audit, the Optimizer — is designed to make that as straightforward as possible.
            </p>
            <p>
              We&apos;re early. The product is growing fast. If you have feedback, we want to hear it.
            </p>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              Contact us
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
