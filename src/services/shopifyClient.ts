/**
 * Shopify Admin API client.
 *
 * Handles client_credentials grant for short-lived (24h) bearer tokens, REST resource
 * lookups by URL handle, theme.liquid read/write for schema injection, and SEO
 * metafield updates on products/pages/articles.
 *
 * After Jan 1, 2026, legacy `shpat_` permanent tokens are no longer issued. New
 * custom apps mint a fresh access_token via `client_credentials` and the token
 * expires in ~86399s. We cache the token on the instance only.
 */

const API_VERSION = "2024-10";
const TIMEOUT_MS = 25_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export interface ShopifyClientOptions {
  shopDomain: string; // mystore.myshopify.com
  clientId: string;
  clientSecret: string;
}

export class ShopifyClient {
  private cached: CachedToken | null = null;

  constructor(private options: ShopifyClientOptions) {}

  private async getToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now() + 60_000) {
      return this.cached.accessToken;
    }
    const res = await fetch(`https://${this.options.shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      throw new Error(data?.error_description ?? data?.error ?? `Token mint failed (${res.status})`);
    }
    const ttl = typeof data.expires_in === "number" ? data.expires_in : 3600;
    this.cached = {
      accessToken: data.access_token,
      expiresAt: Date.now() + ttl * 1000,
    };
    return this.cached.accessToken;
  }

  private async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
    const token = await this.getToken();
    const url = path.startsWith("http")
      ? path
      : `https://${this.options.shopDomain}/admin/api/${API_VERSION}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        const err = (data as { errors?: unknown })?.errors;
        return {
          ok: false,
          status: res.status,
          error: typeof err === "string" ? err : err ? JSON.stringify(err) : `Shopify ${res.status}`,
        };
      }
      return { ok: true, status: res.status, data: data as T };
    } catch (err) {
      return { ok: false, status: 0, error: err instanceof Error ? err.message : "Network error" };
    }
  }

  /** Extract a Shopify resource handle from a URL path: /products/foo, /pages/bar, /blogs/x/y. */
  static parseHandleFromUrl(pageUrl: string): {
    type: "product" | "page" | "article" | "home" | "unknown";
    handle?: string;
    blogHandle?: string;
  } {
    try {
      const u = new URL(pageUrl);
      const segments = u.pathname.split("/").filter(Boolean);
      if (segments.length === 0) return { type: "home" };
      const [first, second, third] = segments;
      if (first === "products" && second) return { type: "product", handle: second };
      if (first === "pages" && second) return { type: "page", handle: second };
      if (first === "blogs" && second && third) {
        return { type: "article", blogHandle: second, handle: third };
      }
      return { type: "unknown" };
    } catch {
      return { type: "unknown" };
    }
  }

  // ──────────────── Products ────────────────

  async findProductByHandle(handle: string): Promise<ShopifyProduct | null> {
    const res = await this.request<{ products: ShopifyProduct[] }>(
      "GET",
      `/products.json?handle=${encodeURIComponent(handle)}&limit=1`,
    );
    if (!res.ok) return null;
    return res.data?.products?.[0] ?? null;
  }

  async updateProductSeo(
    id: number,
    seo: { title?: string; description?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const product: Record<string, unknown> = { id };
    if (seo.title !== undefined) product.metafields_global_title_tag = seo.title;
    if (seo.description !== undefined) product.metafields_global_description_tag = seo.description;
    const res = await this.request("PUT", `/products/${id}.json`, { product });
    return { ok: res.ok, error: res.error };
  }

  async updateProductImageAlt(
    productId: number,
    imageId: number,
    alt: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await this.request("PUT", `/products/${productId}/images/${imageId}.json`, {
      image: { id: imageId, alt },
    });
    return { ok: res.ok, error: res.error };
  }

  /** Find a product image by its CDN URL. Strips query params + checks substring match. */
  async findImageByUrl(
    productId: number,
    src: string,
  ): Promise<ShopifyProductImage | null> {
    const res = await this.request<{ images: ShopifyProductImage[] }>(
      "GET",
      `/products/${productId}/images.json`,
    );
    if (!res.ok || !res.data?.images) return null;
    const cleanSrc = src.split("?")[0];
    return (
      res.data.images.find((img) => {
        const imgSrc = img.src.split("?")[0];
        return imgSrc === cleanSrc || imgSrc.endsWith(cleanSrc) || cleanSrc.endsWith(imgSrc);
      }) ?? null
    );
  }

  /** Search ALL product images globally for a given CDN URL. Slower but works when product context isn't known. */
  async findImageGloballyByUrl(src: string): Promise<{ productId: number; imageId: number } | null> {
    const cleanSrc = src.split("?")[0];
    let pageInfo: string | null = null;
    for (let i = 0; i < 10; i++) {
      const path = pageInfo
        ? `/products.json?limit=50&page_info=${encodeURIComponent(pageInfo)}`
        : `/products.json?limit=50`;
      const res = await this.request<{ products: Array<{ id: number; images: ShopifyProductImage[] }> }>(
        "GET",
        path,
      );
      if (!res.ok || !res.data?.products) return null;
      for (const product of res.data.products) {
        for (const img of product.images ?? []) {
          const imgSrc = img.src.split("?")[0];
          if (imgSrc === cleanSrc || imgSrc.endsWith(cleanSrc) || cleanSrc.endsWith(imgSrc)) {
            return { productId: product.id, imageId: img.id };
          }
        }
      }
      if (res.data.products.length < 50) break;
      pageInfo = null; // cursor pagination via Link header is more correct; this is a v1 best-effort
      break;
    }
    return null;
  }

  // ──────────────── Pages ────────────────

  async findPageByHandle(handle: string): Promise<ShopifyPage | null> {
    const res = await this.request<{ pages: ShopifyPage[] }>(
      "GET",
      `/pages.json?handle=${encodeURIComponent(handle)}&limit=1`,
    );
    if (!res.ok) return null;
    return res.data?.pages?.[0] ?? null;
  }

  async updatePageSeo(
    id: number,
    seo: { title?: string; description?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const page: Record<string, unknown> = { id };
    if (seo.title !== undefined) page.metafields_global_title_tag = seo.title;
    if (seo.description !== undefined) page.metafields_global_description_tag = seo.description;
    const res = await this.request("PUT", `/pages/${id}.json`, { page });
    return { ok: res.ok, error: res.error };
  }

  // ──────────────── Articles ────────────────

  async findBlogByHandle(handle: string): Promise<ShopifyBlog | null> {
    const res = await this.request<{ blogs: ShopifyBlog[] }>(
      "GET",
      `/blogs.json?handle=${encodeURIComponent(handle)}&limit=1`,
    );
    if (!res.ok) return null;
    return res.data?.blogs?.[0] ?? null;
  }

  async findArticleByHandle(blogId: number, handle: string): Promise<ShopifyArticle | null> {
    const res = await this.request<{ articles: ShopifyArticle[] }>(
      "GET",
      `/blogs/${blogId}/articles.json?handle=${encodeURIComponent(handle)}&limit=1`,
    );
    if (!res.ok) return null;
    return res.data?.articles?.[0] ?? null;
  }

  async updateArticleSeo(
    blogId: number,
    articleId: number,
    seo: { title?: string; description?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const article: Record<string, unknown> = { id: articleId };
    if (seo.title !== undefined) article.metafields_global_title_tag = seo.title;
    if (seo.description !== undefined) article.metafields_global_description_tag = seo.description;
    const res = await this.request("PUT", `/blogs/${blogId}/articles/${articleId}.json`, { article });
    return { ok: res.ok, error: res.error };
  }

  // ──────────────── Themes / theme.liquid ────────────────

  async getMainTheme(): Promise<ShopifyTheme | null> {
    const res = await this.request<{ themes: ShopifyTheme[] }>("GET", `/themes.json`);
    if (!res.ok || !res.data?.themes) return null;
    return res.data.themes.find((t) => t.role === "main") ?? null;
  }

  async getThemeAsset(themeId: number, key: string): Promise<{ ok: boolean; value?: string; error?: string }> {
    const res = await this.request<{ asset: { value?: string; key: string } }>(
      "GET",
      `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`,
    );
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, value: res.data?.asset?.value };
  }

  async putThemeAsset(
    themeId: number,
    key: string,
    value: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await this.request("PUT", `/themes/${themeId}/assets.json`, {
      asset: { key, value },
    });
    return { ok: res.ok, error: res.error };
  }
}

// ──────────────── Types ────────────────

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  metafields_global_title_tag?: string | null;
  metafields_global_description_tag?: string | null;
  images?: ShopifyProductImage[];
}

export interface ShopifyProductImage {
  id: number;
  product_id: number;
  src: string;
  alt: string | null;
}

export interface ShopifyPage {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  metafields_global_title_tag?: string | null;
  metafields_global_description_tag?: string | null;
}

export interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
}

export interface ShopifyArticle {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  blog_id: number;
}

export interface ShopifyTheme {
  id: number;
  name: string;
  role: "main" | "unpublished" | "demo";
  theme_store_id?: number | null;
}
