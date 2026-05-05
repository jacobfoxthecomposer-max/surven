"use client";

import { useState } from "react";
import { HandCoins, ArrowRight, CheckCircle2, DollarSign, Users, TrendingUp } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

const PERKS = [
  {
    icon: DollarSign,
    title: "Recurring commission",
    body: "Earn a percentage of every monthly payment from clients you refer — for as long as they stay subscribed.",
  },
  {
    icon: Users,
    title: "Built for consultants and agencies",
    body: "If you work with small businesses on marketing, SEO, or web design, your clients are exactly who Surven is built for.",
  },
  {
    icon: TrendingUp,
    title: "Sell a category, not just a tool",
    body: "GEO is new enough that the consultants who get in early become the go-to experts. Surven gives you the platform to do that.",
  },
];

export default function AffiliatePage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

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
            <HandCoins className="h-3.5 w-3.5" />
            Affiliate Program
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 58px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-fg)",
            }}
          >
            Earn recurring revenue by{" "}
            <span style={{ color: "var(--color-primary)" }}>growing with your clients</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
            Refer businesses to Surven and earn a commission on every payment they make — month after month. Built for marketing consultants, SEO agencies, and web designers who serve small businesses.
          </p>
        </section>

        {/* Perks */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PERKS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <h3 className="font-semibold text-[var(--color-fg)] mb-2">{p.title}</h3>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Application form */}
        <section className="max-w-xl mx-auto px-6 pb-24">
          <div
            className="rounded-2xl border p-8"
            style={{
              backgroundColor: "rgba(150,162,131,0.05)",
              borderColor: "rgba(150,162,131,0.25)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 600,
                color: "var(--color-fg)",
              }}
            >
              Apply to become a partner
            </h2>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              We review every application and follow up within 2 business days.
            </p>

            {submitted ? (
              <div
                className="mt-6 flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  backgroundColor: "rgba(150,162,131,0.1)",
                  borderColor: "rgba(150,162,131,0.3)",
                }}
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
                <div>
                  <p className="font-semibold text-[var(--color-fg)]">Application received</p>
                  <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">We&apos;ll be in touch within 2 business days.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">Website or LinkedIn</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Submit application
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
