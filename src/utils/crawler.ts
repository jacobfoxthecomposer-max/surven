import type { CrawledPage } from "@/types/audit";

const USER_AGENT = "SurvenBot/1.0 (+https://surven.ai)";
const MAX_PAGES = 100;
const CRAWL_TIMEOUT_MS = 25_000;
const PAGE_TIMEOUT_MS = 8_000;
const CONCURRENT_REQUESTS = 3;

export interface CrawlResult {
  pages: CrawledPage[];
  pageLinks: Record<string, string[]>;
  hitLimit: boolean;
  durationMs: number;
}

interface PageFetchResult {
  page: CrawledPage;
  links: string[];
}

export async function crawlWebsite(
  siteUrl: string,
  maxPages = MAX_PAGES,
  crawlTimeoutMs = CRAWL_TIMEOUT_MS
): Promise<CrawlResult> {
  const startTime = Date.now();
  const crawlAbort = new AbortController();
  const crawlTimer = setTimeout(() => crawlAbort.abort(), crawlTimeoutMs);

  try {
    const { page: homepage, links: homepageLinks } = await fetchAndParsePage(siteUrl);

    if (homepage.statusCode === 0) {
      return {
        pages: [homepage],
        pageLinks: { [homepage.url]: homepageLinks },
        hitLimit: false,
        durationMs: Date.now() - startTime,
      };
    }

    const pages: CrawledPage[] = [homepage];
    const pageLinks: Record<string, string[]> = { [homepage.url]: homepageLinks };
    const visited = new Set<string>([normalizeUrl(siteUrl)]);

    const toVisit = homepageLinks
      .filter((url) => {
        if (!isSameOrigin(url, siteUrl)) return false;
        const norm = normalizeUrl(url);
        if (visited.has(norm)) return false;
        visited.add(norm);
        return true;
      })
      .slice(0, maxPages - 1);

    for (let i = 0; i < toVisit.length; i += CONCURRENT_REQUESTS) {
      if (pages.length >= maxPages || crawlAbort.signal.aborted) break;

      const batch = toVisit.slice(i, i + CONCURRENT_REQUESTS);
      const results = await Promise.allSettled(batch.map((url) => fetchAndParsePage(url)));

      for (const r of results) {
        if (r.status === "fulfilled" && pages.length < maxPages) {
          pages.push(r.value.page);
          pageLinks[r.value.page.url] = r.value.links;
        }
      }
    }

    return {
      pages,
      pageLinks,
      hitLimit: pages.length >= maxPages,
      durationMs: Date.now() - startTime,
    };
  } finally {
    clearTimeout(crawlTimer);
  }
}

async function fetchAndParsePage(url: string): Promise<PageFetchResult> {
  const fetchStart = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      redirect: "follow",
    });

    const responseTimeMs = Date.now() - fetchStart;

    if (!res.ok) {
      return { page: { ...emptyPage(url, res.status), responseTimeMs }, links: [] };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { page: { ...emptyPage(url, res.status), responseTimeMs }, links: [] };
    }

    const lastModifiedHeader = res.headers.get("Last-Modified");
    const headerDate = lastModifiedHeader ? new Date(lastModifiedHeader) : undefined;

    const html = await res.text();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";

    const metaDescription =
      html.match(/<meta\s+name=["']description["'][^>]*\scontent=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta\s+content=["']([^"']+)["'][^>]*\sname=["']description["']/i)?.[1] ??
      "";

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    const h1 = h1Matches
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);

    const schemaTypes: string[] = [];
    const schemas: Record<string, unknown>[] = [];
    const ldJsonRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    while ((ldMatch = ldJsonRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(ldMatch[1]) as Record<string, unknown>;
        schemas.push(parsed);
        const typeVal = parsed["@type"];
        const types = Array.isArray(typeVal) ? typeVal : [typeVal];
        for (const t of types) {
          if (typeof t === "string") schemaTypes.push(t);
        }
      } catch {
        // invalid JSON-LD, skip
      }
    }

    const metaModifiedRaw =
      html.match(
        /<meta\s+property=["']article:modified_time["'][^>]*\scontent=["']([^"']+)["']/i
      )?.[1] ??
      html.match(
        /<meta\s+content=["']([^"']+)["'][^>]*\sproperty=["']article:modified_time["']/i
      )?.[1];
    let metaDate: Date | undefined;
    if (metaModifiedRaw) {
      const d = new Date(metaModifiedRaw);
      if (!isNaN(d.getTime())) metaDate = d;
    }

    // Crawlability extensions — extract before stripping HTML
    const canonical =
      html.match(/<link\s+rel=["']canonical["'][^>]*\shref=["']([^"']+)["']/i)?.[1] ??
      html.match(/<link\s+href=["']([^"']+)["'][^>]*\srel=["']canonical["']/i)?.[1];

    const metaRobots =
      html.match(/<meta\s+name=["']robots["'][^>]*\scontent=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta\s+content=["']([^"']+)["'][^>]*\sname=["']robots["']/i)?.[1];

    const hasViewportMeta = /<meta\s+name=["']viewport["']/i.test(html);

    // Image alt text stats
    const imgMatches = [...html.matchAll(/<img\b[^>]*>/gi)];
    let imagesMissingAlt = 0;
    for (const m of imgMatches) {
      const tag = m[0];
      const altMatch = tag.match(/\salt=["']([^"']*)["']/i);
      if (!altMatch || altMatch[1].trim() === "") imagesMissingAlt++;
    }

    // Open Graph tags
    const ogTitle =
      html.match(/<meta\s+property=["']og:title["'][^>]*\scontent=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta\s+content=["']([^"']+)["'][^>]*\sproperty=["']og:title["']/i)?.[1];
    const ogDescription =
      html.match(/<meta\s+property=["']og:description["'][^>]*\scontent=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta\s+content=["']([^"']+)["'][^>]*\sproperty=["']og:description["']/i)?.[1];
    const ogImage =
      html.match(/<meta\s+property=["']og:image["'][^>]*\scontent=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta\s+content=["']([^"']+)["'][^>]*\sproperty=["']og:image["']/i)?.[1];

    const content = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15_000);

    const links = extractLinks(html, url);

    return {
      page: {
        url,
        title,
        metaDescription,
        h1,
        content,
        schemaTypes,
        schemas,
        lastModified: headerDate ?? metaDate,
        statusCode: res.status,
        canonical,
        metaRobots,
        imageStats: { total: imgMatches.length, missingAlt: imagesMissingAlt },
        hasViewportMeta,
        ogTags: { title: ogTitle, description: ogDescription, image: ogImage },
        responseTimeMs,
      },
      links,
    };
  } catch {
    return {
      page: { ...emptyPage(url, 0), responseTimeMs: Date.now() - fetchStart },
      links: [],
    };
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /href=["']([^"'#]+)["']/gi;
  const seen = new Set<string>();
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      if (!seen.has(resolved)) {
        seen.add(resolved);
        links.push(resolved);
      }
    } catch {
      // invalid URL, skip
    }
  }
  return links;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function emptyPage(url: string, statusCode: number): CrawledPage {
  return {
    url,
    title: "",
    metaDescription: "",
    h1: [],
    content: "",
    schemaTypes: [],
    schemas: [],
    statusCode,
  };
}
