/**
 * GitHub-based "Apply Fix" handler.
 * Commits a single file to the user's connected repo via GitHub Contents API.
 * Vercel/Netlify auto-deploy triggers from the push.
 */

import { GithubClient } from "@/services/github/githubClient";
import {
  injectPerPageIntoHtml,
  type PerPageInjectResult,
  type PageInjectionRequest,
} from "./perPageHtmlInjector";

const GITHUB_API = "https://api.github.com";
const TIMEOUT_MS = 15_000;
const COMMIT_AUTHOR = {
  name: "Surven Bot",
  email: "bot@surven.ai",
};

export type SupportedFixType = "robots" | "sitemap" | "llms";

export interface GithubApplyFixOptions {
  token: string;
  repo: string; // "owner/repo"
  branch: string;
  fixType: SupportedFixType;
  content: string;
  findingId: string;
  findingTitle: string;
}

export interface ApplyFixResult {
  ok: boolean;
  committedSha?: string;
  commitUrl?: string;
  filePath?: string;
  error?: string;
}

const FILE_PATH_BY_FIX: Record<SupportedFixType, { primary: string; fallback: string }> = {
  robots: { primary: "public/robots.txt", fallback: "robots.txt" },
  sitemap: { primary: "public/sitemap.xml", fallback: "sitemap.xml" },
  llms: { primary: "public/llms.txt", fallback: "llms.txt" },
};

interface GithubContentResponse {
  sha?: string;
  content?: string;
  encoding?: string;
}

interface GithubCommitResponse {
  commit?: { sha?: string; html_url?: string };
}

async function ghFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function pathExists(repo: string, path: string, branch: string, token: string): Promise<boolean> {
  const res = await ghFetch(
    `/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    token
  );
  return res.status === 200;
}

async function getFileSha(
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string | null> {
  const res = await ghFetch(
    `/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    token
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub returned ${res.status} when fetching ${path}`);
  }
  const data = (await res.json()) as GithubContentResponse;
  return data.sha ?? null;
}

/**
 * Determine the right file path for the given fix type.
 * Uses public/ if the repo has a public/ directory (Next.js, Vite, CRA),
 * otherwise writes to root.
 */
async function resolveFilePath(
  repo: string,
  branch: string,
  token: string,
  fixType: SupportedFixType
): Promise<string> {
  const { primary, fallback } = FILE_PATH_BY_FIX[fixType];

  // First check if the file already exists at primary or fallback path
  const primaryExists = await pathExists(repo, primary, branch, token);
  if (primaryExists) return primary;

  const fallbackExists = await pathExists(repo, fallback, branch, token);
  if (fallbackExists) return fallback;

  // Neither exists — pick based on whether public/ dir exists
  const publicDirExists = await pathExists(repo, "public", branch, token);
  return publicDirExists ? primary : fallback;
}

export async function applyFixToGithub(opts: GithubApplyFixOptions): Promise<ApplyFixResult> {
  try {
    const filePath = await resolveFilePath(opts.repo, opts.branch, opts.token, opts.fixType);
    const existingSha = await getFileSha(opts.repo, filePath, opts.branch, opts.token);

    const message = `fix(crawlability): ${opts.findingTitle}\n\nApplied via Surven Optimizer (finding: ${opts.findingId})`;

    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(opts.content, "utf8").toString("base64"),
      branch: opts.branch,
      author: COMMIT_AUTHOR,
      committer: COMMIT_AUTHOR,
    };
    if (existingSha) body.sha = existingSha;

    const res = await ghFetch(
      `/repos/${opts.repo}/contents/${encodeURIComponent(filePath)}`,
      opts.token,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "GitHub token rejected. The token may have expired or lost 'repo' scope." };
    }
    if (res.status === 409) {
      return {
        ok: false,
        error: "File was modified after our scan. Please re-scan and try again.",
      };
    }
    if (res.status === 422) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: `GitHub rejected the commit: ${data?.message ?? "validation error"}` };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `GitHub returned ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = (await res.json()) as GithubCommitResponse;
    return {
      ok: true,
      committedSha: data.commit?.sha,
      commitUrl: data.commit?.html_url,
      filePath,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected error applying fix",
    };
  }
}

