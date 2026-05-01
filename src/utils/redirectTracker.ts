import { checkSsrfSafety } from "./normalizeUrl";
import type { RedirectChain } from "@/types/crawlability";

const USER_AGENT = "SurvenBot/1.0 (+https://surven.ai)";
const HOP_TIMEOUT_MS = 6_000;
const DEFAULT_MAX_HOPS = 10;

/**
 * Manually follow redirects to detect chains.
 * Uses fetch with redirect: "manual" so each Location header can be inspected.
 * Each hop is SSRF-checked before being followed.
 */
export async function trackRedirects(
  startUrl: string,
  maxHops = DEFAULT_MAX_HOPS
): Promise<RedirectChain> {
  const chain: { url: string; status: number }[] = [];
  const visited = new Set<string>();
  let current = startUrl;
  let loop = false;

  for (let hop = 0; hop < maxHops; hop++) {
    if (visited.has(current)) {
      loop = true;
      break;
    }
    visited.add(current);

    if (checkSsrfSafety(current)) {
      // SSRF block — record and stop
      chain.push({ url: current, status: 0 });
      break;
    }

    let res: Response;
    try {
      res = await fetch(current, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
        redirect: "manual",
        signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
      });
    } catch {
      chain.push({ url: current, status: 0 });
      break;
    }

    chain.push({ url: current, status: res.status });

    if (res.status < 300 || res.status >= 400) break;

    const loc = res.headers.get("location");
    if (!loc) break;

    try {
      current = new URL(loc, current).href;
    } catch {
      break;
    }
  }

  return {
    startUrl,
    chain,
    finalUrl: chain[chain.length - 1]?.url ?? startUrl,
    hops: Math.max(0, chain.length - 1),
    loop,
  };
}
