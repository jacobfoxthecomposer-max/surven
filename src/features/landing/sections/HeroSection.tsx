"use client";

import { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PreviewBrowserFrame } from "./ProductPreviewSection";

const ROTATING_TEXTS = [
  "your restaurant.",
  "your law firm.",
  "your dental practice.",
  "your salon.",
  "your agency.",
  "your accountant.",
];

function useTypewriter(texts: string[]) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [deleting, setDeleting] = useState(false);

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
  const [inputValue, setInputValue] = useState("");
  const router = useRouter();

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    router.push(`/signup?business=${encodeURIComponent(trimmed)}`);
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative flex items-center px-6 bg-[var(--color-bg)] pt-14 overflow-hidden min-h-[90vh]"
    >
      {/* Static faint grid */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.06 }}>
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} color="#1A1C1A" />
      </div>

      {/* Mouse-reveal grid */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ maskImage, WebkitMaskImage: maskImage, opacity: 0.35 }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} color="#1A1C1A" />
      </motion.div>

      {/* Color blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute right-[-10%] top-[-15%] w-[40%] h-[45%] rounded-full blur-[130px]"
          style={{ backgroundColor: "rgba(150, 162, 131, 0.28)" }}
        />
        <div
          className="absolute right-[8%] top-[-5%] w-[18%] h-[22%] rounded-full blur-[90px]"
          style={{ backgroundColor: "rgba(150, 162, 131, 0.18)" }}
        />
        <div
          className="absolute left-[-8%] bottom-[-15%] w-[35%] h-[40%] rounded-full blur-[130px]"
          style={{ backgroundColor: "rgba(181, 70, 49, 0.18)" }}
        />
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
        style={{
          height: "140px",
          background: "linear-gradient(to bottom, transparent, var(--color-bg))",
        }}
      />

      {/* Two-column layout */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-[clamp(2rem,4vw,4rem)] items-start pt-[clamp(3rem,5vw,5rem)] pb-[clamp(2rem,3vw,3.5rem)]">

        {/* LEFT: Copy */}
        <div className="flex flex-col gap-7 mt-8">
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
              className="font-light leading-[1.08] tracking-tight text-[var(--color-fg)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.75rem, 4.5vw + 1rem, 4.75rem)",
              }}
            >
              AI is ignoring
              <br />
              <span className="relative mt-3 inline-block">
                <span
                  className="absolute -z-10"
                  style={{
                    inset: "-0.1em -0.18em",
                    border: "2px dashed var(--color-primary)",
                    borderRadius: "0.22em",
                  }}
                />
                <em
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    color: "var(--color-primary)",
<<<<<<< HEAD
=======
                    whiteSpace: "nowrap",
>>>>>>> 8d9d4a6 (fix(hero): fluid typography + cursor wrap fix)
                  }}
                >
                  {typed}
                  <span
<<<<<<< HEAD
                    className={`inline-block w-[2px] ml-1 align-middle ${isResting ? "" : "animate-pulse"}`}
                    style={{
                      height: "0.85em",
=======
                    className={`inline-block w-[2px] ml-1 align-baseline ${isResting ? "" : "animate-pulse"}`}
                    style={{
                      height: "0.75em",
>>>>>>> 8d9d4a6 (fix(hero): fluid typography + cursor wrap fix)
                      backgroundColor: "var(--color-primary)",
                      opacity: isResting ? 0.85 : 0.7,
                    }}
                  />
                </em>
              </span>
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
<<<<<<< HEAD
            className="text-base sm:text-lg text-[var(--color-fg-secondary)] max-w-lg leading-relaxed"
=======
            className="text-[var(--color-fg-secondary)] max-w-lg leading-relaxed"
            style={{ fontSize: "clamp(0.95rem, 0.4vw + 0.85rem, 1.2rem)" }}
>>>>>>> 8d9d4a6 (fix(hero): fluid typography + cursor wrap fix)
          >
            ChatGPT, Claude, Gemini, and Google AI answer millions of buying questions
            every day. If your business isn&apos;t in their answers, your competitors
            are getting those customers.
          </motion.p>

          {/* Input + CTA */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 max-w-lg"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Your business name or website..."
              className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
            <button
              type="submit"
              className="group flex items-center justify-center gap-2 bg-[var(--color-fg)] text-[var(--color-bg)] px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap hover:opacity-90 transition-opacity"
            >
              Check AI Visibility
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.form>

          {/* Microcopy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-xs text-[var(--color-fg-muted)]"
          >
            Free to start · No credit card required
          </motion.p>
        </div>

        {/* RIGHT: Animation — desktop only */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block relative overflow-hidden"
          style={{ maxHeight: "640px" }}
        >
          <PreviewBrowserFrame />
          {/* Fade the bottom edge so the section bleeds naturally into what follows */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: "80px",
              background: "linear-gradient(to bottom, transparent, var(--color-bg))",
            }}
          />
        </motion.div>

      </div>
    </section>
  );
}
