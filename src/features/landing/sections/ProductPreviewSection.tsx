"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, Check, X, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

/* -------------------------------------------------------------------------- */
/*  Scene timing                                                               */
/* -------------------------------------------------------------------------- */

const SCENE_1_MS = 4800; // typing + cursor moves + click + zoom-in scan
const SCENE_2_MS = 4200; // engines querying with dramatic checkmarks
// Scene 3 = ~2.1s for the slowest stat animation (chart end-dot) to finish
// + 2s dwell before the loop restarts.
const SCENE_3_MS = 4200;
const TOTAL_MS = SCENE_1_MS + SCENE_2_MS + SCENE_3_MS;

/* -------------------------------------------------------------------------- */
/*  Mock content                                                               */
/* -------------------------------------------------------------------------- */

const TYPED_TEXT = "Joe's Pizza, Nashville TN";
const TYPE_CHAR_MS = 70;

type EnginePhase = "idle" | "loading" | "done";

const ENGINES: { name: string; finishAt: number; mentions: number; share: number }[] = [
  { name: "ChatGPT", finishAt: 900, mentions: 12, share: 84 },
  { name: "Claude", finishAt: 1800, mentions: 8, share: 71 },
  { name: "Gemini", finishAt: 2700, mentions: 10, share: 65 },
  { name: "Google AI", finishAt: 3600, mentions: 15, share: 72 },
];

const PROMPTS: { text: string; mentioned: boolean; engine: string | null }[] = [
  { text: "best pizza near me", mentioned: true, engine: "ChatGPT" },
  { text: "italian restaurant Nashville TN", mentioned: true, engine: "Gemini" },
  { text: "late night food downtown", mentioned: false, engine: null },
  { text: "where to take a date for dinner", mentioned: true, engine: "Claude" },
  { text: "wood-fired pizza tennessee", mentioned: true, engine: "Google AI" },
];

