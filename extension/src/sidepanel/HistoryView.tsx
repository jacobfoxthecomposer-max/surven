import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

/**
 * Fix History view. Reachable from Settings → "Fix History" row.
 *
 * Shows the user's last N applied fixes with checkboxes + a Revert button.
 * Default window: last 30 days. Toggle to "All time."
 *
 * Revert flow:
 *   1. User selects fixes via checkbox (or "Select all").
 *   2. Clicks Revert.
 *   3. Confirm modal warns about overwriting manual edits (option A).
 *   4. POST /api/fixes/revert → per-fix results displayed inline.
 */

export interface HistoryViewProps {
  apiUrl: string; // e.g. "https://surven.ai/api/audit/run"
  apiKey: string;
  onBack: () => void;
}

interface FixRow {
  id: string;
  businessId: string;
  businessName: string;
  findingId: string;
  fixType: string;
  platform: string;
  status: string;
  filePath: string | null;
  commitUrl: string | null;
  committedSha: string | null;
  appliedAt: string;
  revertedAt: string | null;
  revertedCommitSha: string | null;
  errorMessage: string | null;
  canRevert: boolean;
  cantRevertReason?: string;
}

const SAGE = "#96A283";
const SAGE_DARK = "#7D8E6C";
const RUST = "#B54631";
const CREAM = "#F2EEE3";
const TEXT = "#1A1C1A";
const TEXT_MUTED = "#6B6D6B";

