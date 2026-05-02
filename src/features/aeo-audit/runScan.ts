// AEO scan orchestrator. Fetches the target URL + well-known files in
// parallel, parses HTML once, runs every check, aggregates pillar scores,
// returns a single ScanResult.

import * as cheerio from "cheerio";
import { ALL_CHECKS, type ScanContext } from "./checks";
import {
  type Pillar,
  type PillarScore,
  type ScanResult,
  pillarGrade,
} from "./types";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB cap on HTML body

interface FetchedText {
  ok: boolean;
  status: number;
  text: string;
  headers: Headers;
}

async function fetchText(url: string): Promise<FetchedText> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        // Identify ourselves clearly. Several CDNs reject opaque UAs.
        "user-agent":
          "SurvenAEOBot/1.0 (+https://surven.ai/about/audit-bot)",
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const buf = await res.arrayBuffer();
    const sliced = buf.byteLength > MAX_BODY_BYTES ? buf.slice(0, MAX_BODY_BYTES) : buf;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(sliced);
    return { ok: res.ok, status: res.status, text, headers: res.headers };
  } catch {
    return { ok: false, status: 0, text: "", headers: new Headers() };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHead(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "user-agent": "SurvenAEOBot/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeUrl(input: string): string {
  let s = input.trim();
  if (!s) throw new Error("URL is required.");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  // Strip fragment, default port.
  u.hash = "";
  return u.toString();
}

export async function runScan(rawUrl: string): Promise<ScanResult> {
  const startedAt = Date.now();
  const url = normalizeUrl(rawUrl);
  const u = new URL(url);
  const origin = u.origin;

  // Fire all fetches in parallel.
  const [page, robots, sitemap, llms, ai, faviconHead] = await Promise.all([
    fetchText(url),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/sitemap.xml`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/ai.txt`),
    fetchHead(`${origin}/favicon.ico`),
  ]);

  if (!page.ok || !page.text) {
    return {
      url,
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      score: 0,
      pillars: [],
      checks: [],
      error:
        page.status === 0
          ? "Could not reach the site (timeout or DNS failure)."
          : `Site responded with HTTP ${page.status}.`,
    };
  }

  const $ = cheerio.load(page.text);

  // <link rel="icon"> counts as a favicon even if /favicon.ico HEAD failed.
  const hasFaviconLink =
    $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;

  const ctx: ScanContext = {
    url,
    origin,
    host: u.host,
    status: page.status,
    headers: page.headers,
    html: page.text,
    $,
    robotsTxt: robots.ok ? robots.text : null,
    sitemapXml: sitemap.ok ? sitemap.text : null,
    llmsTxt: llms.ok ? llms.text : null,
    aiTxt: ai.ok ? ai.text : null,
    hasFavicon: faviconHead || hasFaviconLink,
  };

  const checks = ALL_CHECKS.map((c) => c(ctx));

  // Aggregate pillar scores.
  const pillars: Pillar[] = ["discoverable", "structured", "quotable", "trustworthy"];
  const pillarScores: PillarScore[] = pillars.map((p) => {
    const rows = checks.filter((c) => c.pillar === p);
    const earned = rows.reduce((s, r) => s + r.earned, 0);
    const max = rows.reduce((s, r) => s + r.max, 0);
    return {
      pillar: p,
      earned: Math.round(earned * 10) / 10,
      max,
      grade: pillarGrade(earned, max),
    };
  });

  const totalEarned = pillarScores.reduce((s, p) => s + p.earned, 0);
  const totalMax = pillarScores.reduce((s, p) => s + p.max, 0);
  const score = totalMax === 0 ? 0 : Math.round((totalEarned / totalMax) * 100);

  return {
    url,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    score,
    pillars: pillarScores,
    checks,
  };
}
