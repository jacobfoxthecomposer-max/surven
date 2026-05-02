import { parseCurrentPage } from "../shared/domParser";
import type { VisibilityScore } from "../shared/scoring";
import { scoreQuoteability, TIER_TINTS, TIER_BORDERS } from "../shared/quoteability";

const SAGE = "rgba(150, 162, 131, 0.35)";
const SAGE_BORDER = "3px solid rgba(107, 122, 89, 0.85)";
const BADGE_HOST_ID = "surven-badge-host";
const HEATMAP_DATA_ATTR = "data-surven-heatmap";
const HEATMAP_STYLE_ID = "surven-heatmap-style";

interface HeatmapEntry {
  el: HTMLElement;
  prevBg: string;
  prevBoxShadow: string;
  prevTransition: string;
  score: number;
  tier: "high" | "mid" | "low";
}

const heatmapEntries: HeatmapEntry[] = [];

interface SavedStyle {
  el: HTMLElement;
  outline: string;
  outlineOffset: string;
  backgroundColor: string;
}

const highlighted: SavedStyle[] = [];

function clearAllHighlights() {
  for (const { el, outline, outlineOffset, backgroundColor } of highlighted) {
    el.style.outline = outline;
    el.style.outlineOffset = outlineOffset;
    el.style.backgroundColor = backgroundColor;
  }
  highlighted.length = 0;

  // Remove any toast badges
  document.querySelectorAll(".surven-toast").forEach((el) => el.remove());
}

