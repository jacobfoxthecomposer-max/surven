"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Card } from "@/components/atoms/Card";
import { AuditFindings } from "@/components/organisms/AuditFindings";
import type { AuditResult } from "@/types/audit";

interface AuditPageProps {
  businessId: string;
  businessName: string;
}

export function AuditPage({ businessId, businessName }: AuditPageProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setScanning(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/audit/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, siteUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Scan failed. Please try again.");
        return;
      }

      setResult(data as AuditResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  const criticalCount = result?.findings.filter((f) => f.severity === "critical").length ?? 0;
  const highCount = result?.findings.filter((f) => f.severity === "high").length ?? 0;
  const totalIssues = result?.findings.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">Website Audit</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          Scan {businessName}&apos;s website to find what&apos;s hurting your AI visibility.
        </p>
      </div>

      {/* URL input */}
      <Card>
        <form onSubmit={handleScan} className="space-y-4">
          <Input
            label="Website URL"
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={scanning}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={scanning} disabled={scanning}>
              <Search className="h-4 w-4" />
              {scanning ? "Scanning…" : "Run Audit"}
            </Button>
            {scanning && (
              <p className="text-xs text-[var(--color-fg-muted)]">
                Crawling your site — this may take up to 30 seconds.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-[#B54631]">{error}</p>}
        </form>
      </Card>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* Summary header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-fg)]">
                {totalIssues === 0
                  ? "No issues found"
                  : `${totalIssues} issue${totalIssues !== 1 ? "s" : ""} found`}
              </h2>
              <p className="text-sm text-[var(--color-fg-muted)]">
                {result.siteUrl}
                {criticalCount > 0 && (
                  <span className="text-[#B54631] font-semibold ml-2">
                    {criticalCount} critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="text-[#C97B45] font-semibold ml-2">
                    {highCount} high
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={result.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View site
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setSiteUrl(result.siteUrl);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-scan
              </Button>
            </div>
          </div>

          {/* Findings + preview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Findings */}
            <Card className="xl:order-1">
              <h3 className="text-sm font-semibold text-[var(--color-fg)] mb-4">
                Findings
              </h3>
              <AuditFindings
                findings={result.findings}
                pagesCrawled={result.crawlStats.pagesCrawled}
                pagesCapped={result.crawlStats.pagesCapped}
              />
            </Card>

            {/* Website preview */}
            <div className="xl:order-2 space-y-2">
              <p className="text-xs text-[var(--color-fg-muted)]">
                Site preview (may not load if site blocks embedding)
              </p>
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden bg-white h-[500px]">
                <iframe
                  src={result.siteUrl}
                  title="Website preview"
                  className="w-full h-full"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Cache notice */}
          <p className="text-xs text-[var(--color-fg-muted)] text-center">
            Results cached for 24 hours. Use Re-scan to force a fresh audit.
          </p>
        </motion.div>
      )}
    </div>
  );
}
