import type { CrawledPage } from "@/types/audit";
import type {
  CrawlabilityFinding,
  CrawlabilityCategory,
  RobotsAnalysis,
  SitemapAnalysis,
  RedirectChain,
  LlmsTxtAnalysis,
} from "@/types/crawlability";
import { autoBuildLlmsTxt } from "@/services/fixes/llmsTxtGenerator";

const MAX_AFFECTED_URLS = 50;

export interface RuleContext {
  homepage: CrawledPage;
  pages: CrawledPage[];
  pageLinks: Record<string, string[]>;
  robots: RobotsAnalysis;
  sitemap: SitemapAnalysis;
  llmsTxt?: LlmsTxtAnalysis;
  redirects: RedirectChain[];
  siteUrl: string;
}

type RuleCheck = (ctx: RuleContext) => CrawlabilityFinding | null;

// HTML-content rules (canonical, viewport, OG, schema, freshness, alt text, dupes) must
// only apply to pages that returned text/html. Non-HTML 200s — fonts, css/js chunks,
// favicon — get crawled when they appear in <link>/<script> hrefs but have no <head>,
// no canonical, no meta. Counting them as "missing" produces nonsense findings and the
// per-page fix injector then can't find a route file for /_next/static/media/*.woff2.
function isIndexableHtmlPage(p: CrawledPage): boolean {
  return p.statusCode >= 200 && p.statusCode < 300 && p.isHtml !== false;
}

function makeFinding(opts: {
  id: string;
  title: string;
  severity: CrawlabilityFinding["severity"];
  category: CrawlabilityCategory;
  affectedPages: number;
  affectedUrls?: string[];
  fixTime: number;
  impact: number;
  whatIsIt: string;
  whyItMatters: string;
  howToFix: string;
  fixCode?: string;
  fixType?: CrawlabilityFinding["fixType"];
  fixLabel?: string;
}): CrawlabilityFinding {
  return {
    id: opts.id,
    title: opts.title,
    severity: opts.severity,
    category: opts.category,
    affectedPages: opts.affectedPages,
    affectedUrls: opts.affectedUrls?.slice(0, MAX_AFFECTED_URLS),
    estimatedFixTime: opts.fixTime,
    estimatedImpact: opts.impact,
    whatIsIt: opts.whatIsIt,
    whyItMatters: opts.whyItMatters,
    howToFix: opts.howToFix,
    fixCode: opts.fixCode,
    fixType: opts.fixType,
    fixLabel: opts.fixLabel,
  };
}

