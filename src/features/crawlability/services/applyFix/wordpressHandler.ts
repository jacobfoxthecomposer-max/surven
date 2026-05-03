/**
 * WordPress fix handler.
 *
 * Parallel to githubHandler.ts and the Next.js section of htmlInjectHandler.ts.
 * Takes a fix payload and applies it to the user's WordPress site via the REST API
 * using stored Application Password credentials.
 *
 * Supports (Sprint 2 v1):
 *   - alt_text: works on every WP install (standard /wp/v2/media endpoint)
 *   - meta_desc: requires Yoast / RankMath / AIOSEO plugin; falls back to excerpt field
 *   - title_tag: requires Yoast / RankMath / AIOSEO plugin
 *   - schema_org: returns a graceful manual fallback (per-plugin schema injection in Sprint 2.5)
 */

import { WordPressClient, type SeoPlugin } from "@/services/wordpressClient";
import type { HtmlInjectPayload, HtmlInjectResult } from "./htmlInjectHandler";

export interface WordpressApplyOptions {
  creds: { username: string; applicationPassword: string };
  siteUrl: string;
  pageUrl: string;
  payload: HtmlInjectPayload;
  findingId: string;
  findingTitle: string;
}

export async function applyFixToWordpress(options: WordpressApplyOptions): Promise<HtmlInjectResult> {
  const { creds, siteUrl, pageUrl, payload } = options;

  let client: WordPressClient;
  try {
    client = new WordPressClient({
      siteUrl,
      username: creds.username,
      applicationPassword: creds.applicationPassword,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to initialize WordPress client" };
  }

  switch (payload.kind) {
    case "alt_text":
      return await applyAltTextFix(client, payload);

    case "meta_desc":
      return await applyMetaDescFix(client, pageUrl, payload);

    case "title_tag":
      return await applyTitleFix(client, pageUrl, payload);

    case "schema_org":
      return await applySchemaFix(client, pageUrl, payload);
  }
}

async function applyAltTextFix(
  client: WordPressClient,
  payload: Extract<HtmlInjectPayload, { kind: "alt_text" }>,
): Promise<HtmlInjectResult> {
  if (payload.replacements.length === 0) {
    return { ok: false, error: "No alt text replacements provided" };
  }

  const results: Array<{ src: string; ok: boolean; error?: string }> = [];

  for (const replacement of payload.replacements) {
    try {
      const media = await client.findMediaByUrl(replacement.src);
      if (!media) {
        results.push({ src: replacement.src, ok: false, error: "Image not found in WordPress media library" });
        continue;
      }
      const result = await client.updateMediaAlt(media.id, replacement.alt);
      results.push({ src: replacement.src, ok: result.ok, error: result.error });
    } catch (err) {
      results.push({ src: replacement.src, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  if (successCount === 0) {
    return {
      ok: false,
      error: `None of the ${results.length} images were updated. ${results[0]?.error ?? ""}`,
    };
  }

  return {
    ok: true,
    filePath: `${successCount} of ${results.length} images in WordPress media library`,
    commitUrl: undefined,
  };
}

async function applyMetaDescFix(
  client: WordPressClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "meta_desc" }>,
): Promise<HtmlInjectResult> {
  const page = await client.findPageOrPostByUrl(pageUrl);
  if (!page) {
    return {
      ok: false,
      error: "Couldn't find a page matching this URL in WordPress. The page may use a custom URL structure.",
    };
  }

  const plugin = await client.detectSeoPlugin();
  const result = await client.updatePageMetaDescription(page, payload.description, plugin);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    commitUrl: result.editUrl,
    filePath: pluginBadge(plugin, page.type, page.title?.rendered),
  };
}

async function applyTitleFix(
  client: WordPressClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "title_tag" }>,
): Promise<HtmlInjectResult> {
  const page = await client.findPageOrPostByUrl(pageUrl);
  if (!page) {
    return {
      ok: false,
      error: "Couldn't find a page matching this URL in WordPress.",
    };
  }

  const plugin = await client.detectSeoPlugin();
  if (!plugin) {
    return {
      ok: false,
      manualNote: "Your WordPress site has no SEO plugin installed. Install Yoast SEO (free) to enable automatic title tag updates, then re-run.",
    };
  }

  const result = await client.updatePageSeoTitle(page, payload.title, plugin);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    commitUrl: result.editUrl,
    filePath: pluginBadge(plugin, page.type, page.title?.rendered),
  };
}

async function applySchemaFix(
  client: WordPressClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "schema_org" }>,
): Promise<HtmlInjectResult> {
  const page = await client.findPageOrPostByUrl(pageUrl);
  if (!page) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: "Couldn't find a matching page in WordPress. Copy the snippet and add it via your SEO plugin or 'Insert Headers and Footers' plugin.",
    };
  }

  const plugin = await client.detectSeoPlugin();
  const result = await client.injectJsonLd(page, payload.jsonLd, payload.schemaType, plugin);

  if (!result.ok) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: result.manualNote ?? result.error ?? "Couldn't auto-inject schema. Paste the snippet manually.",
    };
  }

  return {
    ok: true,
    commitUrl: result.editUrl,
    filePath: pluginBadge(plugin, page.type, page.title?.rendered),
  };
}

function pluginBadge(plugin: SeoPlugin, type: string, title?: string): string {
  const titlePart = title ? ` "${title.slice(0, 40)}${title.length > 40 ? "…" : ""}"` : "";
  const pluginPart = plugin ? ` (via ${plugin})` : "";
  return `WordPress ${type}${titlePart}${pluginPart}`;
}
