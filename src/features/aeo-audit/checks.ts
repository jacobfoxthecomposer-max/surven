// Check implementations for the AEO audit. Each check is a small pure
// function operating on a `ScanContext`. They return `CheckResult` rows
// that the orchestrator aggregates into pillar scores.

import * as cheerio from "cheerio";
import type { CheckResult, Pillar } from "./types";

export interface ScanContext {
  /** Normalized URL we scanned (https://host/...). */
  url: string;
  /** Host, scheme, origin pieces — pre-derived for convenience. */
  origin: string;
  host: string;
  /** Final HTTP status of the target page fetch. */
  status: number;
  /** Response headers from the target page. */
  headers: Headers;
  /** Raw HTML body of the target page. */
  html: string;
  /** Pre-parsed Cheerio document. */
  $: cheerio.CheerioAPI;
  /** /robots.txt body, or null if missing/unreachable. */
  robotsTxt: string | null;
  /** /sitemap.xml body, or null. */
  sitemapXml: string | null;
  /** /llms.txt body, or null. */
  llmsTxt: string | null;
  /** /ai.txt body, or null. */
  aiTxt: string | null;
  /** True if /favicon.ico HEAD returned 200, or a <link rel="icon"> exists. */
  hasFavicon: boolean;
}

type Check = (ctx: ScanContext) => CheckResult;

// ─── Helpers ──────────────────────────────────────────────────────────────

// Estimated minutes to fix each check (rough — used for effort pills
// on priority cards). 5 = trivial copy edit. 15 = small markup tweak.
// 30 = schema work. 60+ = writing or dev work.
export const CHECK_EFFORT_MIN: Record<string, number> = {
  https: 60,
  "robots-txt": 10,
  sitemap: 30,
  canonical: 10,
  "ai-bots": 5,
  "robots-meta": 5,
  title: 5,
  "meta-description": 5,
  h1: 5,
  "heading-hierarchy": 30,
  "open-graph": 10,
  "twitter-card": 5,
  "html-lang": 5,
  viewport: 5,
  "json-ld": 30,
  "schema-coverage": 45,
  "alt-text": 30,
  "body-content": 60,
  freshness: 15,
  faq: 45,
  "internal-links": 30,
  "external-links": 20,
  "llms-txt": 10,
  "ai-txt": 10,
  favicon: 5,
};

