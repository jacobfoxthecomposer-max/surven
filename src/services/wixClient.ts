/**
 * Wix REST API client.
 *
 * Used by the Wix fix handler to apply Sprint 1 fixes (alt text, meta, title, schema)
 * directly to a user's Wix site via the Wix REST API + API Key authentication.
 *
 * Auth: three headers — Authorization (API key), wix-site-id, wix-account-id.
 * API keys are generated in the Wix dashboard at manage.wix.com/account/api-keys.
 *
 * Capabilities (Wix v1):
 *   - Site SEO settings (page-level title, description) via Site Pages API
 *   - Schema injection via Custom Code API (head injection)
 *   - Alt text via Media Manager API (limited — Wix media doesn't have alt text per file
 *     in the same way WordPress does; alt text is set per IMAGE INSTANCE on a page)
 *
 * Limitations:
 *   - Wix's API surface is more restrictive than WordPress
 *   - Some operations require specific permission scopes on the API key
 *   - Site URL changes don't propagate immediately — published changes take 30-60s
 */

const TIMEOUT_MS = 20_000;
const WIX_API = "https://www.wixapis.com";

export interface WixClientOptions {
  apiKey: string;
  siteId: string;
  accountId: string;
}

export interface WixPage {
  id: string;
  title?: string;
  pageUriSEO?: string; // the URL slug
  isVisible?: boolean;
}

export interface WixCustomCode {
  id?: string;
  componentName: string;
  htmlSnippet: string;
  position: "HEAD" | "BODY_START" | "BODY_END";
  loadStrategy?: "LOAD_AT_ALL_PAGES" | "LOAD_AT_HOME_PAGE";
}

export class WixClient {
  constructor(private options: WixClientOptions) {}

  private get headers(): HeadersInit {
    return {
      Authorization: this.options.apiKey,
      "wix-site-id": this.options.siteId,
      "wix-account-id": this.options.accountId,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${WIX_API}${path}`, {
      ...init,
      headers: {
        ...this.headers,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  /**
   * List all pages on the site. Used to find the page that matches an audited URL.
   *
   * Wix has multiple page-listing endpoints depending on how the site was built. We try
   * them in order until one returns pages. Returns an empty array AND a diagnostic
   * string when nothing works, so the caller can surface a useful error.
   */
  async listPages(): Promise<{ pages: WixPage[]; diagnostic?: string }> {
    // Endpoint 1: site-pages v1 (older sites)
    const candidates = [
      "/site-pages/v1/pages",
      "/wix-site-pages/v1/pages",
      "/headless/v1/pages",
    ];

    const errors: string[] = [];
    for (const path of candidates) {
      try {
        const res = await this.fetch(path);
        if (!res.ok) {
          errors.push(`${path} → ${res.status}`);
          continue;
        }
        const data = await res.json() as { pages?: Array<{ id?: string; pageId?: string; title?: string; pageUriSEO?: string; visible?: boolean }> };
        const raw = data.pages ?? [];
        const parsed = raw.map((p) => ({
          id: p.id ?? p.pageId ?? "",
          title: p.title,
          pageUriSEO: p.pageUriSEO,
          isVisible: p.visible !== false,
        })).filter((p) => p.id);
        if (parsed.length > 0) {
          return { pages: parsed };
        }
        errors.push(`${path} → 200 but 0 pages`);
      } catch (e) {
        errors.push(`${path} → ${e instanceof Error ? e.message : "error"}`);
      }
    }

    return { pages: [], diagnostic: errors.join(" | ") };
  }

  /**
   * Find a page by URL — matches by slug (last path segment).
   *
   * Wix has TWO URL patterns we need to handle:
   *   - Free tier: `username.wixsite.com/sitename[/page-slug]`
   *     — first path segment is the SITE identifier, not a page slug
   *     — page slug is the SECOND path segment, or empty for homepage
   *   - Custom domain: `customdomain.com/[page-slug]`
   *     — first path segment IS the page slug
   *     — empty path is homepage
   *
   * Wix homepage's pageUriSEO is typically empty string, "home", or matches the site
   * name. We try several matching strategies before giving up.
   */
  async findPageByUrl(pageUrl: string): Promise<{ page: WixPage | null; diagnostic?: string }> {
    let slug: string;
    let pathSegments: string[];
    try {
      const u = new URL(pageUrl);
      const path = u.pathname.replace(/^\/+|\/+$/g, "");
      pathSegments = path === "" ? [] : path.split("/");

      // Free Wix subdomain detection: the first path segment is the site identifier.
      // The actual page slug is whatever comes AFTER it.
      const isFreeWixDomain = u.hostname.endsWith(".wixsite.com") || u.hostname.endsWith(".editorx.io");
      if (isFreeWixDomain) {
        pathSegments = pathSegments.slice(1);
      }

      slug = pathSegments.length === 0 ? "" : (pathSegments[pathSegments.length - 1] ?? "");
    } catch {
      return { page: null, diagnostic: "URL parse failed" };
    }

    const { pages, diagnostic } = await this.listPages();
    if (pages.length === 0) {
      return { page: null, diagnostic: diagnostic ?? "No pages returned by Wix API" };
    }

    if (slug === "" || slug === "home") {
      const home = pages.find((p) => !p.pageUriSEO || p.pageUriSEO === "" || p.pageUriSEO.toLowerCase() === "home");
      return { page: home ?? pages[0] };
    }

    const exact = pages.find((p) => p.pageUriSEO?.toLowerCase() === slug.toLowerCase());
    if (exact) return { page: exact };

    return { page: null, diagnostic: `Slug "${slug}" not found among ${pages.length} pages: ${pages.map((p) => p.pageUriSEO || "(home)").slice(0, 5).join(", ")}` };
  }

  /**
   * Update SEO settings (title, description) for a page.
   * Uses the Site Pages API: PATCH /site-pages/v1/pages/{pageId}/seo
   */
  async updatePageSeo(pageId: string, fields: { title?: string; description?: string }): Promise<{ ok: boolean; error?: string; editUrl?: string }> {
    const res = await this.fetch(`/site-pages/v1/pages/${encodeURIComponent(pageId)}/seo`, {
      method: "PATCH",
      body: JSON.stringify({
        seoData: {
          tags: [
            ...(fields.title ? [{ type: "title", children: fields.title }] : []),
            ...(fields.description ? [{ type: "meta", props: { name: "description", content: fields.description } }] : []),
          ],
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Wix returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return {
      ok: true,
      editUrl: `https://manage.wix.com/dashboard/${this.options.siteId}/seo`,
    };
  }

