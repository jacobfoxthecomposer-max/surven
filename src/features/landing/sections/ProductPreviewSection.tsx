"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  Check,
  X,
  Sparkles,
  Loader2,
  ArrowRight,
  LayoutGrid,
  ListChecks,
  BookOpen,
  GitCompare,
  Plus,
  BarChart2,
  Zap,
  Bell,
  Settings,
  TrendingUp,
} from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

/* -------------------------------------------------------------------------- */
/*  Scene timing                                                               */
/* -------------------------------------------------------------------------- */

const SCENE_1_MS = 4800;
const SCENE_2_MS = 1400;
const SCENE_3_MS = 3800;
const SCENE_4_MS = 1600;
const SCENE_5_MS = 3800;
const SCENE_6_MS = 1600;
const SCENE_7_MS = 4200;
const SCENE_8_MS = 1600;
const SCENE_9_MS = 4500;

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type Scene = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type EnginePhase = "idle" | "loading" | "done";
type MouseStage = "hidden" | "approaching" | "hovering" | "clicking" | "leaving";
type GcState = { visible: boolean; x: number; y: number; scale: number };

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                  */
/* -------------------------------------------------------------------------- */

const TYPED_TEXT = "Joe's Pizza, Nashville TN";
const TYPE_CHAR_MS = 70;

const ENGINES = [
  { name: "ChatGPT",   finishAt: 200, mentions: 12, total: 15, share: 84 },
  { name: "Claude",    finishAt: 400, mentions: 8,  total: 15, share: 71 },
  { name: "Gemini",    finishAt: 600, mentions: 10, total: 15, share: 65 },
  { name: "Google AI", finishAt: 800, mentions: 11, total: 15, share: 72 },
];

const PROMPTS = [
  { text: "best pizza near me",              mentioned: true,  engine: "ChatGPT"   },
  { text: "italian restaurant Nashville TN", mentioned: true,  engine: "Gemini"    },
  { text: "late night food downtown",        mentioned: false, engine: null        },
  { text: "where to take a date for dinner", mentioned: true,  engine: "Claude"    },
  { text: "wood-fired pizza tennessee",      mentioned: true,  engine: "Google AI" },
];

const TRACKED_PROMPTS = [
  { text: "best pizza near me",              chatgpt: true,  claude: false, gemini: true,  googleai: true,  score: 75  },
  { text: "italian restaurant Nashville",    chatgpt: true,  claude: true,  gemini: false, googleai: true,  score: 75  },
  { text: "late night food downtown",        chatgpt: false, claude: false, gemini: false, googleai: false, score: 0   },
  { text: "where to take a date for dinner", chatgpt: true,  claude: true,  gemini: false, googleai: true,  score: 75  },
  { text: "wood-fired pizza Tennessee",      chatgpt: true,  claude: true,  gemini: true,  googleai: true,  score: 100 },
  { text: "cheap eats Nashville",            chatgpt: false, claude: false, gemini: true,  googleai: false, score: 25  },
];

const RESEARCH_PROMPTS = [
  { text: "best wood-fired pizza Nashville",       intent: "Recommendation" },
  { text: "pizza with outdoor seating Nashville",  intent: "Local"          },
  { text: "family-friendly restaurants Nashville", intent: "Local"          },
  { text: "best Italian in Tennessee",             intent: "Comparison"     },
  { text: "pizza near Vanderbilt",                 intent: "Hyperlocal"     },
];

const COMPETITOR = {
  myName: "Joe's Pizza", myScore: 73,
  theirName: "Tony's Italian", theirScore: 78,
  engines: [
    { name: "ChatGPT",   myShare: 84, theirShare: 91 },
    { name: "Claude",    myShare: 71, theirShare: 68 },
    { name: "Gemini",    myShare: 65, theirShare: 77 },
    { name: "Google AI", myShare: 72, theirShare: 69 },
  ],
};

const TARGET_SCORE = 73;

/* -------------------------------------------------------------------------- */
/*  Sidebar + cursor constants                                                 */
/* -------------------------------------------------------------------------- */

// Sidebar is w-14 (56 px). Cursor positions are in canvas coordinates.
// Scan bar compact ≈ 44 px. Logo header ≈ 50 px. Nav py-2 top = 8 px.
// Each icon item is h-10 (40 px) with gap-1 (4 px) between.
//   Item center Y = 44 + 50 + 8 + (item_index * 44) + 20
const SIDEBAR_X = 28;
const SIDEBAR_Y_TRACKED     = 166;
const SIDEBAR_Y_RESEARCH    = 210;
const SIDEBAR_Y_COMPETITORS = 254;

const GC_HIDDEN: GcState = { visible: false, x: 0, y: 0, scale: 1 };

