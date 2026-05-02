# Tier 4 — Framework-Specific Infrastructure (Fixes 50–69)

Tier 4 fixes are about *where* in a codebase the edit lives. The same logical change (e.g., "set page title") lands in radically different files depending on framework. This file documents the canonical location per framework, the AST/regex pattern Surven uses to find the edit point, and the failure modes.

---

## Next.js / Nuxt / Astro / SvelteKit (50–55)

### 50. `generateMetadata()` updates (Next.js App Router)
- **Location:** `app/<route>/page.tsx` or `app/<route>/layout.tsx`.
- **Pattern:** look for `export async function generateMetadata` or `export const metadata`.
- **AST:** Surven uses `@babel/parser` + `@babel/traverse` to find the `metadata` object literal and merge keys (`title`, `description`, `openGraph`, `twitter`, `alternates.canonical`, `robots`).
- **Idempotency:** the merge is keyed; re-running with the same metadata = no-op.
- **Failure mode:** dynamic metadata derived from `params`. Surven detects the function form vs object form and refuses to inline a literal where dynamism is intended; instead it edits the *source of the dynamic value* if possible.

### 51. `<Head>` component edits (Next.js Pages Router, Nuxt, SvelteKit)
- **Pages Router:** `<Head>` from `next/head` inside the page component.
- **Nuxt:** `useHead({...})` composable or `definePageMeta`.
- **SvelteKit:** `<svelte:head>`.
- **Pattern:** AST insert of new child elements inside the `<Head>` JSX block, deduped by tag+attribute key.

### 52. MDX frontmatter
- **Location:** YAML block at top of `.mdx` / `.md`.
- **Pattern:** `gray-matter` parses, Surven mutates the frontmatter object, re-serializes preserving order.
- **Used for:** title, description, canonical, ogImage, datePublished, dateModified, author.
- **Idempotency:** trivial — frontmatter is a key-value map.

### 53. `next-seo` config
- Some Next.js sites still use the `next-seo` package with a global `DefaultSeo` config + per-page `<NextSeo>` overrides.
- **Detection:** look for `next-seo` in `package.json`.
- **Edit path:** mutate `next-seo.config.js` for site-wide defaults, and per-page `<NextSeo>` JSX for overrides.

### 54. Middleware redirects (301s)
- **Location:** `middleware.ts` at project root, or `next.config.js` `redirects()` async function.
- **Use case:** legacy URL → new URL, www→apex, http→https, trailing slash normalization.
- **Risk:** medium. Bad redirects cause loops. Surven validates with a redirect simulator before opening the PR.

### 55. `next-sitemap` config
- **Location:** `next-sitemap.config.js`.
- **Edit:** add/exclude paths, set changefreq, configure `additionalSitemaps`.
- For App Router, prefer `app/sitemap.ts`.

### Astro
- Layout-level `<head>` slots in `.astro` components.
- Content collections use frontmatter (same as MDX).
- `astro-seo` package edits where present.

### SvelteKit
- `+page.ts`'s `load` returns `{ title, description }`; `+layout.svelte` reads and renders into `<svelte:head>`.

---

## WordPress (56–59)