  /**
   * Inject custom HTML code into the site's <head>. Used for JSON-LD schema injection.
   * Uses the Custom Code API.
   *
   * Wix's Custom Code lets you inject arbitrary scripts that run on every page (or specific pages).
   * Schema in <head> via this approach is the cleanest way to add JSON-LD on Wix sites.
   */
  async addCustomCode(componentName: string, htmlSnippet: string, loadStrategy: "LOAD_AT_ALL_PAGES" | "LOAD_AT_HOME_PAGE" = "LOAD_AT_ALL_PAGES"): Promise<{ ok: boolean; error?: string; codeId?: string; editUrl?: string }> {
    const res = await this.fetch(`/custom-code/v1/custom-code`, {
      method: "POST",
      body: JSON.stringify({
        customCode: {
          componentName,
          htmlSnippet,
          position: "HEAD",
          loadStrategy,
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Wix Custom Code API returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data = await res.json();
    return {
      ok: true,
      codeId: data?.customCode?.id,
      editUrl: `https://manage.wix.com/dashboard/${this.options.siteId}/marketing-tools/integrations`,
    };
  }

  /**
   * List existing custom code injections — used to detect duplicates.
   */
  async listCustomCode(): Promise<WixCustomCode[]> {
    const res = await this.fetch(`/custom-code/v1/custom-code`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.customCode ?? data?.codes ?? []) as WixCustomCode[];
  }

  /**
   * Update alt text for a media file. Wix's media manager has a description field
   * which serves as alt text on rendered images.
   */
  async updateMediaAlt(fileId: string, altText: string): Promise<{ ok: boolean; error?: string }> {
    const res = await this.fetch(`/site-media/v1/files/${encodeURIComponent(fileId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        labels: [altText.slice(0, 100)],
        // Wix uses both `description` and `labels` — set both to be safe
        description: altText,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Wix returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  }

  /**
   * Find a media file by source URL. Wix media URLs are CDN URLs that contain the file ID.
   * Pattern: https://static.wixstatic.com/media/{fileId}~mv2.jpg/...
   */
  async findMediaByUrl(srcUrl: string): Promise<{ fileId: string } | null> {
    // Wix media URL pattern includes the file ID
    const match = srcUrl.match(/static\.wixstatic\.com\/media\/([^/~]+)~/);
    if (match?.[1]) {
      return { fileId: match[1] };
    }

    // Alternative pattern for older Wix images
    const altMatch = srcUrl.match(/wixmp-[^/]+\.appspot\.com\/[^/]+\/([^/?]+)/);
    if (altMatch?.[1]) {
      return { fileId: altMatch[1] };
    }

    return null;
  }
}