// 1. robots.txt analysis
const checkRobotsTxt: RuleCheck = ({ robots, siteUrl }) => {
  if (!robots.exists) {
    return makeFinding({
      id: "robots_missing",
      title: "robots.txt File Missing",
      severity: "critical",
      category: "indexability",
      affectedPages: 1,
      fixTime: 10,
      impact: 9,
      whatIsIt:
        "robots.txt is a small text file at your domain's root that tells search engines and AI crawlers (like GPTBot and Anthropic's bot) which pages they're allowed to read. Without it, crawlers fall back to default behavior, which is fine for some — but you also miss the chance to tell them where your sitemap is.",
      whyItMatters:
        "robots.txt is the first place AI and search crawlers check when they visit your site. Without it, you have no control over what they index, and you can't point them to your sitemap — making it harder for AI to discover all your important pages.",
      howToFix:
        "Create a robots.txt file at the root of your domain. The minimum it should contain: an Allow rule for all crawlers and a reference to your sitemap.",
      fixCode: `User-agent: *\nAllow: /\n\nSitemap: ${new URL(siteUrl).origin}/sitemap.xml\n`,
      fixType: "robots",
      fixLabel: "Create /robots.txt with this content:",
    });
  }

  if (robots.blocksGooglebot) {
    return makeFinding({
      id: "robots_blocks_googlebot",
      title: "robots.txt Blocks Googlebot",
      severity: "critical",
      category: "indexability",
      affectedPages: 1,
      fixTime: 5,
      impact: 10,
      whatIsIt:
        "Your robots.txt file is telling Googlebot it can't crawl your site. Google's AI Overview and search results both depend on Googlebot — so blocking it removes you from AI-generated answers and search results entirely.",
      whyItMatters:
        "Googlebot is the gateway to Google AI Overview, search rankings, and Gemini citations. If it can't read your site, you're invisible across Google's entire ecosystem.",
      howToFix:
        "Open your robots.txt and remove or replace any 'Disallow: /' rules that apply to Googlebot or User-agent: *. Replace with 'Allow: /' to permit crawling.",
      fixCode: `User-agent: *\nAllow: /\n\nSitemap: ${new URL(siteUrl).origin}/sitemap.xml\n`,
      fixType: "robots",
      fixLabel: "Replace your robots.txt with:",
    });
  }

  if (!robots.hasSitemapReference) {
    return makeFinding({
      id: "robots_no_sitemap",
      title: "robots.txt Doesn't Reference a Sitemap",
      severity: "medium",
      category: "indexability",
      affectedPages: 1,
      fixTime: 5,
      impact: 5,
      whatIsIt:
        "Your robots.txt file doesn't include a Sitemap: directive. The sitemap directive is a single line that tells crawlers exactly where to find a list of every page on your site — making indexing faster and more complete.",
      whyItMatters:
        "Without a sitemap reference in robots.txt, AI and search crawlers have to guess at your site structure by following links. They may miss important pages, especially newer ones or those buried deep in your navigation.",
      howToFix:
        "Add a single Sitemap: line to your robots.txt pointing to your sitemap URL.",
      fixCode: `Sitemap: ${new URL(siteUrl).origin}/sitemap.xml`,
      fixType: "robots",
      fixLabel: "Add this line to the bottom of your robots.txt:",
    });
  }

  if (robots.blocksGPTBot || robots.blocksAnthropicAI) {
    const blocked: string[] = [];
    if (robots.blocksGPTBot) blocked.push("GPTBot (ChatGPT)");
    if (robots.blocksAnthropicAI) blocked.push("anthropic-ai (Claude)");

    // Build a clean robots.txt that strips the AI blocks while preserving everything else
    const cleaned = stripAiBotBlocks(robots.rawContent ?? "", siteUrl);

    return makeFinding({
      id: "robots_blocks_ai_bots",
      title: `robots.txt Blocks ${blocked.join(" and ")}`,
      severity: "high",
      category: "indexability",
      affectedPages: 1,
      fixTime: 5,
      impact: 8,
      whatIsIt:
        "Your robots.txt is explicitly blocking AI training crawlers like GPTBot or anthropic-ai. Some sites do this intentionally for content protection — but if you want to appear in ChatGPT or Claude responses, this is preventing it.",
      whyItMatters:
        "Surven's mission is to make you visible in AI responses. If you're blocking the bots that build those AI models, you've cut yourself off from a major source of visibility. Only block these if you have a strict content-protection reason.",
      howToFix:
        "Replace your robots.txt with the version below. It strips the GPTBot/anthropic-ai/ClaudeBot disallow blocks while keeping the rest of your file intact.",
      fixCode: cleaned,
      fixType: "robots",
      fixLabel: "Replace your robots.txt with:",
    });
  }

  return null;
};

/**
 * Strip Disallow blocks for known AI crawlers from a robots.txt file.
 * Preserves all other user-agent groups, comments, and Sitemap directives.
 */
function stripAiBotBlocks(rawRobots: string, siteUrl: string): string {
  if (!rawRobots) {
    return `User-agent: *\nAllow: /\n\nSitemap: ${new URL(siteUrl).origin}/sitemap.xml\n`;
  }
  const aiAgents = ["gptbot", "anthropic-ai", "claudebot", "claude-web"];
  const lines = rawRobots.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;
  let buffered: string[] = [];
  let bufferedIsAi = false;

  const flush = () => {
    if (buffered.length === 0) return;
    if (!bufferedIsAi) out.push(...buffered);
    buffered = [];
    bufferedIsAi = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      flush();
      const agent = lower.slice("user-agent:".length).trim();
      bufferedIsAi = aiAgents.some((a) => agent === a || agent.includes(a));
      buffered.push(rawLine);
      skipping = bufferedIsAi;
    } else if (line === "" || line.startsWith("#") || lower.startsWith("sitemap:")) {
      flush();
      out.push(rawLine);
      skipping = false;
    } else {
      if (skipping) buffered.push(rawLine);
      else out.push(rawLine);
    }
  }
  flush();

  // Collapse runs of blank lines
  const result = out.join("\n").replace(/\n{3,}/g, "\n\n");
  return result.endsWith("\n") ? result : result + "\n";
}

