"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radar, Info } from "lucide-react";
import { VisibilityGauge } from "@/components/organisms/VisibilityGauge";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { HoverHint } from "@/components/atoms/HoverHint";
import { SURVEN_SEMANTIC } from "@/utils/brandColors";

interface GaugeSectionProps {
  businessName: string;
  industry: string;
  score: number;
  lastScanDate: string | null;
  scanType?: "manual" | "automated";
  scanning: boolean;
  isLoading: boolean;
  onRunScan: () => void;
}

function visibilityStatus(score: number, hasScan: boolean): {
  word: string;
  color: string;
} {
  if (!hasScan) {
    return { word: "not yet measured", color: SURVEN_SEMANTIC.neutral };
  }
  if (score >= 50) return { word: "strong", color: SURVEN_SEMANTIC.good };
  if (score >= 25) return { word: "moderate", color: SURVEN_SEMANTIC.mid };
  return { word: "thin", color: SURVEN_SEMANTIC.bad };
}

export function GaugeSection({
  businessName,
  industry,
  score,
  lastScanDate,
  scanType,
  scanning,
  isLoading,
  onRunScan,
}: GaugeSectionProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <Skeleton className="w-[220px] h-[220px] rounded-full" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  const { word, color } = visibilityStatus(score, !!lastScanDate);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      {/* Gauge with scanning pulse ring */}
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
                background: "radial-gradient(circle, rgb(150 162 131 / 0.3) 30%, transparent 70%)",
                filter: "blur(12px)",
              }}
            />
          )}
        </AnimatePresence>
        <VisibilityGauge score={score} />
      </div>

      <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.5vw, 44px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--color-fg)",
            }}
          >
            {businessName}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-1.5">
            <Badge variant="info">{industry}</Badge>
            {scanType === "automated" && <Badge variant="neutral">Auto</Badge>}
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-1.5">
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(18px, 2vw, 24px)",
              fontWeight: 500,
              lineHeight: 1.3,
              color: "var(--color-fg-secondary)",
            }}
          >
            Your AI visibility is{" "}
            <span style={{ color, fontStyle: "italic" }}>{word}</span>.
          </p>
          <HoverHint
            hint="Visibility score is the share of AI prompts (across ChatGPT, Claude, Gemini, Google AI) that mention your business. 50%+ is strong, 25–50% is moderate, under 25% is thin."
            placement="top"
          >
            <Info className="h-3.5 w-3.5 text-[var(--color-fg-muted)] cursor-help opacity-60" />
          </HoverHint>
        </div>

        {lastScanDate && (
          <p className="text-sm text-[var(--color-fg-muted)]">
            Last scan: {new Date(lastScanDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}

        <Button onClick={onRunScan} loading={scanning} size="lg">
          <Radar className="h-4 w-4" />
          {scanning ? "Scanning..." : "Run New Scan"}
        </Button>

        <AnimatePresence>
          {scanning && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-[var(--color-primary)] overflow-hidden"
            >
              Querying ChatGPT, Claude, Gemini &amp; Google AI
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {" "}...
              </motion.span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
