/**
 * Idempotency primitives for site editing.
 *
 * Every Surven-authored edit is wrapped in a marker so repeated runs replace
 * (not duplicate) prior edits. Three primitive editors:
 *
 *   - htmlMarker        — wraps blocks of HTML with <!-- surven:marker -->
 *   - frontmatterEditor — sets/removes keys in YAML/TOML frontmatter
 *   - fencedBlockEditor — replaces named fenced blocks in any text file
 */

const HTML_MARKER_PREFIX = "<!-- surven:start ";
const HTML_MARKER_SUFFIX = "<!-- surven:end ";
const HTML_MARKER_CLOSE = " -->";

// ─────────────────────────────────────────────────────
// HTML marker editor
// ─────────────────────────────────────────────────────

export function buildHtmlMarker(name: string, content: string): string {
  const safe = sanitizeMarkerName(name);
  return `${HTML_MARKER_PREFIX}${safe}${HTML_MARKER_CLOSE}\n${content}\n${HTML_MARKER_SUFFIX}${safe}${HTML_MARKER_CLOSE}`;
}

export function findHtmlMarker(html: string, name: string): { start: number; end: number } | null {
  const safe = sanitizeMarkerName(name);
  const startTag = `${HTML_MARKER_PREFIX}${safe}${HTML_MARKER_CLOSE}`;
  const endTag = `${HTML_MARKER_SUFFIX}${safe}${HTML_MARKER_CLOSE}`;
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) return null;
  const endIdx = html.indexOf(endTag, startIdx + startTag.length);
  if (endIdx === -1) return null;
  return { start: startIdx, end: endIdx + endTag.length };
}

/**
 * Insert or replace a Surven-marked block in HTML.
 * If the marker exists, replaces its contents. Otherwise appends to <head> or end of file.
 */
export function upsertHtmlMarker(
  html: string,
  name: string,
  content: string,
  options: { insertInHead?: boolean } = {}
): string {
  const marker = buildHtmlMarker(name, content);
  const found = findHtmlMarker(html, name);
  if (found) {
    return html.slice(0, found.start) + marker + html.slice(found.end);
  }
  if (options.insertInHead) {
    const headCloseIdx = html.search(/<\/head>/i);
    if (headCloseIdx !== -1) {
      return html.slice(0, headCloseIdx) + marker + "\n" + html.slice(headCloseIdx);
    }
  }
  return html + "\n" + marker + "\n";
}

export function removeHtmlMarker(html: string, name: string): string {
  const found = findHtmlMarker(html, name);
  if (!found) return html;
  let out = html.slice(0, found.start) + html.slice(found.end);
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function sanitizeMarkerName(name: string): string {
  if (!/^[a-z0-9_-]+$/i.test(name)) {
    throw new Error(`Invalid marker name '${name}' — use [a-zA-Z0-9_-] only`);
  }
  return name.toLowerCase();
}

// ─────────────────────────────────────────────────────
// Frontmatter editor (YAML or TOML)
// ─────────────────────────────────────────────────────

export type FrontmatterFormat = "yaml" | "toml";

export interface ParsedFrontmatter {
  format: FrontmatterFormat | null;
  raw: string;
  body: string;
  data: Record<string, unknown>;
}

export function parseFrontmatter(text: string): ParsedFrontmatter {
  const yamlMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (yamlMatch) {
    return {
      format: "yaml",
      raw: yamlMatch[1] ?? "",
      body: yamlMatch[2] ?? "",
      data: parseSimpleYaml(yamlMatch[1] ?? ""),
    };
  }
  const tomlMatch = text.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/);
  if (tomlMatch) {
    return {
      format: "toml",
      raw: tomlMatch[1] ?? "",
      body: tomlMatch[2] ?? "",
      data: parseSimpleToml(tomlMatch[1] ?? ""),
    };
  }
  return { format: null, raw: "", body: text, data: {} };
}

/**
 * Set keys in frontmatter. Creates frontmatter block if absent (defaults to YAML).
 * Existing keys are updated; new keys appended; keys set to null are removed.
 */