// 2. sitemap coverage
const checkSitemapCoverage: RuleCheck = ({ sitemap, siteUrl }) => {
  if (!sitemap.found) {
    return makeFinding({
      id: "sitemap_missing",
      title: "XML Sitemap Not Found",
      severity: "high",
      category: "indexability",
      affectedPages: 1,
      fixTime: 30,
      impact: 8,
      whatIsIt:
        "An XML sitemap is a file (usually at /sitemap.xml) that lists every page on your site, when it was last updated, and how often it changes. Crawlers use it as a complete map of your content instead of trying to find pages by following links.",
      whyItMatters:
        "Without a sitemap, AI crawlers have to discover your pages by following links from the homepage. Pages that aren't well-linked can be missed entirely. Sitemaps are especially important for newer content and large sites.",
      howToFix:
        "Generate an XML sitemap. Most CMS platforms (WordPress with Yoast/Rank Math, Webflow, Wix, Shopify) generate one automatically. For custom sites, generate one based on your routes.",
      fixCode: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${new URL(siteUrl).origin}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <!-- Add a <url> entry for every page -->\n</urlset>`,
      fixType: "sitemap",
      fixLabel: "Create /sitemap.xml with entries like:",
    });
  }

  if (sitemap.coveragePct < 80 && sitemap.totalUrls > 0) {
    return makeFinding({
      id: "sitemap_low_coverage",
      title: `Sitemap Only Covers ${Math.round(sitemap.coveragePct)}% of Your Pages`,
      severity: "high",
      category: "indexability",
      affectedPages: sitemap.missingPages.length,
      affectedUrls: sitemap.missingPages,
      fixTime: 30,
      impact: 7,
      whatIsIt:
        "Your sitemap exists but is missing pages we found by crawling your site. AI crawlers may rely on the sitemap as the canonical list of pages — anything not in it could be missed.",
      whyItMatters:
        "When pages aren't in your sitemap, crawlers either find them by accident (via internal links) or not at all. This creates inconsistent AI visibility — some pages get cited, others never do.",
      howToFix:
        "Regenerate your sitemap so it includes every page on your site. If you use a CMS, check your sitemap plugin settings. For custom sites, add the missing URLs to /sitemap.xml.",
      // Auto-fix: same generator the sitemap_missing path uses — regenerate /sitemap.xml
      // from the crawl results and commit. Both paths now reach the same GitHub handler.
      fixCode: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${new URL(siteUrl).origin}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <!-- Surven regenerates this with every crawled page -->\n</urlset>`,
      fixType: "sitemap",
      fixLabel: "Regenerated /sitemap.xml will include every page Surven found:",
    });
  }

  if (sitemap.brokenUrlsCount > 0) {
    return makeFinding({
      id: "sitemap_broken_urls",
      title: `Sitemap Has ${sitemap.brokenUrlsCount} Broken URL${sitemap.brokenUrlsCount !== 1 ? "s" : ""}`,
      severity: "medium",
      category: "indexability",
      affectedPages: sitemap.brokenUrlsCount,
      fixTime: 20,
      impact: 5,
      whatIsIt:
        "Your sitemap lists pages that return 404 or other errors when crawled. Crawlers waste budget trying to fetch these dead URLs, and a sitemap full of errors signals a stale, neglected site.",
      whyItMatters:
        "AI and search crawlers have a finite crawl budget per site. Wasting it on broken URLs means less attention paid to your real content.",
      howToFix:
        "Remove dead URLs from your sitemap. Most CMS sitemap plugins update automatically when pages are deleted — if yours doesn't, regenerate the sitemap.",
    });
  }

  return null;
};

// 3. HTTP errors
const checkHttpErrors: RuleCheck = ({ pages }) => {
  const errors5xx: string[] = [];
  const errors4xx: string[] = [];
  for (const p of pages) {
    if (p.statusCode >= 500) errors5xx.push(p.url);
    else if (p.statusCode >= 400) errors4xx.push(p.url);
  }

  if (errors5xx.length > 0) {
    return makeFinding({
      id: "http_5xx_errors",
      title: `${errors5xx.length} Page${errors5xx.length !== 1 ? "s" : ""} Return Server Errors`,
      severity: "critical",
      category: "http",
      affectedPages: errors5xx.length,
      affectedUrls: errors5xx,
      fixTime: 60,
      impact: 9,
      whatIsIt:
        "5xx errors mean your server failed to respond to requests for these pages. Crawlers see a 5xx as 'come back later' — but if it persists, they stop crawling those pages entirely.",
      whyItMatters:
        "Server errors directly block AI and search visibility for the affected pages. They also signal an unstable site, which can cause crawlers to reduce how often they visit overall.",
      howToFix:
        "Check your server logs and hosting dashboard for the affected URLs. Common causes: deployment failures, database errors, broken CMS plugins, or hitting memory/CPU limits.",
    });
  }

  const total = pages.length;
  if (total > 0 && errors4xx.length / total > 0.1) {
    return makeFinding({
      id: "http_4xx_high",
      title: `${errors4xx.length} of ${total} Pages Return 4xx Errors`,
      severity: "high",
      category: "http",
      affectedPages: errors4xx.length,
      affectedUrls: errors4xx,
      fixTime: 45,
      impact: 7,
      whatIsIt:
        "4xx errors mean a page can't be found (404) or access is forbidden (403). Crawlers try once or twice, then drop these URLs from their index.",
      whyItMatters:
        "When more than 10% of your pages return 4xx, crawlers start questioning the overall health of your site and may reduce crawl frequency across all pages — affecting AI visibility for your good content too.",
      howToFix:
        "Audit the affected URLs. For removed pages, set up 301 redirects to relevant alternatives. For broken links, fix the source URL. Update your sitemap to remove dead pages.",
    });
  }

  return null;
};

