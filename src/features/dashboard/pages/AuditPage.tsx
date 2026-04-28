"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink, RefreshCw, Monitor, X, Loader2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Card } from "@/components/atoms/Card";
import { AuditFindings } from "@/components/organisms/AuditFindings";
import type { AuditResult } from "@/types/audit";

interface AuditPageProps {
  businessId: string;
  businessName: string;
}

type PreviewState = "idle" | "loading" | "active" | "error";

export function AuditPage({ businessId, businessName }: AuditPageProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [scanError, setScanError] = useState("");

  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewError, setPreviewError] = useState("");
  const [viewerUrl, setViewerUrl] = useState("");
  const sessionIdRef = useRef<string | null>(null);

  // Release Steel session on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        fetch("/api/audit/preview", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => {});
      }
    };
  }, []);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setScanning(true);
    setScanError("");
    setResult(null);
    closePreview();

    try {
      const res = await fetch("/api/audit/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Scan failed. Please try again.");
        return;
      }
      setResult(data as AuditResult);
    } catch {
      setScanError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  async function handleOpenPreview() {
    if (!result) return;
    setPreviewState("loading");
    setPreviewError("");

    try {
      const res = await fetch("/api/audit/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: result.siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewState("error");
        setPreviewError(data.error ?? "Failed to start preview.");
        return;
      }
      sessionIdRef.current = data.sessionId;
      setViewerUrl(data.viewerUrl);
      setPreviewState("active");
    } catch {
      setPreviewState("error");
      setPreviewError("Failed to start preview. Check your Steel API key.");
    }
  }

  function closePreview() {
    if (sessionIdRef.current) {
      fetch("/api/audit/preview", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {});
      sessionIdRef.current = null;
    }
    setViewerUrl("");
    setPreviewState("idle");
    setPreviewError("");
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
          {scanError && <p className="text-sm text-[#B54631]">{scanError}</p>}
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
                  closePreview();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-scan
              </Button>
            </div>
          </div>

          {/* Findings + live preview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
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

            {/* Live preview */}
            <div className="xl:order-2 space-y-2">
              {previewState === "idle" && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
                  <Monitor className="h-8 w-8 text-[var(--color-fg-muted)]" />
                  <p className="text-sm text-[var(--color-fg-secondary)] text-center">
                    Open a live, interactive preview of the website
                  </p>
                  <Button onClick={handleOpenPreview} variant="secondary">
                    <Monitor className="h-4 w-4" />
                    Open Live Preview
                  </Button>
                </div>
              )}

              {previewState === "loading" && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    Starting browser session…
                  </p>
                </div>
              )}

              {previewState === "error" && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
                  <p className="text-sm text-[#B54631] text-center">{previewError}</p>
                  <Button onClick={handleOpenPreview} variant="secondary" size="sm">
                    Try again
                  </Button>
                </div>
              )}

              {previewState === "active" && viewerUrl && (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-[var(--color-fg-muted)] truncate">
                      {result.siteUrl}
                    </p>
                    <button
                      onClick={closePreview}
                      className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors cursor-pointer shrink-0"
                      aria-label="Close preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden bg-white" style={{ height: "700px" }}>
                    <iframe
                      src={viewerUrl}
                      title="Live website preview"
                      className="w-full h-full"
                      allow="same-origin"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-fg-muted)] text-center">
                    Live browser session — fully interactive. Closes automatically after 5 minutes.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Cache notice */}
          <p className="text-xs text-[var(--color-fg-muted)] text-center">
            Audit results cached for 24 hours. Use Re-scan to force a fresh audit.
          </p>
        </motion.div>
      )}
    </div>
  );
}
