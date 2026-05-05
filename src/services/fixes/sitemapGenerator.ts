/**
 * Build a complete sitemap.xml by merging the live site's existing sitemap (if any)
 * with the URLs Surven discovered during the crawl that weren't in it.
 *
 * Strategy:
 *   1. Try to fetch the live /sitemap.xml. If it exists, parse out its <loc> entries
 *      to preserve any URLs that the crawler may have missed (e.g. orphan pages).
 *   2. Merge those with `additionalUrls` (the crawler's `missingPages` list — the
 *      "8% sitemap covers your site" finding's affectedUrls).
 *   3. De-dupe, sort by URL depth (homepage first, then alphabetical), emit fresh XML.
 *
 * Always includes the homepage even if neither source has it.
 */

const TIMEOUT_MS = 8000;

export async function buildCompleteSitemap(siteUrl: string, additionalUrls: string[]): Promise<string> {
  let origin: string;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    throw new Error(`Invalid siteUrl: ${siteUrl}`);
  }

  const existingUrls = await fetchExistingSitemapUrls(origin);

  // Combine + de-dupe. Drop fragments + query strings (sitemaps shouldn't include them)
  // and keep only same-origin URLs.
  const all = new Set<string>();
  all.add(`${origin}/`);
  for (const url of [...existingUrls, ...additionalUrls]) {
    const cleaned = cleanForSitemap(url, origin);
    if (cleaned) all.add(cleaned);
  }

  const sorted = Array.from(all).sort((a, b) => {
    if (a === `${origin}/`) return -1;
    if (b === `${origin}/`) return 1;
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });

  const today = new Date().toISOString().slice(0, 10);
  const entries = sorted
    .map((loc) => {
      const isHome = loc === `${origin}/`;
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${isHome ? "weekly" : "monthly"}</changefreq>\n    <priority>${isHome ? "1.0" : "0.7"}</priority>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function fetchExistingSitemapUrls(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "SurvenBot/1.0 (Sitemap Generator)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi))
      .map((m) => m[1]!.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function cleanForSitemap(url: string, origin: string): string | null {
  try {
    const u = new URL(url, origin);
    if (u.origin !== origin) return null;
    u.hash = "";
    u.search = "";
    return u.toString();
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