// One sentence per check on how it affects whether AI engines can
// read and understand the page. Surfaced under the row's expanded
// "How this affects readability" section in the UI.
export const READABILITY_IMPACT: Record<string, string> = {
  https:
    "AI engines and search crawlers downgrade or skip non-HTTPS pages — they may not even attempt to read your content over an unencrypted connection.",
  "robots-txt":
    "robots.txt is the first file every crawler reads. Without it, AI bots fall back to default behavior and lose any guidance about which pages matter.",
  sitemap:
    "Without a sitemap, AI crawlers have to discover your pages by following links — they often miss deep pages or fail to recrawl when content changes.",
  canonical:
    "Without a canonical URL, AI engines can't tell which version of a page is authoritative and may attribute content (or citations) to the wrong URL.",
  "ai-bots":
    "Blocking GPTBot, ClaudeBot, or PerplexityBot means those engines can't read your site at all — you become invisible in any answer they generate.",
  "robots-meta":
    "A noindex directive tells every engine to ignore the page entirely. AI tools won't read or cite it even if everything else is perfect.",
  title:
    "The title is the strongest single signal of what a page is about. AI engines weight it heavily when deciding whether to use the page in an answer.",
  "meta-description":
    "AI tools often quote the meta description verbatim when summarizing a page. A missing or weak one forces the model to generate its own — often inaccurately.",
  h1: "AI uses the H1 as the page's primary topic anchor. Multiple H1s or a missing one confuses the model about what the page is actually about.",
  "heading-hierarchy":
    "Skipped heading levels break AI's outline of your content. The model loses track of which sections are subordinate to which, and may miss key sub-topics.",
  "open-graph":
    "AI engines and link-preview generators read Open Graph tags to label your content. Missing tags mean your page shows up as a bare URL with no context.",
  "twitter-card":
    "Twitter Card tags add another structured layer AI can pull from. Without them, fewer engines have a clean handle on the page's title, summary, and image.",
  "html-lang":
    "Without a lang attribute, AI may misidentify the language of your content — leading to mistranslation, mis-classification, or skipping the page in language-specific answers.",
  viewport:
    "AI crawlers run a mobile-first heuristic. A non-responsive page signals low quality and gets deprioritized in mobile-tilted answers.",
  "json-ld":
    "Without JSON-LD, AI engines have to infer your business identity, products, and articles from scattered visible text — they often guess wrong or skip you entirely.",
  "schema-coverage":
    "Each schema type tells AI a different story (Organization = who you are, Article = an opinion piece, Product = something to buy). Missing types means AI can only tell part of the story.",
  "alt-text":
    "AI can't see your images, but it can read alt text. Missing alt text means any meaning embedded in visuals is invisible to the model.",
  "body-content":
    "AI needs enough text to extract a confident answer. Sparse pages don't give the model anything to lift — even if the topic is a perfect match, it skips you for a longer source.",
  freshness:
    "AI engines actively prefer fresh content and downrank pages they think are stale. Without a freshness signal, the model assumes your page is dated and may pick a more recent competitor instead.",
  faq: "Question-and-answer content in FAQPage schema is the single most quotable format for AI. Without it, the model has to extract Q&A patterns from prose — and often won't.",
  "internal-links":
    "Internal links tell AI how your content is organized and which pages relate. A site with no internal linking looks like a stack of orphan pages instead of a connected resource.",
  "external-links":
    "Linking to credible external sources is a trust signal. Pages that cite no one feel less authoritative, and AI tools weight them lower when picking citations.",
  "llms-txt":
    "llms.txt is the modern standard for telling AI systems how to read your site (similar to robots.txt for crawlers). Without it, you're relying on AI defaults instead of your own guidance.",
  "ai-txt":
    "ai.txt declares your AI training and use policies. It's emerging — having one is a small forward-looking signal that AI-mature engines may start preferring.",
  favicon:
    "A missing favicon is a freshness/professionalism signal. AI quality heuristics treat sites without one as lower-effort, all else being equal.",
};

function pass(
  id: string,
  pillar: Pillar,
  label: string,
  max: number,
  detail: string,
): CheckResult {
  return {
    id,
    pillar,
    label,
    status: "pass",
    earned: max,
    max,
    detail,
    readabilityImpact: READABILITY_IMPACT[id] || "",
    recommendation: "",
    effortMin: CHECK_EFFORT_MIN[id] ?? 15,
  };
}

function fail(
  id: string,
  pillar: Pillar,
  label: string,
  max: number,
  detail: string,
  recommendation: string,
): CheckResult {
  return {
    id,
    pillar,
    label,
    status: "critical",
    earned: 0,
    max,
    detail,
    readabilityImpact: READABILITY_IMPACT[id] || "",
    recommendation,
    effortMin: CHECK_EFFORT_MIN[id] ?? 15,
  };
}

function partial(
  id: string,
  pillar: Pillar,
  label: string,
  earned: number,
  max: number,
  detail: string,
  recommendation: string,
): CheckResult {
  return {
    id,
    pillar,
    label,
    status: "partial",
    earned: Math.round(earned * 10) / 10,
    max,
    detail,
    readabilityImpact: READABILITY_IMPACT[id] || "",
    recommendation,
    effortMin: CHECK_EFFORT_MIN[id] ?? 15,
  };
}

function visibleBodyText($: cheerio.CheerioAPI): string {
  // Strip script/style/nav/footer/aside before extracting text.
  const $clone = cheerio.load($.html());
  $clone("script, style, noscript, nav, footer, aside, header").remove();
  return $clone("body").text().replace(/\s+/g, " ").trim();
}

// ─── DISCOVERABLE pillar ──────────────────────────────────────────────────