export function HistoryView({ apiUrl, apiKey, onBack }: HistoryViewProps) {
  const apiOrigin = useMemo(() => apiOriginFromAuditUrl(apiUrl), [apiUrl]);

  const [days, setDays] = useState(30); // 30 = last 30 days, 0 = all time
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fixes, setFixes] = useState<FixRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [revertResult, setRevertResult] = useState<{
    succeeded: number;
    failed: number;
    perFix: Record<string, { ok: boolean; error?: string; revertedCommitSha?: string }>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const url = `${apiOrigin}/api/fixes/history?days=${days}`;
        const res = await fetch(url, { headers: { "x-api-key": apiKey } });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          if (cancelled) return;
          setLoadError(`Couldn't load history (${res.status}): ${txt.slice(0, 120)}`);
          setLoading(false);
          return;
        }
        const data = await res.json() as { fixes: FixRow[] };
        if (cancelled) return;
        setFixes(data.fixes ?? []);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Network error");
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiOrigin, apiKey, days]);

  const eligible = fixes.filter((f) => f.canRevert);
  const allEligibleSelected = eligible.length > 0 && eligible.every((f) => selected.has(f.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allEligibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map((f) => f.id)));
    }
  }

  async function performRevert() {
    setReverting(true);
    setRevertResult(null);
    try {
      const ids = Array.from(selected);
      const res = await fetch(`${apiOrigin}/api/fixes/revert`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ fixIds: ids }),
      });
      const data = await res.json().catch(() => null) as {
        succeeded?: number;
        failed?: number;
        results?: Array<{ id: string; ok: boolean; error?: string; revertedCommitSha?: string }>;
        error?: string;
      } | null;

      if (!res.ok || !data || !data.results) {
        setRevertResult({
          succeeded: 0,
          failed: ids.length,
          perFix: Object.fromEntries(
            ids.map((id) => [id, { ok: false, error: data?.error ?? `Server returned ${res.status}` }])
          ),
        });
        setReverting(false);
        return;
      }

      const perFix: Record<string, { ok: boolean; error?: string; revertedCommitSha?: string }> = {};
      for (const r of data.results) {
        perFix[r.id] = { ok: r.ok, error: r.error, revertedCommitSha: r.revertedCommitSha };
      }
      setRevertResult({
        succeeded: data.succeeded ?? 0,
        failed: data.failed ?? 0,
        perFix,
      });

      // Refresh the list so reverted rows show their new state.
      const refresh = await fetch(`${apiOrigin}/api/fixes/history?days=${days}`, { headers: { "x-api-key": apiKey } });
      if (refresh.ok) {
        const refreshed = await refresh.json() as { fixes: FixRow[] };
        setFixes(refreshed.fixes ?? []);
      }
      setSelected(new Set());
    } catch (err) {
      setRevertResult({
        succeeded: 0,
        failed: 1,
        perFix: { error: { ok: false, error: err instanceof Error ? err.message : "Network error" } },
      });
    } finally {
      setReverting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div style={{ padding: "16px", fontFamily: "var(--font-inter), -apple-system, sans-serif", background: CREAM, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: TEXT_MUTED }}
          aria-label="Back to settings"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ fontSize: "16px", fontWeight: 600, color: TEXT }}>Fix History</h1>
      </div>

      <p style={{ fontSize: "12px", color: TEXT_MUTED, marginBottom: "12px", lineHeight: 1.5 }}>
        Every change Surven has applied to your sites. Tick the ones you want to undo and click <strong>Revert selected</strong>. Reverts are committed back to your repo (GitHub) or the original WordPress field.
      </p>

      {/* Time-range toggle */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[30, 90, 0].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "999px",
              border: "1px solid",
              borderColor: days === d ? SAGE_DARK : "#D8D2C2",
              background: days === d ? SAGE : "white",
              color: days === d ? "white" : TEXT_MUTED,
              cursor: "pointer",
            }}
          >
            {d === 0 ? "All time" : `Last ${d} days`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px", gap: "8px", color: TEXT_MUTED }}>
          <Loader2 size={16} className="surven-spin" />
          <span style={{ fontSize: "12px" }}>Loading…</span>
        </div>
      ) : loadError ? (
        <div style={{ padding: "12px", background: "#FEE2E2", border: `1px solid ${RUST}`, borderRadius: "6px", fontSize: "12px", color: RUST }}>
          {loadError}
        </div>
      ) : fixes.length === 0 ? (
        <div style={{ padding: "24px 12px", background: "white", border: "1px solid #E5E1D5", borderRadius: "8px", fontSize: "13px", color: TEXT_MUTED, textAlign: "center" }}>
          No fixes applied {days === 0 ? "yet" : `in the last ${days} days`}.
        </div>
      ) : (
        <>
          {/* Select all + revert button row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: eligible.length === 0 ? "default" : "pointer", fontSize: "12px", color: TEXT_MUTED }}>
              <input
                type="checkbox"
                checked={allEligibleSelected}
                onChange={toggleAll}
                disabled={eligible.length === 0}
                style={{ accentColor: SAGE }}
              />
              <span>Select all revertable ({eligible.length})</span>
            </label>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={selected.size === 0 || reverting}
              style={{
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 500,
                borderRadius: "6px",
                border: "none",
                background: selected.size === 0 ? "#D8D2C2" : RUST,
                color: "white",
                cursor: selected.size === 0 ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RotateCcw size={14} />
              Revert selected{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>

          {/* Result banner if a revert just ran */}
          {revertResult && (
            <div
              style={{
                padding: "10px 12px",
                marginBottom: "12px",
                borderRadius: "6px",
                background: revertResult.failed === 0 ? "#E8EFE0" : "#FFF4E0",
                border: `1px solid ${revertResult.failed === 0 ? SAGE : "#C9A95B"}`,
                fontSize: "12px",
                color: TEXT,
              }}
            >
              {revertResult.failed === 0
                ? `Reverted ${revertResult.succeeded} fix${revertResult.succeeded === 1 ? "" : "es"}.`
                : `Reverted ${revertResult.succeeded}, failed ${revertResult.failed}. See per-row status below.`}
            </div>
          )}

          {/* Fix list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {fixes.map((fix) => {
              const result = revertResult?.perFix[fix.id];
              const isReverted = fix.status === "reverted";
              return (
                <div
                  key={fix.id}
                  style={{
                    background: "white",
                    border: "1px solid #E5E1D5",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    opacity: isReverted ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(fix.id)}
                      disabled={!fix.canRevert}
                      onChange={() => toggle(fix.id)}
                      style={{ marginTop: "3px", accentColor: SAGE }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: TEXT }}>
                          {prettyFinding(fix.findingId)}
                        </span>
                        <PlatformBadge platform={fix.platform} />
                        {isReverted && (
                          <span style={{ fontSize: "10px", padding: "2px 6px", background: "#E8EFE0", color: SAGE_DARK, borderRadius: "999px", fontWeight: 600 }}>
                            Reverted
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: TEXT_MUTED }}>
                        {fix.businessName} · {formatDate(fix.appliedAt)}
                        {fix.filePath ? ` · ${fix.filePath}` : ""}
                      </div>
                      {fix.commitUrl && (
                        <a
                          href={fix.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "11px", color: SAGE_DARK, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px", marginTop: "3px" }}
                        >
                          View commit <ExternalLink size={10} />
                        </a>
                      )}
                      {!fix.canRevert && fix.cantRevertReason && (
                        <div style={{ fontSize: "11px", color: TEXT_MUTED, marginTop: "3px", fontStyle: "italic" }}>
                          {fix.cantRevertReason}
                        </div>
                      )}
                      {result && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11px",
                            color: result.ok ? SAGE_DARK : RUST,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {result.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {result.ok ? "Reverted." : `Revert failed: ${result.error ?? "unknown error"}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div style={{ background: "white", borderRadius: "10px", padding: "20px", maxWidth: "400px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <AlertCircle size={20} color={RUST} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: TEXT, margin: 0 }}>
                Revert {selected.size} fix{selected.size === 1 ? "" : "es"}?
              </h2>
            </div>
            <div style={{ background: "#FFF4E0", border: "1px solid #C9A95B", borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#7A5A1F", marginBottom: "4px" }}>
                ⚠ This will overwrite any manual edits
              </div>
              <div style={{ fontSize: "12px", color: "#7A5A1F", lineHeight: 1.5 }}>
                If you (or anyone else) edited these pages or settings <strong>after</strong> Surven applied the fix, those manual changes will be lost when we restore the original state.
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px" }}>
                  <li><strong>GitHub:</strong> creates a new commit that resets the affected files to their pre-Surven state.</li>
                  <li><strong>WordPress:</strong> writes the captured pre-Surven value back into the meta field, alt text, or removes the schema block.</li>
                </ul>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: TEXT_MUTED, marginBottom: "14px" }}>
              You can re-apply any of these later by re-running the audit.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={reverting}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #D8D2C2",
                  background: "white",
                  color: TEXT,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={performRevert}
                disabled={reverting}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  borderRadius: "6px",
                  border: "none",
                  background: RUST,
                  color: "white",
                  cursor: reverting ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {reverting && <Loader2 size={14} className="surven-spin" />}
                {reverting ? "Reverting…" : "Yes, revert"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .surven-spin { animation: surven-spin 1s linear infinite; }
        @keyframes surven-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function apiOriginFromAuditUrl(auditUrl: string): string {
  try {
    return new URL(auditUrl).origin;
  } catch {
    return auditUrl.replace(/\/api\/.*$/, "");
  }
}

function prettyFinding(findingId: string): string {
  return findingId
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    github: { bg: "#1A1C1A", fg: "white" },
    wordpress: { bg: "#21759B", fg: "white" },
    wix: { bg: "#FFB400", fg: "#1A1C1A" },
    shopify: { bg: "#96BF48", fg: "white" },
  };
  const c = colors[platform] ?? { bg: "#D8D2C2", fg: TEXT_MUTED };
  return (
    <span style={{
      fontSize: "10px",
      padding: "2px 6px",
      background: c.bg,
      color: c.fg,
      borderRadius: "999px",
      fontWeight: 600,
      textTransform: "capitalize",
    }}>
      {platform}
    </span>
  );
}
