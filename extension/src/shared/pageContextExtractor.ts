/**
 * Page-context extractor — runs in the content script, extracts structured business
 * data from the current DOM. Used to build the PageContext object sent to
 * /api/audit/generate.
 *
 * Designed to fail gracefully — every field is optional. If we can't find an
 * address, we don't fabricate one. The schema generator on the server returns
 * "Not enough data" errors honestly when required fields are missing.
 */

import { detectPlatform, type CmsPlatform } from "./platformInstructions";

export interface ExtractedPageContext {
  url: string;
  title?: string;
  description?: string;
  businessName?: string;
  bodyContent?: string;
  platform?: CmsPlatform;
  /**
   * True when the page looks like a dashboard, admin panel, directory, or any UI
   * that displays content ABOUT other entities. On these pages we deliberately skip
   * extracting business-identity fields from body text (phone, address, hours, etc.)
   * because they probably belong to a featured entity, not the site itself.
   */
  ambiguousPage?: boolean;
  ambiguousReasons?: string[];
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  hours?: Array<{ days: string; opens: string; closes: string }>;
  socials?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  reviewItems?: Array<{ author?: string; rating?: number; text?: string }>;
  productItems?: Array<{ name: string; price?: string; image?: string; description?: string }>;
  serviceItems?: Array<{ name: string; description?: string }>;
  videoItems?: Array<{ name?: string; description?: string; thumbnailUrl?: string; embedUrl?: string }>;
  personItems?: Array<{ name: string; jobTitle?: string; image?: string; bio?: string }>;
  breadcrumbItems?: Array<{ name: string; url: string }>;
  articleHeadline?: string;
  articleAuthor?: string;
  articleDate?: string;
  logo?: string;
}

const SOCIAL_DOMAINS = [
  "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
  "youtube.com", "tiktok.com", "pinterest.com", "yelp.com", "github.com",
];

