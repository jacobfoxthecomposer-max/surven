import type { CrawledPage } from "./types";

export function parseCurrentPage(): CrawledPage {
  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .flatMap((s) => {
      try {
        return [JSON.parse(s.textContent ?? "")];
      } catch {
        return [];
      }
    });

  const metaDesc = document.querySelector('meta[name="description"]');
  const h1Elements = document.querySelectorAll("h1");

  return {
    url: location.href,
    title: document.title,
    metaDescription: metaDesc?.getAttribute("content") ?? "",
    h1: Array.from(h1Elements).map((h) => h.textContent?.trim() ?? ""),
    content: (document.body?.innerText ?? "").slice(0, 15_000),
    schemaTypes: schemas.map((s) => s["@type"]).filter(Boolean) as string[],
    schemas: schemas as Record<string, unknown>[],
    lastModified: document.lastModified ? new Date(document.lastModified) : undefined,
    statusCode: 200,
  };
}
