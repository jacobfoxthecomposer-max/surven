/**
 * Page-context extractor — runs in the content script, extracts structured business
 * data from the current DOM. Used to build the PageContext object sent to
 * /api/audit/generate.
 *
 * Designed to fail gracefully — every field is optional. If we can't find an
 * address, we don't fabricate one. The schema generator on the server returns
 * "Not enough data" errors honestly when required fields are missing.
 */

export interface ExtractedPageContext {
  url: string;
  title?: string;
  description?: string;
  businessName?: string;
  bodyContent?: string;
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
    url: window.location.href,
  };

  ctx.title = document.title?.trim() || undefined;
  ctx.description = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content?.trim() || undefined;

  ctx.businessName = extractBusinessName();
  ctx.logo = extractLogo();
  ctx.phone = extractPhone();
  ctx.address = extractAddress();
  ctx.hours = extractHours();
  ctx.socials = extractSocials();
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

  return ctx;
}

function extractBusinessName(): string | undefined {
  const ogSite = (document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement | null)?.content?.trim();
  if (ogSite) return ogSite;

  const ldName = readJsonLdValue(["name"]);
  if (ldName) return ldName;

  const h1 = document.querySelector("h1");
  if (h1 && h1.innerText.trim().length > 0 && h1.innerText.trim().length < 60) {
    return h1.innerText.trim();
  }

  const title = document.title?.split(/[|–—-]/)[0]?.trim();
  if (title && title.length > 0 && title.length < 60) return title;

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

function extractPhone(): string | undefined {
  const telLink = document.querySelector('a[href^="tel:"]') as HTMLAnchorElement | null;
  if (telLink) {
    const tel = telLink.getAttribute("href")?.replace(/^tel:/, "").trim();
    if (tel) return tel;
  }

  const bodyText = document.body.innerText;
  const phoneMatch = bodyText.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return phoneMatch?.[0]?.trim();
}

function extractAddress(): ExtractedPageContext["address"] {
  const bodyText = document.body.innerText;

  const streetMatch = bodyText.match(new RegExp(`\\b\\d{1,5}\\s+\\w+(\\s+\\w+){0,4}\\s+${STREET_SUFFIX.source}\\b`, "i"));
  if (!streetMatch) return undefined;

  const street = streetMatch[0].trim();
  const startIdx = (streetMatch.index ?? 0) + street.length;
  const tail = bodyText.slice(startIdx, startIdx + 200);

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

function extractHours(): ExtractedPageContext["hours"] {
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

function readJsonLdValue(path: string[]): string | undefined {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const script of Array.from(scripts)) {
    try {
      const parsed = JSON.parse(script.textContent ?? "");
      const found = walk(parsed, path);
      if (typeof found === "string") return found;
    } catch {
      // skip malformed
    }
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
