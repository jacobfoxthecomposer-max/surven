import { useState, useEffect } from "react";
import { Search, ChevronDown, X, Settings, ArrowLeft, Wrench, ExternalLink, CheckCircle2, AlertCircle, Loader2, Flame, Code2 } from "lucide-react";
import type { AuditFinding, ApplyFixResponse, PerPageFixResult } from "../shared/types";
import { computeVisibilityScore } from "../shared/scoring";
import { getInstructionsForPlatform, getDisplayName, type CmsPlatform, type FixKind } from "../shared/platformInstructions";
import "./styles.css";

interface ManagedPlanCta {
  url: string;
  headline: string;
  body: string;
  buttonLabel: string;
}

function ManagedPlanCard({ cta }: { cta?: ManagedPlanCta }) {
  if (!cta) return null;
  return (
    <div
      style={{
        marginTop: "10px",
        padding: "12px",
        background: "linear-gradient(135deg, rgba(125,142,108,0.08), rgba(125,142,108,0.02))",
        border: "1px solid rgba(125,142,108,0.35)",
        borderLeft: "3px solid #7D8E6C",
        borderRadius: "6px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#3D3F3D", marginBottom: "6px" }}>
        {cta.headline}
      </div>
      <div style={{ fontSize: "11px", lineHeight: "1.5", color: "#555", marginBottom: "10px" }}>
        {cta.body}
      </div>
      <a
        href={cta.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "7px 12px",
          background: "#7D8E6C",
          color: "white",
          textDecoration: "none",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 600,
        }}
      >
        {cta.buttonLabel} <ExternalLink size={11} />
      </a>
    </div>
  );
}

type FixState =
  | { status: "idle" }
  | { status: "applying" }
  | { status: "preview"; current: string | null; suggested: string; rewriteKind: "meta_desc" | "title_tag" }
  | { status: "preview-faq"; pairs: Array<{ question: string; answer: string }>; snippet: string }
  | { status: "preview-alt"; suggestions: Array<{ src: string; alt: string | null; error: string | null }> }
  | { status: "success"; commitUrl?: string; filePath?: string; snippet?: string; manualNote?: string; suggested?: string }
  | { status: "success-per-page"; commitUrl?: string; perPageResult: PerPageFixResult; managedPlanCta?: ManagedPlanCta }
  | { status: "manual"; snippet?: string; suggested?: string; manualNote: string; rewriteKind?: "meta_desc" | "title_tag" | "faq_page" | "alt_text"; managedPlanCta?: ManagedPlanCta }
  | { status: "ambiguous"; reasons: string[] }
  | { status: "error"; message: string; connectUrl?: string; snippet?: string };

const FINDING_TO_SCHEMA_TYPE: Record<string, string> = {
  org_schema_missing: "Organization",
  local_business_schema_missing: "LocalBusiness",
};

const FINDING_TO_REWRITE_KIND: Record<string, "meta_desc" | "title_tag"> = {
  meta_desc_missing: "meta_desc",
  meta_desc_short: "meta_desc",
  meta_desc_long: "meta_desc",
  title_tag_missing: "title_tag",
  title_tag_generic: "title_tag",
  title_tag_short: "title_tag",
  title_tag_long: "title_tag",
};

const FAQ_FINDING_IDS = new Set(["faq_schema_missing", "faq_schema_insufficient"]);
const ALT_TEXT_FINDING_IDS = new Set(["image_alt_text_missing", "alt_text_missing", "images_missing_alt"]);

const REWRITE_LABELS: Record<"meta_desc" | "title_tag", { button: string; whatItIs: string; previewWhatAiSees: string; previewBetter: string; useThis: string }> = {
  meta_desc: {
    button: "Improve how AI describes your site",
    whatItIs: "the summary AI engines use when describing your site",
    previewWhatAiSees: "What AI sees now",
    previewBetter: "Better version (more likely to get cited)",
    useThis: "Use this version",
  },
  title_tag: {
    button: "Improve your site's main headline",
    whatItIs: "your site's main headline (browser tab + Google results)",
    previewWhatAiSees: "Your headline now",
    previewBetter: "Stronger version",
    useThis: "Use this version",
  },
};

