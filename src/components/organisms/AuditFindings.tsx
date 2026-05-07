"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, HelpCircle, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import type { AuditFinding, AuditSeverity } from "@/types/audit";

interface AuditFindingsProps {
  findings: AuditFinding[];
  pagesCrawled: number;
  pagesCapped: boolean;
}

const SEVERITY_CONFIG: Record<
  AuditSeverity,
  { label: string; icon: typeof AlertTriangle; rowBg: string; badgeBg: string; iconColor: string }
> = {
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    rowBg: "bg-[#B54631]/8",
    badgeBg: "bg-[#B54631]/15 text-[#B54631]",
    iconColor: "text-[#B54631]",
  },
  high: {
    label: "High",
    icon: AlertCircle,
    rowBg: "bg-[#C97B45]/8",
    badgeBg: "bg-[#C97B45]/15 text-[#C97B45]",
    iconColor: "text-[#C97B45]",
  },
  medium: {
    label: "Medium",
    icon: HelpCircle,
    rowBg: "bg-[#6BA3F5]/8",
    badgeBg: "bg-[#6BA3F5]/15 text-[#5B8FD8]",
    iconColor: "text-[#6BA3F5]",
  },
  low: {
    label: "Low",
    icon: HelpCircle,
    rowBg: "bg-[#96A283]/8",
    badgeBg: "bg-[#96A283]/15 text-[#566A47]",
    iconColor: "text-[#96A283]",
  },
};

export function AuditFindings({ findings, pagesCrawled, pagesCapped }: AuditFindingsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-fg-muted)]">
        <span>
          Crawled {pagesCrawled} page{pagesCrawled !== 1 ? "s" : ""}
          {pagesCapped && " (capped at 100)"}
        </span>
        <span className="ml-auto flex gap-3">
          {critical > 0 && (
            <span className="font-semibold text-[#B54631]">{critical} Critical</span>
          )}
          {high > 0 && (
            <span className="font-semibold text-[#C97B45]">{high} High</span>
          )}
          {medium > 0 && (
            <span className="font-semibold text-[#6BA3F5]">{medium} Medium</span>
          )}
          {findings.length === 0 && (
            <span className="font-semibold text-[#96A283]">No issues found</span>
          )}
        </span>
      </div>

      {findings.length === 0 && (
        <div className="py-10 text-center text-sm text-[var(--color-fg-muted)]">
          Great — no major AI visibility issues detected.
        </div>
      )}

      <div className="space-y-2">
        {findings.map((finding, i) => {
          const cfg = SEVERITY_CONFIG[finding.severity];
          const Icon = cfg.icon;
          const isExpanded = expandedId === finding.id;

          return (
            <motion.div
              key={finding.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={cn(
                "rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden",
                cfg.rowBg
              )}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors cursor-pointer"
              >
                <Icon className={cn("h-4 w-4 shrink-0", cfg.iconColor)} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-fg)] leading-tight">
                    {finding.title}
                  </p>
                  {finding.affectedPages > 0 && (
                    <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                      {finding.affectedPages} page{finding.affectedPages !== 1 ? "s" : ""} affected
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      cfg.badgeBg
                    )}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[11px] text-[var(--color-fg-muted)] hidden sm:inline">
                    ~{finding.estimatedFixTime}m fix
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] space-y-4">
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mb-1">
                          Why it matters
                        </p>
                        <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                          {finding.whyItMatters}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mb-1">
                          How to fix
                        </p>
                        <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed whitespace-pre-line">
                          {finding.howToFix}
                        </p>
                      </div>

                      <div className="flex gap-6 text-xs pt-1">
                        <div>
                          <p className="text-[var(--color-fg-muted)]">AI Impact</p>
                          <p className="font-semibold text-[var(--color-fg)]">
                            {finding.estimatedImpact}/10
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--color-fg-muted)]">Time to fix</p>
                          <p className="font-semibold text-[var(--color-fg)]">
                            ~{finding.estimatedFixTime} min
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
