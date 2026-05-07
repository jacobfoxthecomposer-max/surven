"use client";

import React from "react";
import { Building2, Target, LineChart } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const steps = [
  {
    number: "01",
    title: "Add your business",
    description:
      "Enter your business name, industry, and location. Add up to 5 competitors to benchmark against and track them side-by-side.",
    icon: Building2,
  },
  {
    number: "02",
    title: "Run a scan",
    description:
      "Surven generates realistic consumer prompts and queries ChatGPT, Claude, Gemini, and Google AI to see who gets recommended.",
    icon: Target,
  },
  {
    number: "03",
    title: "See your results",
    description:
      "Get your Visibility Score and see the exact moments a customer asked AI for a recommendation — and whether your business showed up or a competitor did.",
    icon: LineChart,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 px-4 bg-[var(--color-surface)]">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)] mb-3 block">
            How it works
          </span>
          <h2
            className="text-3xl sm:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From setup to insights{" "}
            <em className="italic font-normal text-[var(--color-primary)]">in minutes</em>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.number}>
                  <div className="md:w-72 lg:w-80">
                    <div className="h-full p-7 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                      {/* Step number + icon */}
                      <div className="flex items-start gap-4 mb-5">
                        <span
                          className="text-4xl font-light leading-none text-[var(--color-border)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {step.number}
                        </span>
                        <div className="mt-1 w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                        </div>
                      </div>

                      <h3
                        className="text-lg font-medium text-[var(--color-fg)] mb-2"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="hidden md:flex items-center mx-5 flex-shrink-0">
                      <div className="w-12 h-px bg-[var(--color-border)]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)] -ml-px" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
