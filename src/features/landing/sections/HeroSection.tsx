"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/Button";

const ROTATING_TEXTS = [
  "your business?",
  "your restaurant?",
  "your law firm?",
  "your dental practice?",
  "your salon?",
  "your agency?",
];

function useTypewriter(texts: string[]) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = texts[index];
    const speed = deleting ? 55 : 110;

    const timer = setTimeout(() => {
      if (deleting) {
        setDisplay((prev) => prev.slice(0, -1));
      } else {
        setDisplay((prev) => full.slice(0, prev.length + 1));
      }
    }, speed);

    if (!deleting && display === full) {
      const pause = setTimeout(() => setDeleting(true), 2200);
      return () => clearTimeout(pause);
    }
    if (deleting && display === "") {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % texts.length);
    }

    return () => clearTimeout(timer);
  }, [display, deleting, index, texts]);

  return display;
}

export function HeroSection() {
  const typed = useTypewriter(ROTATING_TEXTS);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[var(--color-bg)] pt-14">
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center gap-10">
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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-light leading-[1.08] tracking-tight text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Does AI recommend
            <br />
            {/* Typewriter line with dashed sage border */}
            <span className="relative mt-3 inline-block">
              <span
                className="absolute inset-0 -z-10 rounded-2xl"
                style={{
                  margin: "-6px -14px",
                  border: "2px dashed var(--color-primary)",
                  borderRadius: "16px",
                }}
              />
              <em
                className="italic font-normal not-italic"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--color-primary)",
                }}
              >
                {typed}
                <span
                  className="inline-block w-[2px] ml-1 align-middle animate-pulse"
                  style={{
                    height: "0.85em",
                    backgroundColor: "var(--color-primary)",
                    opacity: 0.7,
                  }}
                />
              </em>
            </span>
          </h1>
        </motion.div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg text-[var(--color-fg-secondary)] max-w-xl leading-relaxed"
        >
          Surven tracks your visibility across ChatGPT, Claude, Gemini, and Google AI —
          and shows you exactly where you stand.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Link href="/signup">
            <Button size="lg" className="group gap-2 text-base px-9 py-3">
              Track Your Visibility
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base px-9 py-3">
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