export const checkHttps: Check = (ctx) => {
  if (ctx.url.startsWith("https://") && ctx.status >= 200 && ctx.status < 400) {
    return pass(
      "https",
      "discoverable",
      "HTTPS reachable",
      6,
      `Site responded ${ctx.status} over HTTPS.`,
    );
  }
  return fail(
    "https",
    "discoverable",
    "HTTPS reachable",
    6,
    `Site is not reachable over HTTPS (status ${ctx.status}).`,
    "Serve your site over HTTPS. Most hosts enable this with one click.",
  );
};

export const checkRobotsTxt: Check = (ctx) => {
  if (ctx.robotsTxt && ctx.robotsTxt.trim().length > 0) {
    return pass(
      "robots-txt",
      "discoverable",
      "robots.txt present",
      5,
      `Found at ${ctx.origin}/robots.txt (${ctx.robotsTxt.length} bytes).`,
    );
  }
  return fail(
    "robots-txt",
    "discoverable",
    "robots.txt present",
    5,
    "No /robots.txt was found at the site root.",
    "Add a /robots.txt file at the site root with at least 'User-agent: *' and an Allow rule.",
  );
};

export const checkSitemap: Check = (ctx) => {
  if (ctx.sitemapXml && ctx.sitemapXml.includes("<")) {
    return pass(
      "sitemap",
      "discoverable",
      "sitemap.xml present",
      5,
      `Found at ${ctx.origin}/sitemap.xml.`,
    );
  }
  // Some sites declare sitemap inside robots.txt — partial credit.
  if (ctx.robotsTxt && /sitemap:/i.test(ctx.robotsTxt)) {
    return partial(
      "sitemap",
      "discoverable",
      "sitemap.xml present",
      2.5,
      5,
      "No /sitemap.xml at root, but a Sitemap directive was found in robots.txt.",
      "Add a sitemap directly at /sitemap.xml so AI crawlers and search engines can discover it.",
    );
  }
  return fail(
    "sitemap",
    "discoverable",
    "sitemap.xml present",
    5,
    "No sitemap was found at /sitemap.xml or referenced in robots.txt.",
    "Add a /sitemap.xml listing all your indexable pages.",
  );
};

export const checkCanonical: Check = (ctx) => {
  const href = ctx.$('link[rel="canonical"]').attr("href");
  if (href && /^https?:\/\//i.test(href)) {
    return pass(
      "canonical",
      "discoverable",
      "Canonical URL set",
      4,
      `<link rel="canonical"> points to ${href}.`,
    );
  }
  if (href) {
    return partial(
      "canonical",
      "discoverable",
      "Canonical URL set",
      2,
      4,
      "Canonical tag is present but uses a relative URL.",
      "Use an absolute URL in your canonical tag (e.g. https://example.com/page).",
    );
  }
  return fail(
    "canonical",
    "discoverable",
    "Canonical URL set",
    4,
    "No <link rel=\"canonical\"> tag was found.",
    "Add <link rel=\"canonical\" href=\"…\"> to the <head> of every page.",
  );
};

const AI_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];

export const checkAiBotsAllowed: Check = (ctx) => {
  const txt = ctx.robotsTxt ?? "";
  if (!txt) {
    return partial(
      "ai-bots",
      "discoverable",
      "AI crawlers allowed",
      2,
      4,
      "No robots.txt found, so default-allow applies — but rules can't be confirmed.",
      "Add a robots.txt that explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and CCBot.",
    );
  }

  const blocked: string[] = [];
  // Naive parse: split into UA blocks and look for Disallow: / per bot.
  const blocks = txt.split(/\n(?=user-agent:)/i);
  for (const bot of AI_BOTS) {
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const uaLine = lines.find((l) =>
        new RegExp(`^user-agent:\\s*${bot}`, "i").test(l.trim()),
      );
      if (!uaLine) continue;
      const disallow = lines.find((l) =>
        /^disallow:\s*\/\s*$/i.test(l.trim()),
      );
      if (disallow) blocked.push(bot);
    }
  }

  if (blocked.length === 0) {
    return pass(
      "ai-bots",
      "discoverable",
      "AI crawlers allowed",
      4,
      "No Disallow:/ rules found for major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot).",
    );
  }
  return fail(
    "ai-bots",
    "discoverable",
    "AI crawlers allowed",
    4,
    `Robots.txt blocks: ${blocked.join(", ")}.`,
    `Remove 'Disallow: /' rules for ${blocked.join(", ")} so they can read your site.`,
  );
};

