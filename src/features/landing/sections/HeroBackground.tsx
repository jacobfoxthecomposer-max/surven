"use client";

import { motion } from "framer-motion";

// Fixed parallax background — renders behind the hero, stays put as sections scroll over it.
// Sections below the hero must have an opaque background to cover this layer on scroll.
export function HeroBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(67 97 238 / 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(67 97 238 / 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 20%, transparent 100%)",
        }}
      />

      {/* Central pulsing glow */}
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(circle, rgb(67 97 238 / 0.13) 0%, transparent 65%)" }}
      />

      {/* Blue orb — top-left */}
      <motion.div
        animate={{ y: [0, -28, 0], x: [0, 14, 0], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[12%] left-[8%] w-80 h-80 rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(67 97 238 / 0.2) 0%, transparent 70%)",
          filter: "blur(45px)",
        }}
      />

      {/* Teal orb — bottom-right */}
      <motion.div
        animate={{ y: [0, 22, 0], x: [0, -18, 0], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[10%] right-[6%] w-72 h-72 rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(6 214 160 / 0.18) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Blue orb — top-right */}
      <motion.div
        animate={{ y: [0, 18, 0], x: [0, -12, 0], opacity: [0.18, 0.4, 0.18] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute top-[18%] right-[12%] w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(67 97 238 / 0.14) 0%, transparent 70%)",
          filter: "blur(55px)",
        }}
      />

      {/* Teal orb — left-center */}
      <motion.div
        animate={{ y: [0, -16, 0], opacity: [0.12, 0.3, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-[55%] left-[3%] w-56 h-56 rounded-full"
        style={{
          background: "radial-gradient(circle, rgb(6 214 160 / 0.14) 0%, transparent 70%)",
          filter: "blur(45px)",
        }}
      />

      {/* Floating particles */}
      {[
        { top: "22%", left: "18%", delay: 0, dur: 5.5 },
        { top: "38%", left: "75%", delay: 1.2, dur: 7 },
        { top: "65%", left: "30%", delay: 0.6, dur: 6.2 },
        { top: "14%", left: "55%", delay: 2, dur: 8 },
        { top: "50%", left: "88%", delay: 0.3, dur: 5 },
        { top: "78%", left: "62%", delay: 1.8, dur: 6.8 },
        { top: "30%", left: "42%", delay: 3, dur: 9 },
        { top: "70%", left: "15%", delay: 0.9, dur: 7.5 },
      ].map((p, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0, 0.6, 0], y: [0, -12, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          className="absolute w-1 h-1 rounded-full bg-[#4361ee]"
          style={{ top: p.top, left: p.left, boxShadow: "0 0 6px 1px rgb(67 97 238 / 0.5)" }}
        />
      ))}
    </div>
  );
}
