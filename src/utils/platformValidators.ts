/**
 * Validate API credentials by making a lightweight test call to each platform.
 * Returns null on success, or an error string for the user.
 */

const TIMEOUT_MS = 10_000;

export interface GithubCredentials {
  token: string;
  repo: string; // "owner/repo"
  branch?: string;
}

export interface VercelCredentials {
  token: string;
  projectId: string;
}

export interface WordpressCredentials {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface WebflowCredentials {
  token: string;
  siteId: string;
}

export interface WixCredentials {
  apiKey: string;
  siteId: string;
  accountId: string;
}

export interface ShopifyCredentials {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
}

export type PlatformCredentials =
  | { platform: "github"; data: GithubCredentials }
  | { platform: "vercel"; data: VercelCredentials }
  | { platform: "wordpress"; data: WordpressCredentials }
  | { platform: "webflow"; data: WebflowCredentials }
  | { platform: "wix"; data: WixCredentials }
  | { platform: "shopify"; data: ShopifyCredentials };

export interface ValidationResult {
  ok: boolean;
  error?: string;
  meta?: Record<string, string>;
}

export async function validateGithub(creds: GithubCredentials): Promise<ValidationResult> {
  if (!creds.token || !creds.repo) {
    return { ok: false, error: "Token and repo are required" };
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(creds.repo)) {
    return { ok: false, error: "Repo must be in 'owner/repo' format" };
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${creds.repo}`, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "GitHub token rejected. Check it has 'repo' scope." };
    }
    if (res.status === 404) {
      return { ok: false, error: "Repo not found. Check the owner/repo name." };
    }
    if (!res.ok) {
      return { ok: false, error: `GitHub returned ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: true,
      meta: { defaultBranch: data.default_branch ?? "main", fullName: data.full_name },
    };
  } catch {
    return { ok: false, error: "Could not reach GitHub. Try again." };
  }
}

export async function validateVercel(creds: VercelCredentials): Promise<ValidationResult> {
  if (!creds.token || !creds.projectId) {
    return { ok: false, error: "Token and project ID are required" };
  }
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(creds.projectId)}`,
      {
        headers: { Authorization: `Bearer ${creds.token}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Vercel token rejected. Check it has project access." };
    }
    if (res.status === 404) {
      return { ok: false, error: "Project not found. Check the project ID." };
    }
    if (!res.ok) {
      return { ok: false, error: `Vercel returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, meta: { name: data.name ?? creds.projectId } };
  } catch {
    return { ok: false, error: "Could not reach Vercel. Try again." };
  }
}

export async function validateWordpress(creds: WordpressCredentials): Promise<ValidationResult> {
  if (!creds.siteUrl || !creds.username || !creds.applicationPassword) {
    return { ok: false, error: "Site URL, username, and application password are required" };
  }
  let base: string;
  try {
    base = new URL(creds.siteUrl).origin;
  } catch {
    return { ok: false, error: "Invalid site URL" };
  }
  const auth = Buffer.from(`${creds.username}:${creds.applicationPassword}`).toString("base64");
  try {
    const res = await fetch(`${base}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "WordPress credentials rejected. Generate a new application password in WP Admin → Users → Profile → Application Passwords." };
    }
    if (res.status === 404) {
      return { ok: false, error: "WP REST API not found. Make sure permalinks are enabled and the site supports the REST API." };
    }
    if (!res.ok) {
      return { ok: false, error: `WordPress returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, meta: { displayName: data.name ?? creds.username, base } };
  } catch {
    return { ok: false, error: "Could not reach WordPress site. Check the URL." };
  }
}

export async function validateWix(creds: WixCredentials): Promise<ValidationResult> {
  if (!creds.apiKey || !creds.siteId || !creds.accountId) {
    return { ok: false, error: "API Key, Site ID, and Account ID are all required" };
  }
  try {
    // Smoke test: read site SEO settings. If this works, the credentials + scopes are good.
    const res = await fetch(`https://www.wixapis.com/site-properties/v4/properties`, {
      headers: {
        Authorization: creds.apiKey,
        "wix-site-id": creds.siteId,
        "wix-account-id": creds.accountId,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Wix API key rejected. Check it has 'Manage Site' or 'Manage SEO' permissions." };
    }
    if (res.status === 404) {
      return { ok: false, error: "Site not found. Double-check Site ID and Account ID." };
    }
    if (!res.ok) {
      return { ok: false, error: `Wix returned ${res.status}` };
    }
    const data = await res.json();
    const displayName = data?.properties?.siteDisplayName ?? data?.siteDisplayName ?? "Wix site";
    return { ok: true, meta: { displayName } };
  } catch {
    return { ok: false, error: "Could not reach Wix. Try again." };
  }
}