// 4. Redirect chains
const checkRedirectChains: RuleCheck = ({ redirects }) => {
  const longChains = redirects.filter((r) => r.hops > 2);
  const loops = redirects.filter((r) => r.loop);

  if (loops.length > 0) {
    return makeFinding({
      id: "redirect_loops",
      title: `${loops.length} Redirect Loop${loops.length !== 1 ? "s" : ""} Detected`,
      severity: "critical",
      category: "http",
      affectedPages: loops.length,
      affectedUrls: loops.map((l) => l.startUrl),
      fixTime: 30,
      impact: 9,
      whatIsIt:
        "A redirect loop is when URL A redirects to B, B redirects back to A (or to C which redirects back). Crawlers stop after detecting the loop and the pages become unreachable.",
      whyItMatters:
        "Redirect loops make pages permanently uncrawlable. AI and search engines simply give up on these URLs, and any links pointing to them become useless.",
      howToFix:
        "Identify the redirect rules causing the loop (server config, .htaccess, Vercel/Netlify redirects, or CMS settings) and remove the conflicting rule.",
    });
  }

  if (longChains.length > 0) {
    return makeFinding({
      id: "redirect_chains_long",
      title: `${longChains.length} Redirect Chain${longChains.length !== 1 ? "s" : ""} Longer Than 2 Hops`,
      severity: "high",
      category: "http",
      affectedPages: longChains.length,
      affectedUrls: longChains.map((c) => c.startUrl),
      fixTime: 20,
      impact: 6,
      whatIsIt:
        "A redirect chain is when one URL redirects through multiple intermediate URLs before reaching the final page (A → B → C → D). Each hop slows crawling and some crawlers stop after 3-5 hops.",
      whyItMatters:
        "Each redirect hop adds latency and risk. AI crawlers have time budgets — long chains mean less time spent on your actual content. Search engines also pass progressively less authority through each redirect.",
      howToFix:
        "Update redirects so each old URL points directly to the final destination, not through intermediate URLs. Check your hosting platform's redirect rules (Vercel, Netlify, Apache, nginx).",
    });
  }

  return null;
};

// 5. Noindex pages
const checkNoindexPages: RuleCheck = ({ pages }) => {
  const noindex = pages.filter((p) => /noindex/i.test(p.metaRobots ?? ""));
  if (noindex.length === 0) return null;
  // Skip if homepage is noindex — that's such an obvious mistake it's a different finding
  const homepageNoindex = noindex.some((p) => p.url === pages[0]?.url);
  if (homepageNoindex) {
    return makeFinding({
      id: "homepage_noindex",
      title: "Your Homepage Is Set to noindex",
      severity: "critical",
      category: "indexability",
      affectedPages: 1,
      affectedUrls: [pages[0].url],
      fixTime: 5,
      impact: 10,
      whatIsIt:
        "A 'noindex' meta tag in your page's <head> tells crawlers to not include this page in their search index. On your homepage, this hides your entire site from AI and search results.",
      whyItMatters:
        "This is the single most damaging crawlability issue. AI models and search engines will refuse to cite or rank your homepage, which usually means your business name disappears from AI answers entirely.",
      howToFix:
        "Open your homepage's HTML and remove the <meta name=\"robots\" content=\"noindex\"> tag. If you're on WordPress, check Settings → Reading and uncheck 'Discourage search engines'.",
    });
  }

  if (noindex.length / Math.max(1, pages.length) > 0.3) {
    return makeFinding({
      id: "noindex_widespread",
      title: `${noindex.length} of ${pages.length} Pages Are Set to noindex`,
      severity: "high",
      category: "indexability",
      affectedPages: noindex.length,
      affectedUrls: noindex.map((p) => p.url),
      fixTime: 30,
      impact: 8,
      whatIsIt:
        "These pages have a 'noindex' meta tag, telling crawlers to skip them. This is sometimes intentional (admin pages, thank-you pages) but often accidental — left over from staging, a CMS template, or a misconfigured plugin.",
      whyItMatters:
        "Each noindex page is invisible to AI and search. If your service pages, blog posts, or landing pages are accidentally noindex'd, you've removed them from AI consideration entirely.",
      howToFix:
        "Review the affected pages and remove the noindex tag from any page you want to be visible. The tag is usually controlled by a CMS plugin or template setting.",
    });
  }

  return null;
};

