/**
 * llms.txt generator.
 *
 * Per the llmstxt.org spec, llms.txt lives at the site root and gives LLMs
 * a curated, structured map of the most important pages and what they cover.
 * Used by the crawlability audit to draft a starter llms.txt when the site
 * is missing one — the draft becomes the fixCode that gets committed via
 * the GitHub apply-fix flow.
 *
 * Spec: https://llmstxt.org/
 */

export interface LlmsTxtSection {
  title: string;
  links: Array<{ url: string; title: string; description?: string }>;
}

export interface LlmsTxtInput {
  siteName: string;
  siteUrl: string;
  summary?: string;
  details?: string;
  sections: LlmsTxtSection[];
  optional?: LlmsTxtSection;
}

export function generateLlmsTxt(input: LlmsTxtInput): string {
  const lines: string[] = [];

  lines.push(`# ${input.siteName}`);
  lines.push("");

  if (input.summary) {
    lines.push(`> ${input.summary}`);
    lines.push("");
  }

  if (input.details) {
    lines.push(input.details.trim());
    lines.push("");
  }

  for (const section of input.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    for (const link of section.links) {
      const desc = link.description ? `: ${link.description}` : "";
      lines.push(`- [${link.title}](${link.url})${desc}`);
    }
    lines.push("");
  }

  if (input.optional && input.optional.links.length > 0) {
    lines.push(`## Optional`);
    lines.push("");
    for (const link of input.optional.links) {
      const desc = link.description ? `: ${link.description}` : "";
      lines.push(`- [${link.title}](${link.url})${desc}`);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Build a default llms.txt from a business profile + a list of crawled URLs.
 * Sorts pages into Docs / Products / Blog / About based on URL patterns.
 * Smart enough for a starting draft; the user refines the PR before merging.
 */
export interface AutoBuildInput {
  siteName: string;
  siteUrl: string;
  description?: string;
  pages: Array<{ url: string; title: string }>;
}

export function autoBuildLlmsTxt(input: AutoBuildInput): string {
  const docs: AutoBuildInput["pages"] = [];
  const products: AutoBuildInput["pages"] = [];
  const blog: AutoBuildInput["pages"] = [];
  const about: AutoBuildInput["pages"] = [];
  const other: AutoBuildInput["pages"] = [];
  const optional: AutoBuildInput["pages"] = [];

  for (const page of input.pages) {
    const path = safePath(page.url, input.siteUrl).toLowerCase();
    if (/\b(docs?|documentation|guide|tutorial|reference|api)\b/.test(path)) docs.push(page);
    else if (/\b(product|pricing|features?|shop|store|services?)\b/.test(path)) products.push(page);
    else if (/\b(blog|news|articles?|posts?|insights?)\b/.test(path)) blog.push(page);
    else if (/\b(about|team|company|mission|contact|press)\b/.test(path)) about.push(page);
    else if (/\b(privacy|terms|legal|cookies|policy)\b/.test(path)) optional.push(page);
    else other.push(page);
  }

  const sections: LlmsTxtSection[] = [];

  if (products.length > 0) {
    sections.push({
      title: "Products & Services",
      links: products.slice(0, 15).map((p) => ({ url: p.url, title: p.title })),
    });
  }
  if (docs.length > 0) {
    sections.push({
      title: "Documentation",
      links: docs.slice(0, 25).map((p) => ({ url: p.url, title: p.title })),
    });
  }
  if (blog.length > 0) {
    sections.push({
      title: "Articles",
      links: blog.slice(0, 15).map((p) => ({ url: p.url, title: p.title })),
    });
  }
  if (about.length > 0) {
    sections.push({
      title: "About",
      links: about.slice(0, 10).map((p) => ({ url: p.url, title: p.title })),
    });
  }
  if (other.length > 0 && sections.length === 0) {
    sections.push({
      title: "Pages",
      links: other.slice(0, 20).map((p) => ({ url: p.url, title: p.title })),
    });
  }

  return generateLlmsTxt({
    siteName: input.siteName,
    siteUrl: input.siteUrl,
    summary: input.description,
    sections,
    optional:
      optional.length > 0
        ? {
            title: "Optional",
            links: optional.map((p) => ({ url: p.url, title: p.title })),
          }
        : undefined,
  });
}

function safePath(url: string, base: string): string {
  try {
    const u = new URL(url, base);
    return u.pathname;
  } catch {
    return url;
  }
}