// Path patterns that mean "individual post / content" rather than "profile page".
// Used to filter out Instagram reels, Facebook posts, etc. from the sameAs list.
const CONTENT_URL_PATTERNS: Record<string, RegExp[]> = {
  "instagram.com": [/^\/(p|reel|tv|stories|explore)\//i],
  "facebook.com": [/^\/(posts|videos|photos|story)\//i, /\/permalink\//i],
  "twitter.com": [/\/status\//i],
  "x.com": [/\/status\//i],
  "youtube.com": [/^\/watch/i, /^\/shorts\//i],
  "linkedin.com": [/\/(posts|pulse|feed)\//i],
  "tiktok.com": [/\/video\//i],
  "pinterest.com": [/\/pin\//i],
};

const STATE_ABBREVIATIONS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

const STREET_SUFFIX = /(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Ln|Lane|Pl|Place|Ct|Court|Hwy|Highway|Pkwy|Parkway)\.?/i;

export function extractPageContext(): ExtractedPageContext {
  const ctx: ExtractedPageContext = {
    url: getCanonicalUrl(),
  };

  ctx.title = document.title?.trim() || undefined;
  ctx.description = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content?.trim() || undefined;
  ctx.bodyContent = extractBodyContent();
  ctx.platform = detectPlatform();

  const ambiguity = detectPageAmbiguity();
  ctx.ambiguousPage = ambiguity.ambiguous;
  ctx.ambiguousReasons = ambiguity.reasons.length > 0 ? ambiguity.reasons : undefined;

  ctx.businessName = extractBusinessName(ambiguity.ambiguous);
  ctx.logo = extractLogo();
  ctx.phone = extractPhone(ambiguity.ambiguous);
  ctx.address = extractAddress(ambiguity.ambiguous);
  ctx.hours = extractHours(ambiguity.ambiguous);
  ctx.socials = extractSocials();

  // Content-feature extractors (FAQ, reviews, products, etc.) describe what the page DISPLAYS.
  // On ambiguous pages, displayed content probably belongs to OTHER entities, so skip these
  // entirely — better to return nothing than to mark up another business's reviews as the
  // current site's reviews.
  if (!ambiguity.ambiguous) {
    ctx.faqItems = extractFaqItems();
    ctx.reviewItems = extractReviewItems();
    ctx.productItems = extractProductItems();
    ctx.serviceItems = extractServiceItems();
    ctx.videoItems = extractVideoItems();
    ctx.personItems = extractPersonItems();
    ctx.breadcrumbItems = extractBreadcrumbItems();

    const article = extractArticleMeta();
    if (article) {
      ctx.articleHeadline = article.headline;
      ctx.articleAuthor = article.author;
      ctx.articleDate = article.datePublished;
    }
  }

  return ctx;
}

interface AmbiguityResult {
  ambiguous: boolean;
  reasons: string[];
}

/**
 * Detect when a page is likely a dashboard, admin panel, directory, or feed showing data ABOUT
 * other entities. On these pages, body-text signals (phone numbers, addresses, business names)
 * usually belong to a FEATURED entity, not the site itself — so we should skip those.
 *
 * Triggers (any 1 = ambiguous):
 *   - URL contains /dashboard, /admin, /portal, /clients, /properties
 *   - Document title contains "Dashboard", "Admin", "Portal"
 *   - 3+ phone numbers visible on page (likely a directory)
 *   - 3+ street addresses visible on page (likely a directory)
 *   - Auth UI present (sign-out button, user avatar dropdown)
 *   - Multiple JSON-LD entities with different @type/name (likely a CMS rendering 3rd-party data)
 */
function detectPageAmbiguity(): AmbiguityResult {
  const reasons: string[] = [];

  const url = window.location.href.toLowerCase();
  if (/\/(dashboard|admin|portal|clients?|properties|members?|users?|directory)\b/.test(url)) {
    reasons.push("URL suggests admin / directory page");
  }

  const title = (document.title ?? "").toLowerCase();
  if (/\b(dashboard|admin|portal|control panel)\b/.test(title)) {
    reasons.push("Page title contains 'dashboard' / 'admin' / 'portal'");
  }

  const bodyText = document.body?.innerText ?? "";
  const phoneRe = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phones = new Set((bodyText.match(phoneRe) ?? []).map((p) => p.replace(/\D/g, "")));
  if (phones.size >= 3) {
    reasons.push(`${phones.size} different phone numbers on this page — looks like a directory`);
  }

  const addressRe = new RegExp(`\\b\\d{1,5}\\s+\\w+(\\s+\\w+){0,4}\\s+${STREET_SUFFIX.source}\\b`, "gi");
  const addressCount = (bodyText.match(addressRe) ?? []).length;
  if (addressCount >= 3) {
    reasons.push(`${addressCount} different street addresses on this page — looks like a directory`);
  }

  // Auth chrome — but EXCLUDE buttons inside known CMS admin bars. A WordPress site's
  // public front-end shows a "Log Out" link in #wpadminbar when an admin is viewing it,
  // but that doesn't make the page a SaaS dashboard — it's still the real public page.
  const authButtons = Array.from(document.querySelectorAll("button, a")).filter((el) => {
    const text = (el as HTMLElement).innerText?.trim().toLowerCase() ?? "";
    if (!/^(sign\s*out|log\s*out|logout|signout)$/i.test(text)) return false;
    // Skip if inside a CMS admin bar (WordPress, Shopify preview bar, Webflow Designer, etc.)
    if (el.closest("#wpadminbar, #shopify-section-header, [class*='admin-bar'], [class*='admin_bar']")) return false;
    return true;
  });
  if (authButtons.length > 0) {
    reasons.push("Page has a sign-out button — looks like an authenticated app");
  }

  // Multiple distinct JSON-LD entities
  const ldNames = new Set<string>();
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const s of Array.from(scripts)) {
    try {
      const parsed = JSON.parse(s.textContent ?? "");
      collectNamesFromJsonLd(parsed, ldNames);
    } catch {
      // skip
    }
  }
  if (ldNames.size >= 3) {
    reasons.push("Multiple distinct JSON-LD entities on the page");
  }

  return { ambiguous: reasons.length > 0, reasons };
}

function collectNamesFromJsonLd(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectNamesFromJsonLd(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.name === "string" && obj.name.length > 0 && obj.name.length < 100) {
    out.add(obj.name);
  }
  if (obj["@graph"]) collectNamesFromJsonLd(obj["@graph"], out);
  if (obj["mainEntity"]) collectNamesFromJsonLd(obj["mainEntity"], out);
  if (obj["itemListElement"]) collectNamesFromJsonLd(obj["itemListElement"], out);
}


/**
 * Returns the canonical URL for the page, preferring (in order):
 *   1. <link rel="canonical"> href
 *   2. <meta property="og:url"> content
 *   3. window.location.href, but with Vercel preview hashes stripped
 *      (e.g. surven-abc123-someproject-x6.vercel.app → surven.vercel.app)
 *
 * Schemas should always reference the canonical URL — preview URLs change with every
 * deploy and confuse AI engines indexing the site.
 */
function getCanonicalUrl(): string {
  const canonical = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href?.trim();
  if (canonical) {
    try { return new URL(canonical).href; } catch { /* fall through */ }
  }

  const ogUrl = (document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null)?.content?.trim();
  if (ogUrl) {
    try { return new URL(ogUrl).href; } catch { /* fall through */ }
  }

  const current = window.location.href;
  try {
    const u = new URL(current);
    // Vercel preview pattern: <project>-<hash>-<scope>.vercel.app
    // Production: <project>.vercel.app or a custom domain
    const previewMatch = u.hostname.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)-[a-z0-9]{6,}-[a-z0-9-]+\.vercel\.app$/i);
    if (previewMatch) {
      u.hostname = `${previewMatch[1]}.vercel.app`;
      return u.href;
    }
    return current;
  } catch {
    return current;
  }
}

function extractBodyContent(): string | undefined {
  // Get visible main content, skipping nav/footer/aside/admin chrome.
  const main = document.querySelector("main, article, [role='main']") as HTMLElement | null;
  const sourceEl = main ?? document.body;
  if (!sourceEl) return undefined;

  // Clone and strip noisy chrome before reading text. The CMS admin bars (WordPress's
  // #wpadminbar, Shopify's preview bar, Webflow's designer chrome) are particularly
  // important to strip — they're not <nav>/<header> so they slip past generic chrome
  // selectors, and their text ("Howdy", "+ New", "Edit Page", "WordPress") makes the
  // LLM hallucinate that the page is about editing the CMS.
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  const stripSelectors = [
    "nav", "footer", "aside", "header",
    "script", "style", "noscript",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    "#wpadminbar", ".admin-bar", ".wp-toolbar",
    "#shopify-section-header", "[id*='admin-bar' i]",
    ".webflow-designer", "[data-wf-page]",
  ];
  for (const sel of stripSelectors) {
    for (const el of Array.from(clone.querySelectorAll(sel))) el.remove();
  }

  const text = (clone.innerText ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 50) return undefined;
  return text.slice(0, 3000);
}

function extractBusinessName(ambiguous = false): string | undefined {
  // Highest-confidence signal: og:site_name is explicitly the SITE'S name (set by the developer).
  const ogSite = (document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement | null)?.content?.trim();
  if (ogSite) return ogSite;

  // Second: WebSite-typed JSON-LD. WebSite specifically describes the SITE, unlike Organization/LocalBusiness
  // which might describe a featured entity on the page.
  const websiteName = readJsonLdValueByType(["name"], ["WebSite"]);
  if (websiteName) return websiteName;

  // Third: <title> split before separator. Title is a site-level signal in <head>.
  // Only split on space-bounded separators ("Page Title | Site" or "Page Title – Site"),
  // NEVER on plain hyphens — domain names like "felicitous-grivet-xyz.com" contain
  // hyphens but shouldn't be split apart.
  const titleParts = (document.title ?? "").split(/\s+[|–—]\s+|\s+-\s+/);
  const title = titleParts[0]?.trim();
  // Reject if it looks like a hostname / domain (e.g. "yoursite.instawp.site"). Those
  // aren't useful as a business name — better to fall through to H1.
  const looksLikeHostname = title ? /^[a-z0-9]+([-.][a-z0-9]+)+$/i.test(title) : false;
  if (title && title.length > 0 && title.length < 60 && !looksLikeHostname) {
    return title;
  }

  // Below this point: lower-confidence signals that can pick up DISPLAYED content on
  // dashboards, directories, etc. Skip them when ambiguous.
  if (ambiguous) return undefined;

  // Organization/LocalBusiness JSON-LD (lower confidence — could be the site's identity OR
  // a featured entity, but on non-ambiguous pages it's almost always the site's identity).
  const orgName = readJsonLdValueByType(["name"], ["Organization", "LocalBusiness", "Restaurant", "Store", "Corporation"]);
  if (orgName) return orgName;

  // H1 — weakest signal. Could be page-content title rather than site title.
  const h1 = document.querySelector("h1");
  if (h1 && h1.innerText.trim().length > 0 && h1.innerText.trim().length < 60) {
    return h1.innerText.trim();
  }

  return undefined;
}

function extractLogo(): string | undefined {
  const ogImage = (document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null)?.content;
  if (ogImage) return absoluteUrl(ogImage);

  const logoSelectors = [
    "img[class*='logo' i]",
    "img[id*='logo' i]",
    "img[alt*='logo' i]",
    "header img",
    "nav img",
  ];
  for (const sel of logoSelectors) {
    const img = document.querySelector(sel) as HTMLImageElement | null;
    if (img?.src) return absoluteUrl(img.src);
  }

  return undefined;
}

function extractPhone(ambiguous = false): string | undefined {
  // tel: links are intentional contact links on the page — strongest signal.
  // Prefer ones in header/footer (site chrome) over main content.
  const allTelLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]'));
  if (allTelLinks.length > 0) {
    const chromeFirst = allTelLinks.find((el) => el.closest("header, footer, [role='banner'], [role='contentinfo']"));
    const chosen = chromeFirst ?? allTelLinks[0];
    const tel = chosen.getAttribute("href")?.replace(/^tel:/, "").trim();
    if (tel) return tel;
  }

  // No tel: link found. On ambiguous pages, refuse to pull a phone from body text
  // (it probably belongs to a featured entity, not this site).
  if (ambiguous) return undefined;

  // Try footer / header / contact-section text first — these are usually site chrome.
  const sectionText =
    (document.querySelector("footer") as HTMLElement | null)?.innerText ??
    (document.querySelector("address") as HTMLElement | null)?.innerText ??
    (document.querySelector("[class*='contact' i], [id*='contact' i]") as HTMLElement | null)?.innerText ??
    "";
  const phoneRe = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const sectionMatch = sectionText.match(phoneRe);
  if (sectionMatch) return sectionMatch[0]?.trim();

  // Last resort: body text. Risky on directories/listings even when not flagged as ambiguous,
  // so we double-check there's only one match.
  const bodyText = document.body.innerText;
  const allMatches = bodyText.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) ?? [];
  if (allMatches.length === 1) return allMatches[0].trim();

  // Multiple phones in body — too ambiguous.
  return undefined;
}

function extractAddress(ambiguous = false): ExtractedPageContext["address"] {
  // On ambiguous pages, don't pull an address from body text — it might belong to a
  // featured entity, not the site itself.
  if (ambiguous) return undefined;

  // Prefer footer / address element / contact section (site chrome).
  const sectionEl =
    (document.querySelector("address") as HTMLElement | null) ??
    (document.querySelector("footer") as HTMLElement | null) ??
    (document.querySelector("[class*='contact' i], [id*='contact' i]") as HTMLElement | null);
  const sectionText = sectionEl?.innerText ?? "";

  const streetRe = new RegExp(`\\b\\d{1,5}\\s+\\w+(\\s+\\w+){0,4}\\s+${STREET_SUFFIX.source}\\b`, "i");

  let streetMatch = sectionText.match(streetRe);
  let sourceText = sectionText;

  // Fall back to body text only if no chrome match AND there's exactly one address overall.
  if (!streetMatch) {
    const bodyText = document.body.innerText;
    const allMatches = bodyText.match(new RegExp(`\\b\\d{1,5}\\s+\\w+(\\s+\\w+){0,4}\\s+${STREET_SUFFIX.source}\\b`, "gi")) ?? [];
    if (allMatches.length !== 1) return undefined;
    streetMatch = bodyText.match(streetRe);
    sourceText = bodyText;
  }

  if (!streetMatch) return undefined;
  const street = streetMatch[0].trim();
  const startIdx = (streetMatch.index ?? 0) + street.length;
  const tail = sourceText.slice(startIdx, startIdx + 200);

  const cityStateZip = tail.match(/[\s,]*([A-Z][a-zA-Z .]+?)[\s,]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
  if (cityStateZip) {
    const region = cityStateZip[2].toUpperCase();
    return {
      street,
      city: cityStateZip[1].trim(),
      region: STATE_ABBREVIATIONS.has(region) ? region : cityStateZip[2],
      postalCode: cityStateZip[3],
      country: "US",
    };
  }

  return { street };
}

const DAY_NORMALIZE: Record<string, string> = {
  monday: "Monday", mon: "Monday",
  tuesday: "Tuesday", tue: "Tuesday", tues: "Tuesday",
  wednesday: "Wednesday", wed: "Wednesday",
  thursday: "Thursday", thu: "Thursday", thur: "Thursday", thurs: "Thursday",
  friday: "Friday", fri: "Friday",
  saturday: "Saturday", sat: "Saturday",
  sunday: "Sunday", sun: "Sunday",
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function expandDayLabel(label: string): string[] {
  const days: string[] = [];
  // Handle ranges like "Mon-Fri" or "Monday - Thursday"
  const rangeMatch = label.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\s*[-–—to]+\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)/i);
  if (rangeMatch) {
    const startName = DAY_NORMALIZE[rangeMatch[1].toLowerCase()];
    const endName = DAY_NORMALIZE[rangeMatch[2].toLowerCase()];
    if (startName && endName) {
      const startIdx = DAY_ORDER.indexOf(startName);
      const endIdx = DAY_ORDER.indexOf(endName);
      if (startIdx >= 0 && endIdx >= startIdx) {
        return DAY_ORDER.slice(startIdx, endIdx + 1);
      }
    }
  }
  // Otherwise extract every day name we find (handles "Wed/Thu/Fri" or "Wed, Thu, Fri")
  const tokens = label.toLowerCase().match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/g) ?? [];
  for (const tok of tokens) {
    const norm = DAY_NORMALIZE[tok];
    if (norm && !days.includes(norm)) days.push(norm);
  }
  return days;
}

function extractHours(ambiguous = false): ExtractedPageContext["hours"] {
  // On ambiguous pages, don't extract hours — they could belong to a featured entity.
  if (ambiguous) return undefined;

  const bodyText = document.body.innerText;
  const lines = bodyText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Bucket: key = "days|opens|closes", value = entry. Dedupes silently.
  const seen = new Map<string, { days: string; opens: string; closes: string }>();
  const dayPattern = /^(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[\s,/&]*)+/i;
  const timePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/;
  const closedPattern = /closed/i;

  for (const line of lines) {
    if (line.length > 120) continue;
    const dayMatch = line.match(dayPattern);
    if (!dayMatch) continue;

    if (closedPattern.test(line)) continue;

    const timeMatch = line.match(timePattern);
    if (!timeMatch) continue;

    const dayLabel = dayMatch[0].trim();
    const expandedDays = expandDayLabel(dayLabel);
    if (expandedDays.length === 0) continue;

    const opens = normalizeTime(timeMatch[1]);
    const closes = normalizeTime(timeMatch[2]);

    for (const day of expandedDays) {
      const key = `${day}|${opens}|${closes}`;
      if (seen.has(key)) continue;
      seen.set(key, { days: day, opens, closes });
    }
  }

  const result = DAY_ORDER
    .flatMap((d) => Array.from(seen.values()).filter((h) => h.days === d));
  return result.length > 0 ? result : undefined;
}

function normalizeTime(t: string): string {
  const cleaned = t.toLowerCase().replace(/\s+/g, "");
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (!match) return t;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ?? "00";
  const meridiem = match[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function extractSocials(): string[] | undefined {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
  // Map of domain → first profile URL we saw for that domain.
  // Schema.org sameAs expects ONE link per platform (the profile), not posts.
  const profileByDomain = new Map<string, string>();

  for (const link of links) {
    const href = link.href;
    if (!href.startsWith("http")) continue;
    try {
      const u = new URL(href);
      const urlHost = u.hostname.replace(/^www\./, "");
      const path = u.pathname.replace(/\/+$/, "");
      // A real profile has a meaningful path beyond the domain root.
      if (path.length < 2) continue;

      // Match against known social domains.
      const matchedDomain = SOCIAL_DOMAINS.find((d) => urlHost === d || urlHost.endsWith(`.${d}`));
      if (!matchedDomain) continue;

      // Skip individual posts / reels / videos — we only want profile URLs.
      const contentPatterns = CONTENT_URL_PATTERNS[matchedDomain];
      if (contentPatterns && contentPatterns.some((rx) => rx.test(path))) continue;

      // Keep only the first profile URL per domain.
      if (!profileByDomain.has(matchedDomain)) {
        profileByDomain.set(matchedDomain, href);
      }
    } catch {
      // skip malformed
    }
  }

  const socials = Array.from(profileByDomain.values());
  return socials.length > 0 ? socials : undefined;
}

function extractFaqItems(): ExtractedPageContext["faqItems"] {
  const items: ExtractedPageContext["faqItems"] = [];

  const dts = document.querySelectorAll("dl > dt");
  for (const dt of Array.from(dts)) {
    const dd = dt.nextElementSibling;
    if (dd?.tagName === "DD") {
      const q = (dt as HTMLElement).innerText.trim();
      const a = (dd as HTMLElement).innerText.trim();
      if (q && a) items.push({ question: q, answer: a });
    }
  }

  const detailsList = document.querySelectorAll("details");
  for (const det of Array.from(detailsList)) {
    const summary = det.querySelector("summary");
    if (!summary) continue;
    const q = (summary as HTMLElement).innerText.trim();
    const summaryClone = summary.cloneNode(true);
    summary.remove();
    const a = (det as HTMLElement).innerText.trim();
    summary.appendChild(summaryClone);
    if (q && a && q.length < 200 && a.length > 10) items.push({ question: q, answer: a });
  }

  if (items.length === 0) {
    const headings = Array.from(document.querySelectorAll("h2, h3, h4, h5")) as HTMLElement[];
    for (const h of headings) {
      const text = h.innerText.trim();
      if (!text.endsWith("?") && !/^(how|what|why|when|where|do you|can i|is it)\b/i.test(text)) continue;
      const next = h.nextElementSibling;
      if (next && (next.tagName === "P" || next.tagName === "DIV")) {
        const a = (next as HTMLElement).innerText.trim();
        if (a.length > 20 && a.length < 1000) items.push({ question: text, answer: a });
      }
    }
  }

  return items.length > 0 ? items.slice(0, 20) : undefined;
}

function extractReviewItems(): ExtractedPageContext["reviewItems"] {
  const items: ExtractedPageContext["reviewItems"] = [];
  const seen = new Set<string>();

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("blockquote, [class*='review' i], [class*='testimonial' i], [class*='quote' i]"));
  for (const el of candidates) {
    const text = el.innerText.trim();
    if (text.length < 30 || text.length > 1500) continue;
    const key = text.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);

    const attribMatch = text.match(/[—–-]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z]\.?)?)\s*$/m);
    const author = attribMatch?.[1]?.trim();
    const reviewText = attribMatch ? text.slice(0, attribMatch.index).trim().replace(/^["“”]|["“”]$/g, "").trim() : text;

    items.push({ author, text: reviewText });
    if (items.length >= 6) break;
  }

  return items.length > 0 ? items : undefined;
}