function highlightEl(el: HTMLElement) {
  highlighted.push({
    el,
    outline: el.style.outline,
    outlineOffset: el.style.outlineOffset,
    backgroundColor: el.style.backgroundColor,
  });
  el.style.outline = SAGE_BORDER;
  el.style.outlineOffset = "3px";
  el.style.backgroundColor = SAGE;
}

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.className = "surven-toast";
  toast.style.cssText = `
    position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
    z-index: 2147483647; background: rgba(107,122,89,0.95); color: white;
    padding: 10px 16px; border-radius: 6px; font-size: 13px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2); pointer-events: none;
    white-space: nowrap;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  highlighted.push({ el: toast, outline: "", outlineOffset: "", backgroundColor: "" });
}

// Selectors for visible findings
const FINDING_SELECTORS: Record<string, string[]> = {
  credentials_missing: ["footer", "[id*='about']", "[class*='about']", "[id*='team']", "[class*='team']", "[id*='credential']", "[class*='credential']"],
  credentials_low: ["footer", "[id*='about']", "[class*='about']", "[id*='team']", "[class*='team']"],
  content_freshness_unknown: ["main", "article", "[role='main']", "[id*='content']", "[class*='content']", "section"],
  content_stale: ["main", "article", "[role='main']", "[id*='content']", "[class*='content']", "section"],
  content_outdated: ["main", "article", "[role='main']", "[id*='content']", "[class*='content']", "section"],
};

const INVISIBLE_MESSAGES: Record<string, string> = {
  org_schema_missing: "Fix: Add Organization schema to your <head>",
  local_business_schema_missing: "Fix: Add LocalBusiness schema to your <head>",
  faq_schema_missing: "Fix: Add FAQPage schema — see sidebar for details",
  faq_schema_insufficient: "Fix: Expand your FAQPage schema to 5+ questions",
  meta_desc_missing: "Fix: Add a <meta name=\"description\"> tag to your <head>",
  meta_desc_short: "Fix: Expand your meta description to 100–160 characters",
  meta_desc_long: "Fix: Trim your meta description to under 160 characters",
  title_tag_missing: "Fix: Add a <title> tag to your <head>",
  title_tag_generic: "Fix: Replace generic title with [Service] | [City] | [Business]",
  title_tag_short: "Fix: Expand your title tag to 50–70 characters",
  title_tag_long: "Fix: Trim your title tag to under 70 characters",
  citation_consistency: "Action required: Audit your citations across Google, Yelp, BBB",
};

function highlightFinding(findingId: string) {
  clearAllHighlights();

  const selectors = FINDING_SELECTORS[findingId];

  if (!selectors) {
    // Invisible finding — show a toast
    const msg = INVISIBLE_MESSAGES[findingId] ?? "See sidebar for details";
    showToast(msg);
    return;
  }

  // Find first matching element for each selector and highlight it
  let found = false;
  for (const selector of selectors) {
    const els = document.querySelectorAll<HTMLElement>(selector);
    if (els.length > 0) {
      const el = els[0];
      highlightEl(el);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      found = true;
      break;
    }
  }

  if (!found) {
    showToast("Could not find a matching element — see sidebar for fix instructions");
  }
}

function ensureBadgeHost(): ShadowRoot {
  let host = document.getElementById(BADGE_HOST_ID);
  if (host && host.shadowRoot) return host.shadowRoot;

  host = document.createElement("div");
  host.id = BADGE_HOST_ID;
  host.style.cssText = "position: fixed !important; z-index: 2147483647 !important; bottom: 20px !important; right: 20px !important; margin: 0 !important; padding: 0 !important; display: block !important; pointer-events: auto !important;";
  (document.body ?? document.documentElement).appendChild(host);
  return host.attachShadow({ mode: "open" });
}

function renderBadge(score: VisibilityScore) {
  const root = ensureBadgeHost();
  const findingsHtml = score.topFindings
    .map((f) => `<li><span class="dot ${f.severity}"></span>${escapeHtml(f.title)}</li>`)
    .join("");

  root.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .pill {
        display: flex; align-items: center; gap: 10px;
        background: white; color: #1a1a1a;
        padding: 10px 16px; border-radius: 999px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
        cursor: pointer; user-select: none;
        border: 1.5px solid ${score.color};
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        font-size: 13px;
        animation: surven-fade-in 0.3s ease;
      }
      .pill:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.1); }
      .score-num {
        font-weight: 700; font-size: 18px; color: ${score.color};
        font-variant-numeric: tabular-nums;
      }
      .label { font-weight: 600; color: ${score.color}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      .divider { width: 1px; height: 18px; background: #e5e5e5; }
      .geo-label { color: #666; font-size: 11px; font-weight: 500; }
      .panel {
        position: absolute; bottom: 56px; right: 0;
        width: 320px;
        background: white; border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e5e5e5;
        padding: 16px;
        display: none;
        animation: surven-fade-in 0.2s ease;
      }
      .panel.open { display: block; }
      .panel-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
      .panel-score { font-size: 32px; font-weight: 700; color: ${score.color}; line-height: 1; font-variant-numeric: tabular-nums; }
      .panel-tier { font-size: 13px; font-weight: 600; color: ${score.color}; text-transform: uppercase; letter-spacing: 0.5px; }
      .panel-sub { font-size: 11px; color: #888; margin-top: 4px; }
      .panel-title { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 14px; margin-bottom: 8px; }
      ul { margin: 0; padding: 0; list-style: none; }
      li { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; color: #333; border-bottom: 1px solid #f5f5f5; }
      li:last-child { border-bottom: none; }
      .dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
      .dot.critical { background: #B54631; }
      .dot.high { background: #C97B45; }
      .dot.medium { background: #6BA3F5; }
      .dot.low { background: #96A283; }
      .empty { color: #888; font-size: 13px; text-align: center; padding: 12px 0; }
      .close {
        position: absolute; top: 8px; right: 8px;
        background: transparent; border: none;
        cursor: pointer; padding: 4px; color: #888;
        font-size: 18px; line-height: 1;
      }
      .close:hover { color: #333; }
      @keyframes surven-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
    <div class="panel" id="panel">
      <button class="close" id="close-btn" aria-label="Close">×</button>
      <div class="panel-header">
        <div>
          <div class="panel-score">${score.score}</div>
          <div class="panel-tier">${escapeHtml(score.label)}</div>
        </div>
      </div>
      <div class="panel-sub">${score.totalFindings} ${score.totalFindings === 1 ? "issue" : "issues"} found on this page</div>
      ${score.topFindings.length > 0 ? `<div class="panel-title">Top Issues to Fix</div><ul>${findingsHtml}</ul>` : `<div class="empty">No issues — your page looks great.</div>`}
    </div>
    <div class="pill" id="pill">
      <span class="geo-label">PAGE HEALTH</span>
      <div class="divider"></div>
      <span class="score-num">${score.score}</span>
      <span class="label">${escapeHtml(score.label)}</span>
    </div>
  `;

  const pill = root.getElementById("pill");
  const panel = root.getElementById("panel");
  const closeBtn = root.getElementById("close-btn");

  pill?.addEventListener("click", (e) => {
    e.stopPropagation();
    panel?.classList.toggle("open");
  });
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    panel?.classList.remove("open");
  });
  document.addEventListener("click", (e) => {
    if (!panel?.classList.contains("open")) return;
    const target = e.target as Node;
    const host = document.getElementById(BADGE_HOST_ID);
    if (host && !host.contains(target)) panel.classList.remove("open");
  });
}

