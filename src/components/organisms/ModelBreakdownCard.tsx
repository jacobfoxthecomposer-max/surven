"use client";

import { motion } from "framer-motion";
import { MessageSquare, Brain, Search } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";
import { Card } from "@/components/atoms/Card";
import type { ModelName } from "@/types/database";
import { cn } from "@/utils/cn";

const modelConfig: Record<
  ModelName,
  { icon: typeof MessageSquare; label: string; color: string }
> = {
  chatgpt: { icon: MessageSquare, label: "ChatGPT", color: "#10a37f" },
  claude: { icon: Brain, label: "Claude", color: "#d97706" },
  perplexity: { icon: Search, label: "Perplexity", color: "#22d3ee" },
};

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
  const config = modelConfig[model];
  const Icon = config.icon;
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
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: config.color }} />
            </div>
            <span className="font-semibold text-sm">{config.label}</span>
          </div>
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