export const checkRobotsMeta: Check = (ctx) => {
  const robots = ctx.$('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robots)) {
    return fail(
      "robots-meta",
      "discoverable",
      "Page is indexable",
      3,
      `<meta name="robots"> contains "${robots}". The page is excluded from indexes.`,
      "Remove the noindex directive from this page if you want it to appear in search and AI answers.",
    );
  }
  return pass(
    "robots-meta",
    "discoverable",
    "Page is indexable",
    3,
    robots
      ? `<meta name="robots" content="${robots}"> — page is indexable.`
      : "No noindex directive — page is open to indexing.",
  );
};

// ─── STRUCTURED pillar ────────────────────────────────────────────────────

export const checkTitle: Check = (ctx) => {
  const title = ctx.$("title").first().text().trim();
  if (!title) {
    return fail(
      "title",
      "structured",
      "Title tag",
      4,
      "No <title> tag was found.",
      "Add a unique <title> of 30–60 characters describing the page.",
    );
  }
  if (title.length < 20) {
    return partial(
      "title",
      "structured",
      "Title tag",
      2,
      4,
      `Title is only ${title.length} chars — too short to be descriptive.`,
      "Aim for a 30–60 character title that describes the page clearly.",
    );
  }
  if (title.length > 70) {
    return partial(
      "title",
      "structured",
      "Title tag",
      3,
      4,
      `Title is ${title.length} chars — likely truncated in search results.`,
      "Trim the title to under 60 characters.",
    );
  }
  return pass(
    "title",
    "structured",
    "Title tag",
    4,
    `Title is ${title.length} chars: "${title}".`,
  );
};

export const checkMetaDescription: Check = (ctx) => {
  const desc = ctx.$('meta[name="description"]').attr("content")?.trim() || "";
  if (!desc) {
    return fail(
      "meta-description",
      "structured",
      "Meta description",
      4,
      "No <meta name=\"description\"> tag was found.",
      "Write a 50–160 character meta description summarizing the page.",
    );
  }
  if (desc.length < 50) {
    return partial(
      "meta-description",
      "structured",
      "Meta description",
      2,
      4,
      `Description is only ${desc.length} chars — too short.`,
      "Expand to 50–160 characters.",
    );
  }
  if (desc.length > 200) {
    return partial(
      "meta-description",
      "structured",
      "Meta description",
      2.5,
      4,
      `Description is ${desc.length} chars — likely truncated.`,
      "Trim to under 160 characters.",
    );
  }
  return pass(
    "meta-description",
    "structured",
    "Meta description",
    4,
    `Description is ${desc.length} chars.`,
  );
};

export const checkSingleH1: Check = (ctx) => {
  const h1s = ctx.$("h1");
  if (h1s.length === 0) {
    return fail(
      "h1",
      "structured",
      "Single H1",
      3,
      "No <h1> tag was found.",
      "Add exactly one descriptive <h1> to the page.",
    );
  }
  if (h1s.length > 1) {
    return partial(
      "h1",
      "structured",
      "Single H1",
      1.5,
      3,
      `Page has ${h1s.length} <h1> tags. Best practice is exactly one.`,
      "Demote extra H1s to H2 so the page has a single top-level heading.",
    );
  }
  const text = h1s.first().text().trim();
  if (text.length < 5) {
    return partial(
      "h1",
      "structured",
      "Single H1",
      2,
      3,
      `<h1> exists but is only ${text.length} chars long.`,
      "Make the H1 descriptive — aim for 20–70 characters.",
    );
  }
  return pass(
    "h1",
    "structured",
    "Single H1",
    3,
    `Single H1 found, ${text.length} chars: "${text}".`,
  );
};

