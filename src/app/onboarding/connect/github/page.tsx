"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Code2, ExternalLink, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";

export default function GithubConnectPage() {
  const router = useRouter();
  const { activeBusiness, businesses, setActiveBusinessId } = useActiveBusiness();
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) {
      setError("No active business. Create one first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "github",
          businessId: activeBusiness.id,
          token: token.trim(),
          repo: repo.trim(),
          branch: branch.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Connection failed");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard?connected=github"), 1200);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-16 px-4">
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => router.push("/onboarding/connect")}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to picker
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <Github className="h-6 w-6 text-[var(--color-fg)]" />
            </div>
            <h1
              className="text-[var(--color-fg)]"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 500 }}
            >
              Connect GitHub
            </h1>
          </div>
          <p className="text-[var(--color-fg-secondary)] text-sm">
            Surven opens pull requests with proposed fixes. You review and merge — nothing ships without your approval.
          </p>
        </motion.div>

        {activeBusiness && (
          <div className="mb-6 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between">
            <div className="text-sm">
              <span className="text-[var(--color-fg-secondary)]">Connecting for </span>
              <strong className="text-[var(--color-fg)]">{activeBusiness.name}</strong>
            </div>
            {businesses.length > 1 && (
              <select
                value={activeBusiness.id}
                onChange={(e) => setActiveBusinessId(e.target.value)}
                className="text-xs bg-transparent text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] cursor-pointer focus:outline-none"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    Switch to {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-fg)] mb-1.5">
              Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_... or github_pat_..."
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] font-mono text-sm"
            />
            <a
              href="https://github.com/settings/tokens?type=beta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] mt-1.5 hover:underline"
            >
              Generate a fine-grained token <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-xs text-[var(--color-fg-secondary)] mt-2">
              Required permissions on your repo: <strong>Contents: Read & Write</strong>, <strong>Pull requests: Read & Write</strong>, <strong>Metadata: Read</strong>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-fg)] mb-1.5">
              Repository
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo-name"
              required
              pattern="[\w.-]+/[\w.-]+"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] font-mono text-sm"
            />
            <p className="text-xs text-[var(--color-fg-secondary)] mt-1.5">
              The repo that hosts your website source. Example: <code className="font-mono">acme/marketing-site</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-fg)] mb-1.5">
              Branch <span className="text-[var(--color-fg-secondary)] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="auto-detect default"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] font-mono text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-sm text-[var(--color-fg)] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
              Connected. Redirecting…
            </div>
          )}

          <Button type="submit" loading={submitting} disabled={success || !activeBusiness} fullWidth>
            {success ? "Connected" : "Connect GitHub"}
          </Button>
        </form>
      </div>
    </div>
  );
}