// 6. Canonical tags
const checkCanonicalTags: RuleCheck = ({ pages }) => {
  const indexablePages = pages.filter(isIndexableHtmlPage);
  if (indexablePages.length === 0) return null;

  const missing = indexablePages.filter((p) => !p.canonical);
  const ratio = missing.length / indexablePages.length;

  if (ratio > 0.5) {
    return makeFinding({
      id: "canonical_missing",
      title: `${missing.length} Pages Missing Canonical Tag`,
      severity: "medium",
      category: "indexability",
      affectedPages: missing.length,
      affectedUrls: missing.map((p) => p.url),
      fixTime: 30,
      impact: 5,
      whatIsIt:
        "A canonical tag (<link rel=\"canonical\">) tells crawlers the official URL of a page when multiple URLs could serve the same content (e.g. with/without trailing slash, with/without query parameters). Without it, crawlers may treat duplicates as separate pages.",
      whyItMatters:
        "Without canonical tags, AI and search engines can split authority across duplicate URLs. Instead of one strong page being cited, you have multiple weak versions competing with each other.",
      howToFix:
        "Add a canonical tag to every page's <head> pointing to the page's official URL. Most CMS platforms add this automatically — check your SEO plugin settings.",
      fixCode: `<link rel="canonical" href="https://yoursite.com/this-exact-page" />`,
      fixType: "html",
      fixLabel: "Add to each page's <head>:",
    });
  }

  return null;
};

// 7. Duplicate titles
const checkDuplicateTitles: RuleCheck = ({ pages }) => {
  const titleGroups = new Map<string, string[]>();
  for (const p of pages) {
    if (!p.title || p.statusCode < 200 || p.statusCode >= 300) continue;
    const key = p.title.trim().toLowerCase();
    if (!titleGroups.has(key)) titleGroups.set(key, []);
    titleGroups.get(key)!.push(p.url);
  }
  const dupes: string[] = [];
  for (const [, urls] of titleGroups) {
    if (urls.length > 1) dupes.push(...urls);
  }
  if (dupes.length === 0) return null;

  return makeFinding({
    id: "duplicate_titles",
    title: `${dupes.length} Pages Share Duplicate Titles`,
    severity: "medium",
    category: "content",
    affectedPages: dupes.length,
    affectedUrls: dupes,
    fixTime: 45,
    impact: 5,
    whatIsIt:
      "Multiple pages have identical <title> tags. The title is one of the strongest signals to AI about what a page covers — when several pages share a title, AI can't tell them apart.",
    whyItMatters:
      "Duplicate titles confuse AI ranking. AI may pick a less-relevant page to cite, or split mentions across all the duplicates instead of concentrating authority on the right one.",
    howToFix:
      "Give each page a unique, descriptive title. Format: '[Page topic] | [Business name]'. The title should clearly distinguish each page from your other pages.",
    // Auto-fix: Surven LLM-batches all N duplicate pages and rewrites each with a distinct
    // title. Routed by the extension to /api/audit/rewrite-duplicates instead of the
    // single-snippet apply path. fixCode is a placeholder — the actual values come from
    // the LLM call.
    fixType: "rewrite_duplicates",
    fixCode: "(Surven will rewrite each page's title with a distinct, AI-generated value.)",
    fixLabel: "Each duplicate page will get a unique title generated from its content:",
  });
};

// 8. Duplicate meta descriptions
const checkDuplicateMetaDescriptions: RuleCheck = ({ pages }) => {
  const groups = new Map<string, string[]>();
  for (const p of pages) {
    if (!p.metaDescription || p.statusCode < 200 || p.statusCode >= 300) continue;
    const key = p.metaDescription.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p.url);
  }
  const dupes: string[] = [];
  for (const [, urls] of groups) {
    if (urls.length > 1) dupes.push(...urls);
  }
  if (dupes.length === 0) return null;

  return makeFinding({
    id: "duplicate_meta_descriptions",
    title: `${dupes.length} Pages Share Duplicate Meta Descriptions`,
    severity: "medium",
    category: "content",
    affectedPages: dupes.length,
    affectedUrls: dupes,
    fixTime: 45,
    impact: 4,
    whatIsIt:
      "Multiple pages have the same meta description. The meta description is the summary that appears in search results and helps AI understand the page — duplicates are a missed opportunity.",
    whyItMatters:
      "When pages share descriptions, AI has no way to distinguish their value. Each page should describe its unique content so AI can match it to the right user query.",
    howToFix:
      "Write a unique 100-160 character description for each page that summarizes what's unique about that specific page.",
    fixType: "rewrite_duplicates",
    fixCode: "(Surven will rewrite each page's meta description with a distinct, AI-generated value.)",
    fixLabel: "Each duplicate page will get a unique description generated from its content:",
  });
};

