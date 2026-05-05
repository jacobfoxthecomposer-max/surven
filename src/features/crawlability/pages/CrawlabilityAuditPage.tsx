"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Lock,
  AlertTriangle,
  AlertCircle,
  Info,
  Crown,
  ArrowRight,
  Link2,
  GitBranch,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { AIOverview } from "@/components/atoms/AIOverview";
import { HoverHint } from "@/components/atoms/HoverHint";
import { useCrawlabilityAudit } from "@/features/crawlability/hooks/useCrawlabilityAudit";
import { useSiteConnections } from "@/features/crawlability/hooks/useSiteConnections";
import { useIsFirstTimeUser } from "@/features/auth/hooks/useIsFirstTimeUser";
import { CrawlabilityScoreGauge } from "@/features/crawlability/components/CrawlabilityScoreGauge";
import { StatusCodeDonut } from "@/features/crawlability/components/StatusCodeDonut";
import { CategoryScoresBars } from "@/features/crawlability/components/CategoryScoresBars";
import { ScanProgressIndicator } from "@/features/crawlability/components/ScanProgressIndicator";
import { CrawlabilityFindings } from "@/features/crawlability/components/CrawlabilityFindings";
import { ApplyFixModal } from "@/features/crawlability/components/ApplyFixModal";
import type { CrawlabilityFinding } from "@/types/crawlability";

const ease = [0.16, 1, 0.3, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(4px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease },
} as const;

interface CrawlabilityAuditPageProps {
  businessId: string;
  businessName: string;
  plan: "free" | "plus" | "premium" | "admin";
}

