import Link from "next/link";
import { Check } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";
import { Footer } from "@/features/landing/sections/Footer";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Try the tracker and see where you stand.",
    cta: "Get Started",
    ctaHref: "/signup",
    ctaVariant: "outline" as const,
    features: [
      "5 AI visibility scans / day",
      "ChatGPT, Claude, Gemini tracking",
      "Competitor mention tracking",
      "Basic visibility score",
    ],
    highlight: false,
  },
  {
    name: "Plus",
    price: "$49",
    period: "/mo",
    description: "More scans, plus the Chrome extension for on-site audits.",
    cta: "Get Started",
    ctaHref: "/signup",
    ctaVariant: "primary" as const,
    features: [
      "20 AI visibility scans / day",
      "ChatGPT, Claude, Gemini tracking",
      "Competitor mention tracking",
      "Full visibility score & history",
      "Chrome extension (site auditor)",
      "Custom search prompts",
    ],
    highlight: true,
  },
  {
    name: "Premium",
    price: "$199",
    period: "/mo",
    description: "Unlimited usage for agencies and high-volume teams.",
    cta: "Get Started",
    ctaHref: "/signup",
    ctaVariant: "outline" as const,
    features: [
      "Unlimited AI visibility scans",
      "ChatGPT, Claude, Gemini tracking",
      "Competitor mention tracking",
      "Full visibility score & history",
      "Chrome extension (site auditor)",
      "Custom search prompts",
      "Priority support",
    ],
    highlight: false,
  },
  {
    name: "Managed",
    price: "Custom",
    period: "",
    description: "We handle the optimization for you — fully done for you.",
    cta: "Book a Call",
    ctaHref: "https://calendly.com/surven/managed-intro",
    ctaVariant: "outline" as const,
    ctaExternal: true,
    features: [
      "Everything in Enterprise",
      "Dedicated optimization strategist",
      "Custom GEO strategy & execution",
      "Schema markup implementation",
      "Monthly reporting & review calls",
      "Direct line to our team",
      "Custom pricing based on scope",
    ],
    highlight: false,
    badge: "Done For You",
  },
];

export default function PricingPage() {
  return (
    <>
      <LandingNav />

      <main className="min-h-screen pt-24 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="font-display text-5xl font-semibold mb-4">Simple, honest pricing</h1>
            <p className="text-[var(--color-fg-muted)] text-lg max-w-xl mx-auto">
              Start free and upgrade when you're ready. Every plan includes real AI visibility data — no fluff.
            </p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlight
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--color-primary)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--color-fg)] text-[var(--color-bg)] text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mb-3">
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-[var(--color-fg-muted)] text-sm">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-snug">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check size={15} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.ctaExternal ? (
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-2.5 px-4 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-bg)] transition-colors"
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={`block text-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      plan.ctaVariant === "primary"
                        ? "bg-[var(--color-primary)] text-white hover:opacity-90"
                        : "border border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Managed callout */}
          <div className="mt-16 p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Not sure which plan is right for you?</h3>
              <p className="text-[var(--color-fg-muted)] max-w-lg">
                Book a free 20-minute call with our team. We'll walk through your current AI presence, show you exactly what's holding you back, and recommend the best path forward — no pressure.
              </p>
            </div>
            <a
              href="https://calendly.com/surven/managed-intro"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 py-3 px-6 rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Book a Free Call
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
