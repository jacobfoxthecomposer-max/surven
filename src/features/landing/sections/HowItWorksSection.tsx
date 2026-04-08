"use client";

import { Building2, Radar, LineChart } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const steps = [
  {
    number: "01",
    icon: Building2,
    color: "#4361ee",
    title: "Add your business",
    description:
      "Enter your business name, industry, and location. Optionally add competitors you want to track alongside.",
  },
  {
    number: "02",
    icon: Radar,
    color: "#06d6a0",
    title: "Run a scan",
    description:
      "Surven generates realistic consumer prompts and queries ChatGPT, Claude, and Perplexity to see who gets recommended.",
  },
  {
    number: "03",
    icon: LineChart,
    color: "#8b5cf6",
    title: "See your results",
    description:
      "Get a Visibility Score, per-model breakdown, and the exact prompts that mentioned — or missed — your business.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 px-4 bg-[var(--color-surface)]/40">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] mb-3 block">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold">
            From setup to insights in minutes
          </h2>
        </ScrollReveal>

        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-[#4361ee] via-[#06d6a0] to-[#8b5cf6] opacity-30" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <ScrollReveal key={step.number} delay={i * 0.12} direction="up">
                  <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                    {/* Icon bubble */}
                    <div className="relative">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${step.color}18`, border: `1px solid ${step.color}30` }}
                      >
                        <Icon className="h-7 w-7" style={{ color: step.color }} />
                      </div>
                      <span
                        className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: step.color, color: "#fff" }}
                      >
                        {step.number}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
