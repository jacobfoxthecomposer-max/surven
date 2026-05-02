export interface SchemaInventoryItem {
  source: "json-ld" | "microdata";
  type: string;
  raw?: unknown;
}

export interface SchemaMarkedElement {
  el: HTMLElement;
  type: string;
  source: "microdata";
}

export interface MissingSchemaCandidate {
  el: HTMLElement;
  suggestedType: string;
  reason: string;
  why: string;
}

export interface SchemaScanResult {
  inventory: SchemaInventoryItem[];
  marked: SchemaMarkedElement[];
  missing: MissingSchemaCandidate[];
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  FAQPage: "Wraps Q&A content. AI engines pull verbatim answers from FAQPage schema more than any other type.",
  HowTo: "Wraps step-by-step instructions. AI uses HowTo schema directly for 'how do I...' queries.",
  Article: "Wraps blog posts and editorial content. Boosts citation in AI Overview and ChatGPT answers.",
  BlogPosting: "Subset of Article — same value, more specific signal for blog content.",
  LocalBusiness: "Identifies you as a physical business with location, hours, and phone. Critical for local AI queries.",
  Organization: "Identifies your company as an entity. Connects your website to your brand across AI engines.",
  Product: "Wraps product info (price, availability, reviews). AI uses this for shopping queries.",
  Recipe: "Wraps cooking instructions. Standard for recipe sites — AI shows recipe cards from this.",
  Review: "Wraps individual reviews. Helps AI surface ratings and testimonials.",
  BreadcrumbList: "Wraps page hierarchy. Helps AI understand site structure.",
  Person: "Wraps author/team bios. Boosts E-E-A-T signals for AI ranking.",
  Event: "Wraps event details (date, location, performers). AI uses for 'what's happening' queries.",
  Service: "Wraps services offered. Helps AI match queries to your offerings.",
};

export function describeSchemaType(type: string): string {
  return TYPE_DESCRIPTIONS[type] ?? "Helps AI engines understand the structure of your content.";
}

export function scanSchema(): SchemaScanResult {
  const inventory: SchemaInventoryItem[] = [];
  const marked: SchemaMarkedElement[] = [];

  const ldScripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const script of Array.from(ldScripts)) {
    try {
      const parsed = JSON.parse(script.textContent ?? "");
      collectJsonLdTypes(parsed, inventory);
    } catch {
      // skip malformed
    }
  }

  const microdataEls = document.querySelectorAll<HTMLElement>("[itemtype]");
  for (const el of Array.from(microdataEls)) {
    const itemtype = el.getAttribute("itemtype") ?? "";
    const type = extractTypeFromUrl(itemtype);
    if (type) {
      marked.push({ el, type, source: "microdata" });
      inventory.push({ source: "microdata", type });
    }
  }

  const inventoryTypes = new Set(inventory.map((i) => i.type.toLowerCase()));
  const missing = detectMissingSchema(inventoryTypes);

  return { inventory: dedupeInventory(inventory), marked, missing };
}

function collectJsonLdTypes(node: unknown, inventory: SchemaInventoryItem[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdTypes(item, inventory);
    return;
  }
  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (typeof type === "string") {
    inventory.push({ source: "json-ld", type, raw: obj });
  } else if (Array.isArray(type)) {
    for (const t of type) {
      if (typeof t === "string") inventory.push({ source: "json-ld", type: t, raw: obj });
    }
  }

  if (obj["@graph"]) collectJsonLdTypes(obj["@graph"], inventory);
  if (obj["mainEntity"]) collectJsonLdTypes(obj["mainEntity"], inventory);
  if (obj["itemListElement"]) collectJsonLdTypes(obj["itemListElement"], inventory);
}

