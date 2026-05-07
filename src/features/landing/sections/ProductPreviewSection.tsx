"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, Check, X, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

/* -------------------------------------------------------------------------- */
/*  Scene timing                                                               */
/* -------------------------------------------------------------------------- */

const SCENE_1_MS = 3500; // typing + click
const SCENE_2_MS = 3500; // engines querying
const SCENE_3_MS = 5500; // results populate
const PAUSE_MS = 1500; //  hold finished state, then loop

/* -------------------------------------------------------------------------- */
/*  Mock content                                                               */
/* -------------------------------------------------------------------------- */

const TYPED_TEXT = "Joe's Pizza, Manchester CT";
const TYPE_CHAR_MS = 70;

type EnginePhase = "idle" | "loading" | "done";

const ENGINES: { name: string; finishAt: number; mentions: number; share: number }[] = [
  { name: "ChatGPT", finishAt: 700, mentions: 12, share: 84 },
  { name: "Claude", finishAt: 1300, mentions: 8, share: 71 },
  { name: "Gemini", finishAt: 1950, mentions: 10, share: 65 },
  { name: "Google AI", finishAt: 2600, mentions: 15, share: 72 },
];

const PROMPTS: { text: string; mentioned: boolean; engine: string | null }[] = [
  { text: "best pizza near me", mentioned: true, engine: "ChatGPT" },
  { text: "italian restaurant Manchester CT", mentioned: true, engine: "Gemini" },
  { text: "late night food downtown", mentioned: false, engine: null },
  { text: "where to take a date for dinner", mentioned: true, engine: "Claude" },
  { text: "wood-fired pizza connecticut", mentioned: true, engine: "Google AI" },
];

const TARGET_SCORE = 73;
const TARGET_SCORE_DELTA = 12; // vs prior scan