// 9. Image alt text
const checkImageAltText: RuleCheck = ({ pages }) => {
  let totalImages = 0;
  let missingAlt = 0;
  const affected: string[] = [];
  for (const p of pages) {
    if (!p.imageStats) continue;
    totalImages += p.imageStats.total;
    missingAlt += p.imageStats.missingAlt;
    if (p.imageStats.missingAlt > 0) affected.push(p.url);
  }

  if (totalImages === 0) return null;
  const ratio = missingAlt / totalImages;
  if (ratio < 0.2) return null;

  return makeFinding({
    id: "image_alt_text_missing",
    title: `${missingAlt} of ${totalImages} Images Missing Alt Text`,
    severity: "medium",
    category: "content",
    affectedPages: affected.length,
    affectedUrls: affected,
    fixTime: 60,
    impact: 5,
    whatIsIt:
      "Alt text is a text description added to <img> tags. AI uses alt text to understand images — without it, your images are invisible to AI crawlers and screen readers.",
    whyItMatters:
      "AI Overview and ChatGPT increasingly cite pages with rich, accessible content. Missing alt text both hurts your AI extraction and is a baseline accessibility requirement.",
    howToFix:
      "Add descriptive alt text to every <img> tag. Describe what the image shows (not 'image' or 'photo'). Decorative images can use alt=\"\" (empty alt).",
  });
};

// 10. Schema coverage
const checkSchemaCoverage: RuleCheck = ({ pages, siteUrl }) => {
  const indexable = pages.filter(isIndexableHtmlPage);
  if (indexable.length === 0) return null;
  const withSchema = indexable.filter((p) => p.schemaTypes.length > 0);
  const ratio = withSchema.length / indexable.length;
  if (ratio >= 0.5) return null;

  const without = indexable.filter((p) => p.schemaTypes.length === 0);
  return makeFinding({
    id: "schema_coverage_low",
    title: `Only ${Math.round(ratio * 100)}% of Pages Have Schema Markup`,
    severity: "high",
    category: "content",
    affectedPages: without.length,
    affectedUrls: without.map((p) => p.url),
    fixTime: 90,
    impact: 8,
    whatIsIt:
      "Schema markup is structured data (JSON-LD code) that explicitly tells AI what a page is about — Organization, LocalBusiness, Article, Product, FAQ, etc. Pages with schema get cited far more often than pages without.",
    whyItMatters:
      "Surven's mission is AI visibility, and schema is the single biggest lever for AI extraction. Pages with schema get cited 28-40% more often. Most of your pages don't have it.",
    howToFix:
      "Add schema.org markup to every page. Start with Organization on the homepage, LocalBusiness if you have a physical location, and Article schema on blog posts.",
    fixCode: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Business Name",\n  "url": "${new URL(siteUrl).origin}",\n  "logo": "${new URL(siteUrl).origin}/logo.png",\n  "contactPoint": {\n    "@type": "ContactPoint",\n    "telephone": "+1-555-555-5555",\n    "contactType": "Customer Service"\n  }\n}\n</script>`,
    fixType: "html",
    fixLabel: "Add to your homepage's <head>:",
  });
};

// 11. HTTPS coverage
const checkHttpsCoverage: RuleCheck = ({ pages, homepage }) => {
  const httpPages = pages.filter((p) => p.url.startsWith("http://"));
  if (httpPages.length === 0) return null;

  const homepageHttp = homepage.url.startsWith("http://");
  if (homepageHttp) {
    return makeFinding({
      id: "https_homepage_missing",
      title: "Homepage Served Over HTTP (Not HTTPS)",
      severity: "critical",
      category: "security",
      affectedPages: 1,
      affectedUrls: [homepage.url],
      fixTime: 60,
      impact: 9,
      whatIsIt:
        "HTTPS encrypts the connection between your site and visitors. Browsers warn users about non-HTTPS sites, search engines deprioritize them, and AI models treat them as less trustworthy.",
      whyItMatters:
        "An HTTP homepage is treated as 'not secure' by every modern browser. Users see warning banners, search engines penalize ranking, and AI is much less likely to cite your site as a trusted source.",
      howToFix:
        "Get a free SSL certificate from Let's Encrypt (most hosts have one-click setup) or use Cloudflare's free SSL. Then set up a 301 redirect from HTTP to HTTPS so all traffic uses the secure version.",
    });
  }

  return makeFinding({
    id: "https_partial",
    title: `${httpPages.length} Pages Still on HTTP`,
    severity: "high",
    category: "security",
    affectedPages: httpPages.length,
    affectedUrls: httpPages.map((p) => p.url),
    fixTime: 30,
    impact: 7,
    whatIsIt:
      "Some pages on your site are still served over HTTP instead of HTTPS. This often happens after a partial migration or when older pages haven't been updated.",
    whyItMatters:
      "Mixed HTTP/HTTPS confuses crawlers and creates duplicate content issues. AI and search engines may treat HTTP and HTTPS versions as separate pages, splitting authority.",
    howToFix:
      "Add 301 redirects from each HTTP URL to its HTTPS equivalent. Most hosting platforms (Vercel, Netlify, Cloudflare) have one-click 'force HTTPS' settings.",
  });
};