export const checkHeadingHierarchy: Check = (ctx) => {
  const levels: number[] = [];
  ctx.$("h1, h2, h3, h4, h5, h6").each((_, el) => {
    levels.push(parseInt(el.tagName.replace("h", ""), 10));
  });
  if (levels.length < 2) {
    return partial(
      "heading-hierarchy",
      "structured",
      "Heading hierarchy",
      1,
      3,
      `Only ${levels.length} heading${levels.length === 1 ? "" : "s"} found.`,
      "Use H2/H3 to break up content into sections.",
    );
  }
  let skips = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) skips++;
  }
  if (skips === 0) {
    return pass(
      "heading-hierarchy",
      "structured",
      "Heading hierarchy",
      3,
      `Headings flow cleanly across ${levels.length} levels.`,
    );
  }
  return partial(
    "heading-hierarchy",
    "structured",
    "Heading hierarchy",
    1.5,
    3,
    `Found ${skips} skipped heading level${skips === 1 ? "" : "s"} (e.g. H1 → H3).`,
    "Don't skip heading levels — go H1 → H2 → H3 in order.",
  );
};

export const checkOpenGraph: Check = (ctx) => {
  const tags = ["og:title", "og:description", "og:image", "og:url"];
  const present = tags.filter((t) => !!ctx.$(`meta[property="${t}"]`).attr("content"));
  if (present.length === 4) {
    return pass(
      "open-graph",
      "structured",
      "Open Graph tags",
      3,
      "All four core Open Graph tags are present (title, description, image, url).",
    );
  }
  if (present.length >= 2) {
    return partial(
      "open-graph",
      "structured",
      "Open Graph tags",
      1.5,
      3,
      `${present.length} of 4 OG tags present (${present.join(", ")}).`,
      `Add the missing OG tags: ${tags.filter((t) => !present.includes(t)).join(", ")}.`,
    );
  }
  return fail(
    "open-graph",
    "structured",
    "Open Graph tags",
    3,
    "Open Graph tags are missing or incomplete.",
    "Add og:title, og:description, og:image, and og:url to the <head>.",
  );
};

export const checkTwitterCard: Check = (ctx) => {
  const card = ctx.$('meta[name="twitter:card"]').attr("content");
  if (card) {
    return pass(
      "twitter-card",
      "structured",
      "Twitter Card",
      2,
      `<meta name="twitter:card" content="${card}"> is set.`,
    );
  }
  return fail(
    "twitter-card",
    "structured",
    "Twitter Card",
    2,
    "No twitter:card meta tag found.",
    'Add <meta name="twitter:card" content="summary_large_image"> for richer link previews.',
  );
};

export const checkLangAttr: Check = (ctx) => {
  const lang = ctx.$("html").attr("lang");
  if (lang && lang.length >= 2) {
    return pass(
      "html-lang",
      "structured",
      "<html lang> set",
      2,
      `<html lang="${lang}"> is set.`,
    );
  }
  return fail(
    "html-lang",
    "structured",
    "<html lang> set",
    2,
    "<html> tag has no lang attribute.",
    'Add a lang attribute, e.g. <html lang="en">.',
  );
};

export const checkViewport: Check = (ctx) => {
  const vp = ctx.$('meta[name="viewport"]').attr("content");
  if (vp && /width=device-width/i.test(vp)) {
    return pass(
      "viewport",
      "structured",
      "Viewport meta tag",
      2,
      `<meta name="viewport" content="${vp}">.`,
    );
  }
  return fail(
    "viewport",
    "structured",
    "Viewport meta tag",
    2,
    "Viewport meta tag is missing or non-responsive.",
    'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
  );
};

export const checkJsonLd: Check = (ctx) => {
  const blocks = ctx.$('script[type="application/ld+json"]').toArray();
  if (blocks.length === 0) {
    return fail(
      "json-ld",
      "structured",
      "JSON-LD schema",
      4,
      "No JSON-LD <script> blocks were found.",
      "Add at least one JSON-LD block. Start with Organization on your homepage.",
    );
  }
  let parsed = 0;
  for (const el of blocks) {
    try {
      JSON.parse(ctx.$(el).html() || "");
      parsed++;
    } catch {
      // ignore parse errors
    }
  }
  if (parsed === 0) {
    return fail(
      "json-ld",
      "structured",
      "JSON-LD schema",
      4,
      `${blocks.length} JSON-LD blocks found, but none parsed as valid JSON.`,
      "Fix syntax errors in your JSON-LD scripts so they parse cleanly.",
    );
  }
  return pass(
    "json-ld",
    "structured",
    "JSON-LD schema",
    4,
    `${parsed} valid JSON-LD block${parsed === 1 ? "" : "s"} found.`,
  );
};

