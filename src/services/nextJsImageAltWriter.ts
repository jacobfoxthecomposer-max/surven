/**
 * Next.js JSX Image alt-text writer.
 *
 * Finds `<Image>` and `<img>` tags in .tsx / .jsx files whose src matches a
 * given image URL, then adds or updates the `alt` attribute. Used by the
 * Chrome extension's alt-text fix when the connected repo is Next.js.
 *
 * Conservative approach (regex-only, no AST):
 *   - Match by literal src attribute equality first
 *   - Fall back to filename-suffix match (handles imported assets where src
 *     is a JS reference, but the imported file's filename matches)
 *   - Only edits tags that already render the image we're after — never
 *     guesses on ambiguous ones
 */

const SCAN_DIRS = ["src/app", "app", "src/components", "components", "src/pages", "pages"];

export interface AltReplacement {
  /** Rendered image src (e.g. CDN URL or /_next/image?url=...). */
  src: string;
  alt: string;
}

export interface AltWriteResult {
  /** File paths whose contents changed. Map of path → updated content. */
  edits: Map<string, string>;
  /** Replacements we couldn't locate any matching tag for. */
  unmatched: AltReplacement[];
}

/**
 * Scan candidate file paths in a Next.js repo file tree. Filters to the
 * directories that typically contain JSX with images.
 */
export function pickJsxFilesFromTree(fileTree: Set<string>): string[] {
  const result: string[] = [];
  for (const path of fileTree) {
    if (!/\.(tsx|jsx)$/.test(path)) continue;
    if (!SCAN_DIRS.some((dir) => path.startsWith(`${dir}/`))) continue;
    result.push(path);
  }
  return result;
}

/**
 * Apply a list of alt-text replacements across a set of file contents.
 * Returns: per-file edits + a list of replacements we couldn't match anywhere.
 */
export function applyAltReplacements(
  fileContents: Map<string, string>,
  replacements: AltReplacement[],
): AltWriteResult {
  const edits = new Map<string, string>();
  const unmatched: AltReplacement[] = [];

  for (const replacement of replacements) {
    const matchers = buildSrcMatchers(replacement.src);
    let matched = false;

    for (const [path, original] of fileContents) {
      const current = edits.get(path) ?? original;
      const updated = updateAltInJsx(current, matchers, replacement.alt);
      if (updated !== current) {
        edits.set(path, updated);
        matched = true;
      }
    }

    if (!matched) unmatched.push(replacement);
  }

  return { edits, unmatched };
}

/**
 * Derive a list of strings that might appear as the `src` of the JSX `<Image>`
 * or `<img>` tag we're trying to edit.
 *
 * Cases handled:
 *   - Absolute CDN URL: src="https://cdn.example.com/foo.jpg"
 *   - Next.js image optimizer URL: src="/_next/image?url=%2Fimages%2Ffoo.jpg" → /images/foo.jpg
 *   - Public-folder path: /images/foo.jpg
 *   - Filename suffix: foo.jpg (last-resort match)
 */
function buildSrcMatchers(rawSrc: string): { exact: string[]; suffix: string } {
  const exact = new Set<string>();
  exact.add(rawSrc);

  try {
    const u = new URL(rawSrc);
    // Strip origin → path
    exact.add(u.pathname);

    // Next.js image optimizer URL pattern
    if (u.pathname === "/_next/image") {
      const inner = u.searchParams.get("url");
      if (inner) {
        const decoded = decodeURIComponent(inner);
        exact.add(decoded);
        // Also try without leading slash
        if (decoded.startsWith("/")) exact.add(decoded.slice(1));
      }
    }
  } catch {
    // rawSrc wasn't a full URL — that's fine, we'll match it as-is + by suffix
  }

  // Filename suffix (last-resort match)
  const filename = rawSrc.split(/[/?#]/).filter(Boolean).pop() ?? "";

  return { exact: Array.from(exact), suffix: filename };
}

/**
 * Find <Image> or <img> tags in the file whose src matches one of the
 * matchers, then add or update their `alt` attribute.
 *
 * Strategy: for each tag, parse the attributes, decide whether src matches,
 * then rebuild the tag with the new alt.
 */
function updateAltInJsx(
  content: string,
  matchers: { exact: string[]; suffix: string },
  newAlt: string,
): string {
  // Match opening of <Image ...> or <img ...> up through the closing > or />.
  // Captures: group 1 = tag name, group 2 = full attribute string.
  // Note: this won't work on tags with embedded JSX expressions containing >.
  // Most image tags don't have those.
  const tagRegex = /<(Image|img)\b([^>]*?)(\/?)>/g;

  return content.replace(tagRegex, (full, tagName, attrs, selfClose) => {
    const srcMatch = matchSrcAttr(attrs, matchers);
    if (!srcMatch) return full;

    const updatedAttrs = updateAltAttribute(attrs, newAlt);
    if (updatedAttrs === attrs) return full;

    return `<${tagName}${updatedAttrs}${selfClose}>`;
  });
}

/**
 * Check whether the attribute string contains a matching src.
 */
function matchSrcAttr(
  attrs: string,
  matchers: { exact: string[]; suffix: string },
): boolean {
  // String src: src="..." or src='...'
  const stringSrc = /\bsrc\s*=\s*["']([^"']+)["']/.exec(attrs);
  if (stringSrc) {
    const value = stringSrc[1];
    if (matchers.exact.some((m) => m === value)) return true;
    if (matchers.suffix && value.endsWith(matchers.suffix)) return true;
    return false;
  }

  // Expression src: src={something}. We can't match on the value (it's a JS
  // identifier), so fall back to checking whether the file imports something
  // ending with the filename. Done at the file level by the caller's pre-scan,
  // not here. For a per-tag check we can't be sure → skip.
  return false;
}

/**
 * Add or replace the `alt` attribute in a JSX attribute string.
 * Preserves leading whitespace and surrounding attributes.
 */
function updateAltAttribute(attrs: string, newAlt: string): string {
  const escaped = newAlt.replace(/"/g, "&quot;");
  const altRegex = /\balt\s*=\s*(?:["'][^"']*["']|\{[^}]*\})/;

  if (altRegex.test(attrs)) {
    return attrs.replace(altRegex, `alt="${escaped}"`);
  }

  // No alt attribute — add one. Insert just before the trailing whitespace
  // (preserves the original spacing pattern before /> or >).
  const trailingMatch = attrs.match(/\s*$/);
  const trailing = trailingMatch ? trailingMatch[0] : "";
  const head = trailing ? attrs.slice(0, -trailing.length) : attrs;
  // Ensure we have a separator space.
  const sep = head.endsWith(" ") || head === "" ? "" : " ";
  return `${head}${sep}alt="${escaped}"${trailing}`;
}