// 12. URL depth
const checkUrlDepth: RuleCheck = ({ pages }) => {
  const deep = pages.filter((p) => {
    try {
      const path = new URL(p.url).pathname;
      const segments = path.split("/").filter(Boolean);
      return segments.length > 5;
    } catch {
      return false;
    }
  });
  if (deep.length === 0) return null;

  return makeFinding({
    id: "url_depth_excessive",
    title: `${deep.length} Pages Are Deeply Nested`,
    severity: "low",
    category: "http",
    affectedPages: deep.length,
    affectedUrls: deep.map((p) => p.url),
    fixTime: 60,
    impact: 3,
    whatIsIt:
      "URL depth is how many directory levels a page sits under (e.g. /a/b/c/d/e/page = 6 levels). Pages buried this deep are harder for crawlers to find and treated as less important by ranking algorithms.",
    whyItMatters:
      "Deep URLs signal to AI that a page is buried, niche, or low-priority. Important content should generally live within 3 clicks of the homepage.",
    howToFix:
      "Restructure your URL hierarchy so important pages are no more than 4-5 levels deep. Use flat URL structures like /services/dental-cleaning instead of /content/services/dental/general/cleaning.",
  });
};

// 13. Content freshness
const checkContentFreshness: RuleCheck = ({ pages }) => {
  const indexable = pages.filter(isIndexableHtmlPage);
  if (indexable.length === 0) return null;
  const withDate = indexable.filter((p) => p.lastModified);
  const stale = withDate.filter((p) => {
    const ageMs = Date.now() - p.lastModified!.getTime();
    return ageMs > 180 * 24 * 60 * 60 * 1000;
  });
  if (stale.length / Math.max(1, indexable.length) < 0.3) return null;

  return makeFinding({
    id: "content_stale_widespread",
    title: `${stale.length} Pages Haven't Been Updated in 6+ Months`,
    severity: "medium",
    category: "content",
    affectedPages: stale.length,
    affectedUrls: stale.map((p) => p.url),
    fixTime: 120,
    impact: 6,
    whatIsIt:
      "AI models heavily favor recent content. Pages that haven't been updated in 6+ months get deprioritized — AI assumes the information may be outdated.",
    whyItMatters:
      "76.4% of ChatGPT's most-cited pages were updated within the last 30 days. Stale content gets less AI attention, regardless of how good it is.",
    howToFix:
      "Schedule a content refresh: update statistics, add recent examples, fix broken links, and bump the published or modified date. Even small edits signal freshness.",
  });
};

// 14. Internal broken links (NEW)
const checkInternalBrokenLinks: RuleCheck = ({ pages, pageLinks, siteUrl }) => {
  const origin = (() => {
    try {
      return new URL(siteUrl).origin;
    } catch {
      return "";
    }
  })();
  if (!origin) return null;

  const statusByUrl = new Map<string, number>();
  for (const p of pages) statusByUrl.set(p.url, p.statusCode);

  const broken = new Set<string>();
  for (const [, links] of Object.entries(pageLinks)) {
    for (const link of links) {
      try {
        const u = new URL(link);
        if (u.origin !== origin) continue;
        const status = statusByUrl.get(link);
        if (status !== undefined && (status >= 400 || status === 0)) {
          broken.add(link);
        }
      } catch {
        // skip
      }
    }
  }

  if (broken.size === 0) return null;
  return makeFinding({
    id: "internal_broken_links",
    title: `${broken.size} Internal Link${broken.size !== 1 ? "s" : ""} Point to Broken Pages`,
    severity: "high",
    category: "links",
    affectedPages: broken.size,
    affectedUrls: Array.from(broken),
    fixTime: 45,
    impact: 7,
    whatIsIt:
      "Your pages link to other pages on your own site that return errors (404, 500, or unreachable). Each broken link is a dead end for crawlers and visitors.",
    whyItMatters:
      "Broken internal links waste crawl budget and signal site neglect. AI and search engines reduce trust in sites with high broken-link counts.",
    howToFix:
      "Update each link to point to a working URL, or remove it. If the target page was deleted, set up a 301 redirect to a related page.",
  });
};

// 15. Viewport meta (NEW)
const checkViewportMeta: RuleCheck = ({ pages }) => {
  const indexable = pages.filter(isIndexableHtmlPage);
  if (indexable.length === 0) return null;
  const missing = indexable.filter((p) => p.hasViewportMeta === false);
  if (missing.length / indexable.length < 0.3) return null;

  return makeFinding({
    id: "viewport_meta_missing",
    title: `${missing.length} Pages Missing Viewport Meta Tag`,
    severity: "medium",
    category: "content",
    affectedPages: missing.length,
    affectedUrls: missing.map((p) => p.url),
    fixTime: 5,
    impact: 5,
    whatIsIt:
      "The viewport meta tag tells mobile browsers how to scale the page. Without it, pages render at desktop width and require zooming on phones — which Google flags as not mobile-friendly.",
    whyItMatters:
      "Mobile-friendliness is a direct ranking signal for Google and a factor in AI summary generation. Pages without a viewport tag rank lower in mobile-first search.",
    howToFix:
      "Add a single meta tag to every page's <head>.",
    fixCode: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    fixType: "html",
    fixLabel: "Add to each page's <head>:",
  });
};

