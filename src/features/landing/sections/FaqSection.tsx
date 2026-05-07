"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const FAQS = [
  {
    q: "What does Surven track?",
    a: "Surven tracks your visibility across ChatGPT, Claude, Gemini, and Google AI, showing you how often your business is recommended.",
  },
  {
    q: "How does Surven help improve AI visibility?",
    a: "Surven provides a visibility score and identifies where you're missing out compared to competitors, helping you understand and improve your AI presence.",
  },
  {
    q: "Can I monitor my AI mentions over time with Surven?",
    a: "Yes, Surven allows you to monitor your AI mentions over time and catch visibility changes as they happen.",
  },
  {
    q: "What is the visibility score provided by Surven?",
    a: "The visibility score is a 0–100 score indicating how often AI recommends your business based on real consumer prompts.",
  },
  {
    q: "How do I start using Surven?",
    a: "You can start using Surven by adding your business name, industry, and location, and then running a scan to see your results.",
  },
  {
    q: "Is there a free trial available for Surven?",
    a: "Yes, Surven offers a 7-day free trial for every paid plan, with no credit card required to start.",
  },
  {
    q: "What types of analysis does Surven provide?",
    a: "Surven provides sentiment analysis and citation gap analysis to reveal how AI talks about your brand.",
  },
  {
    q: "How often does Surven perform scans?",
    a: "Surven offers automated weekly scans to notify you of significant shifts in your visibility score.",
  },
  {
    q: "Can I export the scan results from Surven?",
    a: "Yes, you can download full scan results as CSV files for reports or further analysis.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 py-24 px-4 bg-[var(--color-bg)]">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)] mb-3 block">
            Frequently asked
          </span>
          <h2
            className="text-3xl sm:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Questions, <em className="italic font-normal text-[var(--color-primary)]">answered</em>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              const panelId = `faq-panel-${i}`;
              const buttonId = `faq-button-${i}`;
              return (
                <div key={faq.q}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left text-[15px] font-medium text-[var(--color-fg)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-[var(--color-fg-muted)] transition-transform duration-200"
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-sm text-[var(--color-fg-muted)] leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mt-8 text-center text-sm text-[var(--color-fg-muted)]">
            Still have questions?{" "}
            <a
              href="/contact"
              className="text-[var(--color-primary)] hover:underline font-medium"
            >
              Get in touch
            </a>
            .
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