function hideBadge() {
  const host = document.getElementById(BADGE_HOST_ID);
  host?.remove();
}

const HEATMAP_SELECTORS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "li", "blockquote", "dd", "dt",
  "td", "th", "caption", "figcaption",
  "summary", "details",
  "article", "section",
].join(",");

const HEATMAP_SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE",
  "NAV", "FOOTER", "ASIDE", "HEADER",
  "FORM", "INPUT", "TEXTAREA", "SELECT", "BUTTON",
  "SVG", "CANVAS", "IFRAME", "VIDEO", "AUDIO",
  "PICTURE", "IMG",
]);

function isInsideSkipped(el: HTMLElement): boolean {
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    if (HEATMAP_SKIP_TAGS.has(cur.tagName)) return true;
    if (cur.id === BADGE_HOST_ID) return true;
    const role = cur.getAttribute("role");
    if (role && (role === "navigation" || role === "banner" || role === "complementary" || role === "contentinfo")) return true;
    cur = cur.parentElement;
  }
  return false;
}

function getDirectText(el: HTMLElement): string {
  let txt = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) txt += (node.textContent ?? "");
  }
  return txt.trim();
}

function detectSchemaContext(el: HTMLElement): boolean {
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body) {
    const itemtype = cur.getAttribute("itemtype");
    if (itemtype && /faq|article|howto|recipe|product|qapage/i.test(itemtype)) return true;
    cur = cur.parentElement;
  }
  return false;
}

function applyHeatmap() {
  removeHeatmap();

  if (!document.getElementById(HEATMAP_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = HEATMAP_STYLE_ID;
    style.textContent = `
      [${HEATMAP_DATA_ATTR}] { transition: background-color 0.18s ease, box-shadow 0.18s ease !important; }
      [${HEATMAP_DATA_ATTR}]:hover { outline: 2px solid currentColor; outline-offset: 2px; }
    `;
    document.head.appendChild(style);
  }

  const candidates = document.querySelectorAll<HTMLElement>(HEATMAP_SELECTORS);
  let tinted = 0;

  for (const el of Array.from(candidates)) {
    if (el.hasAttribute(HEATMAP_DATA_ATTR)) continue;
    if (isInsideSkipped(el)) continue;

    const directText = getDirectText(el);
    const text = directText || (el.tagName.match(/^H[1-6]$/) ? (el.innerText ?? "").trim() : "");
    if (text.length < 20) continue;

    const hasSchema = detectSchemaContext(el);
    const hasLinks = el.querySelector("a[href^='http']") !== null;
    const result = scoreQuoteability(text, { hasSchema, hasLinks });

    heatmapEntries.push({
      el,
      prevBg: el.style.backgroundColor,
      prevBoxShadow: el.style.boxShadow,
      prevTransition: el.style.transition,
      score: result.score,
      tier: result.tier,
    });

    el.setAttribute(HEATMAP_DATA_ATTR, String(result.score));
    el.style.setProperty("background-color", TIER_TINTS[result.tier], "important");
    el.style.setProperty("box-shadow", `inset 4px 0 0 ${TIER_BORDERS[result.tier]}`, "important");
    tinted++;
  }

  showToast(`Heatmap on — ${tinted} text blocks scored`);
}

function removeHeatmap() {
  for (const { el, prevBg, prevBoxShadow, prevTransition } of heatmapEntries) {
    el.style.backgroundColor = prevBg;
    el.style.boxShadow = prevBoxShadow;
    el.style.transition = prevTransition;
    el.removeAttribute(HEATMAP_DATA_ATTR);
  }
  heatmapEntries.length = 0;
  document.getElementById(HEATMAP_STYLE_ID)?.remove();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PARSE_PAGE") {
    try {
      sendResponse({ success: true, page: parseCurrentPage() });
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }

  if (message.type === "HIGHLIGHT") {
    highlightFinding(message.findingId);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "CLEAR_HIGHLIGHTS") {
    clearAllHighlights();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "BADGE_UPDATE") {
    renderBadge(message.score as VisibilityScore);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "BADGE_HIDE") {
    hideBadge();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "HEATMAP_SHOW") {
    try {
      applyHeatmap();
      sendResponse({ success: true, count: heatmapEntries.length });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }

  if (message.type === "HEATMAP_HIDE") {
    removeHeatmap();
    sendResponse({ success: true });
    return true;
  }
});
