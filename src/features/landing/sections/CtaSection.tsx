"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import { Button } from "@/components/atoms/Button";

export function CtaSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <div className="relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-primary)]/20 p-12 text-center"
            style={{
              background: "linear-gradient(135deg, rgb(67 97 238 / 0.08) 0%, rgb(6 214 160 / 0.06) 100%)",
            }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgb(67 97 238 / 0.15), transparent)",
              }}
            />

            <div className="relative z-10 space-y-5">
              <h2 className="text-3xl sm:text-4xl font-bold">
                Ready to know where you show up?
              </h2>
              <p className="text-[var(--color-fg-secondary)] text-lg max-w-xl mx-auto">
                Join businesses already tracking their AI visibility with Surven.
                Free to start — no credit card required.
              </p>
              <Link href="/signup">
                <Button size="lg" className="group gap-2 text-base px-10 mt-2">
                  Get Started Free
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