function getGenerateUrl(auditUrl: string): string {
  return auditUrl.replace(/\/api\/audit\/run\/?$/, "/api/audit/generate");
}

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
  showBadge?: boolean;
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
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [schemaActive, setSchemaActive] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<CmsPlatform>("unknown");

  async function toggleHeatmap() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isInjectable(tab.url)) return;
    if (heatmapActive) {
      chrome.tabs.sendMessage(tab.id, { type: "HEATMAP_HIDE" }).catch(() => {});
      setHeatmapActive(false);
    } else {
      chrome.tabs.sendMessage(tab.id, { type: "HEATMAP_SHOW" }).catch(() => {});
      setHeatmapActive(true);
    }
  }

  async function toggleSchema() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isInjectable(tab.url)) return;
    if (schemaActive) {
      chrome.tabs.sendMessage(tab.id, { type: "SCHEMA_HIDE" }).catch(() => {});
      setSchemaActive(false);
    } else {
      chrome.tabs.sendMessage(tab.id, { type: "SCHEMA_SHOW" }).catch(() => {});
      setSchemaActive(true);
    }
  }

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
          affectedUrls: finding.affectedUrls,
        }),
      });
      const data = (await res.json()) as ApplyFixResponse;

      // Manual-required (e.g. Next.js detected) → render the manual paste card with CTA.
      if (!res.ok && data.manualSnippet) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: {
            status: "manual",
            snippet: data.manualSnippet!,
            manualNote: data.manualNote ?? "Auto-update isn't available for this fix. Paste manually.",
            managedPlanCta: data.managedPlanCta,
          },
        }));
        return;
      }

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

      // Per-page HTML fix → use the per-page success state with detail.
      if (data.perPageResult) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: {
            status: "success-per-page",
            commitUrl: data.commitUrl,
            perPageResult: data.perPageResult!,
            managedPlanCta: data.managedPlanCta,
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

  async function generateSchemaFix(finding: AuditFinding) {
    if (!settings?.apiUrl || !settings?.apiKey) return;
    const schemaType = FINDING_TO_SCHEMA_TYPE[finding.id];
    if (!schemaType) return;

    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No active tab found" } }));
      return;
    }

    let pageContext: unknown;
    try {
      const ctxResp = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" });
      if (!ctxResp?.success) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "error", message: ctxResp?.error ?? "Couldn't read page content. Refresh the tab and try again." },
        }));
        return;
      }
      pageContext = ctxResp.context;
      const platform = (ctxResp.context as { platform?: CmsPlatform })?.platform;
      if (platform) setDetectedPlatform(platform);
    } catch (err) {
      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "error", message: `Couldn't reach page: ${err instanceof Error ? err.message : "unknown"}. Refresh the tab.` },
      }));
      return;
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey,
        },
        body: JSON.stringify({
          kind: "schema_org",
          schemaType,
          pageContext,
          commit: true,
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: {
        ok?: boolean;
        commitUrl?: string;
        filePath?: string;
        snippet?: string;
        manualNote?: string;
        error?: string;
        message?: string;
        connectUrl?: string;
      } = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          setFixStates((s) => ({
            ...s,
            [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` },
          }));
          return;
        }
      }

      if (!res.ok) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: {
            status: "error",
            message: data.message ?? data.error ?? `Generation failed (status ${res.status})`,
            connectUrl: data.connectUrl,
            snippet: data.snippet,
          },
        }));
        return;
      }

      if (data.ok === false && data.snippet && data.manualNote) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "manual", snippet: data.snippet!, manualNote: data.manualNote!, managedPlanCta: (data as { managedPlanCta?: ManagedPlanCta }).managedPlanCta },
        }));
        return;
      }

      if (data.ok === false) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: {
            status: "error",
            message: data.message ?? data.error ?? "Commit failed",
            connectUrl: data.connectUrl,
            snippet: data.snippet,
          },
        }));
        return;
      }

      setFixStates((s) => ({
        ...s,
        [finding.id]: {
          status: "success",
          commitUrl: data.commitUrl,
          filePath: data.filePath,
          snippet: data.snippet,
        },
      }));
    } catch (err) {
      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" },
      }));
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — fallback would be a textarea trick, not worth the complexity
    }
  }

  function isAmbiguousPageResponse(data: { error?: string; reasons?: string[] }): boolean {
    return data?.error === "ambiguous_page" && Array.isArray(data?.reasons);
  }

  async function generateRewritePreview(finding: AuditFinding) {
    if (!settings?.apiUrl || !settings?.apiKey) return;
    const rewriteKind = FINDING_TO_REWRITE_KIND[finding.id];
    if (!rewriteKind) return;

    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No active tab found" } }));
      return;
    }

    let pageContext: unknown;
    try {
      const ctxResp = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" });
      if (!ctxResp?.success) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "error", message: ctxResp?.error ?? "Couldn't read page content. Refresh the tab." },
        }));
        return;
      }
      pageContext = ctxResp.context;
      const platform = (ctxResp.context as { platform?: CmsPlatform })?.platform;
      if (platform) setDetectedPlatform(platform);
    } catch (err) {
      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "error", message: `Couldn't reach page: ${err instanceof Error ? err.message : "unknown"}. Refresh the tab.` },
      }));
      return;
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify({
          kind: rewriteKind,
          pageContext,
          commit: false,
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: { ok?: boolean; suggested?: string; current?: string | null; error?: string; message?: string } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` },
        }));
        return;
      }

      if (isAmbiguousPageResponse(data as { error?: string; reasons?: string[] })) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "ambiguous", reasons: (data as { reasons?: string[] }).reasons ?? [] },
        }));
        return;
      }

      if (!res.ok || !data.suggested) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "error", message: data.message ?? data.error ?? `Generation failed (status ${res.status})` },
        }));
        return;
      }

      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "preview", current: data.current ?? null, suggested: data.suggested!, rewriteKind },
      }));
    } catch (err) {
      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" },
      }));
    }
  }

  async function applyRewrite(finding: AuditFinding) {
    const current = fixStates[finding.id];
    if (!current || current.status !== "preview") return;
    if (!settings?.apiUrl || !settings?.apiKey) return;

    const { suggested, rewriteKind } = current;

    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No active tab found" } }));
      return;
    }

    let pageContext: unknown;
    try {
      const ctxResp = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" });
      pageContext = ctxResp?.success ? ctxResp.context : { url: tab.url };
    } catch {
      pageContext = { url: tab.url };
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify({
          kind: rewriteKind,
          pageContext,
          commit: true,
          approvedContent: suggested,
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: {
        ok?: boolean;
        commitUrl?: string;
        filePath?: string;
        suggested?: string;
        manualNote?: string;
        error?: string;
        message?: string;
        connectUrl?: string;
      } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` },
        }));
        return;
      }

      if (data.ok === false && data.manualNote) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "manual", snippet: suggested, suggested, manualNote: data.manualNote!, rewriteKind, managedPlanCta: (data as { managedPlanCta?: ManagedPlanCta }).managedPlanCta },
        }));
        return;
      }

      if (!res.ok || data.ok === false) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "error", message: data.message ?? data.error ?? "Commit failed", connectUrl: data.connectUrl },
        }));
        return;
      }

      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "success", commitUrl: data.commitUrl, filePath: data.filePath, suggested },
      }));
    } catch (err) {
      setFixStates((s) => ({
        ...s,
        [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" },
      }));
    }
  }

  async function generateFaqPreview(finding: AuditFinding) {
    if (!settings?.apiUrl || !settings?.apiKey) return;
    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No active tab found" } }));
      return;
    }

    let pageContext: unknown;
    try {
      const ctxResp = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" });
      if (!ctxResp?.success) {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: ctxResp?.error ?? "Couldn't read page content. Refresh the tab." } }));
        return;
      }
      pageContext = ctxResp.context;
      const platform = (ctxResp.context as { platform?: CmsPlatform })?.platform;
      if (platform) setDetectedPlatform(platform);
    } catch (err) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: `Couldn't reach page: ${err instanceof Error ? err.message : "unknown"}` } }));
      return;
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify({
          kind: "faq_page",
          pageContext,
          commit: false,
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: { ok?: boolean; pairs?: Array<{ question: string; answer: string }>; snippet?: string; error?: string; message?: string } = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` } }));
        return;
      }

      if (isAmbiguousPageResponse(data as { error?: string; reasons?: string[] })) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "ambiguous", reasons: (data as { reasons?: string[] }).reasons ?? [] },
        }));
        return;
      }

      if (!res.ok || !data.pairs || !data.snippet) {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: data.message ?? data.error ?? `Generation failed (status ${res.status})` } }));
        return;
      }

      setFixStates((s) => ({ ...s, [finding.id]: { status: "preview-faq", pairs: data.pairs!, snippet: data.snippet! } }));
    } catch (err) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" } }));
    }
  }

  async function applyFaqCommit(finding: AuditFinding) {
    const current = fixStates[finding.id];
    if (!current || current.status !== "preview-faq") return;
    if (!settings?.apiUrl || !settings?.apiKey) return;

    const { pairs } = current;
    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No active tab found" } }));
      return;
    }

    let pageContext: unknown;
    try {
      const ctxResp = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" });
      pageContext = ctxResp?.success ? ctxResp.context : { url: tab.url };
    } catch {
      pageContext = { url: tab.url };
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify({
          kind: "faq_page",
          pageContext,
          commit: true,
          approvedContent: JSON.stringify(pairs),
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: {
        ok?: boolean;
        commitUrl?: string;
        filePath?: string;
        snippet?: string;
        manualNote?: string;
        error?: string;
        message?: string;
        connectUrl?: string;
      } = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` } }));
        return;
      }

      if (data.ok === false && data.manualNote) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "manual", snippet: data.snippet, manualNote: data.manualNote!, rewriteKind: "faq_page", managedPlanCta: (data as { managedPlanCta?: ManagedPlanCta }).managedPlanCta },
        }));
        return;
      }

      if (!res.ok || data.ok === false) {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: data.message ?? data.error ?? "Commit failed", connectUrl: data.connectUrl } }));
        return;
      }

      setFixStates((s) => ({ ...s, [finding.id]: { status: "success", commitUrl: data.commitUrl, filePath: data.filePath, snippet: data.snippet } }));
    } catch (err) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" } }));
    }
  }

  async function generateAltTextPreview(finding: AuditFinding) {
    if (!settings?.apiUrl || !settings?.apiKey) return;
    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No active tab found" } }));
      return;
    }

    let pageContext: unknown;
    let imagesNeedingAlt: Array<{ src: string; surroundingText?: string }> = [];
    try {
      const [ctxResp, imgsResp] = await Promise.all([
        chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" }),
        chrome.tabs.sendMessage(tab.id, { type: "FIND_IMAGES_MISSING_ALT" }),
      ]);
      if (!ctxResp?.success) {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: ctxResp?.error ?? "Couldn't read page content." } }));
        return;
      }
      pageContext = ctxResp.context;
      const platform = (ctxResp.context as { platform?: CmsPlatform })?.platform;
      if (platform) setDetectedPlatform(platform);

      if (imgsResp?.success) imagesNeedingAlt = imgsResp.images ?? [];
    } catch (err) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: `Couldn't reach page: ${err instanceof Error ? err.message : "unknown"}` } }));
      return;
    }

    if (imagesNeedingAlt.length === 0) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: "No images missing alt text were found on this page." } }));
      return;
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify({
          kind: "alt_text",
          pageContext,
          commit: false,
          images: imagesNeedingAlt,
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: { ok?: boolean; suggestions?: Array<{ src: string; alt: string | null; error: string | null }>; error?: string; message?: string } = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` } }));
        return;
      }

      if (!res.ok || !data.suggestions) {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: data.message ?? data.error ?? `Generation failed (status ${res.status})` } }));
        return;
      }

      setFixStates((s) => ({ ...s, [finding.id]: { status: "preview-alt", suggestions: data.suggestions! } }));
    } catch (err) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" } }));
    }
  }

  async function applyAltTextCommit(finding: AuditFinding, replacements: Array<{ src: string; alt: string }>) {
    if (!settings?.apiUrl || !settings?.apiKey) return;
    if (replacements.length === 0) return;

    setFixStates((s) => ({ ...s, [finding.id]: { status: "applying" } }));

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let pageContext: unknown = { url: tab?.url ?? "" };
    if (tab?.id) {
      try {
        const ctxResp = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PAGE_CONTEXT" });
        if (ctxResp?.success) pageContext = ctxResp.context;
      } catch {
        // use minimal context
      }
    }

    try {
      const res = await fetch(getGenerateUrl(settings.apiUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify({
          kind: "alt_text",
          pageContext,
          commit: true,
          replacements,
          findingId: finding.id,
          findingTitle: finding.title,
        }),
      });

      const rawText = await res.text();
      let data: { ok?: boolean; commitUrl?: string; filePath?: string; manualNote?: string; error?: string; message?: string; connectUrl?: string } = {};
      try { data = rawText ? JSON.parse(rawText) : {}; } catch {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: `Server returned an unparseable response (status ${res.status}).` } }));
        return;
      }

      if (data.ok === false && data.manualNote) {
        setFixStates((s) => ({
          ...s,
          [finding.id]: { status: "manual", manualNote: data.manualNote!, rewriteKind: "alt_text", managedPlanCta: (data as { managedPlanCta?: ManagedPlanCta }).managedPlanCta },
        }));
        return;
      }

      if (!res.ok || data.ok === false) {
        setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: data.message ?? data.error ?? "Commit failed", connectUrl: data.connectUrl } }));
        return;
      }

      setFixStates((s) => ({ ...s, [finding.id]: { status: "success", commitUrl: data.commitUrl, filePath: data.filePath } }));
    } catch (err) {
      setFixStates((s) => ({ ...s, [finding.id]: { status: "error", message: err instanceof Error ? err.message : "Network error" } }));
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

  async function saveSettings() {
    const trimmed: Settings = {
      apiUrl: draftSettings.apiUrl.trim(),
      apiKey: draftSettings.apiKey.trim(),
      showBadge: draftSettings.showBadge ?? true,
    };
    await chrome.storage.local.set({ surven_settings: trimmed });
    setSettings(trimmed);
    setSettingsOpen(false);

    if (!trimmed.showBadge) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "BADGE_HIDE" }).catch(() => {});
    } else if (state.findings.length > 0) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const score = computeVisibilityScore(state.findings);
        chrome.tabs.sendMessage(tab.id, { type: "BADGE_UPDATE", score }).catch(() => {});
      }
    }
  }

  function isInjectable(url?: string): boolean {
    if (!url) return false;
    return url.startsWith("http://") || url.startsWith("https://");
  }

  async function broadcastBadge(findings: AuditFinding[]) {
    const showBadge = settings?.showBadge ?? true;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isInjectable(tab.url)) return;
    if (!showBadge) {
      chrome.tabs.sendMessage(tab.id, { type: "BADGE_HIDE" }).catch(() => {});
      return;
    }
    const score = computeVisibilityScore(findings);
    chrome.tabs.sendMessage(tab.id, { type: "BADGE_UPDATE", score }).catch(() => {});
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
        broadcastBadge(cached.findings);
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
      broadcastBadge(findings);
    } catch (err) {
      setState({ loading: false, findings: [], error: String(err), fromCache: false });
    }
  }

  async function highlightFinding(finding: AuditFinding) {
    setHighlightedFinding(finding.id);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT", findingId: finding.id, severity: finding.severity }).catch(() => {});
    }
  }

  async function clearHighlights() {
    setHighlightedFinding(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "CLEAR_HIGHLIGHTS" }).catch(() => {});
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
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", padding: "10px 12px", background: "#FAF8F2", border: "1px solid #E5E1D5", borderRadius: "6px" }}>
            <input
              type="checkbox"
              checked={draftSettings.showBadge ?? true}
              onChange={(e) => setDraftSettings((s) => ({ ...s, showBadge: e.target.checked }))}
              style={{ marginTop: "2px", accentColor: "#96A283" }}
            />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#3D3F3D" }}>Show floating Page Health score</div>
              <div style={{ fontSize: "11px", color: "#6B6D6B", marginTop: "2px" }}>
                Display the technical health score on each audited page (bottom-right corner). Separate from your AI Visibility score.
              </div>
            </div>
          </label>
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
        <button
          onClick={toggleHeatmap}
          style={{
            width: "100%",
            marginTop: "8px",
            padding: "9px 12px",
            background: heatmapActive ? "#3D3F3D" : "white",
            color: heatmapActive ? "white" : "#3D3F3D",
            border: `1px solid ${heatmapActive ? "#3D3F3D" : "#d1d5db"}`,
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
          title="Tint every text block on the page by AI quote-ability"
        >
          <Flame size={14} />
          {heatmapActive ? "Hide Heatmap" : "Show Quote-ability Heatmap"}
        </button>
        <button
          onClick={toggleSchema}
          style={{
            width: "100%",
            marginTop: "6px",
            padding: "9px 12px",
            background: schemaActive ? "#3D3F3D" : "white",
            color: schemaActive ? "white" : "#3D3F3D",
            border: `1px solid ${schemaActive ? "#3D3F3D" : "#d1d5db"}`,
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
          title="Outline elements with structured data and flag patterns missing schema"
        >
          <Code2 size={14} />
          {schemaActive ? "Hide Schema Overlay" : "Show Schema Overlay"}
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
                          if (fixState.status === "success-per-page") {
                            const r = fixState.perPageResult;
                            const allSucceeded = r.failed.length === 0 && r.skipped.length === 0;
                            return (
                              <div
                                style={{
                                  padding: "10px",
                                  background: allSucceeded ? "#F0FDF4" : "#FEF3C7",
                                  border: `1px solid ${allSucceeded ? "#96A283" : "#C97B45"}`,
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  color: "#3D3F3D",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px" }}>
                                  <CheckCircle2 size={14} style={{ color: allSucceeded ? "#96A283" : "#C97B45" }} />
                                  {r.succeeded.length} of {r.total} page(s) updated
                                </div>
                                {r.skipped.length > 0 && (
                                  <details style={{ marginBottom: "6px", fontSize: "11px" }}>
                                    <summary style={{ cursor: "pointer", color: "#7C5800", fontWeight: 500 }}>{r.skipped.length} skipped</summary>
                                    <ul style={{ margin: "4px 0 0 18px", padding: 0, color: "#666" }}>
                                      {r.skipped.map((s, i) => (
                                        <li key={i} style={{ marginBottom: "2px" }}>
                                          <code style={{ background: "#EDE8DC", padding: "1px 3px", borderRadius: "2px", fontSize: "10px" }}>{new URL(s.url).pathname}</code>: {s.reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                                {r.failed.length > 0 && (
                                  <details style={{ marginBottom: "6px", fontSize: "11px" }}>
                                    <summary style={{ cursor: "pointer", color: "#B54631", fontWeight: 500 }}>{r.failed.length} couldn&apos;t be updated</summary>
                                    <ul style={{ margin: "4px 0 0 18px", padding: 0, color: "#666" }}>
                                      {r.failed.map((f, i) => (
                                        <li key={i} style={{ marginBottom: "2px" }}>
                                          <code style={{ background: "#EDE8DC", padding: "1px 3px", borderRadius: "2px", fontSize: "10px" }}>{new URL(f.url).pathname}</code>: {f.reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                                {fixState.commitUrl && (
                                  <a
                                    href={fixState.commitUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#96A283", textDecoration: "none", fontSize: "11px" }}
                                  >
                                    View commit on GitHub <ExternalLink size={11} />
                                  </a>
                                )}
                                <ManagedPlanCard cta={fixState.managedPlanCta} />
                              </div>
                            );
                          }
                          if (fixState.status === "ambiguous") {
                            return (
                              <div style={{ padding: "12px", background: "#FEF3C7", border: "1px solid #C97B45", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px", color: "#C97B45" }}>
                                  <AlertCircle size={14} /> Wrong page for this fix
                                </div>
                                <div style={{ marginBottom: "8px", lineHeight: "1.4" }}>
                                  This page looks like a dashboard, directory, or admin panel — it shows data about other businesses, not its own identity. Generating a description here would likely describe the wrong business.
                                </div>
                                {fixState.reasons.length > 0 && (
                                  <details style={{ marginBottom: "8px", fontSize: "11px" }}>
                                    <summary style={{ cursor: "pointer", color: "#666", fontWeight: 500 }}>Why we think so</summary>
                                    <ul style={{ margin: "4px 0 0 18px", padding: 0, color: "#666" }}>
                                      {fixState.reasons.map((r, i) => <li key={i} style={{ marginBottom: "2px" }}>{r}</li>)}
                                    </ul>
                                  </details>
                                )}
                                <div style={{ fontSize: "11px", color: "#3D3F3D", lineHeight: "1.4", padding: "8px 10px", background: "white", borderRadius: "4px" }}>
                                  <strong>Try this:</strong> open the actual website you want to optimize (your client&apos;s real homepage, not a dashboard about it) and run the auditor there.
                                </div>
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

                        {FINDING_TO_SCHEMA_TYPE[finding.id] && (() => {
                          const fixState = fixStates[finding.id] ?? { status: "idle" as const };
                          const schemaType = FINDING_TO_SCHEMA_TYPE[finding.id];

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
                                  <CheckCircle2 size={14} style={{ color: "#96A283" }} /> {schemaType} schema committed
                                </div>
                                {fixState.filePath && (
                                  <div style={{ marginBottom: "4px" }}>
                                    File: <code style={{ background: "#EDE8DC", padding: "1px 4px", borderRadius: "2px" }}>{fixState.filePath}</code>
                                  </div>
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

                          if (fixState.status === "manual") {
                            const instructions = getInstructionsForPlatform(detectedPlatform, "schema_org");
                            return (
                              <div
                                style={{
                                  padding: "12px",
                                  background: "#FEF3C7",
                                  border: "1px solid #C97B45",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  color: "#3D3F3D",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px", color: "#C97B45" }}>
                                  <AlertCircle size={14} /> Couldn&apos;t auto-deploy to {getDisplayName(detectedPlatform)}
                                </div>
                                <div style={{ marginBottom: "10px", lineHeight: "1.4", fontSize: "11px", color: "#666" }}>
                                  {fixState.manualNote || `We can't auto-deploy to ${getDisplayName(detectedPlatform)} for this fix type. Here's how to add it manually:`}
                                </div>

                                <div style={{ background: "white", border: "1px solid #E5D8B8", borderRadius: "4px", padding: "10px", marginBottom: "10px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "11px", marginBottom: "6px", color: "#3D3F3D" }}>Steps for {instructions.platformName}:</div>
                                  <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", lineHeight: "1.55" }}>
                                    {instructions.steps.map((step, i) => (
                                      <li key={i} style={{ marginBottom: "3px" }}>{step}</li>
                                    ))}
                                  </ol>
                                  {instructions.note && (
                                    <div style={{ marginTop: "8px", padding: "6px 8px", background: "#FFF8E1", borderRadius: "3px", fontSize: "10px", color: "#7C5800", fontStyle: "italic" }}>
                                      💡 {instructions.note}
                                    </div>
                                  )}
                                </div>

                                <details style={{ marginBottom: "8px" }}>
                                  <summary style={{ cursor: "pointer", fontWeight: 500, color: "#3D3F3D", fontSize: "11px" }}>Preview the snippet</summary>
                                  <pre style={{
                                    marginTop: "6px",
                                    padding: "8px",
                                    background: "#1A1C1A",
                                    color: "#F2EEE3",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    overflow: "auto",
                                    maxHeight: "200px",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                  }}>{fixState.snippet}</pre>
                                </details>
                                <button
                                  onClick={() => copyToClipboard(fixState.snippet ?? "")}
                                  style={{
                                    padding: "8px 12px",
                                    background: "#C97B45",
                                    border: "none",
                                    color: "white",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    width: "100%",
                                  }}
                                >
                                  📋 Copy snippet to clipboard
                                </button>
                                <ManagedPlanCard cta={fixState.managedPlanCta} />
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
                                  <AlertCircle size={14} /> Generation failed
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
                                  onClick={() => generateSchemaFix(finding)}
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
                              onClick={() => generateSchemaFix(finding)}
                              disabled={fixState.status === "applying"}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                background: fixState.status === "applying" ? "#d1d5db" : "#96A283",
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
                                  <Loader2 size={14} className="surven-spin" /> Generating {schemaType}…
                                </>
                              ) : (
                                <>
                                  ✨ Generate &amp; Commit {schemaType} Schema
                                </>
                              )}
                            </button>
                          );
                        })()}

                        {FINDING_TO_REWRITE_KIND[finding.id] && (() => {
                          const fixState = fixStates[finding.id] ?? { status: "idle" as const };
                          const rewriteKind = FINDING_TO_REWRITE_KIND[finding.id];
                          const labels = REWRITE_LABELS[rewriteKind];

                          if (fixState.status === "preview") {
                            return (
                              <div style={{ padding: "12px", background: "#FAF8F2", border: "1px solid #C8C2B0", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#888", marginBottom: "4px" }}>
                                  {labels.previewWhatAiSees}
                                </div>
                                <div style={{ padding: "8px 10px", background: "white", border: "1px solid #E5E1D5", borderRadius: "4px", marginBottom: "10px", fontSize: "12px", lineHeight: "1.4", color: fixState.current ? "#3D3F3D" : "#999", fontStyle: fixState.current ? "normal" : "italic" }}>
                                  {fixState.current ?? "(nothing — your site has no description set)"}
                                </div>

                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6B7A59", marginBottom: "4px" }}>
                                  {labels.previewBetter}
                                </div>
                                <div style={{ padding: "8px 10px", background: "white", border: "1px solid #96A283", borderRadius: "4px", marginBottom: "10px", fontSize: "12px", lineHeight: "1.4", color: "#3D3F3D", fontWeight: 500 }}>
                                  {fixState.suggested}
                                </div>

                                <div style={{ display: "flex", gap: "6px", flexDirection: "column" }}>
                                  <button
                                    onClick={() => applyRewrite(finding)}
                                    style={{
                                      padding: "8px 12px",
                                      background: "#96A283",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      width: "100%",
                                    }}
                                  >
                                    ✓ {labels.useThis}
                                  </button>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      onClick={() => generateRewritePreview(finding)}
                                      style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        background: "transparent",
                                        border: "1px solid #C8C2B0",
                                        color: "#3D3F3D",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                      }}
                                    >
                                      ↻ Try a different one
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(fixState.suggested)}
                                      style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        background: "transparent",
                                        border: "1px solid #C8C2B0",
                                        color: "#3D3F3D",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                      }}
                                    >
                                      📋 Copy
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (fixState.status === "success" && fixState.suggested) {
                            return (
                              <div style={{ padding: "10px", background: "#F0FDF4", border: "1px solid #96A283", borderRadius: "4px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px" }}>
                                  <CheckCircle2 size={14} style={{ color: "#96A283" }} /> Updated on your site
                                </div>
                                <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>New version:</div>
                                <div style={{ padding: "6px 8px", background: "white", borderRadius: "3px", fontSize: "11px", lineHeight: "1.4", marginBottom: "6px" }}>
                                  {fixState.suggested}
                                </div>
                                {fixState.filePath && (
                                  <div style={{ marginBottom: "4px", fontSize: "11px" }}>File: <code style={{ background: "#EDE8DC", padding: "1px 4px", borderRadius: "2px" }}>{fixState.filePath}</code></div>
                                )}
                                {fixState.commitUrl && (
                                  <a
                                    href={fixState.commitUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#96A283", textDecoration: "none", fontSize: "11px" }}
                                  >
                                    View commit on GitHub <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            );
                          }

                          if (fixState.status === "manual") {
                            const fixKindForInstructions: FixKind = (fixState.rewriteKind ?? rewriteKind);
                            const instructions = getInstructionsForPlatform(detectedPlatform, fixKindForInstructions);
                            return (
                              <div style={{ padding: "12px", background: "#FEF3C7", border: "1px solid #C97B45", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px", color: "#C97B45" }}>
                                  <AlertCircle size={14} /> Add this to {getDisplayName(detectedPlatform)} manually
                                </div>
                                <div style={{ marginBottom: "10px", lineHeight: "1.4", fontSize: "11px", color: "#666" }}>
                                  {fixState.manualNote || `We can't auto-update ${getDisplayName(detectedPlatform)} for this fix type. Here's how to add it manually:`}
                                </div>

                                {fixState.suggested && (
                                  <>
                                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px", fontWeight: 500 }}>The new version:</div>
                                    <div style={{ padding: "8px 10px", background: "white", borderRadius: "4px", fontSize: "11px", lineHeight: "1.4", marginBottom: "10px", border: "1px solid #C97B45" }}>
                                      {fixState.suggested}
                                    </div>
                                  </>
                                )}

                                <div style={{ background: "white", border: "1px solid #E5D8B8", borderRadius: "4px", padding: "10px", marginBottom: "10px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "11px", marginBottom: "6px", color: "#3D3F3D" }}>Steps for {instructions.platformName}:</div>
                                  <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", lineHeight: "1.55" }}>
                                    {instructions.steps.map((step, i) => (
                                      <li key={i} style={{ marginBottom: "3px" }}>{step}</li>
                                    ))}
                                  </ol>
                                  {instructions.note && (
                                    <div style={{ marginTop: "8px", padding: "6px 8px", background: "#FFF8E1", borderRadius: "3px", fontSize: "10px", color: "#7C5800", fontStyle: "italic" }}>
                                      💡 {instructions.note}
                                    </div>
                                  )}
                                </div>

                                {fixState.suggested && (
                                  <button
                                    onClick={() => copyToClipboard(fixState.suggested!)}
                                    style={{
                                      padding: "8px 12px",
                                      background: "#C97B45",
                                      border: "none",
                                      color: "white",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      width: "100%",
                                    }}
                                  >
                                    📋 Copy to clipboard
                                  </button>
                                )}
                                <ManagedPlanCard cta={fixState.managedPlanCta} />
                              </div>
                            );
                          }

                          if (fixState.status === "error") {
                            return (
                              <div style={{ padding: "10px", background: "#FEE2E2", border: "1px solid #B54631", borderRadius: "4px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "4px", color: "#B54631" }}>
                                  <AlertCircle size={14} /> Couldn't generate
                                </div>
                                <div style={{ marginBottom: "6px" }}>{fixState.message}</div>
                                <button
                                  onClick={() => generateRewritePreview(finding)}
                                  style={{
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
                                  Try again
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() => generateRewritePreview(finding)}
                              disabled={fixState.status === "applying"}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                background: fixState.status === "applying" ? "#d1d5db" : "#96A283",
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
                                  <Loader2 size={14} className="surven-spin" /> Asking AI…
                                </>
                              ) : (
                                <>
                                  ✨ {labels.button}
                                </>
                              )}
                            </button>
                          );
                        })()}

                        {FAQ_FINDING_IDS.has(finding.id) && (() => {
                          const fixState = fixStates[finding.id] ?? { status: "idle" as const };

                          if (fixState.status === "preview-faq") {
                            return (
                              <div style={{ padding: "12px", background: "#FAF8F2", border: "1px solid #C8C2B0", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6B7A59", marginBottom: "8px" }}>
                                  Generated Q&amp;A pairs ({fixState.pairs.length})
                                </div>
                                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #E5E1D5", borderRadius: "4px", background: "white", marginBottom: "10px" }}>
                                  {fixState.pairs.map((pair, i) => (
                                    <div key={i} style={{ padding: "8px 10px", borderBottom: i < fixState.pairs.length - 1 ? "1px solid #F2EEE3" : "none" }}>
                                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#3D3F3D", marginBottom: "3px" }}>Q: {pair.question}</div>
                                      <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.4" }}>A: {pair.answer}</div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <button
                                    onClick={() => applyFaqCommit(finding)}
                                    style={{ padding: "8px 12px", background: "#96A283", color: "white", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer", width: "100%" }}
                                  >
                                    ✓ Use these Q&amp;A pairs on my site
                                  </button>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      onClick={() => generateFaqPreview(finding)}
                                      style={{ flex: 1, padding: "6px 10px", background: "transparent", border: "1px solid #C8C2B0", color: "#3D3F3D", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 500 }}
                                    >
                                      ↻ Regenerate
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(fixState.snippet)}
                                      style={{ flex: 1, padding: "6px 10px", background: "transparent", border: "1px solid #C8C2B0", color: "#3D3F3D", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 500 }}
                                    >
                                      📋 Copy snippet
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (fixState.status === "success" && fixState.snippet) {
                            return (
                              <div style={{ padding: "10px", background: "#F0FDF4", border: "1px solid #96A283", borderRadius: "4px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px" }}>
                                  <CheckCircle2 size={14} style={{ color: "#96A283" }} /> FAQ schema added to your site
                                </div>
                                {fixState.filePath && (
                                  <div style={{ marginBottom: "4px", fontSize: "11px" }}>File: <code style={{ background: "#EDE8DC", padding: "1px 4px", borderRadius: "2px" }}>{fixState.filePath}</code></div>
                                )}
                                {fixState.commitUrl && (
                                  <a href={fixState.commitUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#96A283", textDecoration: "none", fontSize: "11px" }}>
                                    View commit on GitHub <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            );
                          }

                          if (fixState.status === "manual") {
                            const instructions = getInstructionsForPlatform(detectedPlatform, "faq_page");
                            return (
                              <div style={{ padding: "12px", background: "#FEF3C7", border: "1px solid #C97B45", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px", color: "#C97B45" }}>
                                  <AlertCircle size={14} /> Add this to {getDisplayName(detectedPlatform)} manually
                                </div>
                                <div style={{ background: "white", border: "1px solid #E5D8B8", borderRadius: "4px", padding: "10px", marginBottom: "10px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "11px", marginBottom: "6px" }}>Steps for {instructions.platformName}:</div>
                                  <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", lineHeight: "1.55" }}>
                                    {instructions.steps.map((step, i) => (
                                      <li key={i} style={{ marginBottom: "3px" }}>{step}</li>
                                    ))}
                                  </ol>
                                  {instructions.note && (
                                    <div style={{ marginTop: "8px", padding: "6px 8px", background: "#FFF8E1", borderRadius: "3px", fontSize: "10px", color: "#7C5800", fontStyle: "italic" }}>💡 {instructions.note}</div>
                                  )}
                                </div>
                                {fixState.snippet && (
                                  <button
                                    onClick={() => copyToClipboard(fixState.snippet ?? "")}
                                    style={{ padding: "8px 12px", background: "#C97B45", border: "none", color: "white", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: 600, width: "100%" }}
                                  >
                                    📋 Copy snippet to clipboard
                                  </button>
                                )}
                                <ManagedPlanCard cta={fixState.managedPlanCta} />
                              </div>
                            );
                          }

                          if (fixState.status === "ambiguous") {
                            return (
                              <div style={{ padding: "12px", background: "#FEF3C7", border: "1px solid #C97B45", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px", color: "#C97B45" }}>
                                  <AlertCircle size={14} /> Wrong page for FAQ generation
                                </div>
                                <div style={{ marginBottom: "8px", lineHeight: "1.4" }}>
                                  This page looks like a dashboard or directory. AI-generated FAQs would describe the wrong business. Open the actual website you want to optimize.
                                </div>
                                {fixState.reasons.length > 0 && (
                                  <details style={{ fontSize: "11px" }}>
                                    <summary style={{ cursor: "pointer", color: "#666", fontWeight: 500 }}>Why we think so</summary>
                                    <ul style={{ margin: "4px 0 0 18px", padding: 0, color: "#666" }}>
                                      {fixState.reasons.map((r, i) => <li key={i} style={{ marginBottom: "2px" }}>{r}</li>)}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            );
                          }

                          if (fixState.status === "error") {
                            return (
                              <div style={{ padding: "10px", background: "#FEE2E2", border: "1px solid #B54631", borderRadius: "4px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "4px", color: "#B54631" }}>
                                  <AlertCircle size={14} /> Couldn&apos;t generate FAQ
                                </div>
                                <div style={{ marginBottom: "6px" }}>{fixState.message}</div>
                                <button
                                  onClick={() => generateFaqPreview(finding)}
                                  style={{ padding: "6px 10px", background: "transparent", border: "1px solid #B54631", color: "#B54631", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 500 }}
                                >Try again</button>
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() => generateFaqPreview(finding)}
                              disabled={fixState.status === "applying"}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                background: fixState.status === "applying" ? "#d1d5db" : "#96A283",
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
                                <><Loader2 size={14} className="surven-spin" /> Reading your page…</>
                              ) : (
                                <>✨ Build a FAQ section AI can cite</>
                              )}
                            </button>
                          );
                        })()}

                        {ALT_TEXT_FINDING_IDS.has(finding.id) && (() => {
                          const fixState = fixStates[finding.id] ?? { status: "idle" as const };

                          if (fixState.status === "preview-alt") {
                            const validSuggestions = fixState.suggestions.filter((s) => s.alt && !s.error);
                            return (
                              <div style={{ padding: "12px", background: "#FAF8F2", border: "1px solid #C8C2B0", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#6B7A59", marginBottom: "8px" }}>
                                  AI-described image text ({validSuggestions.length} of {fixState.suggestions.length})
                                </div>
                                <div style={{ maxHeight: "320px", overflowY: "auto", marginBottom: "10px" }}>
                                  {fixState.suggestions.map((sug, i) => (
                                    <div key={i} style={{ padding: "8px", background: "white", border: "1px solid #E5E1D5", borderRadius: "4px", marginBottom: "6px", display: "flex", gap: "8px" }}>
                                      <img src={sug.src} alt="" style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "3px", flexShrink: 0, background: "#F2EEE3" }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        {sug.alt ? (
                                          <div style={{ fontSize: "11px", color: "#3D3F3D", lineHeight: "1.4" }}>{sug.alt}</div>
                                        ) : (
                                          <div style={{ fontSize: "11px", color: "#B54631", lineHeight: "1.4", fontStyle: "italic" }}>Couldn&apos;t describe: {sug.error ?? "unknown error"}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => applyAltTextCommit(finding, validSuggestions.map((s) => ({ src: s.src, alt: s.alt! })))}
                                  disabled={validSuggestions.length === 0}
                                  style={{ padding: "8px 12px", background: validSuggestions.length === 0 ? "#d1d5db" : "#96A283", color: "white", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: validSuggestions.length === 0 ? "default" : "pointer", width: "100%" }}
                                >
                                  ✓ Apply these descriptions to {validSuggestions.length} image{validSuggestions.length === 1 ? "" : "s"}
                                </button>
                              </div>
                            );
                          }

                          if (fixState.status === "success") {
                            return (
                              <div style={{ padding: "10px", background: "#F0FDF4", border: "1px solid #96A283", borderRadius: "4px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px" }}>
                                  <CheckCircle2 size={14} style={{ color: "#96A283" }} /> Image descriptions added
                                </div>
                                {fixState.commitUrl && (
                                  <a href={fixState.commitUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#96A283", textDecoration: "none", fontSize: "11px" }}>
                                    View commit on GitHub <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            );
                          }

                          if (fixState.status === "manual") {
                            const instructions = getInstructionsForPlatform(detectedPlatform, "alt_text");
                            return (
                              <div style={{ padding: "12px", background: "#FEF3C7", border: "1px solid #C97B45", borderRadius: "6px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "6px", color: "#C97B45" }}>
                                  <AlertCircle size={14} /> Add image descriptions to {getDisplayName(detectedPlatform)} manually
                                </div>
                                <div style={{ marginBottom: "10px", lineHeight: "1.4", fontSize: "11px", color: "#666" }}>
                                  {fixState.manualNote || `We can't auto-edit images on ${getDisplayName(detectedPlatform)} for this fix type. Here's how to add them manually:`}
                                </div>
                                <div style={{ background: "white", border: "1px solid #E5D8B8", borderRadius: "4px", padding: "10px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "11px", marginBottom: "6px" }}>Steps for {instructions.platformName}:</div>
                                  <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", lineHeight: "1.55" }}>
                                    {instructions.steps.map((step, i) => (
                                      <li key={i} style={{ marginBottom: "3px" }}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            );
                          }

                          if (fixState.status === "error") {
                            return (
                              <div style={{ padding: "10px", background: "#FEE2E2", border: "1px solid #B54631", borderRadius: "4px", fontSize: "12px", color: "#3D3F3D" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "4px", color: "#B54631" }}>
                                  <AlertCircle size={14} /> Couldn&apos;t generate descriptions
                                </div>
                                <div style={{ marginBottom: "6px" }}>{fixState.message}</div>
                                <button
                                  onClick={() => generateAltTextPreview(finding)}
                                  style={{ padding: "6px 10px", background: "transparent", border: "1px solid #B54631", color: "#B54631", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: 500 }}
                                >Try again</button>
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() => generateAltTextPreview(finding)}
                              disabled={fixState.status === "applying"}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                background: fixState.status === "applying" ? "#d1d5db" : "#96A283",
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
                                <><Loader2 size={14} className="surven-spin" /> AI is looking at your images…</>
                              ) : (
                                <>✨ Describe the images on this page for AI</>
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
