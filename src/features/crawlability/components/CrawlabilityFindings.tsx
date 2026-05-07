"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Copy,
  Check,
  Lock,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { HoverHint } from "@/components/atoms/HoverHint";
import type { AuditSeverity } from "@/types/audit";
import type { CrawlabilityFinding } from "@/types/crawlability";

interface CrawlabilityFindingsProps {
  findings: CrawlabilityFinding[];
  pagesCrawled: number;
  pagesCapped: boolean;
  plan: "free" | "plus" | "premium" | "admin";
  hasGithubConnection?: boolean;
  onApplyFix?: (finding: CrawlabilityFinding) => void;
}

const AUTO_APPLIABLE_FIX_TYPES = new Set(["robots", "sitemap"]);

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

type FilterTab = "all" | "critical" | "high" | "medium" | "low";

export function CrawlabilityFindings({
  findings,
  pagesCrawled,
  pagesCapped,
  plan,
  hasGithubConnection = false,
  onApplyFix,
}: CrawlabilityFindingsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isPremium = plan === "premium" || plan === "admin";
  const isPlus = plan === "plus";

  const counts = useMemo(() => {
    const c = { all: findings.length, critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) c[f.severity]++;
    return c;
  }, [findings]);

  const filtered = useMemo(() => {
    if (filter === "all") return findings;
    return findings.filter((f) => f.severity === filter);
  }, [findings, filter]);

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const tabs: Array<{ key: FilterTab; label: string; count: number; color: string }> = [
    { key: "all", label: "All", count: counts.all, color: "var(--color-fg)" },
    { key: "critical", label: "Critical", count: counts.critical, color: "#B54631" },
    { key: "high", label: "High", count: counts.high, color: "#C97B45" },
    { key: "medium", label: "Medium", count: counts.medium, color: "#6BA3F5" },
    { key: "low", label: "Low", count: counts.low, color: "#96A283" },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            Findings
          </h3>
          <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
            Crawled {pagesCrawled} page{pagesCrawled !== 1 ? "s" : ""}
            {pagesCapped && " (capped at 100)"}
            {findings.length > 0 ? ` · ${findings.length} issue${findings.length !== 1 ? "s" : ""} found` : ""}
          </p>
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          if (tab.count === 0 && tab.key !== "all") return null;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] border text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-transparent text-[var(--color-fg-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-fg-secondary)]"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "tabular-nums px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                  active ? "bg-white/20 text-white" : ""
                )}
                style={
                  !active
                    ? { backgroundColor: `${tab.color}1A`, color: tab.color }
                    : undefined
                }
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-[var(--color-fg-muted)]">
          {findings.length === 0
            ? "Great — no major crawlability issues detected."
            : `No ${filter} issues found.`}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((finding, i) => {
          const cfg = SEVERITY_CONFIG[finding.severity];
          const Icon = cfg.icon;
          const isExpanded = expandedId === finding.id;
          const hasFixCode = !!finding.fixCode;
          const isAutoAppliable = !!finding.fixType && AUTO_APPLIABLE_FIX_TYPES.has(finding.fixType);
          const canApply = isPremium && hasGithubConnection && isAutoAppliable && !finding.isApplied;
          const showApplyLock = (isPlus || (isPremium && !hasGithubConnection)) && isAutoAppliable && !finding.isApplied;

          return (
            <motion.div
              key={finding.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
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
                  {finding.isApplied && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#96A283]/15 text-[#566A47]">
                      <CheckCircle2 className="h-3 w-3" />
                      Applied
                    </span>
                  )}
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
                          What is this?
                        </p>
                        <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                          {finding.whatIsIt}
                        </p>
                      </div>

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

                      {hasFixCode && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide">
                              {finding.fixLabel ?? "Copy this code:"}
                            </p>
                            <button
                              onClick={() => handleCopy(finding.id, finding.fixCode!)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--color-bg)] hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-fg-secondary)] transition-colors cursor-pointer"
                            >
                              {copiedId === finding.id ? (
                                <>
                                  <Check className="h-3 w-3 text-[#96A283]" />
                                  <span className="text-[#96A283]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <pre
                            className="rounded-[var(--radius-md)] p-3 overflow-x-auto text-xs leading-relaxed border border-[var(--color-border)]"
                            style={{
                              backgroundColor: "var(--color-surface-alt)",
                              fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            }}
                          >
                            <code className="text-[var(--color-fg)]">{finding.fixCode}</code>
                          </pre>
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-xs pt-1 flex-wrap">
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
                        <div className="ml-auto">
                          {finding.isApplied ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium text-[#566A47] bg-[#96A283]/15 border border-[#96A283]/30">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Fix Applied
                            </span>
                          ) : canApply ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onApplyFix?.(finding);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-sm transition-colors cursor-pointer"
                            >
                              <Wand2 className="h-3.5 w-3.5" />
                              Apply Fix
                            </button>
                          ) : showApplyLock ? (
                            <HoverHint
                              hint={
                                isPlus
                                  ? "Upgrade to Premium to apply this fix directly to your site."
                                  : "Connect GitHub in Settings → Integrations to enable Apply Fix."
                              }
                            >
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg)]/40"
                                style={{ cursor: "help" }}
                              >
                                <Lock className="h-3 w-3" />
                                Apply Fix
                              </span>
                            </HoverHint>
                          ) : null}
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