const KEY_SCHEMA_TYPES = [
  "Organization",
  "WebSite",
  "Article",
  "Product",
  "BreadcrumbList",
  "FAQPage",
  "HowTo",
];

export const checkSchemaCoverage: Check = (ctx) => {
  const blocks = ctx.$('script[type="application/ld+json"]').toArray();
  const types = new Set<string>();
  for (const el of blocks) {
    try {
      const parsed = JSON.parse(ctx.$(el).html() || "");
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item["@type"] === "string") types.add(item["@type"]);
        if (Array.isArray(item?.["@type"])) {
          for (const t of item["@type"]) types.add(t);
        }
        if (Array.isArray(item?.["@graph"])) {
          for (const g of item["@graph"]) {
            if (g && typeof g["@type"] === "string") types.add(g["@type"]);
          }
        }
      }
    } catch {
      // skip invalid JSON
    }
  }
  const matched = KEY_SCHEMA_TYPES.filter((t) => types.has(t));
  if (matched.length >= 3) {
    return pass(
      "schema-coverage",
      "structured",
      "Schema type coverage",
      3,
      `Page declares ${matched.length} key schema types: ${matched.join(", ")}.`,
    );
  }
  if (matched.length >= 1) {
    return partial(
      "schema-coverage",
      "structured",
      "Schema type coverage",
      1.5,
      3,
      `Found schema types: ${matched.join(", ")}.`,
      "Layer in additional schema (Organization, WebSite, plus page-specific like Article or Product).",
    );
  }
  return fail(
    "schema-coverage",
    "structured",
    "Schema type coverage",
    3,
    "No high-value schema types (Organization, WebSite, Article, etc.) detected.",
    "Add Organization and WebSite schema sitewide; add page-specific types where relevant.",
  );
};

export const checkAltText: Check = (ctx) => {
  const imgs = ctx.$("img").toArray();
  if (imgs.length === 0) {
    return pass(
      "alt-text",
      "structured",
      "Image alt text",
      2,
      "No <img> tags on the page — nothing to caption.",
    );
  }
  const withAlt = imgs.filter((el) => {
    const alt = ctx.$(el).attr("alt");
    return alt !== undefined && alt.trim().length > 0;
  }).length;
  const ratio = withAlt / imgs.length;
  if (ratio >= 0.8) {
    return pass(
      "alt-text",
      "structured",
      "Image alt text",
      2,
      `${withAlt} of ${imgs.length} images have alt text (${Math.round(ratio * 100)}%).`,
    );
  }
  if (ratio >= 0.4) {
    return partial(
      "alt-text",
      "structured",
      "Image alt text",
      1,
      2,
      `Only ${withAlt} of ${imgs.length} images have alt text (${Math.round(ratio * 100)}%).`,
      "Add alt text to all meaningful images; leave alt=\"\" for purely decorative ones.",
    );
  }
  return fail(
    "alt-text",
    "structured",
    "Image alt text",
    2,
    `${withAlt} of ${imgs.length} images have alt text (${Math.round(ratio * 100)}%).`,
    "Add descriptive alt text to images so AI and accessibility tools can describe them.",
  );
};

// ─── QUOTABLE pillar ──────────────────────────────────────────────────────

export const checkBodyContent: Check = (ctx) => {
  const text = visibleBodyText(ctx.$);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words >= 300) {
    return pass(
      "body-content",
      "quotable",
      "Substantial body content",
      6,
      `Found ${words} words of visible body text.`,
    );
  }
  if (words >= 100) {
    return partial(
      "body-content",
      "quotable",
      "Substantial body content",
      3,
      6,
      `Only ${words} words of body text — AI tools struggle to quote sparse pages.`,
      "Aim for at least 300 words of substantive body content.",
    );
  }
  return fail(
    "body-content",
    "quotable",
    "Substantial body content",
    6,
    `Body text is only ${words} words after stripping nav/footer.`,
    "Add at least 300 words of readable, answer-shaped content.",
  );
};

