# Surven Site-Editing Engine — Research Index

This directory contains the research backing Surven's "close the loop" capability: detect → fix → re-measure. The Chrome extension already diagnoses issues, the Crawlability Audit already crawls. The Site-Editing Engine is the final piece — it actually writes the fix back to the client's site (PR, REST API, or webhook).

## The Core Bet

No GEO competitor today (Frase, Surfer, AthenaHQ, Profound, Conductor, BrightEdge) ships PR-based or API-based site fixes. They all stop at "here is your audit." Surven shipping a working site-editing engine is a category-defining moat — provided we get safety, idempotency, and rollback right.

## File Index

| # | File | Purpose |
|---|------|---------|
| 0 | `README.md` | This file |
| 1 | `01-tier1-safe-fixes.md` | Fixes 1–25 (head/meta/schema/crawl/images) |
| 2 | `02-tier2-reviewable-fixes.md` | Fixes 26–41 (content rewrites/linking/freshness) |
| 3 | `03-tier3-high-touch.md` | Fixes 42–49 (net-new pages) |
| 4 | `04-tier4-framework-specific.md` | Fixes 50–69 (framework-bound) |
| 5 | `05-github-integration.md` | GitHub App architecture |
| 6 | `06-wordpress-integration.md` | WP REST + Yoast/RankMath/ACF |
| 7 | `07-shopify-integration.md` | Shopify Admin API + theme assets |
| 8 | `08-webflow-integration.md` | Webflow API v2 + CMS limits |
| 9 | `09-static-site-integration.md` | Hugo / Jekyll / 11ty / Astro via Git |
| 10 | `10-headless-cms-integration.md` | Contentful / Sanity / Strapi / Ghost |
| 11 | `11-host-platform-integration.md` | Vercel / Netlify / Cloudflare |
| 12 | `12-framework-detection.md` | Detect platform from URL/repo |
| 13 | `13-pr-workflow-and-ux.md` | Branches, diffs, auto-merge |
| 14 | `14-safety-and-rollback.md` | Idempotency, rollback, audit log |
| 15 | `15-permissions-and-security.md` | Scopes, secrets, multi-tenancy |
| 16 | `16-re-measurement-loop.md` | Fix → wait → re-scan → report lift |
| 17 | `EDITABLE-MATRIX.md` | 69 fixes × every platform — the headline reference |
| 18 | `BUILD-ROADMAP.md` | Phased build order |

## Recommended Build Order (one-paragraph version)

GitHub App first (Phase 1) — it covers the largest editable surface (all custom-coded sites: Next.js, Astro, Hugo, Jekyll, Gatsby, SvelteKit, Nuxt, MDX-blog, etc.) and PR review is the cleanest possible UX for "are you sure?" Ship Tier-1 fixes only at first (head tags, schema, llms.txt, robots, sitemap, alt text). Then WordPress (Phase 2) because it is the largest single CMS by market share and the REST API + Application Passwords path is well-trodden. Then Shopify (Phase 3) because GEO-for-ecommerce is an underserved vertical and Shopify's Admin API is mature. Webflow + headless CMSs (Phase 4) round it out. Squarespace and Wix are deferred to manual instructions / paste-in snippets because their APIs do not expose enough surface to do this safely.

## Cross-Cutting Principles

1. **Idempotency over uniqueness** — every change Surven writes is wrapped in an HTML comment marker (`<!-- surven:fix=meta-description v=2 -->`) or has a deterministic ID (`<script type="application/ld+json" id="surven-organization">`) so re-running the fixer is a no-op when the desired state is already present.
2. **Reversibility over correctness** — every change is one PR revert or one API call away from undo. We always store the prior value before writing.
3. **Diff-first UX** — clients never approve text descriptions of changes; they approve actual diffs (or visual before/after for visible changes).
4. **Minimum-privilege scopes** — request the smallest GitHub App / WP capability / Shopify scope that gets the job done. A scope leak is a brand-killer for an agency tool.
5. **Re-measure or it didn't ship** — every merged fix triggers a re-scan within 48 hours. The dashboard shows lift, not just "PR merged."

## How These Files Were Built

Research was done across the GitHub Apps docs, Octokit, WordPress REST + Application Passwords spec, Shopify Admin GraphQL 2026-04, Webflow Data API v2 (post July 2025 publishing changes), Wix headless docs, Contentful/Sanity/Strapi/Ghost APIs, Vercel/Netlify/Cloudflare deploy hooks, llmstxt.org, schema.org, Yoast & RankMath REST endpoints, and competitive analysis of Frase / Surfer / Athena / Profound / Conductor / BrightEdge. Where a platform's documentation diverges from its real-world behavior (Yoast read-only API, Webflow's mid-2025 publishing-rate changes), the docs called it out and recommended the workaround.
