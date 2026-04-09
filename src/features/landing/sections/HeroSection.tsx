"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { ShaderAnimation } from "@/components/ui/shader-animation";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden">
      {/* Full-screen shader animation background */}
      <div className="absolute inset-0">
        <ShaderAnimation className="w-full h-full" />
      </div>

      {/* Dark overlay so text remains readable */}
      <div className="absolute inset-0 bg-[#0f172a]/55" />

      {/* Vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgb(15 23 42 / 0.6) 100%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
            GEO — Generative Engine Optimization
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
        >
          Find out if AI is{" "}
          <span
            className="relative"
            style={{
              background: "linear-gradient(135deg, #4361ee 0%, #06d6a0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            recommending
          </span>{" "}
          your business
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl text-[var(--color-fg-secondary)] max-w-2xl mx-auto"
        >
          Surven tracks your visibility across ChatGPT, Claude, Perplexity, and more — so
          you can show up where your customers are searching.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <Link href="/signup">
            <Button size="lg" className="group gap-2 text-base px-8">
              Track Your AI Visibility — Free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Sign In
            </Button>
          </Link>
        </motion.div>

        {/* Social proof micro-line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-xs text-[var(--color-fg-muted)]"
        >
          Free to start · No credit card required
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="w-5 h-8 border border-[var(--color-border)] rounded-full flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 bg-[var(--color-fg-muted)] rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
