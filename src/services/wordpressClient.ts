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

  /** Get the current alt text on a media item (for revert capture). */
  async getMediaAlt(mediaId: number): Promise<string | null> {
    const res = await this.fetch(`/wp-json/wp/v2/media/${mediaId}?_fields=alt_text`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null) as { alt_text?: string } | null;
    return data?.alt_text ?? "";
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
   * Read the current meta description value on a page/post. Used for revert capture.
   * Returns the stored value (could be empty string if no description set), or null on error.
   * For sites without an SEO plugin, reads `excerpt.raw` (where the apply path stores it).
   */
  async getPageMetaDescription(page: WordPressPageOrPost, plugin: SeoPlugin): Promise<{ value: string; usedExcerpt: boolean; metaKey: string | null } | null> {
    const metaKey =
      plugin === "yoast" ? "_yoast_wpseo_metadesc" :
      plugin === "rankmath" ? "rank_math_description" :
      plugin === "aioseo" ? "_aioseo_description" :
      null;

    const fields = metaKey ? "meta,excerpt" : "excerpt";
    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}?context=edit&_fields=${fields}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null) as { meta?: Record<string, unknown>; excerpt?: { raw?: string } } | null;
    if (!data) return null;

    if (metaKey) {
      const value = (data.meta?.[metaKey] as string | undefined) ?? "";
      return { value, usedExcerpt: false, metaKey };
    }
    return { value: data.excerpt?.raw ?? "", usedExcerpt: true, metaKey: null };
  }

  /** Read the current SEO title value on a page/post. Used for revert capture. */
  async getPageSeoTitle(page: WordPressPageOrPost, plugin: SeoPlugin): Promise<{ value: string; metaKey: string } | null> {
    const metaKey =
      plugin === "yoast" ? "_yoast_wpseo_title" :
      plugin === "rankmath" ? "rank_math_title" :
      plugin === "aioseo" ? "_aioseo_title" :
      null;
    if (!metaKey) return null;

    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}?context=edit&_fields=meta`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null) as { meta?: Record<string, unknown> } | null;
    return { value: (data?.meta?.[metaKey] as string | undefined) ?? "", metaKey };
  }

  /** Set the meta description (or excerpt) on a page back to a specific value. Used for revert. */
  async setPageMetaDescriptionRaw(page: WordPressPageOrPost, value: string, metaKey: string | null, usedExcerpt: boolean): Promise<{ ok: boolean; error?: string }> {
    const body: Record<string, unknown> = usedExcerpt
      ? { excerpt: value }
      : { meta: { [metaKey!]: value } };
    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `WP returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  }

  /** Set the SEO title meta on a page back to a specific value. Used for revert. */
  async setPageSeoTitleRaw(page: WordPressPageOrPost, value: string, metaKey: string): Promise<{ ok: boolean; error?: string }> {
    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}`, {
      method: "POST",
      body: JSON.stringify({ meta: { [metaKey]: value } }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `WP returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  }

  /**
   * Read raw page content. Used by the schema injection path for revert capture
   * (we capture the marker placement so revert can strip it).
   */
  async getPageContentRaw(page: WordPressPageOrPost): Promise<string | null> {
    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}?context=edit&_fields=content`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null) as { content?: { raw?: string } } | null;
    return data?.content?.raw ?? null;
  }

  /** Set raw page content. Used by schema-org revert (strip the marker block). */
  async setPageContentRaw(page: WordPressPageOrPost, content: string): Promise<{ ok: boolean; error?: string }> {
    const res = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `WP returned ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
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
   * Inject JSON-LD schema directly into a WordPress page or post by appending the
   * <script type="application/ld+json"> tag to the page content via REST API.
   *
   * Approach:
   *   1. Detect if the page already contains JSON-LD of the same @type — refuse if so
   *      (don't double-inject)
   *   2. Fetch current page content (raw, not rendered)
   *   3. Append the new <script> block at the end
   *   4. PATCH via /wp/v2/{type}/{id}
   *   5. Verify the script wasn't stripped by WordPress's kses filter (some configurations
   *      strip script tags even from admin-authored content)
   *
   * Schema.org allows JSON-LD anywhere on the page — head is preferred but body works.
   * AI engines pick it up regardless of position. This approach works on every WordPress
   * install with no plugin required.
   */
  async injectJsonLd(page: WordPressPageOrPost, jsonLd: string, schemaType: string, plugin: SeoPlugin): Promise<{ ok: boolean; error?: string; manualNote?: string; editUrl?: string; markerId?: string }> {
    void plugin; // SEO plugin presence doesn't change our approach — we inject directly into content

    // Step 1: Fetch current content
    const fetchRes = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}?context=edit&_fields=content,id`);
    if (!fetchRes.ok) {
      return { ok: false, error: `Couldn't fetch page content (status ${fetchRes.status})` };
    }
    const fetched = await fetchRes.json() as { content?: { raw?: string; rendered?: string } };
    const currentContent = fetched.content?.raw ?? "";

    // Step 2: Refuse to inject if a JSON-LD of the same @type is already in the content.
    // We check both the raw content (what we're about to update) and rendered content
    // (which might include schema injected by SEO plugins via separate hooks).
    const escapedType = schemaType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingPattern = new RegExp(
      `<script[^>]*type=["']application\\/ld\\+json["'][^>]*>[\\s\\S]*?"@type"\\s*:\\s*["']${escapedType}["'][\\s\\S]*?<\\/script>`,
      "i",
    );
    const renderedContent = fetched.content?.rendered ?? "";
    if (existingPattern.test(currentContent) || existingPattern.test(renderedContent)) {
      return {
        ok: false,
        error: `${schemaType} schema is already present on this page. Remove the existing one first if you want to replace it.`,
      };
    }

    // Step 3: Wrap the snippet with surven markers so revert can find and strip it.
    // Markers are HTML comments — invisible at render time, easy to grep on revert.
    const markerId = `${schemaType.toLowerCase()}-${Date.now().toString(36)}`;
    const wrapped = `<!--surven-fix:${markerId}-->\n${jsonLd.trim()}\n<!--/surven-fix:${markerId}-->`;
    const newContent = `${currentContent.trimEnd()}\n\n${wrapped}\n`;

    // Step 4: PATCH the page
    const updateRes = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}`, {
      method: "POST",
      body: JSON.stringify({ content: newContent }),
    });
    if (!updateRes.ok) {
      const errText = await updateRes.text().catch(() => "");
      return { ok: false, error: `WP returned ${updateRes.status}: ${errText.slice(0, 200)}` };
    }

    // Step 5: Verify the script tag wasn't stripped. WordPress's kses filter strips <script>
    // by default for users without the unfiltered_html capability. Most admins on single-site
    // WP have this, but multisite installs sometimes don't. If stripped, fall back to manual.
    const verifyRes = await this.fetch(`/wp-json/wp/v2/${page.type}s/${page.id}?context=edit&_fields=content`);
    if (verifyRes.ok) {
      const verified = await verifyRes.json() as { content?: { raw?: string } };
      const verifiedRaw = verified.content?.raw ?? "";
      if (!verifiedRaw.includes("application/ld+json")) {
        return {
          ok: false,
          manualNote: "WordPress stripped the script tag from your page content (this happens on multisite installs where admins don't have unfiltered_html capability). Copy the snippet and add it via 'Insert Headers and Footers' plugin → Scripts in Header → Save.",
        };
      }
    }

    return {
      ok: true,
      editUrl: `${this.base}/wp-admin/post.php?post=${page.id}&action=edit`,
      markerId,
    };
  }
}
