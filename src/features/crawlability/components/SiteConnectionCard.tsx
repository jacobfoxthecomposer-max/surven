"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Globe,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Loader2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { cn } from "@/utils/cn";
import type { Platform, SiteConnection, ConnectPayload } from "@/features/crawlability/hooks/useSiteConnections";

interface SiteConnectionCardProps {
  platform: Platform;
  businessId: string;
  connection?: SiteConnection;
  onConnect: (payload: ConnectPayload) => Promise<{ ok: boolean; error?: string }>;
  onDisconnect: (platform: Platform) => Promise<{ ok: boolean; error?: string }>;
}

const PLATFORM_META: Record<
  Platform,
  { label: string; description: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; tokenHelp: string; tokenLink?: { url: string; label: string } }
> = {
  github: {
    label: "GitHub",
    description: "Commit fixes directly to your repo. Vercel/Netlify auto-deploy.",
    icon: GitBranch,
    color: "#1A1C1A",
    tokenHelp: "Generate a Personal Access Token with the 'repo' scope.",
    tokenLink: {
      url: "https://github.com/settings/tokens/new?scopes=repo&description=Surven%20Optimizer",
      label: "Create GitHub token",
    },
  },
  vercel: {
    label: "Vercel",
    description: "Deploy fixes through Vercel's API.",
    icon: Globe,
    color: "#000000",
    tokenHelp: "Create an API token with read+write access to your project.",
    tokenLink: {
      url: "https://vercel.com/account/tokens",
      label: "Create Vercel token",
    },
  },
  wordpress: {
    label: "WordPress",
    description: "Update SEO and content via WP REST API.",
    icon: Globe,
    color: "#21759B",
    tokenHelp: "Use WP Admin → Users → Profile → Application Passwords. Don't use your login password.",
  },
  webflow: {
    label: "Webflow",
    description: "Update page SEO and CMS items.",
    icon: Globe,
    color: "#4353FF",
    tokenHelp: "Create a site token with 'sites:write' and 'pages:write' scopes.",
    tokenLink: {
      url: "https://webflow.com/dashboard/account/integrations",
      label: "Create Webflow token",
    },
  },
};