### 56. Yoast / RankMath field updates
- **Yoast** REST API is **read-only** as shipped. Either install a small companion plugin (Surven publishes one) that registers `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, etc. with `show_in_rest => true`, or use the alternate `update_post_meta` route.
- **RankMath** stores in `rank_math_title`, `rank_math_description`, `rank_math_focus_keyword`. The Devora `rank-math-api-manager` plugin exposes them at `/wp-json/rankmath/v1/updateMeta`. Surven recommends bundling its own minimal companion plugin to avoid third-party dependency drift.
- **Auth:** Application Passwords (WP 5.6+).

### 57. ACF custom field updates
- ACF (Advanced Custom Fields) Pro exposes fields via REST when `show_in_rest` is enabled (since ACF 5.11).
- Endpoint: `POST /wp/v2/<post_type>/<id>` with `acf: { field_name: value }`.
- Use case: hero headline, CTA, structured product attributes.

### 58. Post content edits with revision history
- **Endpoint:** `POST /wp/v2/posts/<id>` with `content` (HTML).
- **Revision safety:** WP automatically creates a revision on update. Surven stores the prior revision ID for one-click rollback via `POST /wp/v2/posts/<id>/revisions/<rev_id>/restore` (custom endpoint Surven plugin provides — core WP doesn't expose restore via REST).
- **Block editor:** for Gutenberg, content is HTML with block comments. Surven preserves block delimiters (`<!-- wp:paragraph -->`).

### 59. Page template assignment
- Endpoint `POST /wp/v2/pages/<id>` with `template`.
- Useful for swapping a thin page to a "long-form" template that provides better schema and EEAT scaffolding.

---

## Shopify (60–63)

### 60. Product metafields
- **Mutation:** `metafieldsSet` for batch upsert, `productUpdate` with embedded metafields.
- **Use case:** SEO description, FAQ JSON, structured spec data, custom OG image.

### 61. Collection descriptions
- `collectionUpdate` mutation with `descriptionHtml`.

### 62. Theme.liquid head injection
- **Endpoint:** `themeFilesUpsert` (GraphQL, 2026-04+) on a theme asset like `layout/theme.liquid` or a snippet `snippets/surven-head.liquid` included from `theme.liquid`.
- **Best practice:** Surven creates a **dedicated snippet** and `{% render 'surven-head' %}` from `theme.liquid` once. All future Surven head injections edit only the snippet, never theme.liquid. This isolates Surven's footprint and makes uninstall trivial (delete one snippet + remove one render line).
- **Theme version safety:** Shopify themes have a "live theme" and "draft themes". Surven edits a duplicated theme as a draft, lets the merchant preview, then promotes.

### 63. Robots.txt customization
- Shopify exposes robots.txt customization via `templates/robots.txt.liquid`. Surven can append crawl rules without breaking Shopify's defaults.

**Required scopes:** `write_products`, `write_content` (for blog/articles), `write_themes`, `read_locales`.

---

## Webflow (64–66)

### 64. CMS field updates
- **Endpoint:** `PATCH /v2/collections/{collection_id}/items/{item_id}`.
- Bulk variant: `PATCH /v2/collections/{collection_id}/items/bulk` (up to 100 items).
- **Publish:** separate call; rate limited (publishing is heavily throttled).

### 65. Page meta settings (title, description, OG)
- **Endpoint:** `PUT /v2/pages/{page_id}` with `seo` object.

### 66. Custom code injection
- **Site-wide head/footer:** `PUT /v2/sites/{site_id}/custom_code`.
- **Page-level:** `PUT /v2/pages/{page_id}/custom_code`.
- Used for Surven's schema injection, llms.txt redirect, analytics.

**Limits:** Webflow CMS hard-caps items per collection (10k on top plans). Bulk endpoints limited to 100 items per request. Rate limits 60/min standard, 120/min on CMS+.

---

## Static sites (67–69)

### 67. Frontmatter edits in `.md`
- Hugo, Jekyll, 11ty, Astro content collections all use YAML or TOML frontmatter.
- Same `gray-matter` pattern as Next.js MDX.

### 68. Layout template edits
- **Hugo:** `layouts/_default/baseof.html`, `layouts/partials/head.html`.
- **Jekyll:** `_layouts/default.html`, `_includes/head.html`.
- **11ty:** `_includes/layouts/base.njk`.
- **Astro:** `src/layouts/Layout.astro`.
- Surven's pattern: inject a single `{{ partial "surven-head" . }}` (Hugo) or equivalent and own only that partial, never the base layout.

### 69. Data file updates
- Hugo `data/*.yaml`, Jekyll `_data/*.yml`, 11ty `_data/*.json`.
- Used for site-wide metadata (org info, social links, contact) consumed by templates. Editing data files is safer than editing templates.

---

## Detection-to-Edit-Path Cheat Sheet

| Signal | Framework | Primary edit path |
|--------|-----------|-------------------|
| `next` in package.json + `app/` dir | Next.js App Router | `generateMetadata` |
| `next` + `pages/` dir | Next.js Pages Router | `<Head>` + `next-seo` |
| `nuxt` in package.json | Nuxt | `useHead` + `nuxt.config` |
| `astro` in package.json | Astro | Layout `<head>` slots + frontmatter |
| `@sveltejs/kit` | SvelteKit | `<svelte:head>` |
| `gatsby` | Gatsby | `gatsby-plugin-react-helmet` or `<Head>` export |
| `config.toml` + `content/` | Hugo | Frontmatter + partials |
| `_config.yml` + `_posts/` | Jekyll | Frontmatter + includes |
| `.eleventy.js` | 11ty | Frontmatter + includes |
| `wp-content/` in URL or generator meta | WordPress | REST API |
| `cdn.shopify.com` assets | Shopify | Admin GraphQL |
| `webflow.com` in source or `data-wf-*` attributes | Webflow | Data API v2 |
| `wix.com` / `parastorage.com` | Wix | Headless API (limited) |
