"use client";

/**
 * Compact gauge card for the dashboard trio (gauge / trend / what's next).
 * Slimmed from the prior full-width hero — the page-level hero now owns
 * the "Your AI visibility is *strong*" sentence + business name + last
 * scan timestamp. This card just renders the visibility gauge with a
 * scanning pulse ring and the Run scan CTA.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Radar } from "lucide-react";
import { VisibilityScoreGauge } from "@/components/atoms/VisibilityScoreGauge";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/atoms/Skeleton";
import { SectionHeading } from "@/components/atoms/SectionHeading";

interface GaugeSectionProps {
  score: number;
  hasScan: boolean;
  scanning: boolean;
  isLoading: boolean;
  onRunScan: () => void;
}

export function GaugeSection({
  score,
  hasScan,
  scanning,
  isLoading,
  onRunScan,
}: GaugeSectionProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col h-full"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="mb-3 pb-2 border-b border-[var(--color-border)]">
        <SectionHeading
          text="AI visibility"
          info="Share of AI answers that name your business. 50%+ strong, 25–50% moderate, under 25% thin."
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <Skeleton className="w-[200px] h-[120px] rounded-md" />
          <Skeleton className="h-9 w-32" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-between flex-1 gap-3">
          <div className="relative">
            <AnimatePresence>
              {scanning && (
                <motion.div
                  key="scan-ring"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: [0.6, 0.2, 0.6], scale: [0.92, 1.08, 0.92] }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgb(150 162 131 / 0.3) 30%, transparent 70%)",
                    filter: "blur(12px)",
                  }}
                />
              )}
            </AnimatePresence>
            <VisibilityScoreGauge score={hasScan ? score : null} width={220} />
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button onClick={onRunScan} loading={scanning} size="md">
              <Radar className="h-4 w-4" />
              {scanning ? "Scanning…" : hasScan ? "Run new scan" : "Run first scan"}
            </Button>
            <AnimatePresence>
              {scanning && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs text-[var(--color-fg-secondary)] overflow-hidden text-center"
                >
                  Querying ChatGPT, Claude, Gemini &amp; Google AI
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {" "}…
                  </motion.span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
