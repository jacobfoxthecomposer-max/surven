# Editable Matrix — 69 Fixes × Every Connection Method

The headline answer to "what can Surven actually edit per platform."

Legend:
- `Y` = fully supported
- `P` = partial / with workaround
- `N` = not supported via API
- `M` = manual instructions only (paste-in snippet)
- `–` = not applicable

| # | Fix | GitHub (any code) | WordPress | Shopify | Webflow | Wix | Squarespace | Contentful | Sanity | Strapi | Ghost |
|---|-----|---|---|---|---|---|---|---|---|---|---|
| **HEAD / METADATA** | | | | | | | | | | | |
| 1 | `<title>` | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 2 | Meta description | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 3 | OpenGraph tags | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 4 | Twitter cards | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 5 | Canonical URL | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 6 | Hreflang | Y | Y | P | P | N | M | Y | Y | P | P |
| 7 | Author + EEAT meta | Y | Y | Y | P | N | M | Y | Y | Y | Y |
| **SCHEMA / JSON-LD** | | | | | | | | | | | |
| 8 | LocalBusiness schema | Y | Y | Y | Y (custom code) | M | M | Y | Y | Y | Y (code injection) |
| 9 | Organization schema | Y | Y | Y | Y | M | M | Y | Y | Y | Y |
| 10 | Product schema | Y | Y | Y (auto+enrich) | Y | – | – | Y | Y | Y | – |
| 11 | FAQ schema | Y | Y | Y | Y | M | M | Y | Y | Y | Y |
| 12 | HowTo schema | Y | Y | Y | Y | M | M | Y | Y | Y | Y |
| 13 | Article schema | Y | Y | Y | Y | M | M | Y | Y | Y | Y |
| 14 | Breadcrumb schema | Y | Y | Y | Y | M | M | Y | Y | Y | Y |
| 15 | Review/Rating schema | Y | P | Y | Y | M | M | Y | Y | Y | P |
| 16 | Person schema | Y | Y | Y | Y | M | M | Y | Y | Y | Y |
| **CRAWLABILITY FILES** | | | | | | | | | | | |
| 17 | llms.txt | Y | Y (plugin) | P (theme route) | P (subdomain workaround) | N | N | – | – | – | P |
| 18 | llms-full.txt | Y | Y (plugin) | P | P | N | N | – | – | – | P |
| 19 | robots.txt updates | Y | Y (plugin) | Y | Y | N | N | – | – | – | Y |
| 20 | sitemap.xml | Y | Y (plugin) | Y (auto) | Y (auto) | Y (auto) | Y (auto) | – | – | – | Y (auto) |
| 21 | humans.txt | Y | P | P | P | N | N | – | – | – | P |
| **IMAGES** | | | | | | | | | | | |
| 22 | Alt text (AI-generated) | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 23 | Image filename rewrites | Y | Y | P | P | N | N | P | P | P | P |
| 24 | loading="lazy" | Y | P (filter) | Y (theme) | P | N | N | – | – | – | P |
| 25 | width/height attrs | Y | P (filter) | Y | P | N | N | – | – | – | P |
| **CONTENT REWRITES** | | | | | | | | | | | |
| 26 | Answer-capsule rewrites | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 27 | Heading hierarchy fixes | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 28 | FAQ block insertion | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 29 | Paragraph restructure | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 30 | List conversion | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 31 | Table of contents | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 32 | Definition blocks | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 33 | Author byline | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| **INTERNAL LINKING** | | | | | | | | | | | |
| 34 | Add internal links | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 35 | Anchor links | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 36 | Related sections | Y | Y | Y | Y (CMS only) | N | N | Y | Y | Y | Y |
| 37 | Broken link fixes | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| **FRESHNESS** | | | | | | | | | | | |
| 38 | Last-modified updates | Y | Y | Y | Y | P | N | Y | Y | Y | Y |
| 39 | "Updated" badges | Y | Y | Y | Y | P | N | Y | Y | Y | Y |
| 40 | Refresh stale stats | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 41 | Publication date schema | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| **HIGH-TOUCH (TIER 3)** | | | | | | | | | | | |
| 42 | Net-new answer pages | Y | Y | Y | Y (CMS template) | P | M | Y | Y | Y | Y |
| 43 | Net-new FAQ pages | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 44 | Comparison pages | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 45 | Location/service combos | Y | Y | Y | Y (CMS) | P | M | Y | Y | Y | Y |
| 46 | Topic cluster expansion | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| 47 | Product description rewrites | – | P (Woo) | Y | – | – | – | – | – | – | – |
| 48 | Category page intros | – | P (Woo) | Y | Y (CMS) | – | – | – | – | – | – |
| 49 | About-page EEAT | Y | Y | Y | Y | P | M | Y | Y | Y | Y |
| **FRAMEWORK-SPECIFIC** | | | | | | | | | | | |
| 50 | Next.js generateMetadata | Y | – | – | – | – | – | – | – | – | – |
| 51 | `<Head>` edits | Y | – | – | – | – | – | – | – | – | – |
| 52 | MDX frontmatter | Y | – | – | – | – | – | – | – | – | – |
| 53 | next-seo config | Y | – | – | – | – | – | – | – | – | – |
| 54 | Middleware redirects | Y | P (htaccess) | Y (URL redirects) | Y | N | N | – | – | – | – |
| 55 | next-sitemap config | Y | – | – | – | – | – | – | – | – | – |
| 56 | Yoast/RankMath fields | – | Y | – | – | – | – | – | – | – | – |
| 57 | ACF custom fields | – | Y | – | – | – | – | – | – | – | – |
| 58 | Post content w/ revisions | – | Y | – | – | – | – | – | – | – | – |
| 59 | Page template assignment | – | Y | – | – | – | – | – | – | – | – |
| 60 | Shopify product metafields | – | – | Y | – | – | – | – | – | – | – |
| 61 | Collection descriptions | – | – | Y | – | – | – | – | – | – | – |
| 62 | Theme.liquid head injection | – | – | Y | – | – | – | – | – | – | – |
| 63 | Shopify robots.txt | – | – | Y | – | – | – | – | – | – | – |
| 64 | Webflow CMS field updates | – | – | – | Y | – | – | – | – | – | – |
| 65 | Webflow page meta | – | – | – | Y | – | – | – | – | – | – |
| 66 | Webflow custom code | – | – | – | Y | – | – | – | – | – | – |
| 67 | Static site frontmatter | Y | – | – | – | – | – | – | – | – | – |
| 68 | Static site layouts | Y | – | – | – | – | – | – | – | – | – |
| 69 | Static site data files | Y | – | – | – | – | – | – | – | – | – |

