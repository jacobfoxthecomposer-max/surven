"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

const COMING_FEATURES = [
  "Automatic directory listing across 30+ high-authority sources",
  "Content freshness monitoring and update scheduling",
  "Answer capsule generation optimized for AI extraction",
  "Citation source tracking — know which directories are working",
  "Monthly visibility reports showing ROI",
  "Hands-off management — we handle everything",
];

export default function OptimizerFeaturePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />

      <main className="pt-16">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-24 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: "rgba(150,162,131,0.15)", color: "var(--color-primary)" }}
          >
            <Zap className="h-3.5 w-3.5" />
            Coming Soon
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
            Your AI ranking,{" "}
            <span style={{ color: "var(--color-primary)" }}>on autopilot</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
            The Optimizer takes your Tracker findings and systematically improves your AI presence — directory listings, content optimization, freshness signals — all handled for you while you run your business.
          </p>

          {/* Waitlist form */}
          <div className="mt-10 max-w-md mx-auto">
            {submitted ? (
              <div
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border"
                style={{
                  backgroundColor: "rgba(150,162,131,0.1)",
                  borderColor: "rgba(150,162,131,0.4)",
                  color: "var(--color-primary)",
                }}
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="font-medium">You&apos;re on the list — we&apos;ll be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors shrink-0"
                >
                  Join waitlist
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
            <p className="mt-3 text-xs text-[var(--color-fg-muted)]">
              Be first to know when Optimizer launches. No spam.
            </p>
          </div>

          {/* Coming features */}
          <div className="mt-16 text-left max-w-xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-muted)] mb-5">
              What&apos;s coming
            </p>
            <ul className="space-y-3">
              {COMING_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2
                    className="h-4 w-4 mt-0.5 shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <span className="text-sm text-[var(--color-fg-muted)]">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-14 pt-10 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-fg-muted)] mb-4">
              Ready to track your AI visibility now?
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              Start with the Tracker
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