// 16. Open Graph tags (NEW)
const checkOgTagsCoverage: RuleCheck = ({ pages }) => {
  const indexable = pages.filter(isIndexableHtmlPage);
  if (indexable.length === 0) return null;
  const missing = indexable.filter((p) => {
    const og = p.ogTags;
    return !og || (!og.title && !og.description && !og.image);
  });
  if (missing.length / indexable.length < 0.5) return null;

  return makeFinding({
    id: "og_tags_missing",
    title: `${missing.length} Pages Missing Open Graph Tags`,
    severity: "medium",
    category: "content",
    affectedPages: missing.length,
    affectedUrls: missing.map((p) => p.url),
    fixTime: 30,
    impact: 6,
    whatIsIt:
      "Open Graph tags (<meta property=\"og:*\">) are extra <head> tags that explicitly tell AI and social platforms your page's title, description, and preview image. They were originally for Facebook but AI now uses them for content extraction.",
    whyItMatters:
      "AI models (especially Claude and Gemini) heavily rely on Open Graph data when summarizing pages. Missing OG tags means AI has to guess at your page's title, description, and image.",
    howToFix:
      "Add og:title, og:description, and og:image tags to every page's <head>. Most CMS platforms have an SEO plugin that does this automatically.",
    fixCode: `<meta property="og:title" content="Your Page Title" />\n<meta property="og:description" content="A 1-2 sentence summary of this page." />\n<meta property="og:image" content="https://yoursite.com/og-image.jpg" />\n<meta property="og:url" content="https://yoursite.com/this-page" />\n<meta property="og:type" content="website" />`,
    fixType: "html",
    fixLabel: "Add to each page's <head>:",
  });
};

// 17. llms.txt presence (NEW — GEO-specific, AI engine wayfinder)
const checkLlmsTxt: RuleCheck = ({ llmsTxt, pages, homepage, siteUrl }) => {
  if (llmsTxt?.exists) return null;

  const indexable = pages.filter(isIndexableHtmlPage);
  if (indexable.length === 0) return null;

  let origin: string;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return null;
  }

  const siteName = (homepage.title ?? "").trim() || new URL(origin).hostname;
  const description = homepage.metaDescription?.trim() || undefined;

  const generated = autoBuildLlmsTxt({
    siteName,
    siteUrl: origin,
    description,
    pages: indexable.slice(0, 60).map((p) => ({
      url: p.url,
      title: (p.title ?? p.url).trim() || p.url,
    })),
  });

  return makeFinding({
    id: "llms_txt_missing",
    title: "Site Missing llms.txt — AI Engine Wayfinder",
    severity: "high",
    category: "indexability",
    affectedPages: 1,
    fixTime: 10,
    impact: 8,
    whatIsIt:
      "llms.txt is a curated map of your most important pages, written for LLM crawlers (ChatGPT, Claude, Gemini, Perplexity). Spec at llmstxt.org. AI engines look for it at the site root and use it to prioritize what to read.",
    whyItMatters:
      "It's the single highest-leverage GEO file you can ship — no other audit tool generates it for you. AI engines that find a clean llms.txt index your important pages first, skipping noise.",
    howToFix:
      "Create /llms.txt at your site root. Surven's draft below is auto-generated from your crawl — refine the page list and descriptions before merging.",
    fixCode: generated,
    fixType: "llms",
    fixLabel: "Create /llms.txt with this content:",
  });
};

export const CRAWLABILITY_RULES: Array<{ id: string; check: RuleCheck }> = [
  { id: "robots_txt", check: checkRobotsTxt },
  { id: "sitemap_coverage", check: checkSitemapCoverage },
  { id: "http_errors", check: checkHttpErrors },
  { id: "redirect_chains", check: checkRedirectChains },
  { id: "noindex_pages", check: checkNoindexPages },
  { id: "canonical_tags", check: checkCanonicalTags },
  { id: "duplicate_titles", check: checkDuplicateTitles },
  { id: "duplicate_meta_descriptions", check: checkDuplicateMetaDescriptions },
  { id: "image_alt_text", check: checkImageAltText },
  { id: "schema_coverage", check: checkSchemaCoverage },
  { id: "https_coverage", check: checkHttpsCoverage },
  { id: "url_depth", check: checkUrlDepth },
  { id: "content_freshness", check: checkContentFreshness },
  { id: "internal_broken_links", check: checkInternalBrokenLinks },
  { id: "viewport_meta", check: checkViewportMeta },
  { id: "og_tags_coverage", check: checkOgTagsCoverage },
  { id: "llms_txt", check: checkLlmsTxt },
];