export function CrawlabilityAuditPage({
  businessId,
  businessName,
  plan,
}: CrawlabilityAuditPageProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const { scanning, result, error, runScan, reset, markFindingApplied } = useCrawlabilityAudit();
  const { isFirstTime } = useIsFirstTimeUser();

  const isFree = plan === "free";
  const isPremium = plan === "premium" || plan === "admin";

  const { connections } = useSiteConnections(isPremium ? businessId : undefined);
  const activeConnection = connections.find((c) => c.status === "active");
  const githubConnection = connections.find(
    (c) => c.platform === "github" && c.status === "active"
  );

  // Apply Fix modal state
  const [applyFixFinding, setApplyFixFinding] = useState<CrawlabilityFinding | null>(null);

  async function handleApplyFix(finding: CrawlabilityFinding): Promise<{
    ok: boolean;
    error?: string;
    committedSha?: string;
    commitUrl?: string;
    filePath?: string;
  }> {
    if (!result) return { ok: false, error: "No scan loaded" };
    try {
      const res = await fetch("/api/crawlability/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          auditId: result.id,
          findingId: finding.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.message ?? data?.error ?? "Apply failed" };
      }
      markFindingApplied(finding.id);
      return {
        ok: true,
        committedSha: data.committedSha,
        commitUrl: data.commitUrl,
        filePath: data.filePath,
      };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!siteUrl.trim()) return;
    await runScan({ businessId, siteUrl });
  }

  async function handleRescan() {
    if (!result) return;
    await runScan({ businessId, siteUrl: result.siteUrl, force: true });
  }

  function handleNewScan() {
    reset();
    setSiteUrl("");
  }

  // Severity counts for KPI cards
  const counts = {
    critical: result?.findings.filter((f) => f.severity === "critical").length ?? 0,
    high: result?.findings.filter((f) => f.severity === "high").length ?? 0,
    medium: result?.findings.filter((f) => f.severity === "medium").length ?? 0,
    low: result?.findings.filter((f) => f.severity === "low").length ?? 0,
  };

  const aiOverviewText = !result
    ? "Scan your site to see exactly which crawlability issues are blocking AI models from indexing your content."
    : counts.critical > 0
    ? `${counts.critical} critical issue${counts.critical !== 1 ? "s" : ""} could be preventing AI models from indexing your content. Fix these first.`
    : result.findings.length === 0
    ? "Your site is well-configured for AI crawlability. Keep monitoring for content freshness and schema coverage."
    : "No critical crawlability blockers found. Focus on the warnings below to maximize AI indexability.";

  // Score-derived headline word
  const scoreWord = result
    ? result.crawlabilityScore < 26
      ? "Poor"
      : result.crawlabilityScore < 56
      ? "Fair"
      : result.crawlabilityScore < 81
      ? "Good"
      : "Excellent"
    : null;
  const scoreColor = result
    ? result.crawlabilityScore < 26
      ? "#B54631"
      : result.crawlabilityScore < 56
      ? "#C97B45"
      : result.crawlabilityScore < 81
      ? "#96A283"
      : "#7D8E6C"
    : null;

  return (
    <div className="space-y-5 w-full">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "var(--color-fg)",
          }}
        >
          {!result ? (
            <>
              Your site&apos;s crawlability is{" "}
              <span style={{ color: "var(--color-fg-muted)", fontStyle: "italic" }}>
                unknown
              </span>
              .
            </>
          ) : (
            <>
              Your site&apos;s crawlability is{" "}
              <span style={{ color: scoreColor!, fontStyle: "italic" }}>{scoreWord}</span>
              .
            </>
          )}
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1.5">
          How easily AI models and search engines can crawl, index, and extract data from {businessName}.
        </p>

        {/* Premium: connected site indicator */}
        {isPremium && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeConnection ? (
              <HoverHint
                hint={`Surven can apply fixes directly to your ${connectionLabel(activeConnection.platform)} ${connectionTarget(activeConnection)}.`}
              >
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] border text-xs font-medium"
                  style={{
                    cursor: "help",
                    backgroundColor: "rgba(150,162,131,0.10)",
                    borderColor: "rgba(150,162,131,0.4)",
                    color: "var(--color-primary-hover)",
                  }}
                >
                  <ConnectionIcon platform={activeConnection.platform} />
                  <CheckCircle2 className="h-3 w-3" style={{ color: "var(--color-primary)" }} />
                  {connectionLabel(activeConnection.platform)} connected
                  {connections.length > 1 && (
                    <span className="text-[var(--color-fg-muted)] font-normal">
                      +{connections.length - 1} more
                    </span>
                  )}
                </span>
              </HoverHint>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] border border-dashed border-[var(--color-border-hover)] text-xs font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
              >
                <Link2 className="h-3 w-3" />
                Connect a site to apply fixes directly
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </motion.div>

      {/* AIOverview callout */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease }}
      >
        <AIOverview text={aiOverviewText} />
      </motion.div>

      {/* ── Free upgrade prompt ── */}
      {isFree && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease }}
        >
          <Card>
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
              >
                <Lock className="h-7 w-7" style={{ color: "var(--color-primary)" }} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                  }}
                >
                  Crawlability Audit is a Plus feature
                </h2>
                <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                  Run a 100-page crawlability scan on any site. See exactly what&apos;s
                  blocking AI from indexing your pages — robots.txt, redirects, broken
                  links, schema coverage, and more.
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm shadow-md transition-colors"
              >
                <Crown className="h-4 w-4" />
                {isFirstTime ? "Try Free Trial" : "Upgrade to Plus"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-[var(--color-fg-muted)]">
                Includes Premium tier with direct site editing.
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Scan form (paid users) ── */}
      {!isFree && !result && !scanning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease }}
        >
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Website URL"
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={scanning}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="submit" loading={scanning} disabled={scanning || !siteUrl.trim()}>
                  <Search className="h-4 w-4" />
                  Run Crawlability Scan
                </Button>
                {!isPremium && (
                  <p className="text-xs text-[var(--color-fg-muted)] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
                    Premium plan unlocks direct site editing.
                  </p>
                )}
              </div>
              {error && (
                <div
                  className="text-sm rounded-[var(--radius-md)] p-3 border-l-4"
                  style={{
                    color: "#B54631",
                    borderLeftColor: "#B54631",
                    backgroundColor: "rgba(181,70,49,0.06)",
                  }}
                >
                  {error.message}
                  {error.code === "upgrade_required" && (
                    <Link
                      href="/pricing"
                      className="ml-2 underline font-semibold"
                    >
                      View plans →
                    </Link>
                  )}
                </div>
              )}
            </form>
          </Card>
        </motion.div>
      )}

      {/* ── Loading ── */}
      {scanning && <ScanProgressIndicator />}

      {/* ── Results ── */}
      {result && !scanning && (
        <>
          {/* Action bar */}
          <motion.div {...reveal} className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <a
                href={result.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {result.siteUrl}
              </a>
              {result.fromCache && (
                <span className="text-[11px] text-[var(--color-fg-muted)] px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                  Cached result
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleRescan} loading={scanning}>
                <RefreshCw className="h-3.5 w-3.5" />
                Re-scan
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNewScan}>
                Scan a different URL
              </Button>
            </div>
          </motion.div>

          {/* Score gauge + KPI cards */}
          <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-stretch">
            <CrawlabilityScoreGauge score={result.crawlabilityScore} width={280} />
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Critical"
                value={counts.critical}
                color="#B54631"
                icon={AlertTriangle}
                hint="Issues that actively block AI from indexing your content. Fix these first."
              />
              <KpiCard
                label="High"
                value={counts.high}
                color="#C97B45"
                icon={AlertCircle}
                hint="Significant problems that limit your AI visibility."
              />
              <KpiCard
                label="Medium"
                value={counts.medium}
                color="#6BA3F5"
                icon={Info}
                hint="Improvements that will meaningfully strengthen your AI presence."
              />
              <KpiCard
                label="Low"
                value={counts.low}
                color="#96A283"
                icon={Info}
                hint="Minor optimizations to consider once critical issues are resolved."
              />
            </div>
          </motion.div>

          {/* Status code donut + category bars */}
          <motion.div {...reveal} className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <StatusCodeDonut breakdown={result.statusBreakdown} />
            <CategoryScoresBars scores={result.categoryScores} />
          </motion.div>

          {/* Findings */}
          <motion.div {...reveal}>
            <CrawlabilityFindings
              findings={result.findings}
              pagesCrawled={result.crawlStats.pagesCrawled}
              pagesCapped={result.crawlStats.pagesCapped}
              plan={plan}
              hasGithubConnection={!!githubConnection}
              onApplyFix={(f) => setApplyFixFinding(f)}
            />
          </motion.div>

          {/* Cache notice */}
          <p className="text-xs text-[var(--color-fg-muted)] text-center">
            Crawlability results cached for 24 hours. Use Re-scan to force a fresh audit.
          </p>
        </>
      )}

      {/* Apply Fix Modal (Premium only) */}
      {githubConnection && (
        <ApplyFixModal
          open={!!applyFixFinding}
          finding={applyFixFinding}
          repo={githubConnection.repo ?? ""}
          branch={githubConnection.branch ?? "main"}
          onClose={() => setApplyFixFinding(null)}
          onConfirm={handleApplyFix}
        />
      )}
    </div>
  );
}