function extractProductItems(): ExtractedPageContext["productItems"] {
  const items: ExtractedPageContext["productItems"] = [];
  const seen = new Set<string>();

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[class*='product' i], [class*='item-card' i], [class*='shop-item' i]"));
  for (const el of candidates) {
    const text = el.innerText.trim();
    if (text.length === 0 || text.length > 800) continue;
    const priceMatch = text.match(/\$\d+(\.\d{2})?/);
    if (!priceMatch) continue;

    const heading = el.querySelector("h1, h2, h3, h4, [class*='name' i], [class*='title' i]") as HTMLElement | null;
    const name = heading?.innerText.trim() ?? text.split("\n")[0]?.trim();
    if (!name || name.length > 200) continue;

    const key = name.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const img = el.querySelector("img") as HTMLImageElement | null;
    items.push({
      name,
      price: priceMatch[0],
      image: img?.src ? absoluteUrl(img.src) : undefined,
    });

    if (items.length >= 12) break;
  }

  return items.length > 0 ? items : undefined;
}

function extractServiceItems(): ExtractedPageContext["serviceItems"] {
  const items: ExtractedPageContext["serviceItems"] = [];

  const headings = Array.from(document.querySelectorAll("h1, h2, h3")) as HTMLElement[];
  for (const h of headings) {
    if (!/(our\s+)?services?$|what\s+we\s+(do|offer)|offerings?/i.test(h.innerText.trim())) continue;
    const parent = h.parentElement;
    if (!parent) continue;
    const subItems = parent.querySelectorAll("h3, h4, li, [class*='service-item' i], [class*='card' i]");
    for (const sub of Array.from(subItems).slice(0, 12)) {
      const text = (sub as HTMLElement).innerText.trim();
      if (text.length < 4 || text.length > 400) continue;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const name = lines[0]?.slice(0, 100);
      const description = lines.slice(1).join(" ").slice(0, 300) || undefined;
      if (name) items.push({ name, description });
    }
    if (items.length > 0) break;
  }

  return items.length > 0 ? items : undefined;
}

