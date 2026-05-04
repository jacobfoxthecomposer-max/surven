/**
 * Next.js metadata writer.
 *
 * Injects fields into `export const metadata = { ... }` declarations across
 * Next.js App Router page.tsx and layout.tsx files. Used by per-route fixes
 * (canonical, viewport, OG tags, per-page meta description / title).
 *
 * Design choices:
 *   - String/regex-based, NOT AST-based. ts-morph would be cleaner but pulls in
 *     hundreds of MB of TypeScript compiler — too heavy for a serverless function.
 *   - Conservative: if the parent field already exists in the metadata object,
 *     we bail to a manual instruction rather than risk corrupting the user's
 *     existing structure. Better to ask user to merge by hand than to break code.
 *   - Bails on `generateMetadata()` (dynamic) — those need TypeScript-level
 *     understanding we're not attempting.
 */

const APP_DIR_CANDIDATES = ["src/app", "app"];

export interface UrlToPageResult {
  /** Candidate paths to try in order. */
  candidates: string[];
  /** Whether this URL maps to the root layout (path === "/"). */
  isRoot: boolean;
}

/**
 * Map a URL to candidate Next.js App Router file paths.
 * `/` → src/app/page.tsx, app/page.tsx
 * `/about` → src/app/about/page.tsx, app/about/page.tsx
 * `/blog/post-1` → src/app/blog/post-1/page.tsx, app/blog/post-1/page.tsx
 */
export function urlToPageCandidates(pageUrl: string): UrlToPageResult {
  let pathname: string;
  try {
    pathname = new URL(pageUrl).pathname;
  } catch {
    return { candidates: [], isRoot: false };
  }

  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  const isRoot = !trimmed;
  const segment = isRoot ? "" : `/${trimmed}`;

  const candidates: string[] = [];
  for (const dir of APP_DIR_CANDIDATES) {
    candidates.push(`${dir}${segment}/page.tsx`);
    candidates.push(`${dir}${segment}/page.ts`);
    candidates.push(`${dir}${segment}/page.jsx`);
    candidates.push(`${dir}${segment}/page.js`);
  }
  return { candidates, isRoot };
}

/**
 * Path to the root layout. Used for site-wide metadata (viewport, default
 * description / title, default OG tags).
 */
export function rootLayoutCandidates(): string[] {
  const out: string[] = [];
  for (const dir of APP_DIR_CANDIDATES) {
    out.push(`${dir}/layout.tsx`);
    out.push(`${dir}/layout.ts`);
    out.push(`${dir}/layout.jsx`);
    out.push(`${dir}/layout.js`);
  }
  return out;
}

export type InjectMetadataResult =
  | { ok: true; updated: string }
  | { ok: false; reason: "dynamic_metadata" | "parent_exists" | "no_metadata_block_creatable" | "parse_error"; manualInstruction: string };

export interface MetadataField {
  /** Key path. e.g. ["alternates", "canonical"], ["title"], ["openGraph"]. */
  path: string[];
  /** TypeScript literal that becomes the value: '"https://..."', '{ width: "device-width" }', etc. */
  valueLiteral: string;
}

/**
 * Inject a metadata field into a Next.js page.tsx / layout.tsx file.
 *
 * Behavior:
 *  - If `generateMetadata(...)` is present anywhere in the file → bail (dynamic).
 *  - If `export const metadata = { ... }` exists → inject the field inside it.
 *  - If no metadata export exists → create one above the default export.
 *  - If the parent object already exists (e.g. `alternates: { ... }` when
 *    injecting `["alternates","canonical"]`) → bail to manual to avoid
 *    corrupting the user's existing nested config.
 */
