/**
 * GitHub-based "Apply Fix" handler.
 * Commits a single file to the user's connected repo via GitHub Contents API.
 * Vercel/Netlify auto-deploy triggers from the push.
 */

import { GithubClient } from "@/services/github/githubClient";
import {
  injectPerPageIntoHtml,
  injectPerPageIntoNextJs,
  type PerPageInjectResult,
  type PageInjectionRequest,
  type NextJsPageInjectionRequest,
} from "./perPageHtmlInjector";
import type { MetadataField } from "@/services/nextJsMetadataWriter";

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
 * Per-finding HTML fix support. Each entry pairs a crawlability finding ID with:
 *   - htmlBuilder: produces the snippet + idempotency marker for plain-HTML repos
 *   - nextJsField: produces the metadata field path + value literal for Next.js repos
 *
 * Either or both may be present. Currently every wired finding supports both.
 */
interface HtmlFixSpec {
  htmlBuilder?: (url: string) => { snippet: string; existingMarker: RegExp };
  nextJsField?: (url: string) => MetadataField;
  /** If true, injects into root layout.tsx once (site-wide) instead of per-page. */
  isSiteWide?: boolean;
}

const HTML_FIX_BUILDERS: Record<string, HtmlFixSpec> = {
  canonical_missing: {
    htmlBuilder: (url) => ({
      snippet: `<link rel="canonical" href="${escapeHtmlAttr(url)}" />`,
      existingMarker: /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/i,
    }),
    nextJsField: (url) => ({
      path: ["alternates", "canonical"],
      valueLiteral: JSON.stringify(url),
    }),
  },
  viewport_meta_missing: {
    htmlBuilder: () => ({
      snippet: `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
      existingMarker: /<meta\s+[^>]*name\s*=\s*["']viewport["'][^>]*>/i,
    }),
    nextJsField: () => ({
      path: ["viewport"],
      valueLiteral: `{ width: "device-width", initialScale: 1 }`,
    }),
    isSiteWide: true,
  },
  og_tags_missing: {
    htmlBuilder: (url) => ({
      // Inject minimal OG block. Per-page url + reasonable defaults.
      // og:title and og:description fall back to page title / meta description if absent
      // on the resulting page; this keeps the snippet concise.
      snippet: `<meta property="og:url" content="${escapeHtmlAttr(url)}" />\n  <meta property="og:type" content="website" />`,
      existingMarker: /<meta\s+[^>]*property\s*=\s*["']og:url["'][^>]*>/i,
    }),
    nextJsField: (url) => ({
      path: ["openGraph"],
      valueLiteral: `{ url: ${JSON.stringify(url)}, type: "website" }`,
    }),
  },
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
 * Apply an HTML-class fix across affected pages.
 *
 * Dispatches by framework:
 *   - Plain HTML repos → injects per-page snippets into <head> via perPageHtmlInjector
 *   - Next.js repos    → writes per-route metadata fields via perPageNextJsInjector
 *
 * For site-wide fixes (e.g. viewport_meta_missing), targets the homepage URL
 * for HTML and the root layout.tsx for Next.js, regardless of how many
 * affectedUrls were sent.
 */
export async function applyHtmlFixToGithub(opts: ApplyHtmlFixOptions): Promise<ApplyHtmlFixResult> {
  const spec = HTML_FIX_BUILDERS[opts.findingId];
  if (!spec) {
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

  let fileTree: Set<string>;
  try {
    fileTree = await client.getFileTree(opts.branch);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't read repo file tree",
    };
  }

  const isNextJs =
    fileTree.has("next.config.js") ||
    fileTree.has("next.config.mjs") ||
    fileTree.has("next.config.ts") ||
    fileTree.has("next.config.cjs");

  // Resolve which URLs to actually edit. Site-wide fixes collapse to one URL
  // (the home origin) so we don't redundantly write the same field N times.
  const urlsToProcess = spec.isSiteWide
    ? [originForUrl(opts.affectedUrls[0])]
    : opts.affectedUrls;

  const commitMessage = `fix(crawlability): ${opts.findingTitle}\n\nApplied via Surven Optimizer (finding: ${opts.findingId}, ${urlsToProcess.length} ${spec.isSiteWide ? "site-wide" : "page"} edit(s))`;

  if (isNextJs) {
    if (!spec.nextJsField) {
      return {
        ok: false,
        manualNote: "This repo is Next.js but Surven doesn't have a Next.js writer for this fix yet.",
        manualSnippet: opts.affectedUrls
          .map((u) => spec.htmlBuilder ? spec.htmlBuilder(u).snippet : "")
          .filter(Boolean)
          .join("\n"),
      };
    }
    const requests: NextJsPageInjectionRequest[] = urlsToProcess.map((url) => ({
      url: spec.isSiteWide ? originForUrl(url) : url,
      field: spec.nextJsField!(url),
    }));
    const result = await injectPerPageIntoNextJs(
      client,
      opts.repo,
      opts.branch,
      requests,
      commitMessage,
      fileTree,
    );
    return {
      ok: result.succeeded.length > 0,
      perPageResult: result,
      error: result.succeeded.length === 0 ? "No routes were updated — see per-route details." : undefined,
    };
  }

  // Plain HTML branch
  if (!spec.htmlBuilder) {
    return {
      ok: false,
      manualNote: "This fix is wired for Next.js only — open the file manually for plain HTML.",
    };
  }
  const requests: PageInjectionRequest[] = urlsToProcess.map((url) => {
    const built = spec.htmlBuilder!(url);
    return { url, snippet: built.snippet, existingMarker: built.existingMarker };
  });

  const result = await injectPerPageIntoHtml(client, opts.repo, opts.branch, requests, commitMessage, fileTree);

  return {
    ok: result.succeeded.length > 0,
    perPageResult: result,
    error: result.succeeded.length === 0 ? "No pages were updated — see per-page details." : undefined,
  };
}

function originForUrl(url: string): string {
  try {
    return new URL(url).origin + "/";
  } catch {
    return url;
  }
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
