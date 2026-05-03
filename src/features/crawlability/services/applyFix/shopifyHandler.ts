/**
 * Shopify fix handler.
 *
 * Dispatches each fix kind to the right Admin API call:
 *   - schema_org: inject <script type="application/ld+json"> into theme.liquid (site-wide)
 *   - meta_desc:  metafields_global_description_tag on the matching product/page/article
 *   - title_tag:  metafields_global_title_tag on the matching product/page/article
 *   - alt_text:   image alt update via /products/{id}/images/{img_id}.json
 *
 * Resource lookup is by URL handle: /products/foo, /pages/bar, /blogs/x/y.
 * Home page (/) routes go to theme-level edits only — no per-page metafields exist.
 */

import { ShopifyClient } from "@/services/shopifyClient";
import type { HtmlInjectPayload, HtmlInjectResult } from "./htmlInjectHandler";

export interface ShopifyApplyOptions {
  creds: { clientId: string; clientSecret: string };
  shopDomain: string; // mystore.myshopify.com
  pageUrl: string;
  payload: HtmlInjectPayload;
  findingId: string;
  findingTitle: string;
}

const SCHEMA_MARKER_PREFIX = "<!-- surven:schema:";
const SCHEMA_MARKER_SUFFIX = " -->";

export async function applyFixToShopify(options: ShopifyApplyOptions): Promise<HtmlInjectResult> {
  const { creds, shopDomain, pageUrl, payload } = options;

  const client = new ShopifyClient({
    shopDomain,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
  });

  switch (payload.kind) {
    case "schema_org":
      return await applySchemaFix(client, shopDomain, payload);

    case "meta_desc":
      return await applyMetaDescFix(client, pageUrl, payload);

    case "title_tag":
      return await applyTitleFix(client, pageUrl, payload);

    case "alt_text":
      return await applyAltTextFix(client, pageUrl, payload);
  }
}

async function applySchemaFix(
  client: ShopifyClient,
  shopDomain: string,
  payload: Extract<HtmlInjectPayload, { kind: "schema_org" }>,
): Promise<HtmlInjectResult> {
  const theme = await client.getMainTheme();
  if (!theme) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: "Couldn't load your active Shopify theme. Add the snippet manually: Online Store → Themes → Edit code → layout/theme.liquid → paste before </head>.",
    };
  }

  const asset = await client.getThemeAsset(theme.id, "layout/theme.liquid");
  if (!asset.ok || !asset.value) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: "Couldn't read theme.liquid. Add manually: Online Store → Themes → Edit code → layout/theme.liquid → paste before </head>.",
    };
  }

  const marker = `${SCHEMA_MARKER_PREFIX}${payload.schemaType}${SCHEMA_MARKER_SUFFIX}`;
  if (asset.value.includes(marker)) {
    return {
      ok: false,
      error: `${payload.schemaType} schema is already injected on this Shopify theme. Remove it first from Online Store → Themes → Edit code → layout/theme.liquid.`,
    };
  }

  const block = `${marker}\n<script type="application/ld+json">\n${payload.jsonLd}\n</script>\n`;

  // Insert before </head>. If no </head> (some heavily customized themes), bail to copy-paste.
  const headCloseIdx = asset.value.toLowerCase().indexOf("</head>");
  if (headCloseIdx === -1) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: "Couldn't find </head> in theme.liquid. Paste manually: Online Store → Themes → Edit code → layout/theme.liquid.",
    };
  }

  const updated =
    asset.value.slice(0, headCloseIdx) + block + asset.value.slice(headCloseIdx);

  const result = await client.putThemeAsset(theme.id, "layout/theme.liquid", updated);
  if (!result.ok) {
    return {
      ok: false,
      manualSnippet: payload.jsonLd,
      manualNote: result.error ?? "Theme write was rejected. Paste manually into layout/theme.liquid.",
    };
  }

  const editUrl = `https://${shopDomain.replace(/\.myshopify\.com$/, "")}.myshopify.com/admin/themes/${theme.id}/editor`;
  return {
    ok: true,
    commitUrl: editUrl,
    filePath: `layout/theme.liquid (${payload.schemaType})`,
  };
}

async function applyMetaDescFix(
  client: ShopifyClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "meta_desc" }>,
): Promise<HtmlInjectResult> {
  return await applyResourceSeo(client, pageUrl, { description: payload.description }, payload.description, "description");
}

async function applyTitleFix(
  client: ShopifyClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "title_tag" }>,
): Promise<HtmlInjectResult> {
  return await applyResourceSeo(client, pageUrl, { title: payload.title }, payload.title, "title");
}