function extractVideoItems(): ExtractedPageContext["videoItems"] {
  const items: ExtractedPageContext["videoItems"] = [];

  for (const video of Array.from(document.querySelectorAll("video")).slice(0, 5)) {
    const v = video as HTMLVideoElement;
    items.push({
      name: v.title || undefined,
      thumbnailUrl: v.poster ? absoluteUrl(v.poster) : undefined,
      embedUrl: v.currentSrc || v.src || undefined,
    });
  }

  for (const iframe of Array.from(document.querySelectorAll("iframe")).slice(0, 5)) {
    const f = iframe as HTMLIFrameElement;
    if (!f.src) continue;
    if (!/youtube|vimeo|wistia/i.test(f.src)) continue;
    items.push({
      name: f.title || undefined,
      embedUrl: f.src,
    });
  }

  return items.length > 0 ? items : undefined;
}

function extractPersonItems(): ExtractedPageContext["personItems"] {
  const items: ExtractedPageContext["personItems"] = [];

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[class*='team' i], [class*='member' i], [class*='profile' i], [class*='bio' i]"));
  for (const el of candidates) {
    const heading = el.querySelector("h1, h2, h3, h4, [class*='name' i]") as HTMLElement | null;
    const name = heading?.innerText.trim();
    if (!name || name.length > 100) continue;

    const img = el.querySelector("img") as HTMLImageElement | null;
    const titleEl = el.querySelector("[class*='title' i], [class*='role' i], [class*='position' i]") as HTMLElement | null;
    const bioP = el.querySelector("p");

    items.push({
      name,
      jobTitle: titleEl?.innerText.trim() || undefined,
      image: img?.src ? absoluteUrl(img.src) : undefined,
      bio: bioP?.innerText.trim().slice(0, 500) || undefined,
    });
    if (items.length >= 8) break;
  }

  return items.length > 0 ? items : undefined;
}

