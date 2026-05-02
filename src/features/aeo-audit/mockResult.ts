// Realistic mock ScanResult used as the demo / preview state on the
// Site Readability Audit page. Mirrors the shape and check IDs returned
// by the real /api/aeo-scan endpoint so the UI renders identically.

import { CHECK_EFFORT_MIN, READABILITY_IMPACT } from "./checks";
import type { CheckResult, ScanResult } from "./types";

export function buildMockScanResult(displayUrl = "thecurbskateshop.com"): ScanResult {
  const rawChecks: Omit<CheckResult, "readabilityImpact" | "effortMin">[] = [
    // ── Discoverable ──────────────────────────────────────────────
    {
      id: "https",
      pillar: "discoverable",
      label: "HTTPS reachable",
      status: "pass",
      earned: 6,
      max: 6,
      detail: "Site responded 200 over HTTPS.",
      recommendation: "",
    },
    {
      id: "robots-txt",
      pillar: "discoverable",
      label: "robots.txt present",
      status: "pass",
      earned: 5,
      max: 5,
      detail: "Found at https://thecurbskateshop.com/robots.txt (412 bytes).",
      recommendation: "",
    },
    {
      id: "sitemap",
      pillar: "discoverable",
      label: "sitemap.xml present",
      status: "partial",
      earned: 2.5,
      max: 5,
      detail:
        "No /sitemap.xml at root, but a Sitemap directive was found in robots.txt.",
      recommendation:
        "Add a sitemap directly at /sitemap.xml so AI crawlers and search engines can discover it.",
    },
    {
      id: "canonical",
      pillar: "discoverable",
      label: "Canonical URL set",
      status: "pass",
      earned: 4,
      max: 4,
      detail:
        '<link rel="canonical"> points to https://thecurbskateshop.com/.',
      recommendation: "",
    },
    {
      id: "ai-bots",
      pillar: "discoverable",
      label: "AI crawlers allowed",
      status: "fail",
      earned: 0,
      max: 4,
      detail: "Robots.txt blocks: GPTBot, ClaudeBot.",
      recommendation:
        "Remove 'Disallow: /' rules for GPTBot, ClaudeBot so they can read your site.",
    },
    {
      id: "robots-meta",
      pillar: "discoverable",
      label: "Page is indexable",
      status: "pass",
      earned: 3,
      max: 3,
      detail: "No noindex directive — page is open to indexing.",
      recommendation: "",
    },

    // ── Structured ────────────────────────────────────────────────
    {
      id: "title",
      pillar: "structured",
      label: "Title tag",
      status: "pass",
      earned: 4,
      max: 4,
      detail:
        'Title is 48 chars: "The Curb Skateshop — Skate Gear in Austin, TX".',
      recommendation: "",
    },
    {
      id: "meta-description",
      pillar: "structured",
      label: "Meta description",
      status: "partial",
      earned: 2,
      max: 4,
      detail: "Description is only 38 chars — too short.",
      recommendation: "Expand to 50–160 characters.",
    },
    {
      id: "h1",
      pillar: "structured",
      label: "Single H1",
      status: "pass",
      earned: 3,
      max: 3,
      detail: 'Single H1 found, 22 chars: "Welcome to The Curb".',
      recommendation: "",
    },
    {
      id: "heading-hierarchy",
      pillar: "structured",
      label: "Heading hierarchy",
      status: "partial",
      earned: 1.5,
      max: 3,
      detail: "Found 2 skipped heading levels (e.g. H1 → H3).",
      recommendation: "Don't skip heading levels — go H1 → H2 → H3 in order.",
    },
    {
      id: "open-graph",
      pillar: "structured",
      label: "Open Graph tags",
      status: "partial",
      earned: 1.5,
      max: 3,
      detail: "2 of 4 OG tags present (og:title, og:image).",
      recommendation: "Add the missing OG tags: og:description, og:url.",
    },
    {
      id: "twitter-card",
      pillar: "structured",
      label: "Twitter Card",
      status: "fail",
      earned: 0,
      max: 2,
      detail: "No twitter:card meta tag found.",
      recommendation:
        'Add <meta name="twitter:card" content="summary_large_image"> for richer link previews.',
    },
    {
      id: "html-lang",
      pillar: "structured",
      label: "<html lang> set",
      status: "pass",
      earned: 2,
      max: 2,
      detail: '<html lang="en"> is set.',
      recommendation: "",
    },
    {
      id: "viewport",
      pillar: "structured",
      label: "Viewport meta tag",
      status: "pass",
      earned: 2,
      max: 2,
      detail: '<meta name="viewport" content="width=device-width, initial-scale=1">.',
      recommendation: "",
    },
    {
      id: "json-ld",
      pillar: "structured",
      label: "JSON-LD schema",
      status: "fail",
      earned: 0,
      max: 4,
      detail: "No JSON-LD <script> blocks were found.",
      recommendation:
        "Add at least one JSON-LD block. Start with Organization on your homepage.",
    },
    {
      id: "schema-coverage",
      pillar: "structured",
      label: "Schema type coverage",
      status: "fail",
      earned: 0,
      max: 3,
      detail:
        "No high-value schema types (Organization, WebSite, Article, etc.) detected.",
      recommendation:
        "Add Organization and WebSite schema sitewide; add page-specific types where relevant.",
    },
    {
      id: "alt-text",
      pillar: "structured",
      label: "Image alt text",
      status: "partial",
      earned: 1,
      max: 2,
      detail: "Only 14 of 23 images have alt text (61%).",
      recommendation:
        'Add alt text to all meaningful images; leave alt="" for purely decorative ones.',
    },

    // ── Quotable ──────────────────────────────────────────────────
    {
      id: "body-content",
      pillar: "quotable",
      label: "Substantial body content",
      status: "partial",
      earned: 3,
      max: 6,
      detail: "Only 187 words of body text — AI tools struggle to quote sparse pages.",
      recommendation: "Aim for at least 300 words of substantive body content.",
    },
    {
      id: "freshness",
      pillar: "quotable",
      label: "Freshness signals",
      status: "fail",
      earned: 0,
      max: 5,
      detail:
        "No freshness signal found (no dateModified, no Last-Modified header, no sitemap lastmod).",
      recommendation:
        "Add a dateModified field to your JSON-LD schema so AI knows the content is current.",
    },
    {
      id: "faq",
      pillar: "quotable",
      label: "FAQ-style content",
      status: "fail",
      earned: 0,
      max: 4,
      detail: "No FAQPage schema and no question-style headings found.",
      recommendation: "Add a FAQ section with H2/H3 questions and FAQPage schema.",
    },

    // ── Trustworthy ───────────────────────────────────────────────
    {
      id: "internal-links",
      pillar: "trustworthy",
      label: "Internal links",
      status: "pass",
      earned: 3,
      max: 3,
      detail: "8 contextual internal links in body.",
      recommendation: "",
    },
    {
      id: "external-links",
      pillar: "trustworthy",
      label: "External citation links",
      status: "fail",
      earned: 0,
      max: 4,
      detail: "No outbound citation links found in body content.",
      recommendation:
        "Link out to credible sources (research, official docs, reputable publications).",
    },
    {
      id: "llms-txt",
      pillar: "trustworthy",
      label: "llms.txt present",
      status: "fail",
      earned: 0,
      max: 4,
      detail: "No /llms.txt file found at the site root.",
      recommendation:
        "Create a /llms.txt file describing your site for AI systems (similar to robots.txt for LLMs).",
    },
    {
      id: "ai-txt",
      pillar: "trustworthy",
      label: "ai.txt present (bonus)",
      status: "partial",
      earned: 0,
      max: 2,
      detail: "No /ai.txt file at the site root.",
      recommendation:
        "Optional: add an /ai.txt file declaring AI training/use policies.",
    },
    {
      id: "favicon",
      pillar: "trustworthy",
      label: "Favicon present",
      status: "pass",
      earned: 2,
      max: 2,
      detail: "Favicon detected (link tag or /favicon.ico).",
      recommendation: "",
    },
  ];

  const checks: CheckResult[] = rawChecks.map((c) => ({
    ...c,
    readabilityImpact: READABILITY_IMPACT[c.id] || "",
    effortMin: CHECK_EFFORT_MIN[c.id] ?? 15,
  }));

  const pillars = (["discoverable", "structured", "quotable", "trustworthy"] as const).map((p) => {
    const rows = checks.filter((c) => c.pillar === p);
    const earned = rows.reduce((s, r) => s + r.earned, 0);
    const max = rows.reduce((s, r) => s + r.max, 0);
    const pct = earned / max;
    const grade = pct >= 0.75 ? "good" : pct >= 0.45 ? "average" : "poor";
    return {
      pillar: p,
      earned: Math.round(earned * 10) / 10,
      max,
      grade: grade as "good" | "average" | "poor",
    };
  });

  const totalEarned = pillars.reduce((s, p) => s + p.earned, 0);
  const totalMax = pillars.reduce((s, p) => s + p.max, 0);
  const score = Math.round((totalEarned / totalMax) * 100);

  return {
    url: `https://${displayUrl}`,
    scannedAt: new Date().toISOString(),
    durationMs: 1340,
    score,
    pillars,
    checks,
  };
}