export function isFixTypeSupportedForGithub(fixType: string | undefined): fixType is SupportedFixType {
  return fixType === "robots" || fixType === "sitemap" || fixType === "llms";
}

/**
 * Per-finding HTML fix support. Each entry maps a crawlability finding ID to a
 * per-URL injection plan. Currently only canonical_missing is wired; viewport
 * and OG tags can follow the same pattern.
 */
const HTML_FIX_BUILDERS: Record<
  string,
  (url: string) => { snippet: string; existingMarker: RegExp }
> = {
  canonical_missing: (url) => ({
    snippet: `<link rel="canonical" href="${escapeHtmlAttr(url)}" />`,
    existingMarker: /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/i,
  }),
};

export function isHtmlFixSupportedForGithub(findingId: string): boolean {
  return findingId in HTML_FIX_BUILDERS;
}

export interface ApplyHtmlFixOptions {
  token: string;
  repo: string;
  branch: string;
  findingId: string;
  findingTitle: string;
  /** URLs from the finding's `affectedUrls` field. */
  affectedUrls: string[];
}

export interface ApplyHtmlFixResult {
  ok: boolean;
  perPageResult?: PerPageInjectResult;
  error?: string;
  manualNote?: string;
  manualSnippet?: string;
}

/**
 * Apply a per-page HTML fix (currently: canonical tag) across all affected pages.
 * Returns a structured result so the UI can show "X of N pages fixed".
 *
 * Detects Next.js repos and bails to manual paste — Next.js per-page metadata
 * exports are a separate code path (not yet wired).
 */
export async function applyHtmlFixToGithub(opts: ApplyHtmlFixOptions): Promise<ApplyHtmlFixResult> {
  const builder = HTML_FIX_BUILDERS[opts.findingId];
  if (!builder) {
    return {
      ok: false,
      error: `No HTML fix builder for finding "${opts.findingId}".`,
    };
  }

  if (opts.affectedUrls.length === 0) {
    return {
      ok: false,
      error: "No affected URLs sent with this finding — re-scan and retry.",
    };
  }

  const client = new GithubClient(opts.token, opts.repo);

  // Detect Next.js — if next.config.* exists, raw HTML editing won't apply.
  const isNextJs = await detectNextJs(client, opts.branch);
  if (isNextJs) {
    return {
      ok: false,
      manualNote:
        "This repo looks like Next.js. Add canonical URLs via per-page `metadata.alternates.canonical` exports in each route's page.tsx — automated Next.js per-page edits aren't wired yet.",
      manualSnippet: opts.affectedUrls
        .map((u) => `// In src/app${urlPathnameForNextJs(u)}/page.tsx\nexport const metadata = { alternates: { canonical: "${u}" } };`)
        .join("\n\n"),
    };
  }

  const requests: PageInjectionRequest[] = opts.affectedUrls.map((url) => {
    const built = builder(url);
    return { url, snippet: built.snippet, existingMarker: built.existingMarker };
  });

  const commitMessage = `fix(crawlability): ${opts.findingTitle}\n\nApplied via Surven Optimizer (finding: ${opts.findingId}, ${opts.affectedUrls.length} page(s))`;

  const result = await injectPerPageIntoHtml(client, opts.repo, opts.branch, requests, commitMessage);

  // Even if some pages were skipped (already had canonical) or failed (no HTML file
  // found), we consider the operation successful as long as at least 1 page committed.
  return {
    ok: result.succeeded.length > 0,
    perPageResult: result,
    error: result.succeeded.length === 0 ? "No pages were updated — see per-page details." : undefined,
  };
}

async function detectNextJs(client: GithubClient, branch: string): Promise<boolean> {
  const candidates = ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"];
  for (const name of candidates) {
    const file = await client.getFile(name, branch).catch(() => null);
    if (file?.content) return true;
  }
  return false;
}

function urlPathnameForNextJs(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, "");
    return p || "";
  } catch {
    return "";
  }
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
