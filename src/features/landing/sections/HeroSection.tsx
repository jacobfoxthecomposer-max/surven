"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/Button";

const ROTATING_TEXTS = [
  "your restaurant?",
  "your law firm?",
  "your dental practice?",
  "your salon?",
  "your agency?",
  "your accountant?",
];

function useTypewriter(texts: string[]) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Whether the word is fully typed and resting (used to steady the cursor).
  const isResting = !deleting && display === texts[index];

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

  return { display, isResting };
}

function GridPattern({
  offsetX,
  offsetY,
  color,
}: {
  offsetX: ReturnType<typeof useMotionValue<number>>;
  offsetY: ReturnType<typeof useMotionValue<number>>;
  color: string;
}) {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="surven-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#surven-grid)" />
    </svg>
  );
}

export function HeroSection() {
  const { display: typed, isResting } = useTypewriter(ROTATING_TEXTS);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.4) % 40);
    gridOffsetY.set((gridOffsetY.get() + 0.4) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[var(--color-bg)] pt-14 overflow-hidden"
    >
      {/* Static faint grid */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.06 }}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} color="#1A1C1A" />
      </div>

      {/* Mouse-reveal grid layer */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ maskImage, WebkitMaskImage: maskImage, opacity: 0.35 }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} color="#1A1C1A" />
      </motion.div>

      {/* Color blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Sage — top right */}
        <div
          className="absolute right-[-10%] top-[-15%] w-[40%] h-[45%] rounded-full blur-[130px]"
          style={{ backgroundColor: "rgba(150, 162, 131, 0.28)" }}
        />
        <div
          className="absolute right-[8%] top-[-5%] w-[18%] h-[22%] rounded-full blur-[90px]"
          style={{ backgroundColor: "rgba(150, 162, 131, 0.18)" }}
        />
        {/* Rubric Red — bottom left */}
        <div
          className="absolute left-[-8%] bottom-[-15%] w-[35%] h-[40%] rounded-full blur-[130px]"
          style={{ backgroundColor: "rgba(181, 70, 49, 0.18)" }}
        />
      </div>

      {/* Bottom fade — blends hero grid into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{
          height: "140px",
          background: "linear-gradient(to bottom, transparent, var(--color-bg))",
        }}
      />

      {/* Content */}
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
            <span className="relative mt-3 inline-block">
              <span
                className="absolute -z-10"
                style={{
                  inset: "-6px -14px",
                  border: "2px dashed var(--color-primary)",
                  borderRadius: "16px",
                }}
              />
              <em
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--color-primary)",
                }}
              >
                {typed}
                <span
                  className={`inline-block w-[2px] ml-1 align-middle ${isResting ? "" : "animate-pulse"}`}
                  style={{
                    height: "0.85em",
                    backgroundColor: "var(--color-primary)",
                    opacity: isResting ? 0.85 : 0.7,
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
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="text-base px-9 py-3">
              See How It Works
            </Button>
          </a>
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
