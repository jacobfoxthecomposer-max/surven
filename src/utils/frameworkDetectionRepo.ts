/**
 * Framework detection — repo file-tree layer.
 *
 * For connected GitHub repos, fetch the root file tree + key config files
 * to identify the framework with higher confidence than HTTP probing alone.
 * Used for Tier-4 framework-specific edits (knowing where to write).
 */

import type { DetectedPlatform } from "@/utils/frameworkDetection";

const TIMEOUT_MS = 15_000;

export interface RepoDetectionResult {
  platform: DetectedPlatform;
  confidence: number;
  signals: string[];
  meta: {
    packageManager?: "npm" | "yarn" | "pnpm" | "bun";
    frameworkVersion?: string;
    contentDir?: string;
    routerStyle?: "app" | "pages" | "src/app" | "src/pages";
    typescript?: boolean;
    monorepo?: boolean;
    dependencies?: string[];
  };
}

interface GithubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

async function fetchRepoTree(
  token: string,
  repo: string,
  branch: string
): Promise<GithubTreeItem[]> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.tree) ? (data.tree as GithubTreeItem[]) : [];
}

async function fetchFileText(
  token: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (!res.ok) return null;
  return res.text();
}

export async function detectFromRepo(
  token: string,
  repo: string,
  branch: string = "main"
): Promise<RepoDetectionResult> {
  const result: RepoDetectionResult = {
    platform: "unknown",
    confidence: 0,
    signals: [],
    meta: {},
  };

  const tree = await fetchRepoTree(token, repo, branch);
  if (tree.length === 0) {
    result.signals.push("repo_unreachable_or_empty");
    return result;
  }

  const paths = new Set(tree.map((t) => t.path));
  const has = (p: string) => paths.has(p);
  const hasAny = (...ps: string[]) => ps.some((p) => paths.has(p));
  const hasPrefix = (prefix: string) =>
    tree.some((t) => t.path.startsWith(prefix));

  // ── package manager ──────────────────────────────
  if (has("pnpm-lock.yaml")) result.meta.packageManager = "pnpm";
  else if (has("yarn.lock")) result.meta.packageManager = "yarn";
  else if (has("bun.lockb") || has("bun.lock")) result.meta.packageManager = "bun";
  else if (has("package-lock.json")) result.meta.packageManager = "npm";

  // ── monorepo signals ─────────────────────────────
  if (has("pnpm-workspace.yaml") || has("turbo.json") || has("nx.json") || has("lerna.json")) {
    result.meta.monorepo = true;
    result.signals.push("monorepo_detected");
  }

  // ── typescript ───────────────────────────────────
  if (has("tsconfig.json")) result.meta.typescript = true;

  // ── package.json read for framework + version ────
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null = null;
  if (has("package.json")) {
    const pkgText = await fetchFileText(token, repo, "package.json", branch);
    if (pkgText) {
      try {
        pkg = JSON.parse(pkgText);
      } catch {
        result.signals.push("package_json_parse_failed");
      }
    }
  }
  const allDeps: Record<string, string> = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };
  if (Object.keys(allDeps).length > 0) {
    result.meta.dependencies = Object.keys(allDeps).slice(0, 30);
  }

  // ── Next.js ─────────────────────────────────────
  if (allDeps.next || hasAny("next.config.js", "next.config.ts", "next.config.mjs")) {
    result.platform = "nextjs";
    result.confidence = 0.97;
    result.signals.push("next_in_deps_or_config");
    if (allDeps.next) result.meta.frameworkVersion = allDeps.next;
    if (hasPrefix("app/")) result.meta.routerStyle = "app";
    else if (hasPrefix("src/app/")) result.meta.routerStyle = "src/app";
    else if (hasPrefix("pages/")) result.meta.routerStyle = "pages";
    else if (hasPrefix("src/pages/")) result.meta.routerStyle = "src/pages";
    return result;
  }

  // ── Astro ──────────────────────────────────────
  if (allDeps.astro || hasAny("astro.config.mjs", "astro.config.ts", "astro.config.js")) {
    result.platform = "astro";
    result.confidence = 0.97;
    result.signals.push("astro_in_deps_or_config");
    if (allDeps.astro) result.meta.frameworkVersion = allDeps.astro;
    if (hasPrefix("src/content/")) result.meta.contentDir = "src/content";
    return result;
  }

  // ── Nuxt ───────────────────────────────────────
  if (allDeps.nuxt || hasAny("nuxt.config.ts", "nuxt.config.js")) {
    result.platform = "nuxt";
    result.confidence = 0.97;
    result.signals.push("nuxt_in_deps_or_config");
    if (allDeps.nuxt) result.meta.frameworkVersion = allDeps.nuxt;
    return result;
  }

  // ── SvelteKit ──────────────────────────────────
  if (allDeps["@sveltejs/kit"] || has("svelte.config.js")) {
    result.platform = "sveltekit";
    result.confidence = 0.95;
    result.signals.push("sveltekit_in_deps_or_config");
    if (allDeps["@sveltejs/kit"]) result.meta.frameworkVersion = allDeps["@sveltejs/kit"];
    return result;
  }

  // ── Remix ──────────────────────────────────────
  if (allDeps["@remix-run/node"] || allDeps["@remix-run/dev"] || has("remix.config.js")) {
    result.platform = "remix";
    result.confidence = 0.95;
    result.signals.push("remix_in_deps_or_config");
    return result;
  }

  // ── Gatsby ─────────────────────────────────────
  if (allDeps.gatsby || hasAny("gatsby-config.js", "gatsby-config.ts")) {
    result.platform = "gatsby";
    result.confidence = 0.95;
    result.signals.push("gatsby_in_deps_or_config");
    if (allDeps.gatsby) result.meta.frameworkVersion = allDeps.gatsby;
    return result;
  }

  // ── Hugo ───────────────────────────────────────
  if (hasAny("hugo.toml", "hugo.yaml", "config.toml", "config.yaml", "hugo.json")) {
    if (hasAny("themes/", "content/")) {
      result.platform = "hugo";
      result.confidence = 0.9;
      result.signals.push("hugo_config_and_content");
      result.meta.contentDir = "content";
      return result;
    }
  }

  // ── Jekyll ─────────────────────────────────────
  if (has("_config.yml") && (hasPrefix("_posts/") || hasPrefix("_layouts/"))) {
    result.platform = "jekyll";
    result.confidence = 0.95;
    result.signals.push("jekyll_config_and_dirs");
    return result;
  }

  // ── Eleventy ───────────────────────────────────
  if (allDeps["@11ty/eleventy"] || hasAny(".eleventy.js", "eleventy.config.js", "eleventy.config.mjs")) {
    result.platform = "eleventy";
    result.confidence = 0.95;
    result.signals.push("eleventy_in_deps_or_config");
    return result;
  }

  // ── WordPress (themes/plugins repo) ────────────
  if (hasAny("style.css") && hasPrefix("functions.php")) {
    result.platform = "wordpress";
    result.confidence = 0.85;
    result.signals.push("wordpress_theme_files");
    return result;
  }

  // ── Shopify theme ──────────────────────────────
  if (hasAny("config/settings_schema.json", "layout/theme.liquid")) {
    result.platform = "shopify";
    result.confidence = 0.95;
    result.signals.push("shopify_theme_files");
    return result;
  }

  result.signals.push("no_known_repo_signal");
  return result;
}