const SCENE_URLS: Record<Scene, string> = {
  1: "app.surven.ai/dashboard",
  2: "app.surven.ai/dashboard",
  3: "app.surven.ai/dashboard",
  4: "app.surven.ai/dashboard",
  5: "app.surven.ai/tracked-prompts",
  6: "app.surven.ai/tracked-prompts",
  7: "app.surven.ai/prompt-research",
  8: "app.surven.ai/prompt-research",
  9: "app.surven.ai/competitor-comparison",
};

const SIDEBAR_NAV = [
  { key: "dashboard",   icon: LayoutGrid,  scenes: [3, 4] as Scene[], tooltip: "Dashboard"             },
  { key: "tracked",     icon: ListChecks,  scenes: [5, 6] as Scene[], tooltip: "Tracked Prompts"       },
  { key: "research",    icon: BookOpen,    scenes: [7, 8] as Scene[], tooltip: "Prompt Research"       },
  { key: "competitors", icon: GitCompare,  scenes: [9]    as Scene[], tooltip: "Competitor Comparison" },
  { key: "analytics",   icon: BarChart2,   scenes: []     as Scene[], tooltip: "Analytics"             },
  { key: "automations", icon: Zap,         scenes: []     as Scene[], tooltip: "Automations"           },
  { key: "alerts",      icon: Bell,        scenes: []     as Scene[], tooltip: "Alerts"                },
];

const CHART_POINTS = [
  38, 41, 39, 43, 42, 47, 45, 49, 51, 50, 53, 56, 54, 58,
  60, 62, 60, 64, 63, 66, 68, 67, 69, 71, 70, 72, 71, 73, 72, 73,
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
      <div aria-hidden className="absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-[0.18] pointer-events-none" style={{ backgroundColor: "var(--color-primary)" }} />
      <div aria-hidden className="absolute -bottom-40 -left-32 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-[0.10] pointer-events-none" style={{ backgroundColor: "var(--color-warning)" }} />
      <div className="relative max-w-6xl mx-auto">
        <ScrollReveal className="text-center mb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">See it in action</span>
        </ScrollReveal>
        <ScrollReveal className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-light" style={{ fontFamily: "var(--font-display)" }}>
            Watch a scan{" "}
            <em className="italic font-normal text-[var(--color-primary)]">come to life</em>
          </h2>
        </ScrollReveal>
        <ScrollReveal className="text-center mb-12">
          <p className="text-sm sm:text-base text-[var(--color-fg-secondary)] max-w-xl mx-auto leading-relaxed">
            Type your business, run a scan, and explore every tool — just like your customers will.
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

export function PreviewBrowserFrame() {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState<Scene>(reduced ? 3 : 1);
  const [iteration, setIteration] = useState(0);

  useEffect(() => {
    if (reduced) { setScene(3); return; }

    let cancelled = false;
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => { if (!cancelled) fn(); }, delay);
      timers.push(id);
    };

    function runCycle() {
      if (cancelled) return;
      setScene(1);
      let acc = 0;
      const next = (s: Scene, dur: number) => { acc += dur; schedule(() => setScene(s), acc); };
      next(2, SCENE_1_MS);
      next(3, SCENE_2_MS);
      next(4, SCENE_3_MS);
      next(5, SCENE_4_MS);
      next(6, SCENE_5_MS);
      next(7, SCENE_6_MS);
      next(8, SCENE_7_MS);
      next(9, SCENE_8_MS);
      acc += SCENE_9_MS;
      schedule(() => { setIteration((n) => n + 1); runCycle(); }, acc);
    }

    runCycle();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [reduced]);

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="ml-3 flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={SCENE_URLS[scene]}
              initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
              className="px-3 py-1 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[11px] text-[var(--color-fg-muted)] font-mono"
            >
              {SCENE_URLS[scene]}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-fg-muted)]">Live demo</div>
      </div>
      {/* Canvas */}
      <div className="relative bg-[var(--color-bg)] h-[640px] overflow-hidden">
        <DashboardCanvas scene={scene} iteration={iteration} reduced={!!reduced} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar — icon-only, matching real Surven app                             */
/* -------------------------------------------------------------------------- */

function Sidebar({ scene }: { scene: Scene }) {
  return (
    <div className="shrink-0 w-14 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
      {/* Brand mark */}
      <div className="flex items-center justify-center py-3.5 border-b border-[var(--color-border)]">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          S
        </div>
      </div>
      {/* Nav */}
      <nav className="flex flex-col items-center gap-1 py-2 flex-1">
        {SIDEBAR_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.scenes.includes(scene);
          return (
            <div
              key={item.key}
              title={item.tooltip}
              className={
                "w-10 h-10 flex items-center justify-center rounded-xl cursor-default transition-colors " +
                (isActive
                  ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
                  : "text-[var(--color-fg-muted)]")
              }
            >
              <Icon className="w-[18px] h-[18px]" />
            </div>
          );
        })}
      </nav>
      {/* Bottom: Settings */}
      <div className="flex flex-col items-center gap-1 py-2 border-t border-[var(--color-border)]">
        <div title="Settings" className="w-10 h-10 flex items-center justify-center rounded-xl cursor-default text-[var(--color-fg-muted)]">
          <Settings className="w-[18px] h-[18px]" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard canvas                                                           */