/**
 * Normalize a Shopify shop domain to the bare `*.myshopify.com` form.
 * Accepts: `mystore.myshopify.com`, `https://mystore.myshopify.com`, `mystore` (just the handle).
 * Returns null if the domain doesn't fit the .myshopify.com pattern.
 */
export function normalizeShopDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  let host: string;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      host = new URL(trimmed).hostname;
    } else if (trimmed.includes("/")) {
      host = new URL(`https://${trimmed}`).hostname;
    } else {
      host = trimmed;
    }
  } catch {
    return null;
  }

  if (host.endsWith(".myshopify.com")) {
    const handle = host.replace(/\.myshopify\.com$/, "");
    if (!/^[a-z0-9][a-z0-9-]*$/.test(handle)) return null;
    return `${handle}.myshopify.com`;
  }

  // Bare handle (e.g., "greenleap-frogs")
  if (/^[a-z0-9][a-z0-9-]*$/.test(host)) {
    return `${host}.myshopify.com`;
  }

  return null;
}

/**
 * Mint a short-lived (~24h) Shopify Admin API bearer token via the
 * client_credentials OAuth grant. Required after Jan 1, 2026 — legacy `shpat_`
 * tokens are no longer issued for new apps.
 *
 * Caller is responsible for refreshing before expiry.
 */
export async function mintShopifyAccessToken(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
): Promise<{ ok: boolean; accessToken?: string; expiresIn?: number; scope?: string; error?: string }> {
  try {
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = data?.error_description ?? data?.error ?? `Shopify returned ${res.status}`;
      return { ok: false, error: reason };
    }
    if (!data.access_token) {
      return { ok: false, error: "Shopify returned no access token" };
    }
    return {
      ok: true,
      accessToken: data.access_token,
      expiresIn: typeof data.expires_in === "number" ? data.expires_in : undefined,
      scope: typeof data.scope === "string" ? data.scope : undefined,
    };
  } catch {
    return { ok: false, error: "Could not reach Shopify. Check the shop domain." };
  }
}

export async function validateShopify(creds: ShopifyCredentials): Promise<ValidationResult> {
  if (!creds.shopDomain || !creds.clientId || !creds.clientSecret) {
    return { ok: false, error: "Shop domain, Client ID, and Client Secret are all required" };
  }
  const shopDomain = normalizeShopDomain(creds.shopDomain);
  if (!shopDomain) {
    return { ok: false, error: "Invalid shop domain. Use the format mystore.myshopify.com" };
  }

  const tokenResult = await mintShopifyAccessToken(shopDomain, creds.clientId, creds.clientSecret);
  if (!tokenResult.ok) {
    if (tokenResult.error?.includes("invalid_client") || tokenResult.error?.includes("401") || tokenResult.error?.includes("403")) {
      return {
        ok: false,
        error: "Shopify rejected the credentials. Check Client ID + Secret, and confirm the app is installed on this store.",
      };
    }
    return { ok: false, error: tokenResult.error ?? "Could not authenticate with Shopify" };
  }

  // Smoke test: read shop info with the freshly minted token.
  try {
    const res = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": tokenResult.accessToken!,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Token didn't have shop access. Check the app's Admin API scopes." };
    }
    if (!res.ok) {
      return { ok: false, error: `Shopify returned ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: true,
      meta: {
        shopDomain,
        displayName: data?.shop?.name ?? shopDomain,
        scope: tokenResult.scope ?? "",
      },
    };
  } catch {
    return { ok: false, error: "Could not reach Shopify shop endpoint" };
  }
}

export async function validateWebflow(creds: WebflowCredentials): Promise<ValidationResult> {
  if (!creds.token || !creds.siteId) {
    return { ok: false, error: "Token and site ID are required" };
  }
  try {
    const res = await fetch(`https://api.webflow.com/v2/sites/${encodeURIComponent(creds.siteId)}`, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Webflow token rejected. Check it has sites:write scope." };
    }
    if (res.status === 404) {
      return { ok: false, error: "Site not found. Check the site ID." };
    }
    if (!res.ok) {
      return { ok: false, error: `Webflow returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, meta: { displayName: data.displayName ?? data.shortName ?? creds.siteId } };
  } catch {
    return { ok: false, error: "Could not reach Webflow. Try again." };
  }
}
