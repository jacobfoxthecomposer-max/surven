/**
 * WordPress REST API client.
 *
 * Used by the WordPress fix handler to apply Sprint 1 fixes (alt text, meta, title, schema)
 * directly to a user's WordPress site via the REST API + Application Passwords auth.
 *
 * Auth: Basic with `${username}:${appPassword}`. Application passwords have been built into
 * WordPress core since 5.6 (Dec 2020), so any modern WP install supports this.
 *
 * Detects SEO plugins (Yoast, RankMath, All in One SEO) so meta/title/schema fixes can use
 * each plugin's REST schema. Falls back to "manual paste" if none of the supported plugins
 * are installed.
 */

const TIMEOUT_MS = 20_000;

export type SeoPlugin = "yoast" | "rankmath" | "aioseo" | null;

export interface WordPressClientOptions {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface WordPressMediaItem {
  id: number;
  source_url: string;
  alt_text: string;
  caption?: { rendered?: string };
  media_details?: { sizes?: Record<string, { source_url: string }> };
}

export interface WordPressPageOrPost {
  id: number;
  type: "page" | "post";
  link: string;
  slug: string;
  title?: { rendered: string };
  yoast_head_json?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export class WordPressClient {
  private base: string;
  private authHeader: string;

  constructor(options: WordPressClientOptions) {
    try {
      this.base = new URL(options.siteUrl).origin;
    } catch {
      throw new Error("Invalid WordPress site URL");
    }
    const stripped = options.applicationPassword.replace(/\s+/g, "");
    const token = Buffer.from(`${options.username}:${stripped}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = path.startsWith("http") ? path : `${this.base}${path}`;
    return fetch(url, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  /** Find a media item by its source URL. Used to map an <img src="..."> on a live page back to the WP media library. */
  async findMediaByUrl(srcUrl: string): Promise<WordPressMediaItem | null> {
    const targetUrl = new URL(srcUrl, this.base).href;
    const filenameMatch = targetUrl.match(/\/([^/?#]+\.(?:jpg|jpeg|png|gif|webp|svg|avif))(?:[?#]|$)/i);
    const search = filenameMatch?.[1] ?? "";

    if (search) {
      const res = await this.fetch(`/wp-json/wp/v2/media?per_page=20&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const items = (await res.json()) as WordPressMediaItem[];
        const exact = items.find((m) => m.source_url === targetUrl);
        if (exact) return exact;
        if (items.length > 0) return items[0];
      }
    }

    return null;
  }