async function applyResourceSeo(
  client: ShopifyClient,
  pageUrl: string,
  seo: { title?: string; description?: string },
  rawValue: string,
  label: "description" | "title",
): Promise<HtmlInjectResult> {
  const parsed = ShopifyClient.parseHandleFromUrl(pageUrl);

  if (parsed.type === "product" && parsed.handle) {
    const product = await client.findProductByHandle(parsed.handle);
    if (!product) {
      return {
        ok: false,
        manualSnippet: rawValue,
        manualNote: `Couldn't find a product with handle "${parsed.handle}" on your Shopify store. Update the SEO ${label} manually in Shopify Admin → Products → ${parsed.handle} → Search engine listing preview.`,
      };
    }
    const result = await client.updateProductSeo(product.id, seo);
    if (!result.ok) {
      return { ok: false, manualSnippet: rawValue, manualNote: result.error ?? `Couldn't update product SEO ${label}.` };
    }
    return {
      ok: true,
      filePath: `Product "${product.title}" (${parsed.handle})`,
    };
  }

  if (parsed.type === "page" && parsed.handle) {
    const page = await client.findPageByHandle(parsed.handle);
    if (!page) {
      return {
        ok: false,
        manualSnippet: rawValue,
        manualNote: `Couldn't find a page with handle "${parsed.handle}". Update SEO ${label} manually in Shopify Admin → Online Store → Pages → ${parsed.handle}.`,
      };
    }
    const result = await client.updatePageSeo(page.id, seo);
    if (!result.ok) {
      return { ok: false, manualSnippet: rawValue, manualNote: result.error ?? `Couldn't update page SEO ${label}.` };
    }
    return {
      ok: true,
      filePath: `Page "${page.title}" (${parsed.handle})`,
    };
  }

  if (parsed.type === "article" && parsed.blogHandle && parsed.handle) {
    const blog = await client.findBlogByHandle(parsed.blogHandle);
    if (!blog) {
      return {
        ok: false,
        manualSnippet: rawValue,
        manualNote: `Couldn't find blog "${parsed.blogHandle}". Update SEO ${label} manually in Shopify Admin.`,
      };
    }
    const article = await client.findArticleByHandle(blog.id, parsed.handle);
    if (!article) {
      return {
        ok: false,
        manualSnippet: rawValue,
        manualNote: `Couldn't find article "${parsed.handle}" in blog "${parsed.blogHandle}". Update SEO ${label} manually.`,
      };
    }
    const result = await client.updateArticleSeo(blog.id, article.id, seo);
    if (!result.ok) {
      return { ok: false, manualSnippet: rawValue, manualNote: result.error ?? `Couldn't update article SEO ${label}.` };
    }
    return {
      ok: true,
      filePath: `Article "${article.title}"`,
    };
  }

  // Home page or unknown route — Shopify has no per-page metafield for the home page.
  // Home SEO is set via Online Store → Preferences → Title and meta description.
  return {
    ok: false,
    manualSnippet: rawValue,
    manualNote:
      parsed.type === "home"
        ? `For your storefront home page, set the SEO ${label} in Shopify Admin → Online Store → Preferences → Homepage title / Homepage meta description.`
        : `This URL doesn't map to a Shopify product, page, or article. Paste the ${label} manually in the relevant Shopify Admin section.`,
  };
}

async function applyAltTextFix(
  client: ShopifyClient,
  pageUrl: string,
  payload: Extract<HtmlInjectPayload, { kind: "alt_text" }>,
): Promise<HtmlInjectResult> {
  if (payload.replacements.length === 0) {
    return { ok: false, error: "No alt text replacements provided" };
  }

  const parsed = ShopifyClient.parseHandleFromUrl(pageUrl);
  let scopedProductId: number | null = null;

  if (parsed.type === "product" && parsed.handle) {
    const product = await client.findProductByHandle(parsed.handle);
    if (product) scopedProductId = product.id;
  }

  const results: Array<{ src: string; ok: boolean; error?: string }> = [];

  for (const replacement of payload.replacements) {
    try {
      let productId: number | null = scopedProductId;
      let imageId: number | null = null;

      if (productId) {
        const img = await client.findImageByUrl(productId, replacement.src);
        if (img) imageId = img.id;
      }

      // Fallback: search across all products. Slow but works when URL doesn't carry product context.
      if (!imageId) {
        const found = await client.findImageGloballyByUrl(replacement.src);
        if (found) {
          productId = found.productId;
          imageId = found.imageId;
        }
      }

      if (!productId || !imageId) {
        results.push({
          src: replacement.src,
          ok: false,
          error: "Image isn't a product image on this Shopify store (or not in the first 50 products). Theme/embedded images can't be alt-edited via API — update them in the theme editor.",
        });
        continue;
      }

      const result = await client.updateProductImageAlt(productId, imageId, replacement.alt);
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
    filePath: `${successCount} of ${results.length} product image(s) on Shopify`,
  };
}