// 30 daily visibility points, ending at TARGET_SCORE.
const CHART_POINTS: number[] = [
  38, 41, 39, 43, 42, 47, 45, 49, 51, 50, 53, 56, 54, 58, 60, 62, 60, 64, 63,
  66, 68, 67, 69, 71, 70, 72, 71, 73, 72, 73,
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildChartPath(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildChartArea(values: number[], width: number, height: number) {
  const line = buildChartPath(values, width, height);
  return `${line} L${width},${height} L0,${height} Z`;
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

export function ProductPreviewSection() {
  return (
    <section className="relative py-24 px-4 bg-[var(--color-surface)] overflow-hidden">
      {/* Subtle backdrop accents */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-[0.18] pointer-events-none"
        style={{ backgroundColor: "var(--color-primary)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-[0.10] pointer-events-none"
        style={{ backgroundColor: "var(--color-warning)" }}
      />

      <div className="relative max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
            See it in action
          </span>
        </ScrollReveal>
        <ScrollReveal className="text-center mb-4">
          <h2
            className="text-3xl sm:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Watch a scan{" "}
            <em className="italic font-normal text-[var(--color-primary)]">
              come to life
            </em>
          </h2>
        </ScrollReveal>
        <ScrollReveal className="text-center mb-12">
          <p className="text-sm sm:text-base text-[var(--color-fg-secondary)] max-w-xl mx-auto leading-relaxed">
            Type your business, run a scan, and see exactly how the four major
            AI engines respond — in under a minute.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <PreviewBrowserFrame />
        </ScrollReveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Browser frame + scene controller                                           */
/* -------------------------------------------------------------------------- */

function PreviewBrowserFrame() {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState<1 | 2 | 3>(reduced ? 3 : 1);
  const [paused, setPaused] = useState(false);
  const [iteration, setIteration] = useState(0);
  const timers = useRef<number[]>([]);

  // Master loop. Each iteration steps 1 → 2 → 3 → pause → loop.
  useEffect(() => {
    if (reduced) {
      setScene(3);
      return;
    }
    if (paused) return;

    setScene(1);

    const t1 = window.setTimeout(() => setScene(2), SCENE_1_MS);
    const t2 = window.setTimeout(() => setScene(3), SCENE_1_MS + SCENE_2_MS);
    const t3 = window.setTimeout(() => {
      setIteration((n) => n + 1);
    }, SCENE_1_MS + SCENE_2_MS + SCENE_3_MS + PAUSE_MS);

    timers.current = [t1, t2, t3];
    return () => {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    };
  }, [iteration, paused, reduced]);

  return (
    <div
      onMouseEnter={() => !reduced && setPaused(true)}
      onMouseLeave={() => !reduced && setPaused(false)}
      className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl overflow-hidden"
    >
      {/* Faux browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="ml-3 flex-1 flex items-center justify-center">
          <div className="px-3 py-1 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] text-[var(--color-fg-muted)] font-mono">
            app.surven.ai/dashboard
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-fg-muted)]">
          Live demo
        </div>
      </div>

      {/* Dashboard body */}
      <div className="relative bg-[var(--color-bg)]">
        <DashboardCanvas scene={scene} iteration={iteration} reduced={!!reduced} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard canvas — one layout, scene-driven content                        */
/* -------------------------------------------------------------------------- */

function DashboardCanvas({
  scene,
  iteration,
  reduced,
}: {
  scene: 1 | 2 | 3;
  iteration: number;
  reduced: boolean;
}) {
  return (
    <div className="px-6 sm:px-8 py-8 sm:py-10 min-h-[460px] sm:min-h-[520px]">
      {/* Scan bar — morphs between large-centered (scene 1) and small-top (scenes 2/3) */}
      <ScanBar scene={scene} iteration={iteration} reduced={reduced} />

      {/* Engines row — appears in scene 2 onward */}
      <AnimatePresence>
        {scene >= 2 && (
          <motion.div
            key={`engines-${iteration}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
            className="mt-6"
          >
            <EnginesRow scene={scene} iteration={iteration} reduced={reduced} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results grid — appears in scene 3 */}
      <AnimatePresence>
        {scene === 3 && (
          <motion.div
            key={`results-${iteration}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7"
          >
            <ResultsGrid iteration={iteration} reduced={reduced} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ScanBar — types business name, then "scans" with progress fill             */
/* -------------------------------------------------------------------------- */

function ScanBar({
  scene,
  iteration,
  reduced,
}: {
  scene: 1 | 2 | 3;
  iteration: number;
  reduced: boolean;
}) {
  const [typed, setTyped] = useState(reduced ? TYPED_TEXT : "");
  const [showCursor, setShowCursor] = useState(true);
  const [scanProgress, setScanProgress] = useState(reduced ? 1 : 0);

  // Typewriter — runs whenever scene 1 starts (each iteration).
  useEffect(() => {
    if (reduced) {
      setTyped(TYPED_TEXT);
      setScanProgress(1);
      return;
    }
    if (scene !== 1) return;

    setTyped("");
    setScanProgress(0);
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setTyped(TYPED_TEXT.slice(0, i));
      if (i >= TYPED_TEXT.length) {
        clearInterval(t);
      }
    }, TYPE_CHAR_MS);

    // Once typing is done, fill the scan progress bar.
    const fillStart = TYPED_TEXT.length * TYPE_CHAR_MS + 350;
    const fillTimer = window.setTimeout(() => {
      const start = performance.now();
      const dur = 850;
      function frame(now: number) {
        const p = Math.min(1, (now - start) / dur);
        setScanProgress(p);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, fillStart);

    return () => {
      clearInterval(t);
      clearTimeout(fillTimer);
    };
  }, [scene, iteration, reduced]);

  // Cursor blink
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setShowCursor((v) => !v), 500);
    return () => clearInterval(t);
  }, [reduced]);

  const isBig = scene === 1;

  return (
    <motion.div
      animate={{
        scale: isBig ? 1 : 0.92,
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={
        isBig
          ? "flex flex-col items-center justify-center pt-8 pb-4"
          : "flex items-center justify-between"
      }
    >
      {isBig && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
          New scan
        </p>
      )}

      <motion.div
        layout
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={
          isBig
            ? "w-full max-w-xl flex flex-col gap-3"
            : "flex-1 flex items-center gap-3"
        }
      >
        <div
          className={
            "relative flex items-center gap-2 rounded-xl border bg-[var(--color-bg)] transition-shadow " +
            (isBig
              ? "border-[var(--color-primary)] shadow-md px-4 py-3"
              : "border-[var(--color-border)] px-3 py-2")
          }
        >
          <Search
            className={
              isBig
                ? "h-5 w-5 text-[var(--color-primary)] shrink-0"
                : "h-4 w-4 text-[var(--color-fg-muted)] shrink-0"
            }
          />
          <span
            className={
              "text-[var(--color-fg)] font-medium truncate " +
              (isBig ? "text-base" : "text-sm")
            }
          >
            {typed}
            {scene === 1 && showCursor && typed.length < TYPED_TEXT.length && (
              <span
                aria-hidden
                className="inline-block w-[2px] ml-0.5 align-middle"
                style={{
                  height: "0.95em",
                  backgroundColor: "var(--color-primary)",
                }}
              />
            )}
          </span>
        </div>

        {/* Run scan button — visible in scene 1 only */}
        {isBig && (
          <motion.button
            type="button"
            tabIndex={-1}
            initial={{ opacity: 0, y: 4 }}
            animate={{
              opacity: typed.length === TYPED_TEXT.length ? 1 : 0.6,
              y: 0,
            }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden flex items-center justify-center gap-2 self-end px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold shadow-sm"
            style={{ pointerEvents: "none" }}
          >
            {/* Progress fill — sweeps from left after typing completes */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-[var(--color-primary-hover)]"
              style={{ width: `${scanProgress * 100}%`, transition: "none" }}
            />
            <span className="relative z-[1] flex items-center gap-2">
              {scanProgress < 1 && typed.length === TYPED_TEXT.length ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  Run Scan
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </span>
          </motion.button>
        )}
      </motion.div>

      {/* Compact "scan complete" pill on right side once results land */}
      {!isBig && (
        <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)] text-xs font-semibold">
          <Sparkles className="h-3 w-3" />
          {scene === 3 ? "Scan complete" : "Scanning…"}
        </div>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Engine pills row                                                           */
/* -------------------------------------------------------------------------- */

function EnginesRow({
  scene,
  iteration,
  reduced,
}: {
  scene: 1 | 2 | 3;
  iteration: number;
  reduced: boolean;
}) {
  const [phases, setPhases] = useState<EnginePhase[]>(
    reduced ? ["done", "done", "done", "done"] : ["idle", "idle", "idle", "idle"],
  );

  // When scene 2 starts, each engine independently transitions idle → loading → done.
  useEffect(() => {
    if (reduced) {
      setPhases(["done", "done", "done", "done"]);
      return;
    }
    if (scene < 2) {
      setPhases(["idle", "idle", "idle", "idle"]);
      return;
    }

    // All start loading immediately.
    setPhases(["loading", "loading", "loading", "loading"]);
    const timers: number[] = [];
    ENGINES.forEach((eng, i) => {
      timers.push(
        window.setTimeout(() => {
          setPhases((prev) => {
            const next = [...prev];
            next[i] = "done";
            return next;
          });
        }, eng.finishAt),
      );
    });

    return () => timers.forEach((id) => clearTimeout(id));
  }, [scene, iteration, reduced]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {ENGINES.map((eng, i) => {
        const phase = phases[i];
        return (
          <div
            key={eng.name}
            className={
              "relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-colors duration-300 " +
              (phase === "done"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] bg-[var(--color-surface)]")
            }
          >
            <div className="flex items-center gap-2 min-w-0">
              <EngineDot phase={phase} />
              <span className="text-xs sm:text-[13px] font-semibold text-[var(--color-fg)] truncate">
                {eng.name}
              </span>
            </div>
            <span className="text-[11px] font-medium text-[var(--color-fg-muted)]">
              {phase === "idle" && "—"}
              {phase === "loading" && "Querying…"}
              {phase === "done" && (
                <span className="text-[var(--color-primary-hover)] flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {eng.mentions} mentions
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EngineDot({ phase }: { phase: EnginePhase }) {
  if (phase === "loading") {
    return (
      <span className="relative inline-flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 rounded-full bg-[var(--color-primary)] opacity-60 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]" />
      </span>
    );
  }
  if (phase === "done") {
    return <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] shrink-0" />;
  }
  return <span className="h-2 w-2 rounded-full bg-[var(--color-border)] shrink-0" />;
}

/* -------------------------------------------------------------------------- */
/*  Results grid — gauge, chart, prompts, engine breakdown                     */
/* -------------------------------------------------------------------------- */

function ResultsGrid({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Score card */}
      <div className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            Visibility score
          </p>
          <span className="text-[10px] font-semibold text-[var(--color-primary-hover)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
            +{TARGET_SCORE_DELTA} vs last
          </span>
        </div>
        <ScoreGauge target={TARGET_SCORE} iteration={iteration} reduced={reduced} />
      </div>

      {/* Trend chart */}
      <div className="lg:col-span-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            30-day trend
          </p>
          <span className="text-[10px] text-[var(--color-fg-muted)]">
            150 prompts · 4 engines
          </span>
        </div>
        <TrendChart iteration={iteration} reduced={reduced} />
      </div>

      {/* Prompts table */}
      <div className="lg:col-span-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">
          Top prompts
        </p>
        <PromptsList iteration={iteration} reduced={reduced} />
      </div>

      {/* Engine share bars */}
      <div className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-3">
          Coverage by engine
        </p>
        <EngineBars iteration={iteration} reduced={reduced} />
      </div>
    </div>
  );
}

/* ---- Score gauge ---- */

function ScoreGauge({
  target,
  iteration,
  reduced,
}: {
  target: number;
  iteration: number;
  reduced: boolean;
}) {
  const [score, setScore] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setScore(target);
      return;
    }
    setScore(0);
    const start = performance.now();
    const dur = 1800;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [iteration, target, reduced]);

  // Half-circle arc: stroke from -90° (left) to +90° (right). Gauge displays 0-100.
  const RADIUS = 60;
  const CIRC = Math.PI * RADIUS; // half circumference
  const fillRatio = Math.min(1, Math.max(0, score / 100));
  const dashOffset = CIRC * (1 - fillRatio);

  return (
    <div className="relative flex flex-col items-center justify-center pt-1">
      <svg width="180" height="100" viewBox="0 0 180 100" aria-hidden>
        {/* Track */}
        <path
          d={`M 30 90 A ${RADIUS} ${RADIUS} 0 0 1 150 90`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M 30 90 A ${RADIUS} ${RADIUS} 0 0 1 150 90`}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span
          className="text-4xl sm:text-5xl font-light text-[var(--color-fg)] leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {score}
        </span>
        <span className="text-[10px] text-[var(--color-fg-muted)] mt-1">
          out of 100
        </span>
      </div>
    </div>
  );
}

/* ---- Trend chart ---- */

function TrendChart({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  const W = 380;
  const H = 110;
  const linePath = buildChartPath(CHART_POINTS, W, H);
  const areaPath = buildChartArea(CHART_POINTS, W, H);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[110px]" aria-hidden>
        <defs>
          <linearGradient id="surven-trend-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <motion.path
          key={`area-${iteration}`}
          d={areaPath}
          fill="url(#surven-trend-gradient)"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.6 }}
        />

        {/* Line */}
        <motion.path
          key={`line-${iteration}`}
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />

        {/* End-point dot */}
        <motion.circle
          key={`dot-${iteration}`}
          cx={W}
          cy={H - ((CHART_POINTS[CHART_POINTS.length - 1] - Math.min(...CHART_POINTS)) / (Math.max(...CHART_POINTS) - Math.min(...CHART_POINTS))) * (H - 6) - 3}
          r="3.5"
          fill="var(--color-primary)"
          stroke="var(--color-bg)"
          strokeWidth="2"
          initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 1.7 }}
        />
      </svg>
    </div>
  );
}

/* ---- Prompts list ---- */

function PromptsList({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {PROMPTS.map((p, i) => (
        <motion.li
          key={`${iteration}-${p.text}`}
          initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.4 + i * 0.15 }}
          className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
        >
          <span
            className={
              "h-5 w-5 rounded-full flex items-center justify-center shrink-0 " +
              (p.mentioned
                ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-hover)]"
                : "bg-[var(--color-danger)]/15 text-[var(--color-danger)]")
            }
          >
            {p.mentioned ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </span>
          <span className="text-[13px] text-[var(--color-fg)] flex-1 truncate">
            {p.text}
          </span>
          {p.engine ? (
            <span className="text-[10px] font-medium text-[var(--color-fg-muted)] uppercase tracking-wider shrink-0">
              {p.engine}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-[var(--color-danger)] uppercase tracking-wider shrink-0">
              No mention
            </span>
          )}
        </motion.li>
      ))}
    </ul>
  );
}

/* ---- Engine share bars ---- */

function EngineBars({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  return (
    <div className="space-y-3">
      {ENGINES.map((eng, i) => (
        <div key={eng.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-[var(--color-fg)]">
              {eng.name}
            </span>
            <span className="text-[11px] font-semibold text-[var(--color-fg-muted)]">
              {eng.share}%
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
            <motion.div
              key={`${iteration}-${eng.name}`}
              initial={reduced ? { width: `${eng.share}%` } : { width: 0 }}
              animate={{ width: `${eng.share}%` }}
              transition={{ duration: 0.9, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 bg-[var(--color-primary)] rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
