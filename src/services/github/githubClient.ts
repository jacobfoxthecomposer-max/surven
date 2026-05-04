/**
 * Minimal GitHub API client for file writes + PR opening.
 * No Octokit dep — direct fetch to keep the bundle small and the surface clear.
 *
 * All operations are scoped to a single (token, repo) pair. Token must have:
 *   Contents: Read & Write
 *   Pull requests: Read & Write
 *   Metadata: Read
 */

const API = "https://api.github.com";
const TIMEOUT_MS = 20_000;

interface GhFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export class GithubClient {
  constructor(
    private readonly token: string,
    private readonly repo: string
  ) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      throw new Error("Repo must be 'owner/repo'");
    }
  }

  private async ghFetch<T>(path: string, opts: GhFetchOptions = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GitHub ${res.status} on ${path}: ${text.slice(0, 300)}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Get the full recursive file tree of a branch. Returns a Set of all file paths.
   * Makes a single API call instead of N file probes.
   */
  async getFileTree(branch: string): Promise<Set<string>> {
    const branchSha = await this.getBranchSha(branch);
    const data = await this.ghFetch<{
      tree?: Array<{ path?: string; type?: string }>;
      truncated?: boolean;
    }>(`/repos/${this.repo}/git/trees/${branchSha}?recursive=1`);
    const paths = new Set<string>();
    for (const node of data.tree ?? []) {
      if (node.type === "blob" && typeof node.path === "string") {
        paths.add(node.path);
      }
    }
    return paths;
  }

  async getDefaultBranch(): Promise<string> {
    const data = await this.ghFetch<{ default_branch: string }>(`/repos/${this.repo}`);
    return data.default_branch;
  }

  async getBranchSha(branch: string): Promise<string> {
    const data = await this.ghFetch<{ object: { sha: string } }>(
      `/repos/${this.repo}/git/refs/heads/${encodeURIComponent(branch)}`
    );
    return data.object.sha;
  }

  async createBranch(newBranch: string, fromSha: string): Promise<void> {
    await this.ghFetch(`/repos/${this.repo}/git/refs`, {
      method: "POST",
      body: { ref: `refs/heads/${newBranch}`, sha: fromSha },
    });
  }

  async getFile(
    path: string,
    branch: string
  ): Promise<{ content: string; sha: string } | null> {
    try {
      const data = await this.ghFetch<{ content: string; sha: string; encoding: string }>(
        `/repos/${this.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`
      );
      const decoded =
        data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf8")
          : data.content;
      return { content: decoded, sha: data.sha };
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) return null;
      throw err;
    }
  }

  /**
   * Create or update a single file. For batch writes use `commitBatch`.
   */
  async putFile(
    path: string,
    content: string,
    branch: string,
    commitMessage: string,
    sha?: string
  ): Promise<{ commitSha: string }> {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
    };
    if (sha) body.sha = sha;

    const data = await this.ghFetch<{ commit: { sha: string } }>(
      `/repos/${this.repo}/contents/${encodeURIComponent(path)}`,
      { method: "PUT", body }
    );
    return { commitSha: data.commit.sha };
  }

  /**
   * Atomic batch commit via Git Data API.
   * Use for multi-file fixes (e.g. JSON-LD across many pages).
   */
  async commitBatch(
    files: Array<{ path: string; content: string }>,
    branch: string,
    commitMessage: string
  ): Promise<{ commitSha: string }> {
    const baseSha = await this.getBranchSha(branch);
    const baseCommit = await this.ghFetch<{ tree: { sha: string } }>(
      `/repos/${this.repo}/git/commits/${baseSha}`
    );

    const blobs = await Promise.all(
      files.map(async (f) => {
        const blob = await this.ghFetch<{ sha: string }>(`/repos/${this.repo}/git/blobs`, {
          method: "POST",
          body: {
            content: Buffer.from(f.content, "utf8").toString("base64"),
            encoding: "base64",
          },
        });
        return { path: f.path, sha: blob.sha };
      })
    );

    const newTree = await this.ghFetch<{ sha: string }>(`/repos/${this.repo}/git/trees`, {
      method: "POST",
      body: {
        base_tree: baseCommit.tree.sha,
        tree: blobs.map((b) => ({
          path: b.path,
          mode: "100644",
          type: "blob",
          sha: b.sha,
        })),
      },
    });

    const newCommit = await this.ghFetch<{ sha: string }>(`/repos/${this.repo}/git/commits`, {
      method: "POST",
      body: {
        message: commitMessage,
        tree: newTree.sha,
        parents: [baseSha],
      },
    });

    await this.ghFetch(`/repos/${this.repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: { sha: newCommit.sha },
    });

    return { commitSha: newCommit.sha };
  }

  async openPullRequest(opts: {
    title: string;
    body: string;
    head: string;
    base: string;
    labels?: string[];
  }): Promise<{ number: number; url: string }> {
    const pr = await this.ghFetch<{ number: number; html_url: string }>(
      `/repos/${this.repo}/pulls`,
      {
        method: "POST",
        body: {
          title: opts.title,
          body: opts.body,
          head: opts.head,
          base: opts.base,
        },
      }
    );

    if (opts.labels && opts.labels.length > 0) {
      try {
        await this.ghFetch(`/repos/${this.repo}/issues/${pr.number}/labels`, {
          method: "POST",
          body: { labels: opts.labels },
        });
      } catch {
        // Label add is best-effort; missing labels shouldn't block PR creation.
      }
    }

    return { number: pr.number, url: pr.html_url };
  }
}

/**
 * High-level: open a single-file PR for a Tier-1 fix.
 * Creates a `surven/<slug>` branch, commits the file, opens the PR.
 */
export async function openSingleFilePR(
  client: GithubClient,
  opts: {
    filePath: string;
    fileContent: string;
    branchSlug: string;
    base?: string;
    prTitle: string;
    prBody: string;
    commitMessage: string;
    labels?: string[];
  }
): Promise<{ prNumber: number; prUrl: string; branch: string; commitSha: string }> {
  const base = opts.base ?? (await client.getDefaultBranch());
  const baseSha = await client.getBranchSha(base);
  const branch = `surven/${opts.branchSlug}-${Date.now().toString(36)}`;

  await client.createBranch(branch, baseSha);

  const existing = await client.getFile(opts.filePath, branch).catch(() => null);
  const { commitSha } = await client.putFile(
    opts.filePath,
    opts.fileContent,
    branch,
    opts.commitMessage,
    existing?.sha
  );

  const pr = await client.openPullRequest({
    title: opts.prTitle,
    body: opts.prBody,
    head: branch,
    base,
    labels: opts.labels ?? ["surven", "geo-fix"],
  });

  return { prNumber: pr.number, prUrl: pr.url, branch, commitSha };
}