/* -------------------------------------------------------------------------- */

function DashboardCanvas({ scene, iteration, reduced }: { scene: Scene; iteration: number; reduced: boolean }) {
  const [gc, setGc] = useState<GcState>(GC_HIDDEN);
  const [trackClicked, setTrackClicked] = useState(false);

  useEffect(() => {
    if (reduced) { setGc(GC_HIDDEN); return; }

    let cancelled = false;
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => { if (!cancelled) fn(); }, delay);
      timers.push(id);
    };

    setGc(GC_HIDDEN);

    if (scene === 4) {
      setGc({ visible: true, x: 480, y: 300, scale: 1 });
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_TRACKED,     scale: 1    }), 200);
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_TRACKED,     scale: 0.85 }), 1000);
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_TRACKED,     scale: 1    }), 1200);
      schedule(() => setGc(GC_HIDDEN), 1450);
    } else if (scene === 6) {
      setGc({ visible: true, x: 480, y: 300, scale: 1 });
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_RESEARCH,    scale: 1    }), 200);
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_RESEARCH,    scale: 0.85 }), 1000);
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_RESEARCH,    scale: 1    }), 1200);
      schedule(() => setGc(GC_HIDDEN), 1450);
    } else if (scene === 7) {
      setTrackClicked(false);
      // Track button on row index 1: approx x=820, y=196 in canvas coords
      schedule(() => setGc({ visible: true, x: 580, y: 380, scale: 1    }),  1000);
      schedule(() => setGc({ visible: true, x: 820, y: 196, scale: 1    }),  1700);
      schedule(() => setGc({ visible: true, x: 820, y: 196, scale: 0.85 }),  2500);
      schedule(() => { setTrackClicked(true); setGc({ visible: true, x: 820, y: 196, scale: 1 }); }, 2700);
      schedule(() => setGc(GC_HIDDEN), 3500);
    } else if (scene === 8) {
      setGc({ visible: true, x: 480, y: 300, scale: 1 });
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_COMPETITORS, scale: 1    }), 200);
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_COMPETITORS, scale: 0.85 }), 1000);
      schedule(() => setGc({ visible: true, x: SIDEBAR_X, y: SIDEBAR_Y_COMPETITORS, scale: 1    }), 1200);
      schedule(() => setGc(GC_HIDDEN), 1450);
    }

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [scene, iteration, reduced]);

  const showSidebar = scene >= 3;
  const showEngines = scene === 2;

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Scan bar */}
      <div className="px-6 sm:px-8 shrink-0">
        <motion.div aria-hidden animate={{ height: scene === 1 ? 120 : 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
        <ScanBar scene={scene} iteration={iteration} reduced={reduced} />
      </div>

      {/* Engines — scene 2 only */}
      <AnimatePresence>
        {showEngines && (
          <motion.div key="engines" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="px-6 sm:px-8 mt-5">
            <EnginesRow scene={scene} iteration={iteration} reduced={reduced} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar + pages */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar scene={scene} />
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence>
                {(scene === 3 || scene === 4) && (
                  <motion.div key="page-dashboard" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 p-4 overflow-hidden">
                    <DashboardPage iteration={iteration} reduced={reduced} />
                  </motion.div>
                )}
                {(scene === 5 || scene === 6) && (
                  <motion.div key="page-tracked" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 p-4 overflow-hidden">
                    <TrackedPromptsPage iteration={iteration} reduced={reduced} />
                  </motion.div>
                )}
                {(scene === 7 || scene === 8) && (
                  <motion.div key="page-research" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 p-4 overflow-hidden">
                    <PromptResearchPage iteration={iteration} reduced={reduced} trackClicked={trackClicked} />
                  </motion.div>
                )}
                {scene === 9 && (
                  <motion.div key="page-competitors" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 p-4 overflow-hidden">
                    <CompetitorComparisonPage iteration={iteration} reduced={reduced} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global cursor */}
      <AnimatePresence>
        {gc.visible && <GlobalMouseCursor x={gc.x} y={gc.y} scale={gc.scale} />}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Global mouse cursor                                                        */
/* -------------------------------------------------------------------------- */

function GlobalMouseCursor({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <motion.div
      key="gcursor"
      initial={{ x, y, scale, opacity: 0 }}
      animate={{ x, y, scale, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ x: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }, y: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }, scale: { duration: 0.16, ease: "easeOut" }, opacity: { duration: 0.25 } }}
      className="pointer-events-none absolute top-0 left-0 z-50"
      style={{ transformOrigin: "top left" }}
    >
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2 L2 21 L7.2 16.5 L10.5 24 L13.5 22.7 L10.4 15.3 L17.5 14.5 Z" fill="var(--color-fg)" stroke="var(--color-bg)" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ScanBar                                                                    */
/* -------------------------------------------------------------------------- */

function ScanBar({ scene, iteration, reduced }: { scene: Scene; iteration: number; reduced: boolean }) {
  const [typed, setTyped] = useState(reduced ? TYPED_TEXT : "");
  const [textCursorVisible, setTextCursorVisible] = useState(true);
  const [scanProgress, setScanProgress] = useState(reduced ? 1 : 0);
  const [mouseStage, setMouseStage] = useState<MouseStage>("hidden");
  const [buttonPressed, setButtonPressed] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);

  useEffect(() => {
    if (reduced) { setTyped(TYPED_TEXT); setScanProgress(1); setMouseStage("hidden"); setZoomActive(false); return; }
    if (scene !== 1) { setMouseStage("hidden"); setZoomActive(false); return; }

    let cancelled = false;
    const guard = (fn: () => void) => () => { if (!cancelled) fn(); };
    setTyped(""); setScanProgress(0); setButtonPressed(false); setMouseStage("hidden"); setZoomActive(false);
    const timers: number[] = [];

    let charIdx = 0;
    const typeInt = window.setInterval(() => {
      if (cancelled) { clearInterval(typeInt); return; }
      charIdx += 1;
      setTyped(TYPED_TEXT.slice(0, charIdx));
      if (charIdx >= TYPED_TEXT.length) clearInterval(typeInt);
    }, TYPE_CHAR_MS);
    const typingDoneAt = TYPED_TEXT.length * TYPE_CHAR_MS;

    timers.push(window.setTimeout(guard(() => setMouseStage("approaching")), typingDoneAt + 250));
    timers.push(window.setTimeout(guard(() => setMouseStage("hovering")),    typingDoneAt + 1100));
    const clickAt = typingDoneAt + 1500;
    timers.push(window.setTimeout(guard(() => { setMouseStage("clicking"); setButtonPressed(true); setZoomActive(true); }), clickAt));
    timers.push(window.setTimeout(guard(() => setButtonPressed(false)), clickAt + 200));
    timers.push(window.setTimeout(guard(() => setMouseStage("leaving")), clickAt + 1400));
    timers.push(window.setTimeout(guard(() => {
      const start = performance.now(), dur = 1100;
      const tick = (now: number) => { if (cancelled) return; const p = Math.min(1, (now - start) / dur); setScanProgress(p); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }), clickAt + 100));

    return () => { cancelled = true; clearInterval(typeInt); timers.forEach(clearTimeout); };
  }, [scene, iteration, reduced]);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setTextCursorVisible((v) => !v), 500);
    return () => clearInterval(t);
  }, [reduced]);

  const isBig = scene === 1;

  return (
    <div className={isBig ? "relative pt-2 pb-2" : "relative"}>
      <div className={isBig ? "flex flex-col items-center justify-center" : "flex items-center justify-between"}>
        {isBig && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">New scan</p>}
        <motion.div layout animate={{ scale: isBig && zoomActive ? 1.06 : 1 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className={isBig ? "relative w-full max-w-xl flex flex-col gap-3" : "flex-1 flex items-center gap-3"}>
          <motion.div
            animate={{ boxShadow: isBig && zoomActive ? "0 0 0 6px rgba(150,162,131,0.18), 0 18px 40px -12px rgba(150,162,131,0.45)" : "0 0 0 0px rgba(0,0,0,0)" }}
            transition={{ duration: 0.4 }}
            className={"relative flex items-center gap-2 rounded-xl border bg-[var(--color-bg)] " + (isBig ? "border-[var(--color-primary)] px-4 py-3" : "border-[var(--color-border)] px-3 py-2")}
          >
            <Search className={isBig ? "h-5 w-5 text-[var(--color-primary)] shrink-0" : "h-4 w-4 text-[var(--color-fg-muted)] shrink-0"} />
            <span className={"text-[var(--color-fg)] font-medium truncate " + (isBig ? "text-base" : "text-sm")}>
              {typed}
              {scene === 1 && textCursorVisible && typed.length < TYPED_TEXT.length && (
                <span aria-hidden className="inline-block w-[2px] ml-0.5 align-middle" style={{ height: "0.95em", backgroundColor: "var(--color-primary)" }} />
              )}
            </span>
          </motion.div>
          {isBig && (
            <motion.button type="button" tabIndex={-1} animate={{ opacity: typed.length === TYPED_TEXT.length ? 1 : 0.55, scale: buttonPressed ? 0.96 : 1 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden flex items-center justify-center gap-2 self-end px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold shadow-sm" style={{ pointerEvents: "none" }}>
              <span aria-hidden className="absolute inset-y-0 left-0 bg-[var(--color-primary-hover)]" style={{ width: `${scanProgress * 100}%`, transition: "none" }} />
              <span className="relative z-[1] flex items-center gap-2">
                {scanProgress > 0 && scanProgress < 1 ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Scanning…</> : <>Run Scan<ArrowRight className="h-3.5 w-3.5" /></>}
              </span>
            </motion.button>
          )}
          <AnimatePresence>{isBig && mouseStage !== "hidden" && <MouseCursor stage={mouseStage} />}</AnimatePresence>
        </motion.div>
        {!isBig && (
          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)] text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            {scene >= 3 ? "Scan complete" : "Scanning…"}
          </div>
        )}
      </div>
    </div>
  );
}

function MouseCursor({ stage }: { stage: Exclude<MouseStage, "hidden"> }) {
  const targets: Record<typeof stage, { x: number; y: number; scale: number; opacity: number }> = {
    approaching: { x: 360, y: 130, scale: 1,    opacity: 1 },
    hovering:    { x: 478, y: 102, scale: 1,    opacity: 1 },
    clicking:    { x: 478, y: 102, scale: 0.85, opacity: 1 },
    leaving:     { x: 540, y: 60,  scale: 1,    opacity: 0 },
  };
  return (
    <motion.div key="cursor" initial={{ x: 560, y: 220, scale: 1, opacity: 0 }} animate={targets[stage]} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ x: { duration: 0.85, ease: [0.16, 1, 0.3, 1] }, y: { duration: 0.85, ease: [0.16, 1, 0.3, 1] }, scale: { duration: 0.16, ease: "easeOut" }, opacity: { duration: 0.3 } }} className="pointer-events-none absolute top-0 left-0 z-30" style={{ transformOrigin: "top left" }}>
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2 L2 21 L7.2 16.5 L10.5 24 L13.5 22.7 L10.4 15.3 L17.5 14.5 Z" fill="var(--color-fg)" stroke="var(--color-bg)" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Engines row                                                                */
/* -------------------------------------------------------------------------- */

function EnginesRow({ scene, iteration, reduced }: { scene: Scene; iteration: number; reduced: boolean }) {
  const [phases, setPhases] = useState<EnginePhase[]>(reduced ? ["done", "done", "done", "done"] : ["idle", "idle", "idle", "idle"]);

  useEffect(() => {
    if (reduced) { setPhases(["done", "done", "done", "done"]); return; }
    if (scene === 1) { setPhases(["idle", "idle", "idle", "idle"]); return; }
    if (scene > 2) return;
    let cancelled = false;
    const guard = (fn: () => void) => () => { if (!cancelled) fn(); };
    setPhases(["loading", "loading", "loading", "loading"]);
    const timers: number[] = [];
    ENGINES.forEach((eng, i) => {
      timers.push(window.setTimeout(guard(() => setPhases((prev) => { const n = [...prev]; n[i] = "done"; return n; })), eng.finishAt));
    });
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [scene, iteration, reduced]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {ENGINES.map((eng, i) => <EnginePill key={`${iteration}-${eng.name}`} name={eng.name} mentions={eng.mentions} phase={phases[i]} />)}
    </div>
  );
}

function EnginePill({ name, mentions, phase }: { name: string; mentions: number; phase: EnginePhase }) {
  const isDone = phase === "done";
  return (
    <motion.div animate={isDone ? { scale: [1, 1.08, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className={"relative flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border overflow-hidden " + (isDone ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8" : "border-[var(--color-border)] bg-[var(--color-surface)]")}>
      <AnimatePresence>{isDone && <motion.span aria-hidden initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(120deg, rgba(150,162,131,0.55) 0%, rgba(201,169,91,0.32) 50%, rgba(150,162,131,0) 100%)" }} />}</AnimatePresence>
      <AnimatePresence>{isDone && <motion.span aria-hidden initial={{ scale: 0.6, opacity: 0.55 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 pointer-events-none rounded-lg" style={{ border: "2px solid var(--color-primary)" }} />}</AnimatePresence>
      <div className="relative flex items-center gap-2">
        <EngineDot phase={phase} />
        <span className="text-xs sm:text-[13px] font-semibold text-[var(--color-fg)]">{name}</span>
      </div>
      <div className="relative text-[11px] font-medium pl-4">
        <AnimatePresence mode="wait">
          {phase === "idle" && <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[var(--color-fg-muted)]">—</motion.span>}
          {phase === "loading" && <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[var(--color-fg-muted)] flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Querying…</motion.span>}
          {phase === "done" && (
            <motion.span key="done" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="text-[var(--color-primary-hover)] flex items-center gap-1.5 font-semibold">
              <motion.span initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 520, damping: 14, delay: 0.04 }} className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[var(--color-primary)] text-white shadow-sm">
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
  if (phase === "loading") return <span className="relative inline-flex h-2 w-2 shrink-0"><span className="absolute inset-0 rounded-full bg-[var(--color-primary)] opacity-60 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]" /></span>;
  if (phase === "done") return <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] shrink-0" />;
  return <span className="h-2 w-2 rounded-full bg-[var(--color-border)] shrink-0" />;
}

/* -------------------------------------------------------------------------- */
/*  Dashboard page — matches real Surven dashboard style                      */
/* -------------------------------------------------------------------------- */

function DashboardPage({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  return (
    <div className="h-full flex flex-col gap-3">
      {/* Top row */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Score card */}
        <div className="shrink-0 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">AI Visibility</p>
          <div className="flex-1 flex items-center justify-center">
            <ScoreGauge target={TARGET_SCORE} iteration={iteration} reduced={reduced} />
          </div>
          <div className="text-center -mt-2">
            <p className="text-[13px] font-semibold text-[var(--color-fg)]">Fair</p>
            <p className="text-[10px] text-[var(--color-fg-muted)] mt-0.5 leading-tight">You show up sometimes — plenty of room to climb.</p>
          </div>
        </div>

        {/* Business info */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div>
            <h3 className="text-2xl font-light text-[var(--color-fg)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>Joe&apos;s Pizza</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)] px-2 py-0.5 rounded-full">Restaurant</span>
              <span className="text-[11px] text-[var(--color-fg-muted)]">Nashville, TN</span>
            </div>
          </div>
          <p className="text-[12px] text-[var(--color-fg-muted)]">
            Your AI visibility is{" "}
            <span className="font-semibold" style={{ color: "var(--color-warning)" }}>moderate.</span>
          </p>
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[11px] text-[var(--color-fg-muted)] leading-relaxed">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--color-primary)]" />
            ChatGPT mentioned you in 12 of 15 prompts — your strongest engine. Google AI was lowest.
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Total Mentions", value: "41",  sub: "this week"  },
              { label: "Prompts Tracked", value: "15", sub: "active"     },
              { label: "30-Day Trend",   value: "+5%", sub: "vs last mo" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
                <p className="text-[9px] text-[var(--color-fg-muted)] leading-tight mb-0.5 truncate">{s.label}</p>
                <p className="text-[15px] font-light text-[var(--color-fg)] leading-none" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
                <p className="text-[9px] text-[var(--color-fg-muted)] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
          {/* Trend sparkline */}
          <div className="flex-1 min-h-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pt-2 pb-2 flex flex-col">
            <div className="flex items-center justify-between mb-1 shrink-0">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">Visibility Trend</p>
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-[var(--color-primary-hover)]">
                <TrendingUp className="h-2.5 w-2.5" />↑ 30d
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <DashSparkline iteration={iteration} reduced={reduced} />
            </div>
          </div>
        </div>
      </div>

      {/* Engine breakdown */}
      <div className="shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-2">AI Model Breakdown</p>
        <div className="grid grid-cols-4 gap-2">
          {ENGINES.map((eng, i) => (
            <motion.div
              key={eng.name}
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.1 }}
              className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                <span className="text-[10px] text-[var(--color-fg-muted)] truncate">{eng.name}</span>
                <span className="ml-auto text-[9px] font-semibold text-[var(--color-primary-hover)]">Mentioned</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-light text-[var(--color-fg)]" style={{ fontFamily: "var(--font-display)" }}>{eng.mentions}</span>
                <span className="text-[11px] text-[var(--color-fg-muted)]">/{eng.total}</span>
              </div>
              <p className="text-[10px] text-[var(--color-fg-muted)] mb-2">prompts</p>
              <div className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                <motion.div
                  key={`${iteration}-${eng.name}`}
                  initial={reduced ? { width: `${Math.round((eng.mentions / eng.total) * 100)}%` } : { width: 0 }}
                  animate={{ width: `${Math.round((eng.mentions / eng.total) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-[var(--color-primary)]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ target, iteration, reduced }: { target: number; iteration: number; reduced: boolean }) {
  const [score, setScore] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) { setScore(target); return; }
    let cancelled = false;
    const start = performance.now(), dur = 1700;
    let raf = 0;
    const tick = (now: number) => { if (cancelled) return; const p = Math.min(1, (now - start) / dur); setScore(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [iteration, target, reduced]);

  const RADIUS = 52;
  const CIRC = Math.PI * RADIUS;
  const dashOffset = CIRC * (1 - Math.min(1, Math.max(0, score / 100)));

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="148" height="82" viewBox="0 0 148 82" aria-hidden>
        <path d={`M 22 74 A ${RADIUS} ${RADIUS} 0 0 1 126 74`} fill="none" stroke="var(--color-border)" strokeWidth="9" strokeLinecap="round" />
        <path d={`M 22 74 A ${RADIUS} ${RADIUS} 0 0 1 126 74`} fill="none" stroke="var(--color-primary)" strokeWidth="9" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset} style={{ transition: "stroke-dashoffset 0s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-3xl font-light text-[var(--color-fg)] leading-none" style={{ fontFamily: "var(--font-display)" }}>{score}</span>
        <span className="text-[9px] text-[var(--color-fg-muted)] mt-0.5">/100</span>
      </div>
    </div>
  );
}

function DashSparkline({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  const W = 260, H = 44;
  const linePath = buildChartPath(CHART_POINTS, W, H);
  const areaPath = buildChartArea(CHART_POINTS, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="dash-spark-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path key={`dash-area-${iteration}`} d={areaPath} fill="url(#dash-spark-gradient)" initial={reduced ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.5 }} />
      <motion.path key={`dash-line-${iteration}`} d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" initial={reduced ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: "easeOut" }} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tracked prompts page                                                       */
/* -------------------------------------------------------------------------- */

function CheckCell({ val }: { val: boolean }) {
  return (
    <span className="w-[46px] flex justify-center shrink-0">
      <span className={"h-5 w-5 rounded-full flex items-center justify-center " + (val ? "bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)]" : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]")}>
        {val ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
    </span>
  );
}

function TrackedPromptsPage({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  return (
    <div className="h-full flex flex-col">
      {/* Display heading */}
      <div className="mb-3 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">Tracked Prompts</p>
        <h3 className="text-xl font-light text-[var(--color-fg)] leading-snug" style={{ fontFamily: "var(--font-display)" }}>
          Your prompt coverage is{" "}
          <em className="not-italic font-normal text-[var(--color-primary)]">improving.</em>
        </h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
        {[
          { label: "Prompts Tracked", value: "6",    color: "" },
          { label: "Cited",           value: "5/6",  color: "text-[var(--color-primary-hover)]" },
          { label: "Coverage",        value: "75%",  color: "text-[var(--color-primary-hover)]" },
          { label: "Not Cited",       value: "1",    color: "text-[var(--color-danger)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <p className="text-[10px] text-[var(--color-fg-muted)] mb-0.5">{s.label}</p>
            <p className={"text-lg font-light leading-none " + (s.color || "text-[var(--color-fg)]")} style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--color-border)] shrink-0">
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">Prompt</span>
        {["GPT", "Claude", "Gemini", "AI"].map((h) => (
          <span key={h} className="w-[46px] text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] shrink-0">{h}</span>
        ))}
        <span className="w-[46px] text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] shrink-0">Score</span>
      </div>
      <div className="flex-1 divide-y divide-[var(--color-border)] overflow-hidden">
        {TRACKED_PROMPTS.map((p, i) => (
          <motion.div key={`${iteration}-${p.text}`} initial={reduced ? { opacity: 1 } : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 + i * 0.09 }} className="flex items-center gap-1 px-2 py-2">
            <span className="flex-1 text-[12px] text-[var(--color-fg)] truncate min-w-0">{p.text}</span>
            <CheckCell val={p.chatgpt} /><CheckCell val={p.claude} /><CheckCell val={p.gemini} /><CheckCell val={p.googleai} />
            <span className={"w-[46px] text-right text-[11px] font-semibold shrink-0 " + (p.score === 0 ? "text-[var(--color-danger)]" : p.score === 100 ? "text-[var(--color-primary-hover)]" : "text-[var(--color-fg)]")}>{p.score}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Prompt research page                                                       */
/* -------------------------------------------------------------------------- */

function PromptResearchPage({ iteration, reduced, trackClicked }: { iteration: number; reduced: boolean; trackClicked: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">Prompt Research</p>
        <h3 className="text-xl font-light text-[var(--color-fg)] leading-snug" style={{ fontFamily: "var(--font-display)" }}>
          Your prompt landscape is{" "}
          <em className="not-italic font-normal" style={{ color: "var(--color-warning)" }}>developing.</em>
        </h3>
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">Suggested prompts to add to tracking</p>
      </div>
      <div className="space-y-2 flex-1 overflow-hidden">
        {RESEARCH_PROMPTS.map((p, i) => {
          const isTarget = i === 1;
          const clicked = isTarget && trackClicked;
          return (
            <motion.div key={`${iteration}-${p.text}`} initial={reduced ? { opacity: 1 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 + i * 0.1 }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="flex-1 text-[12px] text-[var(--color-fg)] truncate min-w-0">{p.text}</span>
              <span className="text-[10px] font-medium text-[var(--color-fg-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">{p.intent}</span>
              <motion.button type="button" tabIndex={-1} style={{ pointerEvents: "none" }} animate={clicked ? { scale: [1, 0.92, 1] } : {}} transition={{ duration: 0.25 }} className={"flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md shrink-0 transition-colors duration-200 " + (clicked ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-fg-muted)]")}>
                {clicked ? <><Check className="h-3 w-3" strokeWidth={3} />Tracked</> : <><Plus className="h-3 w-3" />Track</>}
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Competitor comparison page                                                 */
/* -------------------------------------------------------------------------- */

function CompetitorComparisonPage({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] mb-1">Competitor Comparison</p>
        <h3 className="text-xl font-light text-[var(--color-fg)] leading-snug" style={{ fontFamily: "var(--font-display)" }}>
          You&apos;re trailing in{" "}
          <em className="not-italic font-normal text-[var(--color-danger)]">2 engines.</em>
        </h3>
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">vs {COMPETITOR.theirName}</p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
        <motion.div initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center">
          <p className="text-[10px] text-[var(--color-fg-muted)] mb-1">Your Score</p>
          <p className="text-3xl font-light text-[var(--color-fg)] leading-none" style={{ fontFamily: "var(--font-display)" }}>{COMPETITOR.myScore}</p>
        </motion.div>
        <motion.div initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-center">
          <p className="text-[10px] text-[var(--color-fg-muted)] mb-1">Their Score</p>
          <p className="text-3xl font-light text-[var(--color-danger)] leading-none" style={{ fontFamily: "var(--font-display)" }}>{COMPETITOR.theirScore}</p>
        </motion.div>
      </div>

      {/* Per-engine bars */}
      <div className="space-y-3 flex-1 overflow-hidden">
        {COMPETITOR.engines.map((eng, i) => {
          const myWins = eng.myShare >= eng.theirShare;
          return (
            <motion.div key={eng.name} initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 + i * 0.1 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-[var(--color-fg)]">{eng.name}</span>
                <span className={"text-[10px] font-semibold px-1.5 py-0.5 rounded-full " + (myWins ? "bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)]" : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]")}>{myWins ? "You lead" : "Behind"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-[var(--color-fg-muted)]">Joe&apos;s</span>
                    <span className={"font-semibold " + (myWins ? "text-[var(--color-primary-hover)]" : "text-[var(--color-fg-muted)]")}>{eng.myShare}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <motion.div key={`${iteration}-joe-${eng.name}`} initial={reduced ? { width: `${eng.myShare}%` } : { width: 0 }} animate={{ width: `${eng.myShare}%` }} transition={{ duration: 0.9, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] }} className={"h-full rounded-full " + (myWins ? "bg-[var(--color-primary)]" : "bg-[var(--color-fg-muted)]")} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-[var(--color-fg-muted)]">Tony&apos;s</span>
                    <span className={"font-semibold " + (!myWins ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]")}>{eng.theirShare}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <motion.div key={`${iteration}-tony-${eng.name}`} initial={reduced ? { width: `${eng.theirShare}%` } : { width: 0 }} animate={{ width: `${eng.theirShare}%` }} transition={{ duration: 0.9, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] }} className={"h-full rounded-full " + (!myWins ? "bg-[var(--color-danger)]" : "bg-[var(--color-fg-muted)]")} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trend chart (unused in new dashboard but kept for potential future use)    */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TrendChart({ iteration, reduced }: { iteration: number; reduced: boolean }) {
  const W = 380, H = 110;
  const linePath = buildChartPath(CHART_POINTS, W, H);
  const areaPath = buildChartArea(CHART_POINTS, W, H);
  const lastY = H - ((CHART_POINTS[CHART_POINTS.length - 1] - Math.min(...CHART_POINTS)) / (Math.max(...CHART_POINTS) - Math.min(...CHART_POINTS))) * (H - 6) - 3;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[110px]" aria-hidden>
        <defs><linearGradient id="surven-trend-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" /></linearGradient></defs>
        <motion.path key={`area-${iteration}`} d={areaPath} fill="url(#surven-trend-gradient)" initial={reduced ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.6 }} />
        <motion.path key={`line-${iteration}`} d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={reduced ? { pathLength: 1 } : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: "easeOut" }} />
        <motion.circle key={`dot-${iteration}`} cx={W} cy={lastY} r="3.5" fill="var(--color-primary)" stroke="var(--color-bg)" strokeWidth="2" initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 1.7 }} />
      </svg>
    </div>
  );
}