export function setFrontmatterKeys(
  text: string,
  updates: Record<string, string | number | boolean | null>,
  options: { createFormat?: FrontmatterFormat } = {}
): string {
  const parsed = parseFrontmatter(text);
  const format = parsed.format ?? options.createFormat ?? "yaml";
  const merged: Record<string, unknown> = { ...parsed.data };

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }

  const serialized = format === "yaml" ? serializeYaml(merged) : serializeToml(merged);
  const fence = format === "yaml" ? "---" : "+++";
  const body = parsed.format ? parsed.body : text;
  return `${fence}\n${serialized}${fence}\n${body}`;
}

// Minimal YAML / TOML — only flat string/number/boolean values, sufficient for SEO frontmatter.
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    out[m[1]!] = coerceScalar(stripQuotes(m[2]!.trim()));
  }
  return out;
}

function parseSimpleToml(toml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of toml.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]!] = coerceScalar(stripQuotes(m[2]!.trim()));
  }
  return out;
}

function serializeYaml(data: Record<string, unknown>): string {
  return (
    Object.entries(data)
      .map(([k, v]) => `${k}: ${formatYamlValue(v)}`)
      .join("\n") + "\n"
  );
}

function serializeToml(data: Record<string, unknown>): string {
  return (
    Object.entries(data)
      .map(([k, v]) => `${k} = ${formatTomlValue(v)}`)
      .join("\n") + "\n"
  );
}

function formatYamlValue(v: unknown): string {
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (v == null) return "null";
  const s = String(v);
  return /[:#&*!|>'"\[\]{},%@`]/.test(s) || s.includes("\n") ? JSON.stringify(s) : s;
}

function formatTomlValue(v: unknown): string {
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (v == null) return '""';
  return JSON.stringify(String(v));
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerceScalar(s: string): string | number | boolean {
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

// ─────────────────────────────────────────────────────
// Fenced-block editor (any text file)
// ─────────────────────────────────────────────────────

/**
 * Manages named fenced regions in any text file:
 *
 *   # surven:start name
 *   ...managed content...
 *   # surven:end name
 *
 * Comment style is configurable to match the host file (# for robots.txt,
 * <!-- --> for HTML, // for JS, etc.). For HTML use upsertHtmlMarker instead.
 */

export interface FenceConfig {
  open: string;
  close: string;
}

export const FENCE_HASH: FenceConfig = { open: "# surven:start ", close: "# surven:end " };
export const FENCE_DOUBLE_SLASH: FenceConfig = { open: "// surven:start ", close: "// surven:end " };

export function upsertFencedBlock(
  text: string,
  name: string,
  content: string,
  fence: FenceConfig = FENCE_HASH
): string {
  const safe = sanitizeMarkerName(name);
  const startLine = `${fence.open}${safe}`;
  const endLine = `${fence.close}${safe}`;
  const block = `${startLine}\n${content}\n${endLine}`;

  const startIdx = text.indexOf(startLine);
  if (startIdx === -1) {
    return text.endsWith("\n") ? text + block + "\n" : text + "\n" + block + "\n";
  }
  const endIdx = text.indexOf(endLine, startIdx + startLine.length);
  if (endIdx === -1) {
    return text + "\n" + block + "\n";
  }
  return text.slice(0, startIdx) + block + text.slice(endIdx + endLine.length);
}

export function removeFencedBlock(
  text: string,
  name: string,
  fence: FenceConfig = FENCE_HASH
): string {
  const safe = sanitizeMarkerName(name);
  const startLine = `${fence.open}${safe}`;
  const endLine = `${fence.close}${safe}`;
  const startIdx = text.indexOf(startLine);
  if (startIdx === -1) return text;
  const endIdx = text.indexOf(endLine, startIdx + startLine.length);
  if (endIdx === -1) return text;

  let lineStart = startIdx;
  while (lineStart > 0 && text[lineStart - 1] !== "\n") lineStart--;
  let lineEnd = endIdx + endLine.length;
  if (text[lineEnd] === "\n") lineEnd++;

  return text.slice(0, lineStart) + text.slice(lineEnd);
}
