import { useState, useEffect } from "react";
import { Search, ChevronDown, X, Settings, ArrowLeft, Wrench, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { AuditFinding, ApplyFixResponse } from "../shared/types";
import "./styles.css";

type FixState =
  | { status: "idle" }
  | { status: "applying" }
  | { status: "success"; commitUrl?: string; filePath?: string }
  | { status: "error"; message: string; connectUrl?: string };

const WHAT_IS_IT: Record<string, string> = {
  org_schema_missing: "Schema markup is invisible code added to your website's <head> that acts like a structured business card only AI and search engines can read. Organization schema specifically tells AI systems your business name, website URL, phone number, logo, and service area — in a format they can understand without guessing.",
  local_business_schema_missing: "LocalBusiness schema is invisible code in your website's <head> that tells AI systems you are a physical, location-based business. It includes your address, phone number, hours, and what type of business you are (restaurant, plumber, dentist, etc.). Without it, AI can't confidently connect your website to a specific location.",
  faq_schema_missing: "FAQPage schema is invisible code that marks up your Q&A content so AI systems can read it as a structured list of questions and answers. Without it, AI has to guess which text on your page is a question and which is an answer — and often gets it wrong or ignores it entirely.",
  faq_schema_insufficient: "FAQPage schema is invisible code that marks up your Q&A content so AI systems can read it as structured questions and answers. You already have this set up, but it needs more questions. AI looks for at least 5–10 solid pairs to treat your page as a real FAQ source.",
  content_freshness_unknown: "Content freshness is how AI systems determine whether your website's information is current. They check a hidden signal called the Last-Modified date — a timestamp set by your website that tells crawlers when the page was last updated. If this signal is missing, AI can't tell if your hours, prices, or services are up to date.",
  content_stale: "Content freshness is a signal AI systems use to decide if your information is trustworthy and current. It's based on the Last-Modified date of your page — a hidden timestamp that tells AI when you last made changes. Pages that haven't been updated in months get deprioritized because AI assumes your hours, prices, or team may have changed.",
  content_outdated: "Content freshness is a signal AI systems use to decide if your information is trustworthy and current. Pages that haven't been touched in 90+ days start to lose citation priority with AI systems.",
  meta_desc_missing: "The meta description is a 1–2 sentence summary of your page that lives in the <head> of your website's code — invisible to visitors but read by search engines and AI. It's the grey description text that appears under your business name in Google search results.",
  meta_desc_short: "The meta description is a 1–2 sentence summary of your page that lives in the <head> of your website's code — invisible to visitors but read by search engines and AI. It's the grey description text that appears under your business name in Google search results.",
  meta_desc_long: "The meta description is a 1–2 sentence summary of your page that lives in the <head> of your website's code — invisible to visitors but read by search engines and AI. It's the grey description text that appears under your business name in Google search results.",
  credentials_missing: "E-E-A-T stands for Experience, Expertise, Authoritativeness, and Trustworthiness — the criteria AI systems and Google use to decide which businesses to recommend. Credentials signals are the visible proof points on your website that show you're legitimate: years in business, licenses, awards, customer reviews, and media mentions.",
  credentials_low: "E-E-A-T stands for Experience, Expertise, Authoritativeness, and Trustworthiness — the criteria AI systems and Google use to decide which businesses to recommend. Credentials signals are the visible proof points on your website that show you're legitimate: years in business, licenses, awards, customer reviews, and media mentions.",
  citation_consistency: "A citation is any online mention of your business name, address, and phone number — called NAP data. Citations appear on Google Business Profile, Yelp, BBB, and hundreds of directory sites. AI systems cross-reference these sources to verify your business information. If your address says \"123 Main St\" on your website but \"123 Main Street\" on Yelp, AI treats that as a discrepancy and reduces its confidence in recommending you.",
  title_tag_missing: "The title tag is the text that appears in the browser tab at the top of your screen. It's also the blue clickable headline shown in Google search results. It lives in the <head> of your website's code and is one of the first things AI systems read to understand what your business does and where you're located.",
  title_tag_generic: "The title tag is the text that appears in the browser tab at the top of your screen. It's also the blue clickable headline shown in Google search results. It lives in the <head> of your website's code and is one of the first things AI systems read to understand what your business does and where you're located.",
  title_tag_short: "The title tag is the text that appears in the browser tab at the top of your screen. It's also the blue clickable headline shown in Google search results. It lives in the <head> of your website's code and is one of the first things AI systems read to understand what your business does and where you're located.",
  title_tag_long: "The title tag is the text that appears in the browser tab at the top of your screen. It's also the blue clickable headline shown in Google search results. It lives in the <head> of your website's code and is one of the first things AI systems read to understand what your business does and where you're located.",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#FEE2E2", text: "#B54631", border: "#B54631" },
  high: { bg: "#FEF3C7", text: "#C97B45", border: "#C97B45" },
  medium: { bg: "#DBEAFE", text: "#6BA3F5", border: "#6BA3F5" },
  low: { bg: "#F0FDF4", text: "#96A283", border: "#96A283" },
};

const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface CachedAudit {
  findings: AuditFinding[];
  timestamp: number;
}

interface Settings {
  apiUrl: string;
  apiKey: string;
}

interface AuditState {
  loading: boolean;
  findings: AuditFinding[];
  crawlStats?: { pagesCrawled: number; pagesCapped: boolean };
  error?: string;
  fromCache: boolean;
}

function getApplyFixUrl(auditUrl: string): string {
  // /api/audit/run → /api/audit/apply-fix
  return auditUrl.replace(/\/api\/audit\/run\/?$/, "/api/audit/apply-fix");
}

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<Settings>({ apiUrl: "", apiKey: "" });
  const [state, setState] = useState<AuditState>({ loading: false, findings: [], fromCache: false });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whatIsItId, setWhatIsItId] = useState<string | null>(null);
  const [highlightedFinding, setHighlightedFinding] = useState<string | null>(null);
  const [fixStates, setFixStates] = useState<Record<string, FixState>>({});
  const [siteUrl, setSiteUrl] = useState<string | null>(null);

  async function applyFix(finding: AuditFinding) {
    if (!settings?.apiUrl || !settings?.apiKey || !finding.fixCode || !finding.fixType) return;
    const targetUrl = siteUrl ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.url;
    if (!targetUrl) return;

    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    try {
      const res = await fetch(getApplyFixUrl(settings.apiUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey,
        },
        body: JSON.stringify({
          siteUrl: targetUrl,
          findingId: finding.id,
          findingTitle: finding.title,
          fixType: finding.fixType,
          fixCode: finding.fixCode,
        }),
      });
      const data = (await res.json()) as ApplyFixResponse;

      if (!res.ok) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: {
            status: "error",
            message: data.message ?? data.error ?? "Apply failed",
            connectUrl: data.connectUrl,
          },
        }));
        return;
      }

      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "success", commitUrl: data.commitUrl, filePath: data.filePath },
      }));
    } catch (err) {
      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" },
      }));
    }
  }

  useEffect(() => {
    chrome.storage.local.get("surven_settings", (data) => {
      if (data.surven_settings) {
        setSettings(data.surven_settings as Settings);
        setDraftSettings(data.surven_settings as Settings);
      }
    });
  }, []);

  function saveSettings() {
    const trimmed = { apiUrl: draftSettings.apiUrl.trim(), apiKey: draftSettings.apiKey.trim() };
    chrome.storage.local.set({ surven_settings: trimmed });
    setSettings(trimmed);
    setSettingsOpen(false);
  }

  async function runAudit() {
    if (!settings?.apiUrl || !settings?.apiKey) return;
    setState({ loading: true, findings: [], fromCache: false });

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        setState({ loading: false, findings: [], error: "No active tab found", fromCache: false });
        return;
      }

      setSiteUrl(tab.url);
      const hostname = new URL(tab.url).hostname;
      const cacheKey = `audit_${hostname}`;

      // Check cache
      const stored = await chrome.storage.local.get(cacheKey);
      const cached = stored[cacheKey] as CachedAudit | undefined;
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setState({ loading: false, findings: cached.findings, fromCache: true });
        return;
      }

      // Call Surven API
      const res = await fetch(settings.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey,
        },
        body: JSON.stringify({ siteUrl: tab.url }),
      });

      // Read body as text first so an empty body (e.g. timeout) doesn't crash JSON.parse
      const rawText = await res.text();
      let data: { findings?: AuditFinding[]; error?: string; crawlStats?: { pagesCrawled: number; pagesCapped: boolean } } = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          setState({
            loading: false,
            findings: [],
            error: `Server returned an unparseable response (status ${res.status}). The audit may have timed out — try again.`,
            fromCache: false,
          });
          return;
        }
      }

      if (!res.ok) {
        const fallback =
          res.status === 504
            ? "Audit timed out. Try a smaller site or re-scan to retry."
            : `Audit failed (status ${res.status})`;
        setState({ loading: false, findings: [], error: data.error ?? fallback, fromCache: false });
        return;
      }

      const findings: AuditFinding[] = data.findings ?? [];
      await chrome.storage.local.set({ [cacheKey]: { findings, timestamp: Date.now() } as CachedAudit });

      setState({ loading: false, findings, crawlStats: data.crawlStats, fromCache: false });
    } catch (err) {
      setState({ loading: false, findings: [], error: String(err), fromCache: false });
    }
  }

  async function highlightFinding(finding: AuditFinding) {
    setHighlightedFinding(finding.id);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT", findingId: finding.id, severity: finding.severity });
    }
  }

  async function clearHighlights() {
    setHighlightedFinding(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "CLEAR_HIGHLIGHTS" });
    }
  }

  async function rerunAudit() {
    if (!settings?.apiUrl) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const hostname = new URL(tab.url).hostname;
      await chrome.storage.local.remove(`audit_${hostname}`);
    }
    setState({ loading: false, findings: [], fromCache: false });
    runAudit();
  }

  // Settings screen
  if (settingsOpen || !settings) {
    return (
      <div style={{ padding: "16px", fontFamily: "var(--font-inter), -apple-system, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          {settings && (
            <button
              onClick={() => setSettingsOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6B6D6B" }}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#1A1C1A" }}>
            {settings ? "Settings" : "Setup Surven Auditor"}
          </h1>
        </div>

        {!settings && (
          <p style={{ fontSize: "13px", color: "#6B6D6B", marginBottom: "20px", lineHeight: "1.5" }}>
            Enter your Surven API details to get full multi-page audit results.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#3D3F3D", display: "block", marginBottom: "4px" }}>
              API URL
            </label>
            <input
              type="url"
              value={draftSettings.apiUrl}
              onChange={(e) => setDraftSettings((s) => ({ ...s, apiUrl: e.target.value }))}
              placeholder="https://surven.vercel.app/api/audit/run"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#3D3F3D", display: "block", marginBottom: "4px" }}>
              API Key
            </label>
            <input
              type="password"
              value={draftSettings.apiKey}
              onChange={(e) => setDraftSettings((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder="Generate from dashboard Settings → API Keys"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p style={{ fontSize: "11px", color: "#6B6D6B", marginTop: "4px" }}>
              Get this from your Surven dashboard: Settings → API Keys → Generate API Key
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={!draftSettings.apiUrl || !draftSettings.apiKey}
            style={{
              padding: "10px",
              background: !draftSettings.apiUrl || !draftSettings.apiKey ? "#d1d5db" : "#96A283",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: !draftSettings.apiUrl || !draftSettings.apiKey ? "default" : "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  const criticalCount = state.findings.filter((f) => f.severity === "critical").length;
  const highCount = state.findings.filter((f) => f.severity === "high").length;
  const totalIssues = state.findings.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F2EEE3", fontFamily: "var(--font-inter), -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid #C8C2B4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#1A1C1A" }}>Surven Auditor</h1>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6b7280" }}
          >
            <Settings size={16} />
          </button>
        </div>
        <button
          onClick={runAudit}
          disabled={state.loading}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: state.loading ? "#d1d5db" : "#96A283",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: state.loading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Search size={16} />
          {state.loading ? "Scanning site..." : "Run Audit"}
        </button>
        {state.loading && (
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px", textAlign: "center" }}>
            Crawling up to 100 pages — may take 30s
          </p>
        )}
        {state.fromCache && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>Cached results (24h)</p>
            <button
              onClick={rerunAudit}
              style={{ fontSize: "12px", color: "#96A283", background: "none", border: "none", cursor: "pointer" }}
            >
              Re-scan
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px", background: "#F2EEE3" }}>
        {state.error && (
          <div style={{ background: "#FEE2E2", color: "#B54631", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
            {state.error}
          </div>
        )}

        {!state.loading && state.findings.length === 0 && !state.error && (
          <div style={{ textAlign: "center", color: "#6B6D6B", fontSize: "14px", paddingTop: "20px" }}>
            Click "Run Audit" to scan this website
          </div>
        )}

        {state.findings.length > 0 && (
          <>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "14px", color: "#1A1C1A", marginBottom: "4px" }}>
                <strong>{totalIssues}</strong> issue{totalIssues !== 1 ? "s" : ""} found
                {criticalCount > 0 && <span style={{ color: "#B54631", marginLeft: "12px" }}>• {criticalCount} critical</span>}
                {highCount > 0 && <span style={{ color: "#C97B45", marginLeft: "12px" }}>• {highCount} high</span>}
              </div>
              {state.crawlStats && (
                <div style={{ fontSize: "12px", color: "#6B6D6B" }}>
                  {state.crawlStats.pagesCrawled} page{state.crawlStats.pagesCrawled !== 1 ? "s" : ""} crawled
                  {state.crawlStats.pagesCapped && " (capped at 100)"}
                </div>
              )}
            </div>

            {highlightedFinding && (
              <button
                onClick={clearHighlights}
                style={{
                  marginBottom: "12px",
                  width: "100%",
                  padding: "8px 12px",
                  background: "#EDE8DC",
                  border: "1px solid #C8C2B4",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#1A1C1A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <X size={14} /> Clear Highlights
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {state.findings.map((finding) => (
                <div
                  key={finding.id}
                  style={{ border: `1px solid ${SEVERITY_COLORS[finding.severity].border}`, borderRadius: "6px", overflow: "hidden" }}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: SEVERITY_COLORS[finding.severity].bg,
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: SEVERITY_COLORS[finding.severity].text, marginBottom: "4px" }}>
                        {finding.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6B6D6B" }}>
                        Fix time: {finding.estimatedFixTime} min • Impact: {finding.estimatedImpact}/10
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      style={{
                        color: SEVERITY_COLORS[finding.severity].text,
                        transform: expandedId === finding.id ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                        marginLeft: "8px",
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {expandedId === finding.id && (
                    <div style={{ padding: "12px", background: "#E5DFCF", borderTop: `1px solid ${SEVERITY_COLORS[finding.severity].border}` }}>
                      {/* What is this */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setWhatIsItId(whatIsItId === finding.id ? null : finding.id)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#6B6D6B",
                            marginBottom: whatIsItId === finding.id ? "6px" : 0,
                          }}
                        >
                          <ChevronDown size={12} style={{ transform: whatIsItId === finding.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                          What is this?
                        </button>
                        {whatIsItId === finding.id && (
                          <p style={{ fontSize: "13px", color: "#3D3F3D", lineHeight: "1.5", background: "#EDE8DC", padding: "8px 10px", borderRadius: "4px" }}>
                            {finding.whatIsIt || WHAT_IS_IT[finding.id] || ""}
                          </p>
                        )}
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <h4 style={{ fontSize: "12px", fontWeight: 600, color: "#1A1C1A", marginBottom: "4px" }}>Why it matters</h4>
                        <p style={{ fontSize: "13px", color: "#3D3F3D", lineHeight: "1.5" }}>{finding.whyItMatters}</p>
                      </div>
                      <div style={{ marginBottom: "12px" }}>
                        <h4 style={{ fontSize: "12px", fontWeight: 600, color: "#1A1C1A", marginBottom: "4px" }}>How to fix</h4>
                        <p style={{ fontSize: "13px", color: "#3D3F3D", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>{finding.howToFix}</p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <button
                          onClick={() => highlightFinding(finding)}
                          disabled={highlightedFinding === finding.id}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: highlightedFinding === finding.id ? "#e5e7eb" : SEVERITY_COLORS[finding.severity].border,
                            color: highlightedFinding === finding.id ? "#6b7280" : "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: highlightedFinding === finding.id ? "default" : "pointer",
                          }}
                        >
                          {highlightedFinding === finding.id ? "Highlighting on page" : "Highlight on page"}
                        </button>

                        {finding.fixCode && finding.fixType && (() => {
                          const fixState = fixStates[finding.id] ?? { status: "idle" as const };
                          if (fixState.status === "success") {
                            return (
                              <div
                                style={{
                                  padding: "10px",
                                  background: "#F0FDF4",
                                  border: "1px solid #96A283",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  color: "#3D3F3D",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "4px" }}>
                                  <CheckCircle2 size={14} style={{ color: "#96A283" }} /> Committed
                                </div>
                                {fixState.filePath && (
                                  <div style={{ marginBottom: "4px" }}>File: <code style={{ background: "#EDE8DC", padding: "1px 4px", borderRadius: "2px" }}>{fixState.filePath}</code></div>
                                )}
                                {fixState.commitUrl && (
                                  <a
                                    href={fixState.commitUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#96A283", textDecoration: "none" }}
                                  >
                                    View commit on GitHub <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            );
                          }
                          if (fixState.status === "error") {
                            return (
                              <div
                                style={{
                                  padding: "10px",
                                  background: "#FEE2E2",
                                  border: "1px solid #B54631",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  color: "#3D3F3D",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "4px", color: "#B54631" }}>
                                  <AlertCircle size={14} /> Fix failed
                                </div>
                                <div style={{ marginBottom: "6px" }}>{fixState.message}</div>
                                {fixState.connectUrl && (
                                  <a
                                    href={fixState.connectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#B54631", textDecoration: "none", fontWeight: 500 }}
                                  >
                                    Connect GitHub <ExternalLink size={11} />
                                  </a>
                                )}
                                <button
                                  onClick={() => applyFix(finding)}
                                  style={{
                                    marginTop: "6px",
                                    padding: "6px 10px",
                                    background: "transparent",
                                    border: "1px solid #B54631",
                                    color: "#B54631",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                >
                                  Retry
                                </button>
                              </div>
                            );
                          }
                          return (
                            <button
                              onClick={() => applyFix(finding)}
                              disabled={fixState.status === "applying"}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                background: fixState.status === "applying" ? "#d1d5db" : "#6BA3F5",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: fixState.status === "applying" ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                              }}
                            >
                              {fixState.status === "applying" ? (
                                <>
                                  <Loader2 size={14} className="surven-spin" /> Opening commit…
                                </>
                              ) : (
                                <>
                                  <Wrench size={14} /> Fix this for me
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
