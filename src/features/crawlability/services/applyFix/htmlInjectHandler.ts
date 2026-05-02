/**
 * HTML injection GitHub handler.
 *
 * Used by /api/audit/generate to commit changes that MODIFY existing HTML files
 * (schema script tags, meta tags, title tags, image alt attributes) — as opposed
 * to the existing githubHandler which REPLACES whole files (robots.txt, etc.).
 *
 * v1 supports:
 *   - Plain HTML / Vite / CRA / static sites: modify index.html or public/index.html
 *   - Next.js: falls back to copy-to-clipboard (returns ok=false with a structured message
 *     so the side panel can show the snippet for manual paste)
 *
 * Adding more frameworks later: implement a per-framework `prepareEdit` function.
 */

const GITHUB_API = "https://api.github.com";
const TIMEOUT_MS = 25_000;

export type HtmlInjectKind = "schema_org" | "meta_desc" | "title_tag" | "alt_text";

export interface HtmlInjectOptions {
  token: string;
  repo: string;
  branch: string;
  kind: HtmlInjectKind;
  payload: HtmlInjectPayload;
  findingId: string;
  findingTitle: string;
}

export type HtmlInjectPayload =
  | { kind: "schema_org"; jsonLd: string; schemaType: string }
  | { kind: "meta_desc"; description: string }
  | { kind: "title_tag"; title: string }
  | { kind: "alt_text"; replacements: Array<{ src: string; alt: string }> };

export interface HtmlInjectResult {
  ok: boolean;
  committedSha?: string;
  commitUrl?: string;
  filePath?: string;
  error?: string;
  manualSnippet?: string;
  manualNote?: string;
}

interface GithubContentResponse {
  sha?: string;
  content?: string;
  encoding?: string;
}

interface GithubCommitResponse {
  commit?: { sha?: string; html_url?: string };
}

const HTML_FILE_CANDIDATES = ["index.html", "public/index.html", "src/index.html"];
const NEXTJS_MARKERS = ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs"];
const NEXTJS_LAYOUT_CANDIDATES = [
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "src/app/layout.ts",
  "src/app/layout.js",
  "app/layout.tsx",
  "app/layout.jsx",
  "app/layout.ts",
  "app/layout.js",
];

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

async function getFileContents(repo: string, path: string, branch: string, token: string): Promise<{ content: string; sha: string } | null> {
  const res = await ghFetch(
    `/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub returned ${res.status} when fetching ${path}`);
  const data = (await res.json()) as GithubContentResponse;
  if (!data.content || data.encoding !== "base64") return null;
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha ?? "" };
}

