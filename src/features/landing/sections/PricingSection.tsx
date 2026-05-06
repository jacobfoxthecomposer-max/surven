"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/cn";
import { useIsFirstTimeUser } from "@/features/auth/hooks/useIsFirstTimeUser";

const plans = [
  {
    id: "plus",
    name: "Plus",
    description: "For businesses serious about showing up in AI search.",
    monthlyPrice: 49,
    yearlyPrice: 39,
    highlight: false,
    features: [
      "10 AI visibility scans / day",
      "150 prompts per scan across 4 AI engines",
      "ChatGPT, Claude, Gemini & Google AI tracking",
      "Competitor mention tracking",
      "Full visibility score & history",
      "Chrome extension (site auditor)",
      "Custom search prompts",
    ],
    button: { text: "Start Free Trial", href: "/signup" },
  },
  {
    id: "premium",
    name: "Premium",
    description: "For agencies and teams tracking multiple clients.",
    monthlyPrice: 199,
    yearlyPrice: 159,
    highlight: true,
    features: [
      "20 AI visibility scans / day",
      "300 prompts per scan across 4 AI engines",
      "ChatGPT, Claude, Gemini & Google AI tracking",
      "Competitor mention tracking",
      "Full visibility score & history",
      "Chrome extension (site auditor)",
      "Custom search prompts",
      "Priority support",
    ],
    button: { text: "Start Free Trial", href: "/signup" },
  },
  {
    id: "managed",
    name: "Managed",
    description: "We handle the full optimization — completely done for you.",
    monthlyPrice: null,
    yearlyPrice: null,
    highlight: false,
    badge: "Done For You",
    features: [
      "Everything in Premium",
      "Dedicated optimization strategist",
      "Custom GEO strategy & execution",
      "Schema markup implementation",
      "Monthly reporting & review calls",
      "Direct line to our team",
    ],
    button: { text: "Book a Call", href: "https://calendly.com/surven/managed-intro", external: true },
  },
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const { isFirstTime } = useIsFirstTimeUser();

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center mb-12">
          <p className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-widest">
            Pricing
          </p>
          <h2 className="font-display text-5xl lg:text-6xl font-semibold text-[var(--color-fg)]">
            Simple, honest pricing
          </h2>
          <p className="text-[var(--color-fg-muted)] text-lg max-w-md">
            Every paid plan starts with a 7-day free trial. No credit card required.
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center gap-3 text-sm font-medium mt-2">
            <span className={cn(!isYearly ? "text-[var(--color-fg)]" : "text-[var(--color-fg-muted)]")}>
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={cn(isYearly ? "text-[var(--color-fg)]" : "text-[var(--color-fg-muted)]")}>
              Yearly
              <span className="ml-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-6">
          {plans.map((plan) => {
            const price = plan.monthlyPrice === null
              ? null
              : isYearly ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col w-full md:w-80 rounded-2xl border text-left transition-shadow",
                  plan.highlight
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xl"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--color-primary)] text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--color-fg)] text-[var(--color-bg)] text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Card header */}
                <div className="p-6 pb-0 space-y-1.5">
                  <p className="text-sm font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
                    {plan.name}
                  </p>
                  <p className="text-sm text-[var(--color-fg-muted)]">{plan.description}</p>
                  <div className="pt-2">
                    {price !== null ? (
                      <>
                        <span className="font-display text-5xl font-semibold text-[var(--color-fg)]">
                          ${price}
                        </span>
                        <span className="text-[var(--color-fg-muted)] text-sm ml-1">/mo</span>
                        {isYearly && (
                          <p className="text-xs text-[var(--color-fg-muted)] mt-1">
                            Billed ${(price * 12).toLocaleString()} annually
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="font-display text-4xl font-semibold text-[var(--color-fg)]">
                        Custom
                      </span>
                    )}
                  </div>
                </div>

                {/* Separator */}
                <div className="px-6 py-5">
                  <Separator />
                </div>

                {/* Features */}
                <div className="px-6 pb-6 flex-1">
                  {plan.id === "premium" && (
                    <p className="text-sm font-semibold text-[var(--color-fg)] mb-3">
                      Everything in Plus, and:
                    </p>
                  )}
                  {plan.id === "managed" && (
                    <p className="text-sm font-semibold text-[var(--color-fg)] mb-3">
                      Everything in Premium, and:
                    </p>
                  )}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-[var(--color-fg-muted)]">
                        <CircleCheck
                          size={16}
                          className="text-[var(--color-primary)] mt-0.5 shrink-0"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6 mt-auto">
                  {plan.button.external ? (
                    <a
                      href={plan.button.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
                        "border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      )}
                    >
                      {plan.button.text}
                      <ArrowRight size={15} />
                    </a>
                  ) : (
                    <Link
                      href={isFirstTime ? plan.button.href : `/contact?upgrade=${plan.id}`}
                      className={cn(
                        "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
                        plan.highlight
                          ? "bg-[var(--color-primary)] text-white hover:opacity-90"
                          : "border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      )}
                    >
                      {isFirstTime ? "Try Free Trial" : `Upgrade to ${plan.name}`}
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