function extractBreadcrumbItems(): ExtractedPageContext["breadcrumbItems"] {
  const explicitNav = document.querySelector("[aria-label*='breadcrumb' i], [class*='breadcrumb' i] ol, [class*='breadcrumb' i] ul, nav[aria-label*='breadcrumb' i]");
  if (explicitNav) {
    const links = explicitNav.querySelectorAll("a[href], li");
    const items: NonNullable<ExtractedPageContext["breadcrumbItems"]> = [];
    for (const el of Array.from(links)) {
      const a = el as HTMLAnchorElement;
      const href = (a.href || a.querySelector("a")?.href || window.location.href);
      const name = ((a as HTMLElement).innerText || "").trim().split("\n")[0]?.trim();
      if (name && name.length < 60) {
        items.push({ name, url: absoluteUrl(href) });
      }
    }
    if (items.length >= 2) return items;
  }
  return undefined;
}

function extractArticleMeta(): { headline?: string; author?: string; datePublished?: string } | null {
  const article = document.querySelector("article");
  if (!article) return null;

  const headlineEl = article.querySelector("h1") as HTMLElement | null;
  const authorEl = article.querySelector("[rel='author'], [class*='author' i], [itemprop='author']") as HTMLElement | null;
  const timeEl = article.querySelector("time, [itemprop='datePublished']") as HTMLTimeElement | null;

  const headline = headlineEl?.innerText.trim();
  const author = authorEl?.innerText.trim().replace(/^by\s+/i, "");
  const datePublished = timeEl?.dateTime || timeEl?.innerText?.trim();

  if (!headline && !author) return null;
  return { headline, author, datePublished };
}