export function injectMetadataField(content: string, field: MetadataField): InjectMetadataResult {
  if (/\bgenerateMetadata\s*\(/.test(content)) {
    return {
      ok: false,
      reason: "dynamic_metadata",
      manualInstruction: `This file uses generateMetadata() — Surven can't auto-edit dynamic metadata. Set ${formatPathKey(field.path)} = ${field.valueLiteral} inside the function manually.`,
    };
  }

  const metadataMatch = /export\s+const\s+metadata(?:\s*:\s*Metadata)?\s*=\s*\{/.exec(content);

  if (!metadataMatch) {
    return injectNewMetadataExport(content, field);
  }

  const blockOpenIdx = metadataMatch.index + metadataMatch[0].length - 1; // position of `{`
  const blockCloseIdx = findMatchingBrace(content, blockOpenIdx);
  if (blockCloseIdx === -1) {
    return {
      ok: false,
      reason: "parse_error",
      manualInstruction: `Couldn't find the closing brace of the metadata block. Add ${formatPathKey(field.path)}: ${field.valueLiteral} manually.`,
    };
  }

  const block = content.slice(blockOpenIdx + 1, blockCloseIdx);
  const topLevelKey = field.path[0];

  // Conservative: bail if parent object already exists at top level.
  if (containsTopLevelKey(block, topLevelKey)) {
    return {
      ok: false,
      reason: "parent_exists",
      manualInstruction: `metadata.${topLevelKey} already exists in this file. Merge ${formatNestedPath(field.path.slice(1))} = ${field.valueLiteral} into the existing structure manually.`,
    };
  }

  // Choose indentation by sniffing existing block lines.
  const indent = sniffIndent(block) || "  ";

  const fieldText = formatFullField(field, indent);
  const trailingComma = block.trimEnd().endsWith(",") || block.trim() === "" ? "" : ",";
  const insert = `${trailingComma}\n${indent}${fieldText},\n`;

  const updated = content.slice(0, blockCloseIdx) + insert + content.slice(blockCloseIdx);
  return { ok: true, updated };
}

/**
 * Create a new `export const metadata = { ... }` declaration in a file that
 * doesn't have one yet.
 *
 * Strategy: find the last `import` statement and insert the new metadata
 * export immediately after the import block. If no imports exist, insert at
 * the top of the file. We also add a `import type { Metadata } from "next"` if
 * the file is a .ts/.tsx file and doesn't already import Metadata.
 */
function injectNewMetadataExport(content: string, field: MetadataField): InjectMetadataResult {
  let updated = content;
  const needsMetadataTypeImport =
    !/import\s+(type\s+)?\{[^}]*\bMetadata\b[^}]*\}\s+from\s+["']next["']/.test(updated);

  // Find end of import block.
  const importBlockRegex = /^(?:import[\s\S]*?from\s+["'][^"']+["']\s*;?\s*\n)+/m;
  const importMatch = importBlockRegex.exec(updated);
  let insertAt: number;
  if (importMatch) {
    insertAt = importMatch.index + importMatch[0].length;
  } else {
    insertAt = 0;
  }

  // Add Metadata type import if needed (only if the path is .tsx/.ts — caller decides via filename).
  // We always include it; it's a no-op in .js files because Next strips type imports.
  // Actually: in .js/.jsx, "import type" is invalid. Leave it out and just emit the metadata export untyped.
  const metadataExport = `\nexport const metadata = {\n  ${formatFullField(field, "  ")},\n};\n`;
  const importLine = needsMetadataTypeImport ? `import type { Metadata } from "next";\n` : "";

  // Annotate with Metadata type if we added the import.
  const fullExport = needsMetadataTypeImport
    ? `\nimport type { Metadata } from "next";\nexport const metadata: Metadata = {\n  ${formatFullField(field, "  ")},\n};\n`
    : `\nexport const metadata: Metadata = {\n  ${formatFullField(field, "  ")},\n};\n`;

  updated = updated.slice(0, insertAt) + fullExport + updated.slice(insertAt);

  // Suppress unused-var warnings for the helper variables.
  void metadataExport;
  void importLine;

  return { ok: true, updated };
}

/**
 * Format the field as it should appear inside a metadata object.
 *  - Single-key path: `key: value`
 *  - Multi-key path: `key1: { key2: { ... key_n: value } }`
 */
function formatFullField(field: MetadataField, indent: string): string {
  if (field.path.length === 1) {
    return `${field.path[0]}: ${field.valueLiteral}`;
  }
  // Recursive nested wrapper.
  let inner = field.valueLiteral;
  for (let i = field.path.length - 1; i >= 1; i--) {
    inner = `{\n${indent}${indent}${field.path[i]}: ${inner},\n${indent}}`;
  }
  return `${field.path[0]}: ${inner}`;
}

function formatPathKey(path: string[]): string {
  return path.join(".");
}

function formatNestedPath(rest: string[]): string {
  return rest.join(".");
}

/**
 * Find the matching closing brace, accounting for nested braces and skipping
 * braces that appear inside strings, template literals, regex, and comments.
 */
function findMatchingBrace(content: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  const len = content.length;

  while (i < len) {
    const ch = content[i];

    // Skip line comments
    if (ch === "/" && content[i + 1] === "/") {
      const newlineIdx = content.indexOf("\n", i);
      i = newlineIdx === -1 ? len : newlineIdx + 1;
      continue;
    }
    // Skip block comments
    if (ch === "/" && content[i + 1] === "*") {
      const closeIdx = content.indexOf("*/", i + 2);
      i = closeIdx === -1 ? len : closeIdx + 2;
      continue;
    }
    // Skip strings (double, single, backtick)
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(content, i, ch);
      continue;
    }

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }

    i++;
  }
  return -1;
}

function skipString(content: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < content.length) {
    const c = content[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === quote) return i + 1;
    // Template literal expression interpolation
    if (quote === "`" && c === "$" && content[i + 1] === "{") {
      const closeIdx = findMatchingBrace(content, i + 1);
      i = closeIdx === -1 ? content.length : closeIdx + 1;
      continue;
    }
    i++;
  }
  return content.length;
}

/**
 * Check whether a key like "alternates" appears as a top-level field of the
 * metadata block. We need to avoid false positives from nested objects.
 *
 * Approach: scan the block, tracking brace depth. At depth 0, a `key:` token
 * is a top-level entry.
 */
function containsTopLevelKey(blockContent: string, key: string): boolean {
  const len = blockContent.length;
  let depth = 0;
  let i = 0;
  const keyRegex = new RegExp(`^(?:[\\s,;]*)?(?:["']${escapeForRegex(key)}["']|${escapeForRegex(key)})\\s*:`);

  while (i < len) {
    const ch = blockContent[i];

    if (ch === "/" && blockContent[i + 1] === "/") {
      const nl = blockContent.indexOf("\n", i);
      i = nl === -1 ? len : nl + 1;
      continue;
    }
    if (ch === "/" && blockContent[i + 1] === "*") {
      const close = blockContent.indexOf("*/", i + 2);
      i = close === -1 ? len : close + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(blockContent, i, ch);
      continue;
    }

    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;

    if (depth === 0) {
      const slice = blockContent.slice(i);
      if (keyRegex.test(slice)) return true;
    }

    i++;
  }
  return false;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sniff the indentation used inside the metadata block.
 * Returns "  " (2 spaces) if no clear pattern is found.
 */
function sniffIndent(block: string): string | null {
  const lineMatch = block.match(/\n(\s+)\S/);
  if (lineMatch) return lineMatch[1];
  return null;
}