function connectionLabel(platform: string): string {
  return platform === "github"
    ? "GitHub"
    : platform === "vercel"
    ? "Vercel"
    : platform === "wordpress"
    ? "WordPress"
    : platform === "webflow"
    ? "Webflow"
    : platform;
}

function connectionTarget(connection: { platform: string; repo?: string; site_url?: string; site_id?: string }): string {
  if (connection.platform === "github" && connection.repo) return `repo (${connection.repo})`;
  if (connection.platform === "wordpress" && connection.site_url) return `site (${connection.site_url})`;
  if (connection.site_id) return `site (${connection.site_id})`;
  return "site";
}

function ConnectionIcon({ platform }: { platform: string }) {
  if (platform === "github") return <GitBranch className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
}

interface KpiCardProps {
  label: string;
  value: number;
  color: string;
  icon: typeof AlertTriangle;
  hint: string;
}

function KpiCard({ label, value, color, icon: Icon, hint }: KpiCardProps) {
  return (
    <HoverHint hint={hint} display="block" className="h-full">
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col h-full"
        style={{ cursor: "help" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}1A` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
            {label}
          </p>
        </div>
        <p
          className="mt-auto"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 38,
            fontWeight: 600,
            color,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </p>
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">
          {value === 0 ? "No issues" : `Issue${value !== 1 ? "s" : ""} found`}
        </p>
      </div>
    </HoverHint>
  );
}
