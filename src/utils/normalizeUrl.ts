/**
 * Normalize a URL for cache lookups and consistent storage.
 * - Lowercases hostname
 * - Removes default ports (:80, :443)
 * - Strips trailing slash from pathname (except root)
 * - Strips query string and hash
 * - Throws on invalid URL
 */
export function normalizeSiteUrl(input: string): string {
  const u = new URL(input.trim());

  u.hostname = u.hostname.toLowerCase();

  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  ) {
    u.port = "";
  }

  u.search = "";
  u.hash = "";

  let pathname = u.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.replace(/\/+$/, "");
  }
  u.pathname = pathname || "/";

  return u.toString();
}

/**
 * Check if a URL is safe to fetch from a server-side scanner.
 * Blocks private IP ranges, loopback, link-local, and non-HTTP protocols.
 * Returns null if safe; otherwise returns a reason string.
 */
export function checkSsrfSafety(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid_url";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "non_http_protocol";
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return "loopback";
  }

  // IPv4 literal check
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
    if (a === 127) return "loopback";
    if (a === 10) return "private_ip";
    if (a === 192 && b === 168) return "private_ip";
    if (a === 172 && b >= 16 && b <= 31) return "private_ip";
    if (a === 169 && b === 254) return "link_local";
    if (a === 0) return "invalid_ip";
  }

  // IPv6 private/loopback rough check (covers fc00::/7, fe80::/10)
  if (hostname.startsWith("[fc") || hostname.startsWith("[fd") || hostname.startsWith("[fe8")) {
    return "private_ip";
  }

  return null;
}