export const checkFreshness: Check = (ctx) => {
  // Look in JSON-LD for dateModified, then in headers for Last-Modified, then sitemap.
  const blocks = ctx.$('script[type="application/ld+json"]').toArray();
  for (const el of blocks) {
    try {
      const parsed = JSON.parse(ctx.$(el).html() || "");
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item?.dateModified || item?.dateUpdated) {
          return pass(
            "freshness",
            "quotable",
            "Freshness signals",
            5,
            `JSON-LD reports dateModified: ${item.dateModified || item.dateUpdated}.`,
          );
        }
      }
    } catch {
      // skip
    }
  }
  const lastMod = ctx.headers.get("last-modified");
  if (lastMod) {
    return partial(
      "freshness",
      "quotable",
      "Freshness signals",
      3,
      5,
      `HTTP Last-Modified: ${lastMod}.`,
      "Add a dateModified field to your JSON-LD schema for a stronger freshness signal.",
    );
  }
  if (ctx.sitemapXml && /<lastmod>/i.test(ctx.sitemapXml)) {
    return partial(
      "freshness",
      "quotable",
      "Freshness signals",
      2.5,
      5,
      "<lastmod> tags are present in sitemap.xml.",
      "Add a dateModified field to JSON-LD on each page.",
    );
  }
  return fail(
    "freshness",
    "quotable",
    "Freshness signals",
    5,
    "No freshness signal found (no dateModified, no Last-Modified header, no sitemap lastmod).",
    "Add a dateModified field to your JSON-LD schema so AI knows the content is current.",
  );
};

export const checkFaqSignals: Check = (ctx) => {
  // Either FAQPage in JSON-LD, or H2/H3 ending with a question mark.
  const blocks = ctx.$('script[type="application/ld+json"]').toArray();
  for (const el of blocks) {
    try {
      const parsed = JSON.parse(ctx.$(el).html() || "");
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const t = item?.["@type"];
        if (t === "FAQPage" || (Array.isArray(t) && t.includes("FAQPage"))) {
          return pass(
            "faq",
            "quotable",
            "FAQ-style content",
            4,
            "FAQPage schema is declared.",
          );
        }
      }
    } catch {
      // skip
    }
  }
  const questionHeadings = ctx
    .$("h2, h3")
    .toArray()
    .map((el) => ctx.$(el).text().trim())
    .filter((t) => /\?$/.test(t));
  if (questionHeadings.length >= 3) {
    return partial(
      "faq",
      "quotable",
      "FAQ-style content",
      2,
      4,
      `${questionHeadings.length} question-style headings found, but no FAQPage schema.`,
      "Wrap your Q&A pairs in FAQPage JSON-LD for AI to lift them directly into answers.",
    );
  }
  return fail(
    "faq",
    "quotable",
    "FAQ-style content",
    4,
    "No FAQPage schema and no question-style headings found.",
    "Add a FAQ section with H2/H3 questions and FAQPage schema.",
  );
};

// ─── TRUSTWORTHY pillar ───────────────────────────────────────────────────

export const checkInternalLinks: Check = (ctx) => {
  // Strip nav/footer/aside/header before counting.
  const $clone = cheerio.load(ctx.html);
  $clone("nav, footer, aside, header").remove();
  const internal = $clone("a[href]")
    .toArray()
    .map((el) => $clone(el).attr("href") || "")
    .filter((href) => {
      if (!href) return false;
      if (href.startsWith("#")) return false;
      if (href.startsWith("/") && !href.startsWith("//")) return true;
      try {
        const u = new URL(href, ctx.url);
        return u.host === ctx.host;
      } catch {
        return false;
      }
    });
  if (internal.length >= 5) {
    return pass(
      "internal-links",
      "trustworthy",
      "Internal links",
      3,
      `${internal.length} contextual internal links in body.`,
    );
  }
  if (internal.length >= 2) {
    return partial(
      "internal-links",
      "trustworthy",
      "Internal links",
      1.5,
      3,
      `Only ${internal.length} internal link${internal.length === 1 ? "" : "s"} in body content.`,
      "Add at least 5 contextual internal links connecting related pages.",
    );
  }
  return fail(
    "internal-links",
    "trustworthy",
    "Internal links",
    3,
    `${internal.length} internal links in body.`,
    "Add at least 5 contextual internal links so AI can map your site's structure.",
  );
};

