/**
 * Wix fix handler.
 *
 * Auto-deploy is not supported for Wix. Standard Wix API Keys can't reach the
 * site-editing endpoints (Custom Embeds, page SEO, media alt text), and most of
 * those surfaces have no public REST CRUD at all — they require an OAuth-installed
 * Wix App or are only mutable from inside the Wix Editor / Velo runtime.
 *
 * Until we ship a registered Wix App with OAuth, every Wix fix returns a
 * manual-paste fallback with platform-specific instructions for the side panel.
 *
 * The connection (apiKey + siteId + accountId) is still validated and stored so
 * the user shows up as "Wix-connected" — useful when we do build the OAuth flow.
 */

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
  const { payload } = options;

  switch (payload.kind) {
    case "schema_org":
      return {
        ok: false,
        manualSnippet: payload.jsonLd,
        manualNote:
          "Wix doesn't allow auto-deploy of structured data. " +
          "Paste it: Wix Dashboard → Settings → Custom Code → Add Custom Code → " +
          "paste this into the Head, choose 'All pages', then click Apply.",
      };

    case "meta_desc":
      return {
        ok: false,
        manualSnippet: payload.description,
        manualNote:
          "Wix has no API for per-page SEO. " +
          "Paste it: Wix Editor → open the page → Page SEO panel → SEO Basics → " +
          "paste into 'What's the page about?' (Description).",
      };

    case "title_tag":
      return {
        ok: false,
        manualSnippet: payload.title,
        manualNote:
          "Wix has no API for per-page SEO. " +
          "Paste it: Wix Editor → open the page → Page SEO panel → SEO Basics → " +
          "paste into 'What's the page name?' (Title Tag).",
      };

    case "alt_text": {
      const lines = payload.replacements
        .map((r, i) => `${i + 1}. ${r.src}\n   Alt: ${r.alt}`)
        .join("\n\n");
      return {
        ok: false,
        manualSnippet: lines,
        manualNote:
          `Wix has no API for image alt text. ${payload.replacements.length} image(s) need updating: ` +
          "in the Wix Editor, click each image → Settings (gear icon) → 'What's in the image? Tell Google' → paste the alt text.",
      };
    }
  }
}
