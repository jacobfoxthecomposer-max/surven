import { parseCurrentPage } from "../shared/domParser";
import type { VisibilityScore } from "../shared/scoring";
import { scoreQuoteability, TIER_TINTS, TIER_BORDERS, TIER_GLOWS, TIER_LABELS, TIER_DESCRIPTIONS } from "../shared/quoteability";
import type { QuoteScore } from "../shared/quoteability";
import { scanSchema } from "../shared/schemaDetect";
import type { SchemaScanResult } from "../shared/schemaDetect";

const BADGE_HOST_ID = "surven-badge-host";
const HEATMAP_DATA_ATTR = "data-surven-heatmap";
const HEATMAP_STYLE_ID = "surven-heatmap-style";

interface HeatmapEntry {
  el: HTMLElement;
  prevBg: string;
  prevBoxShadow: string;
  prevTransition: string;
  prevBorderRadius: string;
  result: QuoteScore;
}

const heatmapEntries: HeatmapEntry[] = [];
const HEATMAP_TOOLTIP_ID = "surven-heatmap-tooltip-host";
const HEATMAP_LEGEND_ID = "surven-heatmap-legend-host";
const SCHEMA_OVERLAY_STYLE_ID = "surven-schema-overlay-style";
const SCHEMA_INVENTORY_HOST_ID = "surven-schema-inventory-host";
const SCHEMA_LABEL_CLASS = "surven-schema-label";
let tooltipHideTimer: number | null = null;

interface SchemaOverlayEntry {
  el: HTMLElement;
  prevOutline: string;
  prevOutlineOffset: string;
  prevPosition: string;
  label: HTMLElement;
}

const schemaOverlayEntries: SchemaOverlayEntry[] = [];

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