export const checkExternalLinks: Check = (ctx) => {
  const $clone = cheerio.load(ctx.html);
  $clone("nav, footer, aside, header").remove();
  const external = $clone("a[href]")
    .toArray()
    .map((el) => $clone(el).attr("href") || "")
    .filter((href) => {
      if (!/^https?:\/\//i.test(href)) return false;
      try {
        const u = new URL(href);
        return u.host !== ctx.host;
      } catch {
        return false;
      }
    });
  if (external.length >= 2) {
    return pass(
      "external-links",
      "trustworthy",
      "External citation links",
      4,
      `${external.length} outbound links to external sources.`,
    );
  }
  if (external.length === 1) {
    return partial(
      "external-links",
      "trustworthy",
      "External citation links",
      2,
      4,
      "Only 1 outbound link in body content.",
      "Cite at least 2 credible external sources to signal trustworthiness.",
    );
  }
  return fail(
    "external-links",
    "trustworthy",
    "External citation links",
    4,
    "No outbound citation links found in body content.",
    "Link out to credible sources (research, official docs, reputable publications).",
  );
};

export const checkLlmsTxt: Check = (ctx) => {
  if (ctx.llmsTxt && ctx.llmsTxt.trim().length > 0) {
    return pass(
      "llms-txt",
      "trustworthy",
      "llms.txt present",
      4,
      `Found at ${ctx.origin}/llms.txt (${ctx.llmsTxt.length} bytes).`,
    );
  }
  return fail(
    "llms-txt",
    "trustworthy",
    "llms.txt present",
    4,
    "No /llms.txt file found at the site root.",
    "Create a /llms.txt file describing your site for AI systems (similar to robots.txt for LLMs).",
  );
};

export const checkAiTxt: Check = (ctx) => {
  if (ctx.aiTxt && ctx.aiTxt.trim().length > 0) {
    return pass(
      "ai-txt",
      "trustworthy",
      "ai.txt present (bonus)",
      2,
      `Found at ${ctx.origin}/ai.txt.`,
    );
  }
  return partial(
    "ai-txt",
    "trustworthy",
    "ai.txt present (bonus)",
    0,
    2,
    "No /ai.txt file at the site root.",
    "Optional: add an /ai.txt file declaring AI training/use policies.",
  );
};

export const checkFavicon: Check = (ctx) => {
  if (ctx.hasFavicon) {
    return pass(
      "favicon",
      "trustworthy",
      "Favicon present",
      2,
      "Favicon detected (link tag or /favicon.ico).",
    );
  }
  return fail(
    "favicon",
    "trustworthy",
    "Favicon present",
    2,
    "No favicon found.",
    'Add a favicon at /favicon.ico or via <link rel="icon">.',
  );
};

export const ALL_CHECKS: Check[] = [
  // Discoverable
  checkHttps,
  checkRobotsTxt,
  checkSitemap,
  checkCanonical,
  checkAiBotsAllowed,
  checkRobotsMeta,
  // Structured
  checkTitle,
  checkMetaDescription,
  checkSingleH1,
  checkHeadingHierarchy,
  checkOpenGraph,
  checkTwitterCard,
  checkLangAttr,
  checkViewport,
  checkJsonLd,
  checkSchemaCoverage,
  checkAltText,
  // Quotable
  checkBodyContent,
  checkFreshness,
  checkFaqSignals,
  // Trustworthy
  checkInternalLinks,
  checkExternalLinks,
  checkLlmsTxt,
  checkAiTxt,
  checkFavicon,
];
