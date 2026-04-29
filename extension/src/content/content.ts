import { parseCurrentPage } from "../shared/domParser";

const SAGE = "rgba(150, 162, 131, 0.35)";
const SAGE_BORDER = "3px solid rgba(107, 122, 89, 0.85)";

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
});
