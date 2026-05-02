import type { CrawledPage } from "@/types/audit";
import type {
  CrawlabilityFinding,
  CategoryScores,
  StatusBreakdown,
  RobotsAnalysis,
  SitemapAnalysis,
  RedirectChain,
  LlmsTxtAnalysis,
} from "@/types/crawlability";
import { CRAWLABILITY_RULES } from "./crawlabilityRules";
import { trackRedirects } from "./redirectTracker";
import { checkSsrfSafety } from "./normalizeUrl";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const FETCH_TIMEOUT_MS = 6_000;
const USER_AGENT = "SurvenBot/1.0 (+https://surven.ai)";

export interface AnalyzeCrawlabilityResult {
  findings: CrawlabilityFinding[];
  crawlabilityScore: number;
  categoryScores: CategoryScores;
  statusBreakdown: StatusBreakdown;
  robotsAnalysis: RobotsAnalysis;
  sitemapAnalysis: SitemapAnalysis;
  llmsTxtAnalysis: LlmsTxtAnalysis;
  redirectChains: RedirectChain[];
}

export async function analyzeCrawlability(
  pages: CrawledPage[],
  pageLinks: Record<string, string[]>,
  siteUrl: string
): Promise<AnalyzeCrawlabilityResult> {
  const homepage = pages[0];
  if (!homepage) {
    return emptyResult();
  }

  const origin = new URL(siteUrl).origin;

  // Fetch robots.txt, llms.txt, and homepage redirect in parallel
  const [robots, llmsTxt, redirectsHomepage] = await Promise.all([
    fetchRobotsTxt(origin),
    fetchLlmsTxt(origin),
    trackRedirects(siteUrl).catch(() => null),
  ]);

  const sitemap = await fetchAndAnalyzeSitemap(origin, robots, pages);

  // Track redirects on www-vs-apex variant + sample sitemap URLs
  const redirectTargets = buildRedirectTargets(siteUrl, sitemap);
  const redirectResults = await Promise.all(
    redirectTargets.map((u) => trackRedirects(u).catch(() => null))
  );
  const redirectChains: RedirectChain[] = [
    ...(redirectsHomepage ? [redirectsHomepage] : []),
    ...redirectResults.filter((r): r is RedirectChain => r !== null),
  ].filter((c) => c.hops > 0 || c.loop);

  // Run all rules
  const ctx = {
    homepage,
    pages,
    pageLinks,
    robots,
    sitemap,
    llmsTxt,
    redirects: redirectChains,
    siteUrl,
  };

  const findings: CrawlabilityFinding[] = [];
  for (const rule of CRAWLABILITY_RULES) {
    const f = rule.check(ctx);
    if (f) findings.push(f);
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const statusBreakdown = computeStatusBreakdown(pages);
  const categoryScores = computeCategoryScores(findings);
  const crawlabilityScore = computeOverallScore(categoryScores);

  return {
    findings,
    crawlabilityScore,
    categoryScores,
    statusBreakdown,
    robotsAnalysis: robots,
    sitemapAnalysis: sitemap,
    llmsTxtAnalysis: llmsTxt,
    redirectChains,
  };
}

function emptyResult(): AnalyzeCrawlabilityResult {
  return {
    findings: [],
    crawlabilityScore: 0,
    categoryScores: { http: 0, indexability: 0, content: 0, security: 0, links: 0 },
    statusBreakdown: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
    robotsAnalysis: {
      exists: false,
      isValid: false,
      blocksGooglebot: false,
      blocksGPTBot: false,
      blocksAnthropicAI: false,
      disallowedPaths: [],
      hasSitemapReference: false,
      sitemapUrls: [],
    },
    sitemapAnalysis: {
      found: false,
      totalUrls: 0,
      brokenUrlsCount: 0,
      coveragePct: 0,
      missingPages: [],
    },
    llmsTxtAnalysis: { exists: false },
    redirectChains: [],
  };
}

async function fetchLlmsTxt(origin: string): Promise<LlmsTxtAnalysis> {
  const url = `${origin}/llms.txt`;
  if (checkSsrfSafety(url)) return { exists: false };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return { exists: false };
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text") && !ctype.includes("markdown")) return { exists: false };
    const text = await res.text();
    if (text.length < 5) return { exists: false };
    return { exists: true, url, byteLength: text.length, rawContent: text.slice(0, 4000) };
  } catch {
    return { exists: false };
  }
}

async function fetchRobotsTxt(origin: string): Promise<RobotsAnalysis> {
  const url = `${origin}/robots.txt`;
  const ssrf = checkSsrfSafety(url);
  if (ssrf) {
    return {
      exists: false,
      isValid: false,
      blocksGooglebot: false,
      blocksGPTBot: false,
      blocksAnthropicAI: false,
      disallowedPaths: [],
      hasSitemapReference: false,
      sitemapUrls: [],
    };
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        exists: false,
        isValid: false,
        blocksGooglebot: false,
        blocksGPTBot: false,
        blocksAnthropicAI: false,
        disallowedPaths: [],
        hasSitemapReference: false,
        sitemapUrls: [],
      };
    }
    const text = await res.text();
    return parseRobotsTxt(text);
  } catch {
    return {
      exists: false,
      isValid: false,
      blocksGooglebot: false,
      blocksGPTBot: false,
      blocksAnthropicAI: false,
      disallowedPaths: [],
      hasSitemapReference: false,
      sitemapUrls: [],
    };
  }
}

