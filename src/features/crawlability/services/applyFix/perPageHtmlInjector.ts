/**
 * Per-page HTML injection for plain-HTML repos.
 *
 * Resolves each affected URL to a candidate HTML file in the repo, injects a
 * snippet (e.g. `<link rel="canonical">`) into <head>, and commits all changes
 * as a single atomic batch via the GitHub Git Data API.
 *
 * Used by the crawlability auto-fix endpoint for findings whose `fixType` is
 * "html" and whose data shape is per-URL (canonical_missing, viewport_meta_missing,
 * og_tags_missing).
 *
 * Limitations:
 *   - Plain HTML / Vite / CRA only. Next.js routes use page-level metadata exports
 *     (different code path), not raw HTML files. Callers should detect Next.js
 *     and dispatch elsewhere.
 *   - Heuristic file-path resolution: `/about` could be `about.html`,
 *     `about/index.html`, `public/about.html`, etc. We try each in order and use
 *     the first that returns content.
 */

import { GithubClient } from "@/services/github/githubClient";

const HEAD_INJECT_INDENT = "  ";

export interface PerPageInjectResult {
  total: number;
  succeeded: Array<{ url: string; filePath: string }>;
  skipped: Array<{ url: string; reason: string; filePath?: string }>;
  failed: Array<{ url: string; reason: string }>;
  commitSha?: string;
  commitUrl?: string;
}

/**
 * Build per-URL HTML injection plan.
 *
 * For each URL, the caller decides what snippet to inject. The injector handles
 * file resolution, idempotency (don't double-insert), and atomic batching.
 */
export interface PageInjectionRequest {
  url: string;
  /** HTML to inject into <head>. Should NOT include surrounding whitespace. */
  snippet: string;
  /**
   * Regex to detect "this snippet (or a competing version) is already on the
   * page" — match against existing file content. If matches, skip with reason.
   */
  existingMarker: RegExp;
}

export async function injectPerPageIntoHtml(
  client: GithubClient,
  repo: string,
  branch: string,
  requests: PageInjectionRequest[],
  commitMessage: string,
  /** Optional pre-fetched file tree to avoid a redundant API call. */
  fileTreeIn?: Set<string>,
): Promise<PerPageInjectResult> {
  const result: PerPageInjectResult = {
    total: requests.length,
    succeeded: [],
    skipped: [],
    failed: [],
  };

  // Pull the entire file tree in a single API call. Beats N×4 probes per URL.
  let fileTree: Set<string>;
  try {
    fileTree = fileTreeIn ?? (await client.getFileTree(branch));
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Couldn't read repo tree";
    for (const r of requests) result.failed.push({ url: r.url, reason });
    return result;
  }

  // Plan: resolve each URL → file path locally (no API call), then batch-read the
  // unique resolved files in parallel.
  type Plan = { req: PageInjectionRequest; resolvedPath: string };
  const plans: Plan[] = [];
  for (const req of requests) {
    const candidatePaths = resolveCandidatePaths(req.url);
    if (candidatePaths.length === 0) {
      result.failed.push({ url: req.url, reason: "Couldn't parse URL" });
      continue;
    }
    const found = candidatePaths.find((p) => fileTree.has(p));
    if (!found) {
      result.failed.push({
        url: req.url,
        reason: `No HTML file found in repo for this URL. Tried: ${candidatePaths.slice(0, 3).join(", ")}`,
      });
      continue;
    }
    plans.push({ req, resolvedPath: found });
  }

  // Read each unique file once, in parallel.
  const uniquePaths = Array.from(new Set(plans.map((p) => p.resolvedPath)));
  const fileContents = new Map<string, string>();
  await Promise.all(
    uniquePaths.map(async (path) => {
      const file = await client.getFile(path, branch).catch(() => null);
      if (file?.content) fileContents.set(path, file.content);
    }),
  );

  // Collect file edits keyed by path so multiple URLs resolving to the same file
  // (rare but possible — e.g. canonical & og:url for the home page) are merged.
  const edits = new Map<string, { original: string; updated: string; urls: string[] }>();

  for (const { req, resolvedPath } of plans) {
    const resolvedContent = fileContents.get(resolvedPath);
    if (!resolvedContent) {
      result.failed.push({ url: req.url, reason: `Couldn't read ${resolvedPath}` });
      continue;
    }

    const existing = edits.get(resolvedPath);
    const sourceContent = existing?.updated ?? resolvedContent;

    if (req.existingMarker.test(sourceContent)) {
      result.skipped.push({
        url: req.url,
        reason: "Page already has this tag",
        filePath: resolvedPath,
      });
      continue;
    }

    const headCloseIdx = findHeadCloseIndex(sourceContent);
    if (headCloseIdx === -1) {
      result.failed.push({
        url: req.url,
        reason: `No </head> tag in ${resolvedPath}`,
      });
      continue;
    }

    const updated =
      sourceContent.slice(0, headCloseIdx) +
      `${HEAD_INJECT_INDENT}${req.snippet}\n` +
      sourceContent.slice(headCloseIdx);

    if (existing) {
      existing.updated = updated;
      existing.urls.push(req.url);
    } else {
      edits.set(resolvedPath, { original: resolvedContent, updated, urls: [req.url] });
    }

    result.succeeded.push({ url: req.url, filePath: resolvedPath });
  }

  if (edits.size === 0) {
    return result;
  }

  try {
    const filesToCommit = Array.from(edits.entries()).map(([path, data]) => ({
      path,
      content: data.updated,
    }));
    const commitResult = await client.commitBatch(filesToCommit, branch, commitMessage);
    result.commitSha = commitResult.commitSha;
    result.commitUrl = `https://github.com/${repo}/commit/${commitResult.commitSha}`;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Batch commit failed";
    // Move all succeeded → failed since the commit didn't land.
    for (const succ of result.succeeded) {
      result.failed.push({ url: succ.url, reason });
    }
    result.succeeded = [];
  }

  return result;
}

/**
 * Map a URL path to the most likely HTML file paths in a static repo.
 * Tries common conventions: trailing /, .html suffix, public/ prefix.
 */
export function resolveCandidatePaths(pageUrl: string): string[] {
  let pathname: string;
  try {
    pathname = new URL(pageUrl).pathname;
  } catch {
    return [];
  }

  // Strip leading slash
  pathname = pathname.replace(/^\/+/, "");

  // Strip query/fragment (URL constructor already removes them, but defense)
  pathname = pathname.split("?")[0].split("#")[0];

  const candidates: string[] = [];

  if (!pathname || pathname === "") {
    // Home page
    candidates.push("index.html", "public/index.html", "src/index.html");
  } else if (pathname.endsWith("/")) {
    // Trailing slash — definitely a directory
    const dir = pathname.replace(/\/+$/, "");
    candidates.push(
      `${dir}/index.html`,
      `public/${dir}/index.html`,
      `${dir}.html`,
      `public/${dir}.html`,
    );
  } else if (pathname.endsWith(".html")) {
    // Already an .html path
    candidates.push(pathname, `public/${pathname}`);
  } else {
    // Bare path — could be either a file or a directory
    candidates.push(
      `${pathname}.html`,
      `${pathname}/index.html`,
      `public/${pathname}.html`,
      `public/${pathname}/index.html`,
    );
  }

  return candidates;
}

function findHeadCloseIndex(html: string): number {
  // Case-insensitive search for </head>
  const match = html.match(/<\/head\s*>/i);
  if (!match || match.index === undefined) return -1;
  return match.index;
}
