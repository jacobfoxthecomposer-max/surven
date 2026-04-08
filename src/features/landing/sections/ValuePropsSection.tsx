"use client";

import { Scan, BarChart3, TrendingUp } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import { Card } from "@/components/atoms/Card";

const props = [
  {
    icon: Scan,
    color: "#4361ee",
    title: "Scan",
    description:
      "We query AI models with real consumer prompts about your industry and location. See exactly what AI recommends when your customers ask.",
  },
  {
    icon: BarChart3,
    color: "#06d6a0",
    title: "Score",
    description:
      "Get a visibility score from 0–100 showing how often AI recommends your business across all prompts and models.",
  },
  {
    icon: TrendingUp,
    color: "#8b5cf6",
    title: "Improve",
    description:
      "See exactly where you're missing and what competitors are showing up instead. Track changes over time as you optimize.",
  },
];

export function ValuePropsSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything you need to dominate{" "}
            <span className="text-[var(--color-primary)]">AI search</span>
          </h2>
          <p className="mt-4 text-[var(--color-fg-secondary)] max-w-xl mx-auto">
            Surven gives you the same intelligence as enterprise GEO tools — without the
            enterprise price tag.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {props.map((prop, i) => {
            const Icon = prop.icon;
            return (
              <ScrollReveal key={prop.title} delay={i * 0.1} direction="up">
                <Card hover className="h-full space-y-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${prop.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: prop.color }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{prop.title}</h3>
                    <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                      {prop.description}
                    </p>
                  </div>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