/**
 * Find a value at `path` from a JSON-LD entity matching one of the given @type values.
 *
 * Used to safely extract site-identity data: WebSite-typed schemas describe the SITE,
 * while Organization/LocalBusiness typed schemas might describe a FEATURED entity on the
 * page. Calling code can pick which types it considers safe.
 */
function readJsonLdValueByType(path: string[], allowedTypes: string[]): string | undefined {
  const lowerAllowed = new Set(allowedTypes.map((t) => t.toLowerCase()));
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const script of Array.from(scripts)) {
    try {
      const parsed = JSON.parse(script.textContent ?? "");
      const found = findValueInTypedNode(parsed, path, lowerAllowed);
      if (typeof found === "string") return found;
    } catch {
      // skip malformed
    }
  }
  return undefined;
}

function findValueInTypedNode(node: unknown, path: string[], allowedTypes: Set<string>): unknown {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const v = findValueInTypedNode(item, path, allowedTypes);
      if (v !== undefined) return v;
    }
    return undefined;
  }
  if (typeof node !== "object") return undefined;
  const obj = node as Record<string, unknown>;

  const typeField = obj["@type"];
  const types: string[] = typeof typeField === "string"
    ? [typeField]
    : Array.isArray(typeField) ? typeField.filter((t) => typeof t === "string") as string[] : [];

  if (types.some((t) => allowedTypes.has(t.toLowerCase()))) {
    const v = walk(obj, path);
    if (typeof v === "string" && v.length > 0) return v;
  }

  if (obj["@graph"]) {
    const v = findValueInTypedNode(obj["@graph"], path, allowedTypes);
    if (v !== undefined) return v;
  }
  if (obj["mainEntity"]) {
    const v = findValueInTypedNode(obj["mainEntity"], path, allowedTypes);
    if (v !== undefined) return v;
  }

  return undefined;
}

function walk(node: unknown, path: string[]): unknown {
  if (!node || path.length === 0) return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const v = walk(item, path);
      if (v !== undefined) return v;
    }
    return undefined;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (path[0] in obj) return walk(obj[path[0]], path.slice(1));
  }
  return undefined;
}

function absoluteUrl(maybeRelative: string): string {
  try {
    return new URL(maybeRelative, window.location.href).href;
  } catch {
    return maybeRelative;
  }
}
