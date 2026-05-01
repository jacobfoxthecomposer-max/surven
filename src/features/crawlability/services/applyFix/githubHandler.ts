/**
 * GitHub-based "Apply Fix" handler.
 * Commits a single file to the user's connected repo via GitHub Contents API.
 * Vercel/Netlify auto-deploy triggers from the push.
 */

const GITHUB_API = "https://api.github.com";
const TIMEOUT_MS = 15_000;
const COMMIT_AUTHOR = {
  name: "Surven Bot",
  email: "bot@surven.ai",
};

export type SupportedFixType = "robots" | "sitemap";

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
  return fixType === "robots" || fixType === "sitemap";
}