function parseRobotsTxt(text: string): RobotsAnalysis {
  const lines = text.split("\n").map((l) => l.trim());
  const result: RobotsAnalysis = {
    exists: true,
    isValid: true,
    blocksGooglebot: false,
    blocksGPTBot: false,
    blocksAnthropicAI: false,
    disallowedPaths: [],
    hasSitemapReference: false,
    sitemapUrls: [],
    rawContent: text.slice(0, 5000),
  };

  let currentAgents: string[] = [];
  let blocksAll = false;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === "user-agent") {
      currentAgents = currentAgents.length > 0 && !result.disallowedPaths.length
        ? [...currentAgents, value.toLowerCase()]
        : [value.toLowerCase()];
    } else if (directive === "disallow") {
      if (value === "/") {
        for (const a of currentAgents) {
          if (a === "*") blocksAll = true;
          if (a.includes("googlebot")) result.blocksGooglebot = true;
          if (a.includes("gptbot")) result.blocksGPTBot = true;
          if (a.includes("anthropic-ai") || a.includes("claudebot"))
            result.blocksAnthropicAI = true;
        }
      }
      if (value && value !== "/") {
        result.disallowedPaths.push(value);
      }
      // After disallow we reset the agent buffer concept — start fresh on next user-agent
      currentAgents = [];
    } else if (directive === "sitemap") {
      result.hasSitemapReference = true;
      result.sitemapUrls.push(value);
    } else if (directive === "crawl-delay") {
      const n = parseInt(value, 10);
      if (!isNaN(n)) result.crawlDelay = n;
    }
  }

  if (blocksAll) {
    result.blocksGooglebot = true;
    result.blocksGPTBot = true;
    result.blocksAnthropicAI = true;
  }

  return result;
}

async function fetchAndAnalyzeSitemap(
  origin: string,
  robots: RobotsAnalysis,
  pages: CrawledPage[]
): Promise<SitemapAnalysis> {
  // Try robots.txt-referenced sitemaps first, then common defaults
  const candidates = robots.sitemapUrls.length > 0
    ? robots.sitemapUrls
    : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];

  for (const candidate of candidates) {
    const ssrf = checkSsrfSafety(candidate);
    if (ssrf) continue;
    try {
      const res = await fetch(candidate, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const text = await res.text();
      const urls = extractSitemapUrls(text);
      if (urls.length === 0) continue;

      const crawledUrls = new Set(pages.filter((p) => p.statusCode >= 200 && p.statusCode < 400).map((p) => p.url));
      const sitemapSet = new Set(urls);
      const inSitemap = pages.filter((p) => sitemapSet.has(p.url) && p.statusCode >= 200 && p.statusCode < 400).length;
      const coveragePct = crawledUrls.size > 0 ? (inSitemap / crawledUrls.size) * 100 : 0;
      const missingPages = pages
        .filter((p) => !sitemapSet.has(p.url) && p.statusCode >= 200 && p.statusCode < 300)
        .map((p) => p.url);

      // Spot-check up to 10 sitemap URLs for broken responses
      const sample = urls.slice(0, 10);
      let brokenCount = 0;
      const brokenChecks = await Promise.allSettled(
        sample.map(async (u) => {
          if (checkSsrfSafety(u)) return false;
          try {
            const r = await fetch(u, {
              method: "HEAD",
              headers: { "User-Agent": USER_AGENT },
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
            return r.status >= 400;
          } catch {
            return true;
          }
        })
      );
      for (const r of brokenChecks) {
        if (r.status === "fulfilled" && r.value) brokenCount++;
      }
      // Scale broken count up to estimate full sitemap
      const scaledBrokenCount = Math.round((brokenCount / sample.length) * urls.length);

      return {
        found: true,
        url: candidate,
        totalUrls: urls.length,
        brokenUrlsCount: scaledBrokenCount,
        coveragePct,
        missingPages,
      };
    } catch {
      continue;
    }
  }

  return {
    found: false,
    totalUrls: 0,
    brokenUrlsCount: 0,
    coveragePct: 0,
    missingPages: [],
  };
}

function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      urls.push(url);
    }
  }
  return urls;
}

function buildRedirectTargets(siteUrl: string, sitemap: SitemapAnalysis): string[] {
  const targets: string[] = [];
  try {
    const u = new URL(siteUrl);
    const altHost = u.hostname.startsWith("www.")
      ? u.hostname.replace(/^www\./, "")
      : `www.${u.hostname}`;
    targets.push(`${u.protocol}//${altHost}${u.pathname}`);
  } catch {
    // skip
  }
  // Sample up to 10 sitemap URLs for redirect tracking
  if (sitemap.found && sitemap.totalUrls > 0) {
    targets.push(...sitemap.missingPages.slice(0, 5));
  }
  return targets;
}

function computeStatusBreakdown(pages: CrawledPage[]): StatusBreakdown {
  const out: StatusBreakdown = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  for (const p of pages) {
    const s = p.statusCode;
    if (s >= 200 && s < 300) out["2xx"]++;
    else if (s >= 300 && s < 400) out["3xx"]++;
    else if (s >= 400 && s < 500) out["4xx"]++;
    else if (s >= 500) out["5xx"]++;
  }
  return out;
}

function computeCategoryScores(findings: CrawlabilityFinding[]): CategoryScores {
  const scores: CategoryScores = { http: 100, indexability: 100, content: 100, security: 100, links: 100 };
  const deduct = { critical: 25, high: 15, medium: 8, low: 3 } as const;

  for (const f of findings) {
    const cat = f.category;
    scores[cat] = Math.max(0, scores[cat] - deduct[f.severity]);
  }

  return scores;
}

function computeOverallScore(scores: CategoryScores): number {
  const weighted =
    scores.http * 0.25 +
    scores.indexability * 0.3 +
    scores.content * 0.25 +
    scores.security * 0.1 +
    scores.links * 0.1;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

export const _internals = { parseRobotsTxt, extractSitemapUrls };
