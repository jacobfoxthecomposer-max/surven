"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Radar } from "lucide-react";
import { VisibilityGauge } from "@/components/organisms/VisibilityGauge";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Skeleton } from "@/components/atoms/Skeleton";

interface GaugeSectionProps {
  businessName: string;
  industry: string;
  score: number;
  lastScanDate: string | null;
  scanning: boolean;
  isLoading: boolean;
  onRunScan: () => void;
}

export function GaugeSection({
  businessName,
  industry,
  score,
  lastScanDate,
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
                background: "radial-gradient(circle, rgb(67 97 238 / 0.2) 30%, transparent 70%)",
                filter: "blur(12px)",
              }}
            />
          )}
        </AnimatePresence>
        <VisibilityGauge score={score} />
      </div>

      <div className="flex-1 text-center sm:text-left space-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{businessName}</h1>
          <Badge variant="info" className="mt-1.5">{industry}</Badge>
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
              Querying ChatGPT, Claude &amp; Perplexity
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
