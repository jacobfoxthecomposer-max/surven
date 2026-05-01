"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  GitBranch,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import type { CrawlabilityFinding } from "@/types/crawlability";

interface ApplyFixModalProps {
  open: boolean;
  finding: CrawlabilityFinding | null;
  repo: string;
  branch: string;
  onClose: () => void;
  onConfirm: (finding: CrawlabilityFinding) => Promise<{
    ok: boolean;
    error?: string;
    committedSha?: string;
    commitUrl?: string;
    filePath?: string;
  }>;
}

export function ApplyFixModal({
  open,
  finding,
  repo,
  branch,
  onClose,
  onConfirm,
}: ApplyFixModalProps) {
  return (
    <AnimatePresence>
      {open && finding && (
        <ApplyFixModalInner
          key={finding.id}
          finding={finding}
          repo={repo}
          branch={branch}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      )}
    </AnimatePresence>
  );
}

interface InnerProps {
  finding: CrawlabilityFinding;
  repo: string;
  branch: string;
  onClose: () => void;
  onConfirm: (finding: CrawlabilityFinding) => Promise<{
    ok: boolean;
    error?: string;
    committedSha?: string;
    commitUrl?: string;
    filePath?: string;
  }>;
}

function ApplyFixModalInner({
  finding,
  repo,
  branch,
  onClose,
  onConfirm,
}: InnerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    commitUrl?: string;
    filePath?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const result = await onConfirm(finding);
    setSubmitting(false);
    if (result.ok) {
      setSuccess({ commitUrl: result.commitUrl, filePath: result.filePath });
    } else {
      setError(result.error ?? "Could not apply fix");
    }
  }

  const targetFile =
    finding.fixType === "robots"
      ? "robots.txt"
      : finding.fixType === "sitemap"
      ? "sitemap.xml"
      : "(unknown)";

  return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--color-border)]">
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: success
                    ? "rgba(150,162,131,0.15)"
                    : "rgba(150,162,131,0.10)",
                }}
              >
                {success ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                ) : (
                  <FileCode2 className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-[var(--color-fg)]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {success ? "Fix Applied" : "Apply Fix to Your Site"}
                </h3>
                <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
                  {success ? "Your repo has been updated" : finding.title}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {success ? (
                <>
                  <div
                    className="rounded-md p-3 border-l-2"
                    style={{
                      borderLeftColor: "var(--color-primary)",
                      backgroundColor: "rgba(150,162,131,0.08)",
                    }}
                  >
                    <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--color-fg)]">{repo}</span> updated
                      successfully. Vercel/Netlify will auto-deploy in the next minute or two.
                    </p>
                  </div>

                  <DetailRow label="Repository" value={repo} />
                  <DetailRow label="Branch" value={branch} />
                  {success.filePath && (
                    <DetailRow label="File updated" value={success.filePath} mono />
                  )}

                  {success.commitUrl && (
                    <a
                      href={success.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View commit on GitHub
                    </a>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed">
                      Surven will commit the following file to your connected repo. Vercel/Netlify
                      will then auto-deploy the change.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <DetailRow
                      label="Repository"
                      value={
                        <span className="inline-flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5" />
                          {repo}
                        </span>
                      }
                    />
                    <DetailRow label="Branch" value={branch} />
                    <DetailRow label="File" value={targetFile} mono />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-[var(--color-fg-muted)] uppercase tracking-wide mb-1.5">
                      File contents
                    </p>
                    <pre
                      className="rounded-md p-3 overflow-x-auto text-xs leading-relaxed border border-[var(--color-border)] max-h-48"
                      style={{
                        backgroundColor: "var(--color-surface-alt)",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      }}
                    >
                      <code className="text-[var(--color-fg)]">{finding.fixCode}</code>
                    </pre>
                  </div>

                  {error && (
                    <div
                      className="text-sm rounded-md p-3 border-l-4 flex items-start gap-2"
                      style={{
                        color: "#B54631",
                        borderLeftColor: "#B54631",
                        backgroundColor: "rgba(181,70,49,0.06)",
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              {success ? (
                <Button onClick={onClose}>Done</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirm} loading={submitting} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Committing…
                      </>
                    ) : (
                      <>Apply &amp; Commit</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[var(--color-fg-muted)] text-xs font-semibold uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span
        className="text-[var(--color-fg)] font-medium text-right truncate"
        style={
          mono
            ? {
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
              }
            : undefined
        }
      >
        {value}
      </span>
    </div>
  );
}
