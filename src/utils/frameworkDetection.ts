/**
 * Framework detection — HTTP probe layer.
 *
 * Given a URL, identify the platform / CMS / framework powering the site.
 * Uses headers, HTML markers, and well-known files. Repo file-tree detection
 * for connected GitHub sites lives in `frameworkDetectionRepo.ts`.
 */

const TIMEOUT_MS = 10_000;
const USER_AGENT = "SurvenAuditor/1.0 (+https://surven.com)";

export type DetectedPlatform =
  | "nextjs"
  | "nuxt"
  | "astro"
  | "sveltekit"
  | "remix"
  | "gatsby"
  | "hugo"
  | "jekyll"
  | "eleventy"
  | "wordpress"
  | "shopify"
  | "webflow"
  | "wix"
  | "squarespace"
  | "ghost"
  | "framer"
  | "unknown";

export type DetectedHost = "vercel" | "netlify" | "cloudflare" | "shopify" | "wpengine" | "kinsta" | "unknown";

export interface DetectionResult {
  platform: DetectedPlatform;
  host: DetectedHost;
  confidence: number;
  signals: string[];
  ssr: boolean | null;
  meta: {
    generator?: string;
    poweredBy?: string;
    server?: string;
    nextVersion?: string;
    wpVersion?: string;
    shopifyShop?: string;
    plugins?: string[];
  };
  probedUrl: string;
}

interface ProbeData {
  url: string;
  status: number;
  headers: Headers;
  html: string;
  reachable: boolean;
}

