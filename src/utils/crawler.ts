import type { CrawledPage } from "@/types/audit";

const USER_AGENT = "SurvenBot/1.0 (+https://surven.ai)";
const MAX_PAGES = 100;
const CRAWL_TIMEOUT_MS = 25_000;
const PAGE_TIMEOUT_MS = 8_000;
const CONCURRENT_REQUESTS = 3;

export interface CrawlResult {
  pages: CrawledPage[];
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
      return { pages: [homepage], hitLimit: false, durationMs: Date.now() - startTime };
    }

    const pages: CrawledPage[] = [homepage];
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
        }
      }
    }

    return {
      pages,
      hitLimit: pages.length >= maxPages,
      durationMs: Date.now() - startTime,
    };
  } finally {
    clearTimeout(crawlTimer);
  }
}

async function fetchAndParsePage(url: string): Promise<PageFetchResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!res.ok) {
      return { page: emptyPage(url, res.status), links: [] };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { page: emptyPage(url, res.status), links: [] };
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
      },
      links,
    };
  } catch {
    return { page: emptyPage(url, 0), links: [] };
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