  /** Update the alt text of a media item. */
  async updateMediaAlt(mediaId: number, altText: string): Promise<{ ok: boolean; error?: string; editUrl?: string }> {
    const res = await this.fetch(`/wp-json/wp/v2/media/${mediaId}`, {
      method: "POST",
      body: JSON.stringify({ alt_text: altText }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `WP returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true, editUrl: `${this.base}/wp-admin/upload.php?item=${mediaId}` };
  }

  /** Find a page or post matching the given URL. Returns null if not found. */
  async findPageOrPostByUrl(pageUrl: string): Promise<WordPressPageOrPost | null> {
    let path: string;
    try {
      const u = new URL(pageUrl);
      path = u.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
      return null;
    }

    if (path === "" || path === "index.html") {
      const res = await this.fetch(`/wp-json/wp/v2/pages?slug=home&_fields=id,type,link,slug,title,meta,yoast_head_json`);
      if (res.ok) {
        const items = (await res.json()) as WordPressPageOrPost[];
        if (items.length > 0) return { ...items[0], type: "page" };
      }
      const settings = await this.fetch(`/wp-json/wp/v2/settings`).catch(() => null);
      if (settings && settings.ok) {
        const s = (await settings.json()) as { page_on_front?: number; show_on_front?: string };
        if (s.show_on_front === "page" && s.page_on_front) {
          const single = await this.fetch(`/wp-json/wp/v2/pages/${s.page_on_front}?_fields=id,type,link,slug,title,meta,yoast_head_json`);
          if (single.ok) return { ...((await single.json()) as WordPressPageOrPost), type: "page" };
        }
      }
      return null;
    }

    const slug = path.split("/").pop() ?? "";
    if (!slug) return null;

    const pageRes = await this.fetch(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=id,type,link,slug,title,meta,yoast_head_json`);
    if (pageRes.ok) {
      const items = (await pageRes.json()) as WordPressPageOrPost[];
      if (items.length > 0) return { ...items[0], type: "page" };
    }

    const postRes = await this.fetch(`/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,type,link,slug,title,meta,yoast_head_json`);
    if (postRes.ok) {
      const items = (await postRes.json()) as WordPressPageOrPost[];
      if (items.length > 0) return { ...items[0], type: "post" };
    }

    return null;
  }

  /**
   * Detect which SEO plugin is installed. Used to know which REST endpoints to use for
   * meta description / title / schema fixes.
   *
   * Order: Yoast (most popular, ~13M sites) → RankMath → AIOSEO → none.
   */
  async detectSeoPlugin(): Promise<SeoPlugin> {
    // Yoast exposes the `yoast_head_json` field on every page/post. If we hit /wp-json and
    // see "yoast" namespace, it's installed.
    const root = await this.fetch(`/wp-json`).catch(() => null);
    if (root && root.ok) {
      const data = await root.json().catch(() => ({})) as { namespaces?: string[] };
      const ns = data.namespaces ?? [];
      if (ns.some((n) => n.startsWith("yoast/"))) return "yoast";
      if (ns.some((n) => n.startsWith("rank-math/") || n.startsWith("rankmath/"))) return "rankmath";
      if (ns.some((n) => n.startsWith("aioseo/"))) return "aioseo";
    }
    return null;
  }

  /**
   * Update meta description on a page/post. Approach varies by SEO plugin:
   *   - Yoast: PATCH /wp/v2/{type}/{id} with meta._yoast_wpseo_metadesc
   *   - RankMath: PATCH with meta.rank_math_description
   *   - AIOSEO: PATCH with meta._aioseo_description
   *   - None: write to the standard `excerpt` field as a graceful degrade
   */
  async updatePageMetaDescription(page: WordPressPageOrPost, description: string, plugin: SeoPlugin): Promise<{ ok: boolean; error?: string; editUrl?: string }> {
    const metaKey =
      plugin === "yoast" ? "_yoast_wpseo_metadesc" :
      plugin === "rankmath" ? "rank_math_description" :
      plugin === "aioseo" ? "_aioseo_description" :
      null;

    let body: Record<string, unknown>;
    if (metaKey) {
      body = { meta: { [metaKey]: description } };
    } else {
      // Graceful degrade: store as excerpt so SOMETHING reflects the new description.
      // Modern WP themes use excerpt for meta description when no SEO plugin is installed.
      body = { excerpt: description };
    }

    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `WP returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true, editUrl: `${this.base}/wp-admin/post.php?post=${page.id}&action=edit` };
  }

  /**
   * Update SEO title on a page/post. Same plugin-specific approach as meta description.
   * The `title` field on the page itself is the H1, not the SEO title — those are different.
   */
  async updatePageSeoTitle(page: WordPressPageOrPost, title: string, plugin: SeoPlugin): Promise<{ ok: boolean; error?: string; editUrl?: string }> {
    const metaKey =
      plugin === "yoast" ? "_yoast_wpseo_title" :
      plugin === "rankmath" ? "rank_math_title" :
      plugin === "aioseo" ? "_aioseo_title" :
      null;

    if (!metaKey) {
      return {
        ok: false,
        error: "WordPress site has no supported SEO plugin (Yoast / RankMath / AIOSEO). Install one to update SEO titles, or update the page H1 manually.",
      };
    }

    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}`, {
      method: "POST",
      body: JSON.stringify({ meta: { [metaKey]: title } }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `WP returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true, editUrl: `${this.base}/wp-admin/post.php?post=${page.id}&action=edit` };
  }

  /**
   * Inject JSON-LD schema. WordPress doesn't have a built-in "site head injection" REST endpoint,
   * so we rely on SEO plugins:
   *   - Yoast lets you set per-page schema via `_yoast_wpseo_schema_*` meta keys
   *   - RankMath has its own schema fields
   *
   * If no plugin is installed, returns ok:false with a manual fallback message — the user can
   * install "Insert Headers and Footers" plugin or paste the snippet manually.
   */
  async injectJsonLd(_page: WordPressPageOrPost, _jsonLd: string, _schemaType: string, plugin: SeoPlugin): Promise<{ ok: boolean; error?: string; manualNote?: string; editUrl?: string }> {
    if (!plugin) {
      return {
        ok: false,
        manualNote: "WordPress doesn't expose a built-in REST endpoint for injecting raw <head> code. Install Yoast SEO, RankMath, or 'Insert Headers and Footers' (free plugins), then re-run.",
      };
    }

    // For now, return manual fallback even with plugins — plugin-specific schema injection
    // requires careful per-plugin work. Sprint 2.5: per-plugin schema injection.
    return {
      ok: false,
      manualNote: `JSON-LD schema injection on WordPress (with ${plugin}) requires plugin-specific REST endpoints we haven't built yet. For now: copy the snippet, then in WP admin install "Insert Headers and Footers" plugin → paste into "Scripts in Header" → Save.`,
    };
  }
}
