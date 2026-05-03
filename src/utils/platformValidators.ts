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

export type PlatformCredentials =
  | { platform: "github"; data: GithubCredentials }
  | { platform: "vercel"; data: VercelCredentials }
  | { platform: "wordpress"; data: WordpressCredentials }
  | { platform: "webflow"; data: WebflowCredentials }
  | { platform: "wix"; data: WixCredentials };

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
