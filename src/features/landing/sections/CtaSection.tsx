"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import { Button } from "@/components/atoms/Button";

export function CtaSection() {
  return (
    <section className="py-24 px-4 bg-[#1A1C1A]">
      <div className="max-w-3xl mx-auto text-center">
        <ScrollReveal>
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#96A283]">
              Get started
            </p>
            <h2
              className="text-3xl sm:text-4xl font-light leading-tight text-[#F2EEE3]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to know where
              <br />
              <em className="italic font-normal text-[#96A283]">you show up?</em>
            </h2>
            <p className="text-[#C8C2B4] text-base max-w-md mx-auto leading-relaxed">
              See exactly how ChatGPT, Claude, Gemini, and Google AI talk
              about your business — in under a minute. Free to start, no credit card required.
            </p>
            <div className="pt-2">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="group gap-2 text-base px-10 !bg-[#96A283] !text-[#1A1C1A] hover:!bg-[#7D8E6C]"
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