async function probeUrl(targetUrl: string): Promise<ProbeData> {
  let normalized: URL;
  try {
    normalized = new URL(targetUrl);
  } catch {
    return { url: targetUrl, status: 0, headers: new Headers(), html: "", reachable: false };
  }

  try {
    const res = await fetch(normalized.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = await res.text().catch(() => "");
    return {
      url: res.url,
      status: res.status,
      headers: res.headers,
      html: html.slice(0, 200_000),
      reachable: true,
    };
  } catch {
    return { url: normalized.toString(), status: 0, headers: new Headers(), html: "", reachable: false };
  }
}

function findMeta(html: string, name: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  return html.match(re)?.[1];
}

function findHeader(headers: Headers, name: string): string | undefined {
  return headers.get(name) ?? undefined;
}

export async function detectFromUrl(targetUrl: string): Promise<DetectionResult> {
  const probe = await probeUrl(targetUrl);

  const result: DetectionResult = {
    platform: "unknown",
    host: "unknown",
    confidence: 0,
    signals: [],
    ssr: null,
    meta: {},
    probedUrl: probe.url,
  };

  if (!probe.reachable) {
    result.signals.push("site_unreachable");
    return result;
  }

  const generator = findMeta(probe.html, "generator");
  const poweredBy = findHeader(probe.headers, "x-powered-by");
  const server = findHeader(probe.headers, "server");
  const xVercelId = findHeader(probe.headers, "x-vercel-id");
  const xNfRequestId = findHeader(probe.headers, "x-nf-request-id");
  const cfRay = findHeader(probe.headers, "cf-ray");
  const xShopifyStage = findHeader(probe.headers, "x-shopify-stage");
  const xShopId = findHeader(probe.headers, "x-shopid");
  const xShardId = findHeader(probe.headers, "x-shardid");

  if (generator) result.meta.generator = generator;
  if (poweredBy) result.meta.poweredBy = poweredBy;
  if (server) result.meta.server = server;

  // ── Host detection ──────────────────────────────────
  if (xVercelId) {
    result.host = "vercel";
    result.signals.push("header:x-vercel-id");
  } else if (xNfRequestId) {
    result.host = "netlify";
    result.signals.push("header:x-nf-request-id");
  } else if (xShopifyStage || xShopId || xShardId) {
    result.host = "shopify";
    result.signals.push("header:x-shopify-stage");
  } else if (cfRay) {
    result.host = "cloudflare";
    result.signals.push("header:cf-ray");
  } else if (server?.toLowerCase().includes("wp engine")) {
    result.host = "wpengine";
    result.signals.push("header:server=wp engine");
  }

  // ── Platform detection (ordered by signal strength) ────────────────

  // Shopify — strongest signal first
  if (xShopifyStage || xShopId || xShardId || /cdn\.shopify\.com/i.test(probe.html)) {
    result.platform = "shopify";
    result.confidence = 0.95;
    result.signals.push("shopify_cdn_or_header");
    if (xShopId) result.meta.shopifyShop = xShopId;
    return result;
  }

  // Webflow
  if (
    /<html[^>]+data-wf-(site|page)/i.test(probe.html) ||
    /webflow\.com\/css/i.test(probe.html) ||
    server?.toLowerCase().includes("webflow")
  ) {
    result.platform = "webflow";
    result.confidence = 0.95;
    result.signals.push("webflow_data_attr_or_assets");
    return result;
  }

  // Wix
  if (
    /static\.wixstatic\.com/i.test(probe.html) ||
    /X-Wix-Request-Id/i.test([...probe.headers.keys()].join(","))
  ) {
    result.platform = "wix";
    result.confidence = 0.9;
    result.signals.push("wix_assets_or_header");
    return result;
  }

  // Squarespace
  if (
    /static1\.squarespace\.com/i.test(probe.html) ||
    /squarespace-cdn\.com/i.test(probe.html) ||
    generator?.toLowerCase().includes("squarespace")
  ) {
    result.platform = "squarespace";
    result.confidence = 0.95;
    result.signals.push("squarespace_assets_or_generator");
    return result;
  }

  // Framer
  if (/framerusercontent\.com/i.test(probe.html) || generator?.toLowerCase() === "framer") {
    result.platform = "framer";
    result.confidence = 0.95;
    result.signals.push("framer_assets_or_generator");
    return result;
  }

  // Ghost
  if (generator?.toLowerCase().startsWith("ghost") || /ghost\.org/i.test(generator ?? "")) {
    result.platform = "ghost";
    result.confidence = 0.9;
    result.signals.push("ghost_generator");
    return result;
  }

  // WordPress (covers self-hosted + WP.com)
  if (
    generator?.toLowerCase().includes("wordpress") ||
    /\/wp-content\//i.test(probe.html) ||
    /\/wp-includes\//i.test(probe.html) ||
    /wp-json/i.test(probe.html)
  ) {
    result.platform = "wordpress";
    result.confidence = 0.95;
    result.signals.push("wp_assets_or_generator");
    if (generator) result.meta.wpVersion = generator.match(/wordpress\s+([\d.]+)/i)?.[1];

    const plugins: string[] = [];
    if (/wp-content\/plugins\/wordpress-seo/i.test(probe.html)) plugins.push("yoast");
    if (/wp-content\/plugins\/seo-by-rank-math/i.test(probe.html)) plugins.push("rankmath");
    if (/wp-content\/plugins\/all-in-one-seo-pack/i.test(probe.html)) plugins.push("aioseo");
    if (/wp-content\/plugins\/elementor/i.test(probe.html)) plugins.push("elementor");
    if (/wp-content\/plugins\/woocommerce/i.test(probe.html)) plugins.push("woocommerce");
    if (plugins.length) result.meta.plugins = plugins;
    return result;
  }

  // Next.js — header signals + HTML
  const nextDataPresent = /<script\s+id=["']__NEXT_DATA__["']/i.test(probe.html);
  const nextSelfHostedHeader =
    findHeader(probe.headers, "x-nextjs-cache") ?? findHeader(probe.headers, "x-nextjs-prerender");
  if (nextDataPresent || nextSelfHostedHeader || poweredBy?.toLowerCase() === "next.js") {
    result.platform = "nextjs";
    result.confidence = 0.9;
    result.signals.push(nextDataPresent ? "html:__NEXT_DATA__" : "header:x-nextjs-*");
    result.ssr = nextDataPresent;
    return result;
  }

  // Astro
  if (generator?.toLowerCase().startsWith("astro")) {
    result.platform = "astro";
    result.confidence = 0.9;
    result.signals.push("astro_generator");
    return result;
  }

  // Hugo
  if (generator?.toLowerCase().startsWith("hugo")) {
    result.platform = "hugo";
    result.confidence = 0.9;
    result.signals.push("hugo_generator");
    return result;
  }

  // Jekyll
  if (generator?.toLowerCase().includes("jekyll")) {
    result.platform = "jekyll";
    result.confidence = 0.9;
    result.signals.push("jekyll_generator");
    return result;
  }

  // Eleventy
  if (generator?.toLowerCase().startsWith("eleventy") || generator?.toLowerCase().startsWith("11ty")) {
    result.platform = "eleventy";
    result.confidence = 0.9;
    result.signals.push("eleventy_generator");
    return result;
  }

  // Gatsby
  if (generator?.toLowerCase().startsWith("gatsby") || /\/page-data\/[^"']+\/page-data\.json/.test(probe.html)) {
    result.platform = "gatsby";
    result.confidence = 0.85;
    result.signals.push("gatsby_generator_or_pagedata");
    return result;
  }

  // Nuxt
  if (/<script[^>]+>window\.__NUXT__/i.test(probe.html) || generator?.toLowerCase().startsWith("nuxt")) {
    result.platform = "nuxt";
    result.confidence = 0.9;
    result.signals.push("nuxt_window_object");
    return result;
  }

  // SvelteKit
  if (/<script[^>]+>__sveltekit_/i.test(probe.html)) {
    result.platform = "sveltekit";
    result.confidence = 0.85;
    result.signals.push("sveltekit_window_object");
    return result;
  }

  // Remix
  if (/<script[^>]+>window\.__remixContext/i.test(probe.html)) {
    result.platform = "remix";
    result.confidence = 0.85;
    result.signals.push("remix_window_object");
    return result;
  }

  result.signals.push("no_known_signal");
  return result;
}
