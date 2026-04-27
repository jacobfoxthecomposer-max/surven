"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/Button";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-[var(--color-bg)]">
      {/* Subtle horizontal rules framing the content */}
      <div className="absolute top-[28%] left-0 right-0 h-px bg-[var(--color-border)]" />
      <div className="absolute top-[74%] left-0 right-0 h-px bg-[var(--color-border)]" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-muted)]"
        >
          Generative Engine Optimization
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.06] tracking-tight text-[var(--color-fg)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Does AI recommend
          <br />
          <em className="italic font-normal" style={{ color: "var(--color-primary)" }}>
            your business?
          </em>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg text-[var(--color-fg-secondary)] max-w-xl mx-auto leading-relaxed"
        >
          Surven tracks your visibility across ChatGPT, Claude, Gemini, and Google AI —
          and shows you exactly where you stand.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <Link href="/signup">
            <Button size="lg" className="group gap-2 text-base px-8">
              Track Your Visibility
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base px-8">
              Sign In
            </Button>
          </Link>
        </motion.div>

        {/* Micro copy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-xs text-[var(--color-fg-muted)]"
        >
          Free to start · No credit card required
        </motion.p>
      </div>
    </section>
  );
}
