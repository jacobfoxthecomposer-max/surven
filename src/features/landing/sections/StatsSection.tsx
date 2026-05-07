"use client";

import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const stats = [
  { value: "4", label: "AI models tracked", suffix: "" },
  { value: "150", label: "Consumer prompts per scan", suffix: "+" },
  { value: "100", label: "Visibility score scale", suffix: "" },
  { value: "60", label: "Time to first scan results", suffix: "s" },
];

export function StatsSection() {
  return (
    <section className="py-20 px-4 bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.08} direction="up">
              <div className="text-center p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div
                  className="text-3xl font-light text-[var(--color-fg)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="text-[var(--color-primary)]">{stat.value}</span>
                  <span className="text-xl text-[var(--color-fg-muted)]">{stat.suffix}</span>
                </div>
                <p className="mt-1.5 text-xs text-[var(--color-fg-muted)]">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