async function pathExists(repo: string, path: string, branch: string, token: string): Promise<boolean> {
  const res = await ghFetch(
    `/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    token,
  );
  return res.status === 200;
}

async function findHtmlFile(repo: string, branch: string, token: string): Promise<{ path: string; content: string; sha: string } | null> {
  for (const candidate of HTML_FILE_CANDIDATES) {
    const found = await getFileContents(repo, candidate, branch, token);
    if (found) return { path: candidate, ...found };
  }
  return null;
}

async function isNextJsRepo(repo: string, branch: string, token: string): Promise<boolean> {
  const checks = await Promise.all(
    NEXTJS_MARKERS.map((marker) => pathExists(repo, marker, branch, token).catch(() => false)),
  );
  return checks.some(Boolean);
}

function injectIntoHead(html: string, snippet: string): string {
  const closeHead = html.indexOf("</head>");
  if (closeHead === -1) {
    return html.replace(/<body[^>]*>/, (m) => `${m}\n${snippet}`);
  }
  const beforeClose = html.slice(0, closeHead);
  const afterClose = html.slice(closeHead);
  const indent = (beforeClose.match(/[ \t]*$/)?.[0] ?? "  ");
  return `${beforeClose}${snippet.replace(/\n/g, `\n${indent}`)}\n${afterClose}`;
}

/**
 * Returns the @type values of every JSON-LD <script> currently in the HTML.
 * Used to detect whether a schema of a given type is already present so we
 * don't double-inject (e.g. two LocalBusiness blocks with stale data).
 */
function existingJsonLdTypes(html: string): Set<string> {
  const types = new Set<string>();
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      collectTypes(parsed, types);
    } catch {
      // skip malformed scripts — don't block our injection on someone else's bad markup
    }
  }
  return types;
}

function collectTypes(node: unknown, out: Set<string>): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.add(t.toLowerCase());
  else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.add(x.toLowerCase());
  if (obj["@graph"]) collectTypes(obj["@graph"], out);
  if (obj["mainEntity"]) collectTypes(obj["mainEntity"], out);
}

function replaceMetaDescription(html: string, description: string): string {
  const escaped = description.replace(/"/g, "&quot;");
  const newTag = `<meta name="description" content="${escaped}">`;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    return html.replace(/<meta\s+name=["']description["'][^>]*>/i, newTag);
  }
  return injectIntoHead(html, newTag);
}

function replaceTitle(html: string, title: string): string {
  const escaped = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const newTag = `<title>${escaped}</title>`;
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, newTag);
  }
  return injectIntoHead(html, newTag);
}

function replaceAltAttributes(html: string, replacements: Array<{ src: string; alt: string }>): { html: string; modified: number } {
  let updated = html;
  let modified = 0;
  for (const { src, alt } of replacements) {
    const escapedAlt = alt.replace(/"/g, "&quot;");
    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const imgPattern = new RegExp(`(<img\\b[^>]*\\bsrc=["']${escapedSrc}["'][^>]*?)\\s*/?>`, "i");
    const match = updated.match(imgPattern);
    if (!match) continue;
    let imgTag = match[0];
    if (/\salt=/i.test(imgTag)) {
      imgTag = imgTag.replace(/\salt=["'][^"']*["']/i, ` alt="${escapedAlt}"`);
    } else {
      imgTag = imgTag.replace(/\s*\/?>$/, ` alt="${escapedAlt}">`);
    }
    updated = updated.replace(match[0], imgTag);
    modified++;
  }
  return { html: updated, modified };
}

async function commitFile(
  repo: string,
  path: string,
  branch: string,
  token: string,
  content: string,
  sha: string,
  message: string,
): Promise<{ committedSha: string; commitUrl: string }> {
  const res = await ghFetch(
    `/repos/${repo}/contents/${encodeURIComponent(path)}`,
    token,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf-8").toString("base64"),
        sha,
        branch,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`GitHub commit failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as GithubCommitResponse;
  return {
    committedSha: data.commit?.sha ?? "",
    commitUrl: data.commit?.html_url ?? "",
  };
}

export async function applyHtmlInject(options: HtmlInjectOptions): Promise<HtmlInjectResult> {
  const { token, repo, branch, kind, payload, findingId, findingTitle } = options;

  const isNext = await isNextJsRepo(repo, branch, token);
  if (isNext) {
    return {
      ok: false,
      manualSnippet: payload.kind === "schema_org" ? payload.jsonLd : undefined,
      manualNote: "Next.js auto-commit isn't wired yet — copy the snippet and paste it into your <head>, layout.tsx, or page metadata. Auto-commit support coming in Sprint 1.5.",
    };
  }

  const file = await findHtmlFile(repo, branch, token);
  if (!file) {
    return {
      ok: false,
      manualSnippet: payload.kind === "schema_org" ? payload.jsonLd : undefined,
      manualNote: "Couldn't find an HTML file (looked for index.html, public/index.html, src/index.html). Copy the snippet and add it manually.",
    };
  }

  let updatedHtml = file.content;
  let commitSubject = "";

  switch (payload.kind) {
    case "schema_org": {
      const existingTypes = existingJsonLdTypes(file.content);
      if (existingTypes.has(payload.schemaType.toLowerCase())) {
        return {
          ok: false,
          error: `${payload.schemaType} schema is already present in this file. Remove the existing one first if you want to replace it.`,
        };
      }
      updatedHtml = injectIntoHead(file.content, payload.jsonLd);
      commitSubject = `feat(schema): add ${payload.schemaType} JSON-LD`;
      break;
    }
    case "meta_desc": {
      updatedHtml = replaceMetaDescription(file.content, payload.description);
      commitSubject = "fix(seo): update meta description";
      break;
    }
    case "title_tag": {
      updatedHtml = replaceTitle(file.content, payload.title);
      commitSubject = "fix(seo): update <title>";
      break;
    }
    case "alt_text": {
      const result = replaceAltAttributes(file.content, payload.replacements);
      if (result.modified === 0) {
        return {
          ok: false,
          error: "None of the target images were found in the HTML — they may live in components or be dynamically loaded.",
        };
      }
      updatedHtml = result.html;
      commitSubject = `fix(a11y): add alt text to ${result.modified} image${result.modified > 1 ? "s" : ""}`;
      break;
    }
  }

  if (updatedHtml === file.content) {
    return {
      ok: false,
      error: "Nothing changed — the snippet may already be present in the file.",
    };
  }

  const message = `${commitSubject}\n\nApplied via Surven Optimizer (finding: ${findingId} — ${findingTitle})`;
  const { committedSha, commitUrl } = await commitFile(
    repo,
    file.path,
    branch,
    token,
    updatedHtml,
    file.sha,
    message,
  );

  void kind;

  return {
    ok: true,
    committedSha,
    commitUrl,
    filePath: file.path,
  };
}
