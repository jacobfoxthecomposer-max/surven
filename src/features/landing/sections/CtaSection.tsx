"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import { Button } from "@/components/atoms/Button";

export function CtaSection() {
  return (
    <section className="py-24 px-4 bg-[var(--color-fg)]">
      <div className="max-w-3xl mx-auto text-center">
        <ScrollReveal>
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Get started free
            </p>
            <h2
              className="text-3xl sm:text-4xl font-light leading-tight text-[var(--color-bg)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Find out what AI is saying
              <br />
              <em className="italic font-normal text-[var(--color-primary)]">about your business.</em>
            </h2>
            <p className="text-[var(--color-border)] text-base max-w-md mx-auto leading-relaxed">
              Run your first scan free — no credit card required. See your Visibility Score, the exact
              prompts that mentioned you, and where you stand against competitors. Takes 60 seconds.
            </p>
            <div className="pt-2">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="group gap-2 text-base px-10 !bg-[var(--color-primary)] !text-[var(--color-fg)] hover:!bg-[var(--color-primary-hover)]"
                >
                  Track Your Visibility Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