export function SiteConnectionCard({
  platform,
  businessId,
  connection,
  onConnect,
  onDisconnect,
}: SiteConnectionCardProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [projectId, setProjectId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [siteId, setSiteId] = useState("");

  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  const isConnected = connection?.status === "active";
  const isError = connection?.status === "error";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let payload: ConnectPayload;
    if (platform === "github") {
      payload = { platform, businessId, token, repo, branch };
    } else if (platform === "vercel") {
      payload = { platform, businessId, token, projectId };
    } else if (platform === "wordpress") {
      payload = {
        platform,
        businessId,
        siteUrl,
        username,
        applicationPassword: appPassword,
      };
    } else {
      payload = { platform, businessId, token, siteId };
    }

    const result = await onConnect(payload);
    if (!result.ok) {
      setError(result.error ?? "Connection failed");
    } else {
      setOpen(false);
      // Clear form
      setToken("");
      setRepo("");
      setBranch("main");
      setProjectId("");
      setSiteUrl("");
      setUsername("");
      setAppPassword("");
      setSiteId("");
    }
    setSubmitting(false);
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${meta.label}? You can reconnect at any time.`)) return;
    setSubmitting(true);
    await onDisconnect(platform);
    setSubmitting(false);
  }

  const connectedSummary = (() => {
    if (!connection) return "";
    if (platform === "github") return connection.repo ?? "";
    if (platform === "vercel") return connection.site_id ? `Project ${connection.site_id}` : "";
    if (platform === "wordpress") return connection.site_url ?? "";
    if (platform === "webflow") return connection.site_id ? `Site ${connection.site_id}` : "";
    return "";
  })();

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden transition-colors",
        isConnected
          ? "border-[var(--color-primary)]/40"
          : isError
          ? "border-[#B54631]/40"
          : "border-[var(--color-border)]"
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-black/5 transition-colors cursor-pointer"
      >
        <div
          className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${meta.color}14` }}
        >
          <Icon className="h-5 w-5" style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--color-fg)]">{meta.label}</p>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#B54631] bg-[#B54631]/10 px-1.5 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3" />
                Needs attention
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-fg-muted)] mt-0.5 truncate">
            {isConnected && connectedSummary ? connectedSummary : meta.description}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--color-fg-muted)] transition-transform duration-200 shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] space-y-4">
              {isConnected ? (
                <ConnectedView
                  platform={platform}
                  connection={connection!}
                  onDisconnect={handleDisconnect}
                  submitting={submitting}
                />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="rounded-md p-3 border-l-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5">
                    <p className="text-xs text-[var(--color-fg-secondary)] leading-relaxed flex items-start gap-1.5">
                      <Sparkles
                        className="h-3.5 w-3.5 shrink-0 mt-0.5"
                        style={{ color: "var(--color-primary)" }}
                      />
                      <span>
                        {meta.tokenHelp}
                        {meta.tokenLink && (
                          <>
                            {" "}
                            <a
                              href={meta.tokenLink.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-0.5"
                            >
                              {meta.tokenLink.label}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        )}
                      </span>
                    </p>
                  </div>

                  {platform === "github" && (
                    <>
                      <Input
                        label="Personal Access Token"
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_..."
                        required
                        disabled={submitting}
                      />
                      <Input
                        label="Repository (owner/repo)"
                        type="text"
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="acme/website"
                        required
                        disabled={submitting}
                      />
                      <Input
                        label="Branch"
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        disabled={submitting}
                      />
                    </>
                  )}

                  {platform === "vercel" && (
                    <>
                      <Input
                        label="API Token"
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="vercel_..."
                        required
                        disabled={submitting}
                      />
                      <Input
                        label="Project ID"
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="prj_..."
                        required
                        disabled={submitting}
                      />
                    </>
                  )}

                  {platform === "wordpress" && (
                    <>
                      <Input
                        label="Site URL"
                        type="url"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder="https://yoursite.com"
                        required
                        disabled={submitting}
                      />
                      <Input
                        label="Username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin"
                        required
                        disabled={submitting}
                      />
                      <Input
                        label="Application Password"
                        type="password"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx"
                        required
                        disabled={submitting}
                      />
                    </>
                  )}

                  {platform === "webflow" && (
                    <>
                      <Input
                        label="API Token"
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="..."
                        required
                        disabled={submitting}
                      />
                      <Input
                        label="Site ID"
                        type="text"
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        placeholder="..."
                        required
                        disabled={submitting}
                      />
                    </>
                  )}

                  {error && (
                    <div
                      className="text-sm rounded-md p-3 border-l-4"
                      style={{
                        color: "#B54631",
                        borderLeftColor: "#B54631",
                        backgroundColor: "rgba(181,70,49,0.06)",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button type="submit" loading={submitting} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        <>Connect {meta.label}</>
                      )}
                    </Button>
                    <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConnectedView({
  platform,
  connection,
  onDisconnect,
  submitting,
}: {
  platform: Platform;
  connection: SiteConnection;
  onDisconnect: () => void;
  submitting: boolean;
}) {
  const verifiedAt = connection.last_verified_at
    ? new Date(connection.last_verified_at).toLocaleString()
    : "Never";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs">
        {platform === "github" && (
          <>
            <Field label="Repository" value={connection.repo ?? "—"} />
            <Field label="Branch" value={connection.branch ?? "main"} />
          </>
        )}
        {platform === "vercel" && (
          <Field label="Project ID" value={connection.site_id ?? "—"} />
        )}
        {platform === "wordpress" && (
          <Field label="Site URL" value={connection.site_url ?? "—"} />
        )}
        {platform === "webflow" && (
          <Field label="Site ID" value={connection.site_id ?? "—"} />
        )}
        <Field label="Last verified" value={verifiedAt} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          disabled={submitting}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Disconnect
        </Button>
        <p className="text-[11px] text-[var(--color-fg-muted)]">
          Phase 4 (Apply Fix) ships next — your connection is ready.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-fg-muted)]">
        {label}
      </p>
      <p className="text-[var(--color-fg)] font-medium truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
