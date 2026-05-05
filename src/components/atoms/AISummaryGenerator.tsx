"use client";

/**
 * Shared "Generate AI summary" button + collapsible box with typewriter
 * reveal. The component is one-shot per session — once the summary is
 * generated, the button is gone (so customers can't spam the future
 * Haiku call). Each page passes its own `getSummary`/`getCTA` builders.
 *
 * Visual identity is locked: sage→gold→rust gradient with animated
 * border ring + pulsing glow. Matches the AI Visibility Tracker original.
 */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ArrowRight } from "lucide-react";

interface CTA {
  label: string;
  href: string;
}

interface Props {
  getSummary: () => string;
  getCTA?: () => CTA | null;
}

export function AISummaryGenerator({ getSummary, getCTA }: Props) {
  const [hasGenerated, setHasGenerated] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [revealed, setRevealed] = useState("");
  const [generating, setGenerating] = useState(false);
  const [cta, setCta] = useState<CTA | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleGenerate = () => {
    if (hasGenerated) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const text = getSummary();
    setCta(getCTA ? getCTA() : null);
    setHasGenerated(true);
    setExpanded(true);
    setRevealed("");
    setGenerating(true);
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealed(text.slice(0, i));
      if (i >= text.length) {
        setGenerating(false);
        timeoutRef.current = null;
        return;
      }
      const prev = text[i - 1];
      const delay = prev === " " ? 6 : prev === "." || prev === "—" ? 90 : 14;
      timeoutRef.current = setTimeout(tick, delay);
    };
    tick();
  };

  if (!hasGenerated) {
    return (
      <motion.button
        onClick={handleGenerate}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          boxShadow: [
            "0 0 14px rgba(150,162,131,0.22), 0 0 28px rgba(201,123,69,0.10)",
            "0 0 22px rgba(150,162,131,0.36), 0 0 44px rgba(201,123,69,0.18)",
            "0 0 14px rgba(150,162,131,0.22), 0 0 28px rgba(201,123,69,0.10)",
          ],
        }}
        transition={{
          boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="relative self-start inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.22) 0%, rgba(184,160,48,0.16) 50%, rgba(201,123,69,0.20) 100%)",
          fontSize: 13,
          letterSpacing: 0.1,
          color: "#5C6A4D",
        }}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            padding: 1,
            background:
              "linear-gradient(135deg, #96A283 0%, #B8A030 50%, #C97B45 100%)",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
          animate={{ opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <Sparkles className="relative h-4 w-4" style={{ color: "#96A283" }} />
        <span
          className="relative font-semibold tracking-wide"
          style={{
            background:
              "linear-gradient(135deg, #6C7A5A 0%, #8E7B26 50%, #A35F32 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Generate AI summary
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.985 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: [
          "0 0 14px rgba(150,162,131,0.22), 0 0 28px rgba(201,123,69,0.10)",
          "0 0 22px rgba(150,162,131,0.36), 0 0 44px rgba(201,123,69,0.18)",
          "0 0 14px rgba(150,162,131,0.22), 0 0 28px rgba(201,123,69,0.10)",
        ],
      }}
      transition={{
        opacity: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
      }}
      className="relative rounded-[var(--radius-lg)] max-w-[860px] overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(150,162,131,0.16) 0%, rgba(184,160,48,0.10) 50%, rgba(201,123,69,0.14) 100%)",
        border: "1px solid transparent",
        backgroundClip: "padding-box",
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)]"
        style={{
          padding: 1,
          background:
            "linear-gradient(135deg, #96A283 0%, #B8A030 50%, #C97B45 100%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="relative w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[rgba(150,162,131,0.06)] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <motion.div
            animate={
              generating
                ? { rotate: [0, 12, -10, 0], scale: [1, 1.15, 0.95, 1] }
                : { rotate: 0, scale: 1 }
            }
            transition={
              generating
                ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
            className="shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: "#96A283" }} />
          </motion.div>
          <span
            className="font-semibold tracking-wide uppercase"
            style={{
              fontSize: 10.5,
              letterSpacing: 0.6,
              background:
                "linear-gradient(135deg, #6C7A5A 0%, #8E7B26 50%, #A35F32 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Summarize this page
          </span>
          {generating && (
            <span
              className="text-[var(--color-fg-muted)]"
              style={{ fontSize: 11 }}
            >
              · generating…
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0"
        >
          <ChevronDown
            className="h-4 w-4"
            style={{ color: "var(--color-fg-muted)" }}
          />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
            className="relative"
          >
            <div className="px-4 pb-3.5 pt-0.5">
              <p
                className="text-[var(--color-fg-secondary)]"
                style={{ fontSize: 12.5, lineHeight: 1.6 }}
              >
                {revealed}
                {generating && (
                  <motion.span
                    className="inline-block align-baseline ml-0.5"
                    style={{
                      width: 6,
                      height: 12,
                      background: "#96A283",
                    }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                      times: [0, 0.5, 1],
                    }}
                  />
                )}
              </p>
              <AnimatePresence>
                {!generating && revealed && cta && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-2"
                  >
                    <Link
                      href={cta.href}
                      className="inline-flex items-center gap-1 font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80"
                      style={{ fontSize: 12.5, color: "#A35F32" }}
                    >
                      <span>{cta.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
