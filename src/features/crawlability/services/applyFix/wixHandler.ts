/**
 * Wix fix handler.
 *
 * Parallel to wordpressHandler.ts. Takes a fix payload and applies it to the user's
 * Wix site via the Wix REST API using stored API Key + Site ID + Account ID.
 *
 * Supports (Sprint 3 v1):
 *   - schema_org: injected via Wix Custom Code API (lands in <head> on every page)
 *   - meta_desc: per-page SEO settings via Site Pages API
 *   - title_tag: per-page SEO settings via Site Pages API
 *   - alt_text: per-image via Media Manager API
 */

import { WixClient } from "@/services/wixClient";
import type { HtmlInjectPayload, HtmlInjectResult } from "./htmlInjectHandler";

export interface WixApplyOptions {
  creds: { apiKey: string; accountId: string };
  siteId: string;
  pageUrl: string;
  payload: HtmlInjectPayload;
  findingId: string;
  findingTitle: string;
}

export async function applyFixToWix(options: WixApplyOptions): Promise<HtmlInjectResult> {
  const { creds, siteId, pageUrl, payload } = options;

  const client = new WixClient({
    apiKey: creds.apiKey,
    siteId,
    accountId: creds.accountId,
  });

  switch (payload.kind) {
    case "alt_text":
      return await applyAltTextFix(client, payload);

    case "meta_desc":
      return await applyMetaDescFix(client, pageUrl, payload);

    case "title_tag":
      return await applyTitleFix(client, pageUrl, payload);

    case "schema_org":
      return await applySchemaFix(client, payload);
  }
}

async function applyAltTextFix(
  client: WixClient,
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
        results.push({
          src: replacement.src,
          ok: false,
          error: "Image URL doesn't match Wix CDN pattern — may not be a Wix-managed image",
        });
        continue;
      }
      const result = await client.updateMediaAlt(media.fileId, replacement.alt);
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
    filePath: `${successCount} of ${results.length} images in Wix media library`,
  };
}

async function applyMetaDescFix(
  client: WixClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "meta_desc" }>,
): Promise<HtmlInjectResult> {
  const { page, diagnostic } = await client.findPageByUrl(pageUrl);
  if (!page) {
    return {
      ok: false,
      error: `Couldn't find a matching page on your Wix site. ${diagnostic ?? "Unknown reason."}`,
    };
  }

  const result = await client.updatePageSeo(page.id, { description: payload.description });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    commitUrl: result.editUrl,
    filePath: `Wix page${page.title ? ` "${page.title}"` : ""}`,
  };
}

async function applyTitleFix(
  client: WixClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "title_tag" }>,
): Promise<HtmlInjectResult> {
  const { page, diagnostic } = await client.findPageByUrl(pageUrl);
  if (!page) {
    return {
      ok: false,
      error: `Couldn't find a matching page on your Wix site. ${diagnostic ?? "Unknown reason."}`,
    };
  }

  const result = await client.updatePageSeo(page.id, { title: payload.title });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    commitUrl: result.editUrl,
    filePath: `Wix page${page.title ? ` "${page.title}"` : ""}`,
  };
}

async function applySchemaFix(
  client: WixClient,
  payload: Extract<HtmlInjectPayload, { kind: "schema_org" }>,
): Promise<HtmlInjectResult> {
  // Detect duplicates by component name — we use a deterministic name per schema type.
  const componentName = `Surven_Schema_${payload.schemaType}`;

  const existing = await client.listCustomCode();
  const duplicate = existing.find((c) => c.componentName === componentName);
  if (duplicate) {
    return {
      ok: false,
      error: `${payload.schemaType} schema is already injected on this Wix site (component: ${componentName}). Remove it from Wix Dashboard → Settings → Custom Code first.`,
    };
  }

  const result = await client.addCustomCode(componentName, payload.jsonLd);
  if (!result.ok) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: result.error ?? "Wix Custom Code injection failed. Add manually: Wix Dashboard → Settings → Custom Code → Add Custom Code → paste in Head.",
    };
  }

  return {
    ok: true,
    commitUrl: result.editUrl,
    filePath: `Wix Custom Code (${payload.schemaType})`,
  };
}
