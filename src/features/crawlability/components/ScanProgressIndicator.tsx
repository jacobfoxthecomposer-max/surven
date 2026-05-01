"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Search, GitBranch, Link2, FileSearch } from "lucide-react";

const STAGES = [
  { icon: Globe, text: "Crawling your site..." },
  { icon: Search, text: "Checking robots.txt and sitemap..." },
  { icon: FileSearch, text: "Analyzing meta tags and schema markup..." },
  { icon: GitBranch, text: "Detecting redirect chains..." },
  { icon: Link2, text: "Cross-referencing internal links..." },
];

export function ScanProgressIndicator() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % STAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const stage = STAGES[stageIdx];
  const Icon = stage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8"
    >
      <div className="flex flex-col items-center text-center gap-4">
        {/* Pulsing icon ring */}
        <div className="relative h-16 w-16 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
            className="absolute inset-2 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <div className="relative h-12 w-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={stageIdx}
                initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Icon className="h-6 w-6 text-white" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Rotating tip text */}
        <div className="space-y-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={stageIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm font-medium text-[var(--color-fg)]"
            >
              {stage.text}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-[var(--color-fg-muted)]">
            This usually takes 20–30 seconds
          </p>
        </div>

        {/* Animated progress bar */}
        <div className="w-full max-w-xs h-1 rounded-full overflow-hidden bg-[var(--color-bg)]/50 border border-[var(--color-border)] mt-2">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/3 rounded-full bg-[var(--color-primary)]"
          />
        </div>
      </div>
    </motion.div>
  );
}
