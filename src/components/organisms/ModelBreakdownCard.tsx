"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/atoms/Badge";
import { Card } from "@/components/atoms/Card";
import { BrandChip, AI_BRAND_DEFS, getBrandDef } from "@/components/atoms/BrandChip";
import type { ModelName } from "@/types/database";
import { cn } from "@/utils/cn";

interface ModelBreakdownCardProps {
  model: ModelName;
  mentioned: number;
  total: number;
  index?: number;
}

export function ModelBreakdownCard({
  model,
  mentioned,
  total,
  index = 0,
}: ModelBreakdownCardProps) {
  const config = getBrandDef(model, AI_BRAND_DEFS);
  const pct = total > 0 ? (mentioned / total) * 100 : 0;
  const isMentioned = mentioned > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card
        hover
        className="flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <BrandChip brand={config} />
          <Badge variant={isMentioned ? "success" : "neutral"}>
            {isMentioned ? "Mentioned" : "Not Found"}
          </Badge>
        </div>

        {/* Count */}
        <div>
          <span className="text-2xl font-bold tabular-nums">
            {mentioned}
          </span>
          <span className="text-[var(--color-fg-muted)] text-sm">
            /{total} prompts
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
            className={cn("h-full rounded-full")}
            style={{ backgroundColor: config.color }}
          />
        </div>
      </Card>
    </motion.div>
  );
}