function extractTypeFromUrl(itemtype: string): string {
  const last = itemtype.split("/").pop() ?? itemtype;
  return last.replace(/^https?:\/\/.+\//, "");
}

function dedupeInventory(items: SchemaInventoryItem[]): SchemaInventoryItem[] {
  const seen = new Set<string>();
  const out: SchemaInventoryItem[] = [];
  for (const item of items) {
    const key = `${item.source}::${item.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function detectMissingSchema(existingTypes: Set<string>): MissingSchemaCandidate[] {
  const candidates: MissingSchemaCandidate[] = [];

  if (!existingTypes.has("organization") && !existingTypes.has("localbusiness") && !existingTypes.has("corporation")) {
    const org = detectOrganizationPattern();
    if (org) {
      candidates.push({
        el: org,
        suggestedType: "Organization",
        reason: "Brand identity visible without Organization schema",
        why: "Organization schema connects your website to your brand entity across AI engines. Almost every business site should have this — it's foundational.",
      });
    }
  }

  if (!existingTypes.has("website")) {
    candidates.push({
      el: document.querySelector("header, body") as HTMLElement,
      suggestedType: "WebSite",
      reason: "Page-level WebSite schema missing",
      why: "WebSite schema with SearchAction lets AI engines surface your site search box directly. Essential baseline for any modern site.",
    });
  }

  if (!existingTypes.has("breadcrumblist")) {
    const breadcrumb = detectBreadcrumbPattern();
    if (breadcrumb) {
      candidates.push({
        el: breadcrumb,
        suggestedType: "BreadcrumbList",
        reason: "Breadcrumb navigation without BreadcrumbList schema",
        why: "BreadcrumbList schema helps AI understand your site hierarchy — pages with it are surfaced more confidently in answer paths.",
      });
    }
  }

  if (!existingTypes.has("faqpage") && !existingTypes.has("qapage")) {
    for (const el of detectFaqPatterns()) {
      candidates.push({
        el,
        suggestedType: "FAQPage",
        reason: "Q&A pattern detected without FAQPage schema",
        why: "This section looks like a FAQ but isn't marked up. Adding FAQPage schema is the single biggest win for getting cited by AI for question-shaped queries.",
      });
    }
  }

  if (!existingTypes.has("howto")) {
    for (const el of detectHowToPatterns()) {
      candidates.push({
        el,
        suggestedType: "HowTo",
        reason: "Step-by-step content without HowTo schema",
        why: "AI engines extract HowTo schema directly into their answers for 'how do I...' queries. This list reads like instructions but has no schema.",
      });
    }
  }

  if (!existingTypes.has("localbusiness") && !existingTypes.has("restaurant") && !existingTypes.has("store")) {
    const local = detectLocalBusinessPattern();
    if (local) {
      candidates.push({
        el: local,
        suggestedType: "LocalBusiness",
        reason: "Address + phone visible without LocalBusiness schema",
        why: "AI engines need LocalBusiness schema to confidently associate your site with a physical location for 'near me' and 'best X in [city]' queries.",
      });
    }
  }

  if (!existingTypes.has("review") && !existingTypes.has("aggregaterating")) {
    for (const el of detectReviewPatterns()) {
      candidates.push({
        el,
        suggestedType: "Review",
        reason: "Customer review or testimonial without Review schema",
        why: "Wrapping reviews in Review schema lets AI surface star ratings, quotes, and reviewer names directly. Without it, AI has to guess.",
      });
    }
  }

  if (!existingTypes.has("product") && !existingTypes.has("offer")) {
    for (const el of detectProductPatterns()) {
      candidates.push({
        el,
        suggestedType: "Product",
        reason: "Product listing without Product schema",
        why: "Product schema (with price, availability, brand) is required for AI shopping queries. Without it, your products won't appear in AI-generated buying recommendations.",
      });
    }
  }

  if (!existingTypes.has("service")) {
    for (const el of detectServicePatterns()) {
      candidates.push({
        el,
        suggestedType: "Service",
        reason: "Service offering without Service schema",
        why: "Service schema describes what you offer. Critical for AI to match queries like 'best X service near me' to your business.",
      });
    }
  }

  if (!existingTypes.has("videoobject")) {
    for (const el of detectVideoPatterns()) {
      candidates.push({
        el,
        suggestedType: "VideoObject",
        reason: "Video on page without VideoObject schema",
        why: "VideoObject schema lets AI describe and surface your videos in answers — without it, the video is invisible to AI engines.",
      });
    }
  }

  if (!existingTypes.has("event")) {
    const event = detectEventPattern();
    if (event) {
      candidates.push({
        el: event,
        suggestedType: "Event",
        reason: "Event details visible without Event schema",
        why: "Event schema lets AI surface dates, locations, and ticket info directly in 'what's happening near me' answers.",
      });
    }
  }

  if (!existingTypes.has("recipe")) {
    const recipe = detectRecipePattern();
    if (recipe) {
      candidates.push({
        el: recipe,
        suggestedType: "Recipe",
        reason: "Recipe-shaped content without Recipe schema",
        why: "Recipe schema is how AI surfaces recipe cards. Without it, your recipe is just text — with it, AI shows ingredients, time, ratings.",
      });
    }
  }

  if (!existingTypes.has("person")) {
    for (const el of detectPersonPatterns()) {
      candidates.push({
        el,
        suggestedType: "Person",
        reason: "Team or author bio without Person schema",
        why: "Person schema strengthens E-E-A-T signals. AI weighs content from named, credentialed people higher in answers.",
      });
    }
  }

  if (!existingTypes.has("article") && !existingTypes.has("blogposting") && !existingTypes.has("newsarticle")) {
    const article = detectArticlePattern();
    if (article) {
      candidates.push({
        el: article,
        suggestedType: "Article",
        reason: "Long-form editorial content without Article schema",
        why: "Article schema tells AI this is editorial content with an author and date. Pages without it get ranked lower in AI Overview answers.",
      });
    }
  }

  return candidates;
}

function detectFaqPatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];

  const dls = document.querySelectorAll("dl");
  for (const dl of Array.from(dls)) {
    if (dl.querySelectorAll("dt").length >= 2 && dl.querySelectorAll("dd").length >= 1) {
      out.push(dl as HTMLElement);
    }
  }

  const detailsParents = new Set<HTMLElement>();
  const summaries = document.querySelectorAll("details > summary");
  if (summaries.length >= 2) {
    summaries.forEach((s) => {
      const parent = s.closest("section, article, div, main");
      if (parent && !out.includes(parent as HTMLElement)) detailsParents.add(parent as HTMLElement);
    });
  }
  for (const p of detailsParents) out.push(p);

  const headings = Array.from(document.querySelectorAll("h2, h3, h4, h5")) as HTMLElement[];
  const qaParents = new Map<HTMLElement, number>();
  for (const h of headings) {
    const text = (h.innerText ?? "").trim();
    if (text.endsWith("?") || /^(how|what|why|when|where|who|do you|can i|is it|does)\b/i.test(text)) {
      const next = h.nextElementSibling;
      if (next && (next as HTMLElement).innerText && (next as HTMLElement).innerText.length > 20) {
        const parent = h.parentElement as HTMLElement;
        qaParents.set(parent, (qaParents.get(parent) ?? 0) + 1);
      }
    }
  }
  for (const [parent, count] of qaParents) {
    if (count >= 2 && !out.includes(parent)) out.push(parent);
  }

  const accordionContainers = Array.from(document.querySelectorAll<HTMLElement>("[class*='faq' i], [class*='accordion' i], [class*='question' i], [id*='faq' i]"));
  for (const el of accordionContainers) {
    if (!out.includes(el) && (el.innerText ?? "").length > 100) out.push(el);
  }

  return out;
}

function detectHowToPatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];

  const ols = document.querySelectorAll("ol");
  for (const ol of Array.from(ols)) {
    const items = ol.querySelectorAll("li");
    if (items.length < 2) continue;
    const text = (ol as HTMLElement).innerText.toLowerCase();
    if (/\bstep\b|\bfirst\b|\bnext\b|\bthen\b|\bfinally\b|\binstall\b|\bdownload\b|\bsetup\b|\bguide\b/.test(text)) {
      out.push(ol as HTMLElement);
    }
  }

  const headings = Array.from(document.querySelectorAll("h2, h3, h4")) as HTMLElement[];
  const stepParents = new Map<HTMLElement, number>();
  for (const h of headings) {
    const text = (h.innerText ?? "").trim().toLowerCase();
    if (/^step\s*\d+|^\d+\.\s|^\d+\)/.test(text)) {
      const parent = h.parentElement as HTMLElement;
      stepParents.set(parent, (stepParents.get(parent) ?? 0) + 1);
    }
  }
  for (const [parent, count] of stepParents) {
    if (count >= 2 && !out.includes(parent)) out.push(parent);
  }

  const stepContainers = Array.from(document.querySelectorAll<HTMLElement>("[class*='steps' i], [class*='howto' i], [class*='tutorial' i], [class*='guide' i]"));
  for (const el of stepContainers) {
    if (!out.includes(el) && (el.innerText ?? "").length > 100) out.push(el);
  }

  return out;
}

function detectOrganizationPattern(): HTMLElement | null {
  const header = document.querySelector("header");
  if (header && (header as HTMLElement).innerText.length > 0) return header as HTMLElement;

  const logoCandidates = document.querySelectorAll<HTMLElement>("a[href='/'], a[href='./'], [class*='logo' i], [class*='brand' i], [id*='logo' i]");
  for (const el of Array.from(logoCandidates)) {
    const parent = el.closest("header, nav, div") as HTMLElement | null;
    if (parent && (parent.innerText ?? "").length > 0) return parent;
  }

  return document.querySelector("body") as HTMLElement | null;
}

function detectBreadcrumbPattern(): HTMLElement | null {
  const explicit = document.querySelector("[aria-label*='breadcrumb' i], [class*='breadcrumb' i], [id*='breadcrumb' i], nav ol");
  if (explicit) return explicit as HTMLElement;

  const navOls = document.querySelectorAll("nav ol li, nav ul li");
  if (navOls.length >= 2) {
    const text = Array.from(navOls).slice(0, 4).map((li) => (li as HTMLElement).innerText).join(" > ");
    if (text.includes(">") || text.includes("/")) {
      return navOls[0].closest("nav") as HTMLElement;
    }
  }

  return null;
}

function detectServicePatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const headings = Array.from(document.querySelectorAll("h1, h2, h3")) as HTMLElement[];
  for (const h of headings) {
    const text = (h.innerText ?? "").trim().toLowerCase();
    if (/(our\s+)?services?$|what\s+we\s+(do|offer)|offerings?|capabilities/.test(text)) {
      const parent = h.parentElement as HTMLElement;
      if (parent && !seen.has(parent) && parent.innerText.length > 80) {
        seen.add(parent);
        out.push(parent);
      }
    }
  }

  const explicit = document.querySelectorAll<HTMLElement>("[class*='service' i], [id*='service' i]");
  for (const el of Array.from(explicit).slice(0, 4)) {
    if (!seen.has(el) && (el.innerText ?? "").length > 80) {
      seen.add(el);
      out.push(el);
    }
  }

  return out.slice(0, 4);
}

function detectVideoPatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const videos = document.querySelectorAll<HTMLElement>("video, iframe[src*='youtube' i], iframe[src*='vimeo' i], iframe[src*='wistia' i]");
  for (const v of Array.from(videos).slice(0, 5)) {
    const wrapper = (v.closest("figure, section, div, article") as HTMLElement) ?? v;
    if (!out.includes(wrapper)) out.push(wrapper);
  }
  return out;
}

function detectEventPattern(): HTMLElement | null {
  const bodyText = document.body.innerText;
  const dateMatch = bodyText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+(20\d{2})\b/i);
  const timeMatch = bodyText.match(/\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)?\b/);
  if (!dateMatch || !timeMatch) return null;

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[class*='event' i], [class*='show' i], [id*='event' i], section, article"));
  for (const el of candidates) {
    const text = el.innerText ?? "";
    if (text.includes(dateMatch[0]) && text.includes(timeMatch[0]) && text.length < 2000) return el;
  }
  return null;
}

function detectRecipePattern(): HTMLElement | null {
  const bodyText = document.body.innerText.toLowerCase();
  if (!/(ingredients|prep time|cook time|servings|cups?\s|tablespoon|teaspoon)/.test(bodyText)) return null;

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[class*='recipe' i], [id*='recipe' i], article, main"));
  for (const el of candidates) {
    const text = (el.innerText ?? "").toLowerCase();
    if (text.includes("ingredients") && (text.includes("prep") || text.includes("cook") || text.includes("serves"))) {
      return el;
    }
  }
  return null;
}

function detectLocalBusinessPattern(): HTMLElement | null {
  const bodyText = document.body.innerText;

  const phoneMatch = bodyText.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const addressMatch = bodyText.match(/\b\d{1,5}\s+\w+(\s+\w+){0,4}\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Ln|Lane|Pl|Place|Ct|Court|Hwy|Highway)\b/i);
  const zipMatch = bodyText.match(/\b\d{5}(-\d{4})?\b/);

  if (!phoneMatch || !addressMatch || !zipMatch) return null;

  const phone = phoneMatch[0];
  const address = addressMatch[0];

  const semanticCandidates = Array.from(document.querySelectorAll("footer, address, [class*='contact'], [class*='location'], [class*='hours'], [id*='contact'], [id*='location'], [id*='footer']")) as HTMLElement[];
  for (const el of semanticCandidates) {
    const text = el.innerText;
    if (text.includes(phone) && text.includes(address)) return el;
  }

  const all = document.querySelectorAll<HTMLElement>("section, div, aside, article");
  let bestMatch: HTMLElement | null = null;
  let smallestSize = Infinity;
  for (const el of Array.from(all)) {
    const text = el.innerText ?? "";
    if (text.includes(phone) && text.includes(address)) {
      const size = text.length;
      if (size < smallestSize && size > 50) {
        smallestSize = size;
        bestMatch = el;
      }
    }
  }
  if (bestMatch) return bestMatch;

  return document.querySelector("footer, address") as HTMLElement | null;
}

function detectReviewPatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const quoteSelectors = "blockquote, [class*='review' i], [class*='testimonial' i], [class*='quote' i], [class*='feedback' i], [id*='review' i], [id*='testimonial' i]";
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(quoteSelectors))) {
    const text = el.innerText ?? "";
    if (text.length > 30 && text.length < 1500 && !seen.has(el)) {
      seen.add(el);
      out.push(el);
    }
  }

  const allText = Array.from(document.querySelectorAll<HTMLElement>("p, div, blockquote, figure"));
  const attribRegex = /[—–-]\s*[A-Z][a-zA-Z]+(\s+[A-Z]\.?)?\s*$/m;
  for (const el of allText) {
    if (seen.has(el)) continue;
    const text = (el.innerText ?? "").trim();
    if (text.length < 40 || text.length > 1000) continue;
    if ((text.includes('"') || text.includes("“") || text.includes("”")) && attribRegex.test(text)) {
      seen.add(el);
      out.push(el);
    }
  }

  const starSections = Array.from(document.querySelectorAll<HTMLElement>("[class*='star' i], [class*='rating' i]"));
  for (const el of starSections) {
    const wrapper = el.closest("section, article, div") as HTMLElement | null;
    if (wrapper && !seen.has(wrapper) && (wrapper.innerText ?? "").length > 60) {
      seen.add(wrapper);
      out.push(wrapper);
    }
  }

  return out.slice(0, 8);
}

function detectProductPatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const explicit = Array.from(document.querySelectorAll<HTMLElement>("[class*='product' i], [class*='item-card' i], [class*='shop-item' i], [class*='collection-item' i], [data-product], article[class*='product' i]"));
  for (const el of explicit) {
    if (seen.has(el)) continue;
    const text = el.innerText ?? "";
    if (/\$\d|USD|£\d|€\d/.test(text) && text.length < 2000) {
      seen.add(el);
      out.push(el);
    }
  }

  const priceEls = Array.from(document.querySelectorAll<HTMLElement>("*"));
  let priceCount = 0;
  for (const el of priceEls) {
    const direct = (Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent ?? "").join("")).trim();
    if (/^\$\d+(\.\d{2})?$/.test(direct)) {
      priceCount++;
      const wrapper = el.closest("article, section, li, div") as HTMLElement | null;
      if (wrapper && !seen.has(wrapper) && (wrapper.innerText ?? "").length < 1500) {
        seen.add(wrapper);
        out.push(wrapper);
      }
      if (priceCount >= 8) break;
    }
  }

  return out.slice(0, 8);
}

function detectPersonPatterns(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("[class*='team' i], [class*='author' i], [class*='bio' i], [class*='member' i], [class*='profile' i], [class*='staff' i], [id*='team' i], [id*='author' i]"));
  for (const el of candidates) {
    if (seen.has(el)) continue;
    const text = el.innerText ?? "";
    if (text.length > 60 && text.length < 2500) {
      seen.add(el);
      out.push(el);
    }
  }

  return out.slice(0, 5);
}

function detectArticlePattern(): HTMLElement | null {
  const articles = document.querySelectorAll("article");
  for (const a of Array.from(articles)) {
    const text = (a as HTMLElement).innerText;
    if (text.length > 1500 && /\bby\s+[A-Z][a-z]/i.test(text.slice(0, 500))) {
      return a as HTMLElement;
    }
  }

  const main = document.querySelector("main");
  if (main) {
    const text = (main as HTMLElement).innerText;
    if (text.length > 3000 && document.querySelector("h1") && /\bby\s+[A-Z][a-z]/i.test(text.slice(0, 800))) {
      return main as HTMLElement;
    }
  }

  return null;
}
