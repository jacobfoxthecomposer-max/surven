# Framework Detection

Before Surven can fix anything, it must know *what* the site is built with. Detection runs in three passes: (1) HTTP-level signals from a single page fetch, (2) repo-level signals from GitHub when the client connects a repo, (3) confirmation crawl across the site to catch hybrid stacks.

## Pass 1 — HTTP-Level Detection (No Auth)

Available before any integration is connected. Used during the "Connect your site" onboarding to *suggest* integration paths.

### Headers
| Header | Indicator |
|--------|-----------|
| `X-Powered-By: Next.js` | Next.js |
| `X-Powered-By: WordPress` | WordPress |
| `X-Powered-By: PHP/...` | PHP backend (often WP) |
| `Server: cloudflare` | Cloudflare CDN (host hint) |
| `X-Vercel-Id` | Vercel host |
| `X-Nf-Request-Id` | Netlify host |
| `CF-Ray` | Cloudflare |
| `X-Shopify-Stage`, `X-Shopid` | Shopify |
| `X-Drupal-Cache` | Drupal |
| `Server: Microsoft-IIS` + ASP.NET headers | .NET site |

### HTML Source
| Pattern | Indicator |
|---------|-----------|
| `<meta name="generator" content="WordPress ...">` | WordPress + version |
| `<meta name="generator" content="Hugo ...">` | Hugo |
| `<meta name="generator" content="Jekyll ...">` | Jekyll |
| `<meta name="generator" content="Astro ...">` | Astro |
| `<meta name="generator" content="Ghost ...">` | Ghost |
| `<script id="__NEXT_DATA__">` | Next.js |
| `window.__NUXT__` | Nuxt |
| `data-sveltekit-preload` | SvelteKit |
| `data-wf-page` / `data-wf-site` | Webflow |
| `cdn.shopify.com` asset URLs | Shopify |
| `static.parastorage.com` / `wixstatic.com` | Wix |
| `static1.squarespace.com` | Squarespace |
| `cdn.contentful.com` in fetch URLs | Contentful (headless) |
| `cdn.sanity.io` | Sanity |
| `_buildManifest.js` path | Next.js Pages Router |
| `/_app/immutable/` | SvelteKit |

### URL Patterns
| Pattern | Indicator |
|---------|-----------|
| `/wp-content/`, `/wp-includes/`, `/wp-json/` | WordPress |
| `/products/` + Shopify CDN | Shopify |
| `*.myshopify.com` | Shopify |
| `*.webflow.io` | Webflow |
| `*.wixsite.com` | Wix |
| `*.squarespace.com` | Squarespace |
| `*.ghost.io` | Ghost |

### REST API Probes (no auth required)
| Probe | Indicator |
|-------|-----------|
| `GET /wp-json` returns 200 with namespaces | WordPress with REST enabled |
| `GET /api/feed.json` returns Ghost JSON | Ghost |
| `GET /products.json` returns array | Shopify (open product feed) |

## Pass 2 — Repo-Level Detection (Post-GitHub-Connect)

Inspect repo file tree (one Contents API call):

| Signal | Confidence | Framework |
|--------|------------|-----------|
| `package.json` has `"next"` | High | Next.js |
| `package.json` has `"nuxt"` | High | Nuxt |
| `package.json` has `"astro"` | High | Astro |
| `package.json` has `"@sveltejs/kit"` | High | SvelteKit |
| `package.json` has `"gatsby"` | High | Gatsby |
| `package.json` has `"@docusaurus/core"` | High | Docusaurus |
| `package.json` has `"hexo"` | High | Hexo |
| `hugo.toml` / `config.toml` + `content/` dir | High | Hugo |
| `_config.yml` + `Gemfile` with `jekyll` | High | Jekyll |
| `.eleventy.js` | High | 11ty |
| `mkdocs.yml` | High | MkDocs |
| `next.config.js` + `app/` dir | High | Next.js App Router |
| `next.config.js` + `pages/` dir only | High | Next.js Pages Router |
| `gatsby-config.js` | High | Gatsby |

Routing flavor for Next.js matters because `generateMetadata` only exists in App Router.

## Pass 3 — Confirmation Crawl

Surven crawls 5-20 representative URLs and confirms detection by sampling source. Catches:
- **Hybrid sites:** WP backend + Next.js frontend (headless WP). Detection is "WordPress + Next.js" — both integrations apply.
- **Multi-CMS:** marketing site on Webflow, blog on Ghost.
- **Subdomains:** main on one stack, app on another.

The confirmation crawl also detects:
- Whether SSR is used (rendered HTML matches "viewable" content) vs CSR (mostly empty `<div id="__next">`).
- Build framework + deploy host — combination determines fix path.

## Output Schema

Detection returns:
```json
{
  "primaryFramework": "next",
  "frameworkVersion": "14.2",
  "router": "app",
  "cms": null,
  "ecommerce": null,
  "host": "vercel",
  "headlessSources": [],
  "rendering": "ssg",
  "confidence": 0.95,
  "signals": ["package.json:next@14.2", "header:x-vercel-id", "html:__NEXT_DATA__"],
  "integrationPaths": ["github"],
  "limitations": []
}
```

For a complex hybrid:
```json
{
  "primaryFramework": "next",
  "cms": "wordpress",
  "host": "vercel",
  "headlessSources": [{ "type": "wordpress", "url": "https://cms.example.com" }],
  "rendering": "isr",
  "integrationPaths": ["github", "wordpress"],
  "limitations": ["wordpress detected at separate host; client must connect both"]
}
```

## Detection Library

Surven could lean on Wappalyzer's open-source pattern set (now MIT/community-maintained after the original repo was archived) for breadth, but maintain its own opinionated patterns for the platforms Surven actually supports. The `wappalyzer` npm package is no longer maintained; community forks like `wappalyzer-core` continue. Alternative: BuiltWith API (paid, broad).

Recommendation: ship Surven's own ~50-pattern detector for the supported platforms, fall back to a community Wappalyzer fork only for "unsupported but interesting" telemetry.

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Single-page app with empty initial HTML | Render with headless Chrome to detect runtime |
| Site behind authentication/Cloudflare challenge | Ask user to disable challenge for Surven's IP, or retry with pre-rendered preview URL |
| Custom CMS / proprietary stack | Mark as "manual instructions only" tier |
| Generator meta stripped for security | Fall back to file-tree + asset URL heuristics |

## Multi-Tenant Persistence

Detection results stored per-site in `surven_site_detection` Supabase table. Re-run on demand or weekly. Trigger fresh detection if framework signals change (new headers, new HTML patterns).

Cross-references: every integration file uses these heuristics; this is the routing-table for the engine.