## Coverage Summary

| Platform | Y count | P count | M count | N count | Coverage % (Y+P) |
|----------|---------|---------|---------|---------|-----------------|
| GitHub (any code) | 56 | 0 | 0 | 0 | 100% of applicable |
| WordPress | 38 | 7 | 0 | 0 | 100% |
| Shopify | 35 | 4 | 0 | 0 | 100% (within scope) |
| Webflow | 31 | 8 | 0 | 1 | 97% |
| Wix | 0 | 25 | 6 | 18 | 51% (mostly partial) |
| Squarespace | 0 | 0 | 27 | 22 | manual-only |
| Contentful | 27 | 1 | 0 | 0 | 100% (content-side) |
| Sanity | 27 | 1 | 0 | 0 | 100% |
| Strapi | 26 | 2 | 0 | 0 | 100% |
| Ghost | 26 | 4 | 0 | 0 | 100% |

(Counts exclude framework-specific rows where the row is `–` for the platform.)

## Strategic Reading

- **GitHub-via-code** is the broadest surface — anything that lives in a repo, Surven can edit. Ship first.
- **WordPress** covers the largest single CMS user base and is fully supported with a small companion plugin.
- **Shopify** is fully supported within the e-commerce SEO scope. Worth a dedicated push.
- **Webflow** is strong on CMS + meta + custom code, weak on visual page edits (no Designer API). Be honest in marketing.
- **Wix** is mostly "partial" — its headless API is real but the breadth needed for full GEO fixes isn't there. Ship as a "limited support" tier with clear limitations.
- **Squarespace** is a "manual instructions" tier. There is no API. Surven publishes paste-in snippets and step-by-step guides; the agency does the work.
- **Headless CMSs** (Contentful / Sanity / Strapi / Ghost) are nearly fully covered for content-side fixes. Combined with a GitHub repo connection for the rendered site, coverage is total.

## How to Use This Matrix

When a prospect connects their site:
1. Detection identifies the platform.
2. Surven loads this matrix's column for that platform.
3. Initial audit only flags issues whose fixes are at least `P` (Y or partial) — never frustrate users by flagging issues we can't help fix.
4. The dashboard explicitly says "we can fix this automatically" vs "we'll send you instructions."