const TARGET_SCORE = 73;
const TARGET_SCORE_DELTA = 12; // vs prior scan

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
  const [iteration, setIteration] = useState(0);

  // Self-cycling loop. Effect runs once on mount (re-runs only if the
  // OS reduce-motion preference flips). A `cancelled` flag short-circuits
  // any in-flight timer that fires after unmount, so state can never desync.
  useEffect(() => {
    if (reduced) {
      setScene(3);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        fn();
      }, delay);
      timers.push(id);
    };

    function runCycle() {
      if (cancelled) return;
      setScene(1);
      schedule(() => setScene(2), SCENE_1_MS);
      schedule(() => setScene(3), SCENE_1_MS + SCENE_2_MS);
      schedule(() => {
        setIteration((n) => n + 1);
        runCycle();
      }, TOTAL_MS);
    }

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [reduced]);

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl overflow-hidden">
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

      {/* Dashboard body — FIXED height across all scenes */}
      <div className="relative bg-[var(--color-bg)] h-[640px] overflow-hidden">
        <DashboardCanvas scene={scene} iteration={iteration} reduced={!!reduced} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard canvas — every widget always present, content morphs by scene    */
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
    <div className="absolute inset-0 px-6 sm:px-8 py-6 flex flex-col">
      {/* Animated top spacer — pushes the scan bar to the vertical center
          of the box during scene 1, then collapses so scan bar sits at top
          for scenes 2/3. Keeps the box height fixed without faded UI. */}
      <motion.div
        aria-hidden
        animate={{ height: scene === 1 ? 220 : 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="shrink-0"
      />

      <ScanBar scene={scene} iteration={iteration} reduced={reduced} />

      {/* Engines row — appears scene 2 onward, exits cleanly when looping */}
      <AnimatePresence>
        {scene >= 2 && (
          <motion.div
            key="engines"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 pt-1"
          >
            <EnginesRow scene={scene} iteration={iteration} reduced={reduced} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results grid — only mounts in scene 3 */}
      <AnimatePresence>
        {scene === 3 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex-1"
          >
            <ResultsGrid iteration={iteration} reduced={reduced} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ScanBar — typewriter + cursor + click + zoom-in scan                       */
/* -------------------------------------------------------------------------- */

type MouseStage = "hidden" | "approaching" | "hovering" | "clicking" | "leaving";

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
  const [textCursorVisible, setTextCursorVisible] = useState(true);
  const [scanProgress, setScanProgress] = useState(reduced ? 1 : 0);
  const [mouseStage, setMouseStage] = useState<MouseStage>("hidden");
  const [buttonPressed, setButtonPressed] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);

  // Scripted scene-1 sequence with proper cancellation.
  useEffect(() => {
    if (reduced) {
      setTyped(TYPED_TEXT);
      setScanProgress(1);
      setMouseStage("hidden");
      setZoomActive(false);
      return;
    }
    if (scene !== 1) {
      setMouseStage("hidden");
      setZoomActive(false);
      return;
    }

    let cancelled = false;
    const guard = (fn: () => void) => () => {
      if (!cancelled) fn();
    };

    setTyped("");
    setScanProgress(0);
    setButtonPressed(false);
    setMouseStage("hidden");
    setZoomActive(false);

    const timers: number[] = [];

    // 1. Type characters one by one.
    let charIdx = 0;
    const typeInt = window.setInterval(() => {
      if (cancelled) {
        clearInterval(typeInt);
        return;
      }
      charIdx += 1;
      setTyped(TYPED_TEXT.slice(0, charIdx));
      if (charIdx >= TYPED_TEXT.length) clearInterval(typeInt);
    }, TYPE_CHAR_MS);
    const typingDoneAt = TYPED_TEXT.length * TYPE_CHAR_MS;

    // 2. Cursor enters from off-canvas + glides toward button.
    timers.push(
      window.setTimeout(guard(() => setMouseStage("approaching")), typingDoneAt + 250),
    );
    timers.push(
      window.setTimeout(guard(() => setMouseStage("hovering")), typingDoneAt + 1100),
    );

    // 3. Click — cursor presses, button presses, scan begins, zoom kicks in.
    const clickAt = typingDoneAt + 1500;
    timers.push(
      window.setTimeout(
        guard(() => {
          setMouseStage("clicking");
          setButtonPressed(true);
          setZoomActive(true);
        }),
        clickAt,
      ),
    );
    timers.push(window.setTimeout(guard(() => setButtonPressed(false)), clickAt + 200));
    // Cursor exits AFTER scan progress completes so it doesn't ghost mid-flight.
    timers.push(window.setTimeout(guard(() => setMouseStage("leaving")), clickAt + 1400));

    // 4. Scan progress fills.
    const fillStart = clickAt + 100;
    timers.push(
      window.setTimeout(
        guard(() => {
          const start = performance.now();
          const dur = 1100;
          const tick = (now: number) => {
            if (cancelled) return;
            const p = Math.min(1, (now - start) / dur);
            setScanProgress(p);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
        fillStart,
      ),
    );

    return () => {
      cancelled = true;
      clearInterval(typeInt);
      timers.forEach(clearTimeout);
    };
  }, [scene, iteration, reduced]);

  // Text caret blink.
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setTextCursorVisible((v) => !v), 500);
    return () => clearInterval(t);
  }, [reduced]);

  const isBig = scene === 1;

  return (
    <div className={isBig ? "relative pt-2 pb-2" : "relative"}>
      <div className={isBig ? "flex flex-col items-center justify-center" : "flex items-center justify-between"}>
        {isBig && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
            New scan
          </p>
        )}

        <motion.div
          layout
          animate={{
            scale: isBig && zoomActive ? 1.06 : 1,
          }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className={
            isBig
              ? "relative w-full max-w-xl flex flex-col gap-3"
              : "flex-1 flex items-center gap-3"
          }
        >
          <motion.div
            animate={{
              boxShadow:
                isBig && zoomActive
                  ? "0 0 0 6px rgba(150,162,131,0.18), 0 18px 40px -12px rgba(150,162,131,0.45)"
                  : "0 0 0 0px rgba(0,0,0,0), 0 0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.4 }}
            className={
              "relative flex items-center gap-2 rounded-xl border bg-[var(--color-bg)] " +
              (isBig
                ? "border-[var(--color-primary)] px-4 py-3"
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
              {scene === 1 && textCursorVisible && typed.length < TYPED_TEXT.length && (
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
          </motion.div>

          {/* Run scan button — visible in scene 1 only */}
          {isBig && (
            <motion.button
              type="button"
              tabIndex={-1}
              animate={{
                opacity: typed.length === TYPED_TEXT.length ? 1 : 0.55,
                scale: buttonPressed ? 0.96 : 1,
              }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden flex items-center justify-center gap-2 self-end px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold shadow-sm"
              style={{ pointerEvents: "none" }}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-[var(--color-primary-hover)]"
                style={{ width: `${scanProgress * 100}%`, transition: "none" }}
              />
              <span className="relative z-[1] flex items-center gap-2">
                {scanProgress > 0 && scanProgress < 1 ? (
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

          {/* Animated mouse cursor — only mounts during scene 1 active stages */}
          <AnimatePresence>
            {isBig && mouseStage !== "hidden" && (
              <MouseCursor stage={mouseStage} />
            )}
          </AnimatePresence>
        </motion.div>

        {/* "Scanning" / "Scan complete" pill on right side */}
        {!isBig && (
          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)] text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            {scene === 3 ? "Scan complete" : "Scanning…"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Mouse cursor (clean version, no ghosting) ---- */

function MouseCursor({ stage }: { stage: Exclude<MouseStage, "hidden"> }) {
  // Map each stage to a single transform target. AnimatePresence handles
  // mount/unmount; framer-motion smoothly animates between targets.
  const targets: Record<typeof stage, { x: number; y: number; scale: number; opacity: number }> = {
    approaching: { x: 360, y: 130, scale: 1, opacity: 1 },
    hovering: { x: 478, y: 102, scale: 1, opacity: 1 },
    clicking: { x: 478, y: 102, scale: 0.85, opacity: 1 },
    leaving: { x: 540, y: 60, scale: 1, opacity: 0 },
  };
  const t = targets[stage];

  return (
    <motion.div
      key="cursor"
      initial={{ x: 560, y: 220, scale: 1, opacity: 0 }}
      animate={t}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{
        x: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.16, ease: "easeOut" },
        opacity: { duration: 0.3 },
      }}
      className="pointer-events-none absolute top-0 left-0 z-30"
      style={{ transformOrigin: "top left" }}
    >
      <svg
        width="22"
        height="26"
        viewBox="0 0 22 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 2 L2 21 L7.2 16.5 L10.5 24 L13.5 22.7 L10.4 15.3 L17.5 14.5 Z"
          fill="#1A1C1A"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Engine pills row + dramatic done celebration                               */
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

  useEffect(() => {
    if (reduced) {
      setPhases(["done", "done", "done", "done"]);
      return;
    }
    if (scene === 1) {
      setPhases(["idle", "idle", "idle", "idle"]);
      return;
    }
    // Scene 3: phases are already "done" from scene 2 — don't re-trigger
    // the loading→done sequence, which would cause a second wave of
    // checkmark celebrations.
    if (scene === 3) return;

    // Scene 2: kick off the loading → done staggered sequence.
    let cancelled = false;
    const guard = (fn: () => void) => () => {
      if (!cancelled) fn();
    };

    setPhases(["loading", "loading", "loading", "loading"]);
    const timers: number[] = [];
    ENGINES.forEach((eng, i) => {
      timers.push(
        window.setTimeout(
          guard(() =>
            setPhases((prev) => {
              const next = [...prev];
              next[i] = "done";
              return next;
            }),
          ),
          eng.finishAt,
        ),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [scene, iteration, reduced]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {ENGINES.map((eng, i) => (
        <EnginePill
          key={`${iteration}-${eng.name}`}
          name={eng.name}
          mentions={eng.mentions}
          phase={phases[i]}
        />
      ))}
    </div>
  );
}

function EnginePill({
  name,
  mentions,
  phase,
}: {
  name: string;
  mentions: number;
  phase: EnginePhase;
}) {
  const isDone = phase === "done";

  return (
    <motion.div
      animate={
        isDone
          ? { scale: [1, 1.08, 1], y: [0, -3, 0] }
          : { scale: 1, y: 0 }
      }
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={
        "relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border overflow-hidden " +
        (isDone
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8"
          : "border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-300")
      }
    >
      {/* Done flash overlay */}
      <AnimatePresence>
        {isDone && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(120deg, rgba(150,162,131,0.55) 0%, rgba(201,169,91,0.32) 50%, rgba(150,162,131,0) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Done expanding ring */}
      <AnimatePresence>
        {isDone && (
          <motion.span
            aria-hidden
            initial={{ scale: 0.6, opacity: 0.55 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{ border: "2px solid var(--color-primary)" }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-2 min-w-0">
        <EngineDot phase={phase} />
        <span className="text-xs sm:text-[13px] font-semibold text-[var(--color-fg)] truncate">
          {name}
        </span>
      </div>

      <div className="relative text-[11px] font-medium min-w-[68px] text-right">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[var(--color-fg-muted)]"
            >
              —
            </motion.span>
          )}
          {phase === "loading" && (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[var(--color-fg-muted)] flex items-center gap-1 justify-end"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Querying…
            </motion.span>
          )}
          {phase === "done" && (
            <motion.span
              key="done"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="text-[var(--color-primary-hover)] flex items-center gap-1.5 justify-end font-semibold"
            >
              <motion.span
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.04 }}
                className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[var(--color-primary)] text-white shadow-sm"
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </motion.span>
              {mentions} mentions
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
/*  Results grid — every card always rendered, content morphs on `active`      */
/* -------------------------------------------------------------------------- */

function ResultsGrid({
  iteration,
  reduced,
}: {
  iteration: number;
  reduced: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
      {/* Score card */}
      <div className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            Visibility score
          </p>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
            className="text-[10px] font-semibold text-[var(--color-primary-hover)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full"
          >
            +{TARGET_SCORE_DELTA} vs last
          </motion.span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ScoreGauge target={TARGET_SCORE} iteration={iteration} reduced={reduced} />
        </div>
      </div>

      {/* Trend chart */}
      <div className="lg:col-span-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            30-day trend
          </p>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[10px] text-[var(--color-fg-muted)]"
          >
            150 prompts · 4 engines
          </motion.span>
        </div>
        <div className="flex-1 flex items-center">
          <TrendChart iteration={iteration} reduced={reduced} />
        </div>
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

    let cancelled = false;
    const start = performance.now();
    const dur = 1700;
    let raf = 0;
    const tick = (now: number) => {
      if (cancelled) return;
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [iteration, target, reduced]);

  const RADIUS = 60;
  const CIRC = Math.PI * RADIUS;
  const fillRatio = Math.min(1, Math.max(0, score / 100));
  const dashOffset = CIRC * (1 - fillRatio);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="180" height="100" viewBox="0 0 180 100" aria-hidden>
        <path
          d={`M 30 90 A ${RADIUS} ${RADIUS} 0 0 1 150 90`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="10"
          strokeLinecap="round"
        />
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

function TrendChart({
  iteration,
  reduced,
}: {
  iteration: number;
  reduced: boolean;
}) {
  const W = 380;
  const H = 110;
  const linePath = buildChartPath(CHART_POINTS, W, H);
  const areaPath = buildChartArea(CHART_POINTS, W, H);

  const lastY =
    H -
    ((CHART_POINTS[CHART_POINTS.length - 1] - Math.min(...CHART_POINTS)) /
      (Math.max(...CHART_POINTS) - Math.min(...CHART_POINTS))) *
      (H - 6) -
    3;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[110px]" aria-hidden>
        <defs>
          <linearGradient id="surven-trend-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          key={`area-${iteration}`}
          d={areaPath}
          fill="url(#surven-trend-gradient)"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.6 }}
        />
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
        <motion.circle
          key={`dot-${iteration}`}
          cx={W}
          cy={lastY}
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

function PromptsList({
  iteration,
  reduced,
}: {
  iteration: number;
  reduced: boolean;
}) {
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

function EngineBars({
  iteration,
  reduced,
}: {
  iteration: number;
  reduced: boolean;
}) {
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