// Selectors for visible findings — each maps to candidate selectors tried in order
const FINDING_SELECTORS: Record<string, string[]> = {
  credentials_missing: ["[id*='about' i]", "[class*='about' i]", "[id*='team' i]", "[class*='team' i]", "[id*='credential' i]", "[class*='credential' i]", "footer"],
  credentials_low: ["[id*='about' i]", "[class*='about' i]", "[id*='team' i]", "[class*='team' i]", "footer"],
  content_freshness_unknown: ["main", "article", "[role='main']", "[id*='content' i]", "[class*='content' i]", "section"],
  content_stale: ["main", "article", "[role='main']", "[id*='content' i]", "[class*='content' i]", "section"],
  content_outdated: ["main", "article", "[role='main']", "[id*='content' i]", "[class*='content' i]", "section"],
  faq_schema_missing: ["[class*='faq' i]", "[id*='faq' i]", "[class*='accordion' i]", "details", "dl"],
  faq_schema_insufficient: ["[class*='faq' i]", "[id*='faq' i]", "[class*='accordion' i]", "details", "dl"],
  local_business_schema_missing: ["address", "[class*='contact' i]", "[class*='location' i]", "[id*='contact' i]", "footer"],
  citation_consistency: ["address", "[class*='contact' i]", "[class*='location' i]", "footer"],
  alt_text_missing: ["img:not([alt])", "img[alt='']"],
  images_missing_alt: ["img:not([alt])", "img[alt='']"],
  duplicate_titles: ["h1"],
  thin_content: ["main", "article", "[role='main']"],
  word_count_low: ["main", "article", "[role='main']"],
  no_h1: ["body"],
  multiple_h1: ["h1"],
  broken_links: ["a[href^='http']"],
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

type FindingSeverity = "critical" | "high" | "medium" | "low";

const FINDING_PULSE_STYLE_ID = "surven-finding-pulse-style";

function ensureFindingPulseStyle() {
  if (document.getElementById(FINDING_PULSE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = FINDING_PULSE_STYLE_ID;
  style.textContent = `
    @keyframes survenFindingPulseCritical {
      0%, 100% { box-shadow: 0 0 0 0 rgba(181, 70, 49, 0.65); }
      50% { box-shadow: 0 0 0 16px rgba(181, 70, 49, 0); }
    }
    @keyframes survenFindingPulseHigh {
      0%, 100% { box-shadow: 0 0 0 0 rgba(201, 123, 69, 0.6); }
      50% { box-shadow: 0 0 0 16px rgba(201, 123, 69, 0); }
    }
    @keyframes survenFindingPulseMedium {
      0%, 100% { box-shadow: 0 0 0 0 rgba(212, 169, 90, 0.6); }
      50% { box-shadow: 0 0 0 16px rgba(212, 169, 90, 0); }
    }
    @keyframes survenFindingPulseLow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(150, 162, 131, 0.6); }
      50% { box-shadow: 0 0 0 16px rgba(150, 162, 131, 0); }
    }
  `;
  document.head.appendChild(style);
}

function scrollAndPulseFinding(el: HTMLElement, severity: FindingSeverity = "medium") {
  ensureFindingPulseStyle();
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const animationName = `survenFindingPulse${severity[0].toUpperCase()}${severity.slice(1)}`;
  const prevAnimation = el.style.animation;
  el.style.setProperty("animation", `${animationName} 1.4s ease-out 3`, "important");
  setTimeout(() => {
    el.style.animation = prevAnimation;
  }, 4400);
}

function highlightFinding(findingId: string, severity: FindingSeverity = "medium") {
  clearAllHighlights();

  const selectors = FINDING_SELECTORS[findingId];

  if (!selectors) {
    const msg = INVISIBLE_MESSAGES[findingId] ?? "This fix is in your <head> or invisible code — see sidebar for details";
    showToast(msg);
    return;
  }

  for (const selector of selectors) {
    const els = document.querySelectorAll<HTMLElement>(selector);
    if (els.length > 0) {
      scrollAndPulseFinding(els[0], severity);
      return;
    }
  }

  showToast("Could not find a matching element on this page — see sidebar for the fix");
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
      [${HEATMAP_DATA_ATTR}] {
        transition: box-shadow 0.25s ease, transform 0.2s ease !important;
        border-radius: 6px !important;
        animation: survenHeatmapIn 1.6s cubic-bezier(0.22, 1, 0.36, 1) both !important;
      }
      @keyframes survenHeatmapIn {
        0% { background-color: transparent !important; box-shadow: inset 0 0 0 transparent !important; opacity: 0.55; }
        40% { opacity: 0.85; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  ensureTooltipHost();

  const candidates = document.querySelectorAll<HTMLElement>(HEATMAP_SELECTORS);
  const tierCounts = { high: 0, mid: 0, low: 0 };
  let staggerIndex = 0;

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
      prevBorderRadius: el.style.borderRadius,
      result,
    });

    el.setAttribute(HEATMAP_DATA_ATTR, String(result.score));
    el.style.setProperty("background-color", TIER_TINTS[result.tier], "important");
    el.style.setProperty(
      "box-shadow",
      `inset 6px 0 0 ${TIER_BORDERS[result.tier]}, 0 1px 4px rgba(0,0,0,0.06)`,
      "important",
    );
    const delay = Math.min(staggerIndex * 0.025, 0.6);
    el.style.setProperty("animation-delay", `${delay}s`, "important");

    el.addEventListener("mouseenter", onTintedMouseEnter);
    el.addEventListener("mouseleave", onTintedMouseLeave);

    tierCounts[result.tier]++;
    staggerIndex++;
  }

  const total = tierCounts.high + tierCounts.mid + tierCounts.low;
  showToast(`Heatmap on — ${total} blocks scored · ${tierCounts.high} high · ${tierCounts.mid} mid · ${tierCounts.low} low`);
  renderLegend(tierCounts);
}

function removeHeatmap() {
  for (const { el, prevBg, prevBoxShadow, prevTransition, prevBorderRadius } of heatmapEntries) {
    el.style.backgroundColor = prevBg;
    el.style.boxShadow = prevBoxShadow;
    el.style.transition = prevTransition;
    el.style.borderRadius = prevBorderRadius;
    el.style.removeProperty("animation-delay");
    el.removeAttribute(HEATMAP_DATA_ATTR);
    el.removeEventListener("mouseenter", onTintedMouseEnter);
    el.removeEventListener("mouseleave", onTintedMouseLeave);
  }
  heatmapEntries.length = 0;
  document.getElementById(HEATMAP_STYLE_ID)?.remove();
  document.getElementById(HEATMAP_TOOLTIP_ID)?.remove();
  document.getElementById(HEATMAP_LEGEND_ID)?.remove();
}

function renderLegend(counts: { high: number; mid: number; low: number }) {
  document.getElementById(HEATMAP_LEGEND_ID)?.remove();

  const host = document.createElement("div");
  host.id = HEATMAP_LEGEND_ID;
  host.style.cssText = "position: fixed !important; left: 20px !important; bottom: 20px !important; z-index: 2147483646 !important; pointer-events: none !important; display: block !important;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 32px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.06);
        padding: 12px 14px;
        font-size: 12px;
        color: #1a1a1a;
        opacity: 0;
        transform: translateY(8px);
        animation: legendIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both;
        border: 1px solid rgba(0,0,0,0.05);
        min-width: 200px;
      }
      @keyframes legendIn {
        to { opacity: 1; transform: translateY(0); }
      }
      .title {
        font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
        color: #888; margin-bottom: 8px;
      }
      .row {
        display: flex; align-items: center; gap: 10px; padding: 4px 0;
      }
      .swatch {
        width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0;
        position: relative;
      }
      .swatch::before {
        content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 4px 0 0 4px;
      }
      .swatch.high { background: rgba(150, 162, 131, 0.38); }
      .swatch.high::before { background: rgba(107, 122, 89, 0.95); }
      .swatch.mid { background: rgba(212, 169, 90, 0.36); }
      .swatch.mid::before { background: rgba(170, 130, 60, 0.95); }
      .swatch.low { background: rgba(181, 70, 49, 0.30); }
      .swatch.low::before { background: rgba(140, 50, 35, 0.85); }
      .label { font-weight: 600; font-size: 12px; color: #333; flex: 1; }
      .count { font-variant-numeric: tabular-nums; color: #888; font-size: 11px; font-weight: 600; }
    </style>
    <div class="card">
      <div class="title">Quote-ability Heatmap</div>
      <div class="row"><span class="swatch high"></span><span class="label">AI will likely quote</span><span class="count">${counts.high}</span></div>
      <div class="row"><span class="swatch mid"></span><span class="label">Maybe quotable</span><span class="count">${counts.mid}</span></div>
      <div class="row"><span class="swatch low"></span><span class="label">AI will probably skip</span><span class="count">${counts.low}</span></div>
    </div>
  `;
}

function ensureTooltipHost(): ShadowRoot {
  let host = document.getElementById(HEATMAP_TOOLTIP_ID);
  if (host && host.shadowRoot) return host.shadowRoot;

  host = document.createElement("div");
  host.id = HEATMAP_TOOLTIP_ID;
  host.style.cssText = "position: fixed !important; top: 0 !important; left: 0 !important; z-index: 2147483646 !important; pointer-events: none !important; display: block !important;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .tip {
        position: fixed;
        max-width: 320px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 14px 44px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08);
        padding: 14px 16px;
        font-size: 13px;
        color: #1a1a1a;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        pointer-events: none;
        border: 1px solid rgba(0,0,0,0.06);
      }
      .tip.visible { opacity: 1; transform: translateY(0); }
      .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
      .score { font-size: 26px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
      .tier { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .summary { font-size: 12px; color: #666; line-height: 1.45; margin-bottom: 10px; }
      .signal-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid #f0f0f0; padding-top: 8px; }
      .signal { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; font-size: 12px; line-height: 1.4; }
      .sig-icon {
        flex-shrink: 0;
        width: 14px; height: 14px; border-radius: 999px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 10px; font-weight: 700; color: white;
        margin-top: 1px;
      }
      .sig-icon.pos { background: #6B7A59; }
      .sig-icon.neg { background: #B54631; }
      .sig-text { flex: 1; }
      .sig-label { font-weight: 600; color: #333; }
      .sig-detail { color: #666; font-size: 11px; margin-top: 1px; }
      .footer-hint { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; font-size: 10px; color: #999; text-align: center; letter-spacing: 0.3px; text-transform: uppercase; }
    </style>
    <div class="tip" id="tip"></div>
  `;
  return root;
}

function onTintedMouseEnter(e: Event) {
  const el = e.currentTarget as HTMLElement;
  const entry = heatmapEntries.find((x) => x.el === el);
  if (!entry) return;

  el.style.setProperty(
    "box-shadow",
    `inset 6px 0 0 ${TIER_BORDERS[entry.result.tier]}, 0 8px 24px ${TIER_GLOWS[entry.result.tier]}`,
    "important",
  );
  el.style.setProperty("transform", "translateY(-2px)", "important");

  if (tooltipHideTimer !== null) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }

  const root = ensureTooltipHost();
  const tip = root.getElementById("tip");
  if (!tip) return;

  const { result } = entry;
  const tierColor = TIER_BORDERS[result.tier];

  const signalsHtml = result.signals
    .slice(0, 6)
    .map(
      (s) => `
        <li class="signal">
          <span class="sig-icon ${s.positive ? "pos" : "neg"}">${s.positive ? "+" : "−"}</span>
          <span class="sig-text">
            <div class="sig-label">${escapeHtml(s.label)}</div>
            <div class="sig-detail">${escapeHtml(s.detail)}</div>
          </span>
        </li>
      `,
    )
    .join("");

  tip.innerHTML = `
    <div class="head">
      <div>
        <div class="score" style="color: ${tierColor}">${result.score}</div>
        <div class="tier" style="color: ${tierColor}">${escapeHtml(TIER_LABELS[result.tier])}</div>
      </div>
    </div>
    <div class="summary">${escapeHtml(TIER_DESCRIPTIONS[result.tier])}</div>
    <ul class="signal-list">${signalsHtml}</ul>
    <div class="footer-hint">Surven Quote-ability Score</div>
  `;

  positionTooltip(tip as HTMLElement, el);
  requestAnimationFrame(() => tip.classList.add("visible"));
}

function onTintedMouseLeave(e: Event) {
  const el = e.currentTarget as HTMLElement;
  const entry = heatmapEntries.find((x) => x.el === el);
  if (entry) {
    el.style.setProperty(
      "box-shadow",
      `inset 6px 0 0 ${TIER_BORDERS[entry.result.tier]}, 0 1px 4px rgba(0,0,0,0.06)`,
      "important",
    );
    el.style.setProperty("transform", "translateY(0)", "important");
  }

  if (tooltipHideTimer !== null) clearTimeout(tooltipHideTimer);
  tooltipHideTimer = window.setTimeout(() => {
    const host = document.getElementById(HEATMAP_TOOLTIP_ID);
    const tip = host?.shadowRoot?.getElementById("tip");
    tip?.classList.remove("visible");
  }, 80);
}

function positionTooltip(tip: HTMLElement, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const tipW = Math.max(tipRect.width, 320);
  const tipH = Math.max(tipRect.height, 180);
  const margin = 12;

  let left = rect.right + margin;
  let top = rect.top;

  if (left + tipW > window.innerWidth - margin) {
    left = rect.left - tipW - margin;
  }
  if (left < margin) {
    left = Math.max(margin, rect.left);
    top = rect.bottom + margin;
  }
  if (top + tipH > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - tipH - margin);
  }
  if (top < margin) top = margin;

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
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

function applySchemaOverlay() {
  removeSchemaOverlay();

  if (!document.getElementById(SCHEMA_OVERLAY_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = SCHEMA_OVERLAY_STYLE_ID;
    style.textContent = `
      .${SCHEMA_LABEL_CLASS} {
        position: absolute !important;
        top: -12px !important;
        left: 12px !important;
        z-index: 2147483645 !important;
        padding: 3px 8px !important;
        font: 600 10px/1.3 system-ui, -apple-system, sans-serif !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        border-radius: 4px !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12) !important;
      }
      .${SCHEMA_LABEL_CLASS}.present {
        background: rgba(107, 122, 89, 0.95) !important;
        color: white !important;
      }
      .${SCHEMA_LABEL_CLASS}.missing {
        background: rgba(140, 50, 35, 0.95) !important;
        color: white !important;
      }
      @keyframes survenSchemaPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(181, 70, 49, 0.6) !important; }
        50% { box-shadow: 0 0 0 14px rgba(181, 70, 49, 0) !important; }
      }
    `;
    document.head.appendChild(style);
  }

  const result = scanSchema();

  for (const m of result.marked) {
    addSchemaOutline(m.el, m.type, "present");
  }

  for (const c of result.missing) {
    addSchemaOutline(c.el, `Missing: ${c.suggestedType}`, "missing");
  }

  renderSchemaInventory(result);
  showToast(`Schema overlay on — ${result.inventory.length} types found · ${result.marked.length} marked elements · ${result.missing.length} missing`);
}

function addSchemaOutline(el: HTMLElement, type: string, kind: "present" | "missing") {
  const prevOutline = el.style.outline;
  const prevOutlineOffset = el.style.outlineOffset;
  const prevPosition = el.style.position;

  const color = kind === "present" ? "rgba(107, 122, 89, 0.95)" : "rgba(140, 50, 35, 0.85)";
  const style = kind === "present" ? "solid" : "dashed";

  el.style.setProperty("outline", `3px ${style} ${color}`, "important");
  el.style.setProperty("outline-offset", "4px", "important");
  if (getComputedStyle(el).position === "static") {
    el.style.setProperty("position", "relative", "important");
  }

  const label = document.createElement("span");
  label.className = `${SCHEMA_LABEL_CLASS} ${kind}`;
  label.textContent = type;
  el.appendChild(label);

  schemaOverlayEntries.push({ el, prevOutline, prevOutlineOffset, prevPosition, label });
}

function removeSchemaOverlay() {
  for (const { el, prevOutline, prevOutlineOffset, prevPosition, label } of schemaOverlayEntries) {
    el.style.outline = prevOutline;
    el.style.outlineOffset = prevOutlineOffset;
    el.style.position = prevPosition;
    label.remove();
  }
  schemaOverlayEntries.length = 0;
  document.getElementById(SCHEMA_OVERLAY_STYLE_ID)?.remove();
  document.getElementById(SCHEMA_INVENTORY_HOST_ID)?.remove();
}

function renderSchemaInventory(result: SchemaScanResult) {
  document.getElementById(SCHEMA_INVENTORY_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = SCHEMA_INVENTORY_HOST_ID;
  host.style.cssText = "position: fixed !important; right: 20px !important; bottom: 80px !important; z-index: 2147483646 !important; pointer-events: auto !important; display: block !important;";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const presentTypes = Array.from(new Set(result.inventory.map((i) => i.type)));
  const missingByType = new Map<string, typeof result.missing>();
  for (const m of result.missing) {
    if (!missingByType.has(m.suggestedType)) missingByType.set(m.suggestedType, []);
    missingByType.get(m.suggestedType)!.push(m);
  }

  const presentHtml = presentTypes.length > 0
    ? presentTypes.map((t) => `
        <li class="row" data-type="${escapeHtml(t)}">
          <span class="dot present"></span>
          <span class="name">${escapeHtml(t)}</span>
          <span class="src">${result.inventory.find((i) => i.type === t)?.source === "json-ld" ? "JSON-LD" : "Microdata"}</span>
        </li>
      `).join("")
    : `<li class="empty">No structured data on this page</li>`;

  const missingHtml = result.missing.length > 0
    ? Array.from(missingByType.entries()).map(([type, items]) => `
        <li class="row missing clickable" data-missing-type="${escapeHtml(type)}" data-missing-index="0">
          <span class="dot missing"></span>
          <span class="name">${escapeHtml(type)}${items.length > 1 ? ` <span class="count">(${items.length})</span>` : ""}</span>
          <span class="reason">${escapeHtml(items[0].reason)}</span>
          <span class="cta">${items.length > 1 ? `Click to cycle ${items.length}` : "Click to scroll"} →</span>
        </li>
      `).join("")
    : `<li class="empty good">No obvious schema gaps detected</li>`;

  root.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      .card {
        width: 320px; max-height: 480px; overflow-y: auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06);
        padding: 14px 16px;
        font-size: 12px;
        color: #1a1a1a;
        opacity: 0;
        transform: translateY(8px);
        animation: schemaCardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
        border: 1px solid rgba(0,0,0,0.05);
      }
      @keyframes schemaCardIn { to { opacity: 1; transform: translateY(0); } }
      .title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6B7A59; margin-bottom: 8px; }
      .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 12px 0 6px; }
      ul { margin: 0; padding: 0; list-style: none; }
      .row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
      .row:last-child { border-bottom: none; }
      .row.missing { flex-wrap: wrap; }
      .row.clickable { cursor: pointer; padding: 8px; margin: 2px -4px; border-radius: 6px; transition: background 0.15s ease; border-bottom: none; }
      .row.clickable:hover { background: rgba(181, 70, 49, 0.08); }
      .dot { width: 9px; height: 9px; border-radius: 999px; flex-shrink: 0; }
      .dot.present { background: #6B7A59; }
      .dot.missing { background: #B54631; }
      .name { font-weight: 600; color: #333; flex: 0 0 auto; }
      .name .count { font-weight: 500; color: #888; font-size: 11px; }
      .src { font-size: 10px; color: #888; font-weight: 600; padding: 2px 6px; background: #f5f5f5; border-radius: 4px; margin-left: auto; }
      .reason { font-size: 11px; color: #B54631; flex: 1 0 100%; padding-left: 17px; line-height: 1.35; margin-top: 2px; }
      .cta { font-size: 10px; color: #B54631; font-weight: 600; flex: 1 0 100%; padding-left: 17px; margin-top: 4px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.4px; }
      .row.clickable:hover .cta { opacity: 1; }
      .empty { font-size: 12px; color: #888; padding: 8px 0; font-style: italic; }
      .empty.good { color: #6B7A59; font-style: normal; }
      .footnote { font-size: 10px; color: #999; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0; line-height: 1.4; }
      @keyframes survenSchemaPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(181, 70, 49, 0.6); }
        50% { box-shadow: 0 0 0 12px rgba(181, 70, 49, 0); }
      }
    </style>
    <div class="card">
      <div class="title">Schema Inventory</div>
      <div class="section-label">Present (${presentTypes.length})</div>
      <ul>${presentHtml}</ul>
      <div class="section-label">Suggested (${result.missing.length})</div>
      <ul>${missingHtml}</ul>
      <div class="footnote">Sage outlines = schema present. Rust dashed = schema missing for detected pattern. Click any missing item to scroll to it.</div>
    </div>
  `;

  const missingByTypeArr = Array.from(missingByType.entries());
  const cycleIndex = new Map<string, number>();
  for (const [type] of missingByTypeArr) cycleIndex.set(type, 0);

  root.querySelectorAll<HTMLElement>(".row.clickable").forEach((row) => {
    row.addEventListener("click", () => {
      const type = row.getAttribute("data-missing-type") ?? "";
      const items = missingByType.get(type) ?? [];
      if (items.length === 0) return;
      const idx = cycleIndex.get(type) ?? 0;
      const target = items[idx % items.length];
      cycleIndex.set(type, idx + 1);
      scrollAndPulseElement(target.el);
    });
  });
}

function scrollAndPulseElement(el: HTMLElement) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const prevAnimation = el.style.animation;
  el.style.setProperty("animation", "survenSchemaPulse 1.4s ease-out 2", "important");
  setTimeout(() => {
    el.style.animation = prevAnimation;
  }, 2900);
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
    highlightFinding(message.findingId, message.severity);
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

  if (message.type === "SCHEMA_SHOW") {
    try {
      applySchemaOverlay();
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }

  if (message.type === "SCHEMA_HIDE") {
    removeSchemaOverlay();
    sendResponse({ success: true });
    return true;
  }
});
