# Tier 1 — Safe Auto-Fixes (Fixes 1–25)

Tier 1 are fixes Surven can ship as a PR with auto-merge enabled (for clients who opt in) because they are mechanical, well-bounded, and rarely controversial. Every Tier-1 fix must be idempotent, must not change rendered visible content (with the exception of alt text), and must be reversible by a single PR revert or a single API DELETE.

For each fix below: **What** → **How** → **Idempotency marker** → **Risk** → **GEO impact**.

---

## Head / Metadata (1–7)

### 1. Add `<title>` if missing
- **What:** Inject a `<title>` element into `<head>` when none is present, or when the existing one is `Untitled` / empty.
- **How (Next.js):** Add or update `metadata.title` in `app/<route>/page.tsx` or `generateMetadata()`. For Pages Router: edit `<Head><title>` in the page component. For static HTML: insert into `<head>`.
- **How (WordPress):** Yoast/RankMath own `<title>` rendering — set `rank_math_title` or `_yoast_wpseo_title` post meta via REST API.
- **How (Shopify):** `productUpdate` mutation with `seo: { title }` field, or theme.liquid `{{ page_title }}` override.
- **Source title:** derive from `<h1>`, then page slug, then domain. Always append site name with separator (` | Surven`) unless config says otherwise.
- **Idempotency:** check current title hash before write; skip if unchanged.
- **Risk:** Low. Auto-merge eligible.
- **GEO impact:** AI overviews and Perplexity citations heavily weight `<title>` for entity disambiguation.

### 2. Add / rewrite meta description
- **What:** Write a 140–160 char description that answers "what is this page about" in plain prose.
- **How:** Same per-framework path as #1. Field is `meta name="description"`, `metadata.description`, `_yoast_wpseo_metadesc`, `rank_math_description`, or Shopify `seo.description`.
- **Generation:** LLM call against the page's primary content (H1 + first 3 paragraphs), forced to <160 chars and ending in a period.
- **Idempotency:** wrap rewrites in a marker only when we *replaced* an existing description; new ones get an HTML comment `<!-- surven:meta-description v=1 -->`.
- **Risk:** Low–medium. Default to "review required" for the first 3 pages of any site, then auto-merge after the client signals trust.
- **GEO impact:** Snippet text frequently lifted verbatim into AI summaries; misleading or empty descriptions cost citations.

### 3. OpenGraph tags (og:title, og:description, og:image, og:type, og:url, og:site_name)
- **What:** Inject all six OG tags in `<head>`.
- **How:** `metadata.openGraph` in Next.js App Router; `<meta property="og:*">` in static HTML; Yoast's `_yoast_wpseo_opengraph-*` fields; Shopify `seo` object plus a theme.liquid OG block.
- **og:image** — if missing, generate a 1200×630 PNG from page H1+brand colors and commit it to `/public/og/<slug>.png` (GitHub flow) or upload via WP media REST.
- **Idempotency:** consolidated into a single `<!-- surven:og v=1 -->` block that is replaced atomically.
- **Risk:** Low. Auto-merge eligible.
- **GEO impact:** ChatGPT and Claude with web access prefer pages with rich OG metadata for thumbnail attribution.

### 4. Twitter Card tags
- **What:** `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
- **How:** Same path as OG; defaults to `summary_large_image`.
- **Idempotency:** Combined with the OG block above; one marker.
- **Risk:** Low.
- **GEO impact:** Indirect — improves social-amplification → backlinks → mention frequency.

### 5. Canonical URL
- **What:** `<link rel="canonical" href="...">` pointing to the preferred URL.
- **How:** Strip tracking params, normalize trailing slash, force https, remove duplicate index pages.
- **Risk:** Medium — wrong canonical can de-rank a page. Always require review on the first canonical fix; auto-merge subsequent identical patterns.
- **Idempotency:** set declarative — same canonical URL = no-op.
- **GEO impact:** Prevents AI engines from citing the "wrong" URL when the same content exists at multiple paths.

### 6. hreflang tags
- **What:** `<link rel="alternate" hreflang="..." href="...">` for every language variant.
- **How:** Requires a sitemap of multilingual variants. Inject in `<head>` or via `next-intl` / WPML / Polylang config.
- **Risk:** Medium — broken hreflang clusters confuse Google. Always require review.
- **GEO impact:** AI engines route language-matched queries to language-matched URLs.

### 7. `<meta name="author">` + E-E-A-T signals
- **What:** Author name, organization, schema.org `Person` linking. Adds `<meta name="author">`, `<link rel="author">`, and Person schema in JSON-LD.
- **How:** Pulled from WP author field, MDX frontmatter, or Shopify `Article.author`.
- **Risk:** Low.
- **GEO impact:** Major. AI engines weight expertise signals heavily after the EEAT updates.

---

## Schema / JSON-LD (8–16)

All schema fixes share an idempotency pattern: `<script type="application/ld+json" id="surven-<schemaname>">...</script>`. Re-runs replace by ID. Removal is a single delete by selector.

### 8. LocalBusiness schema
- **What:** `@type: LocalBusiness`, `name`, `address`, `geo`, `telephone`, `openingHours`, `priceRange`.
- **How:** Insert one JSON-LD block in `<head>` of the homepage and contact page. For WP, use a "head injection" plugin or hook `wp_head`. For Shopify, theme.liquid head block.
- **Risk:** Low if data comes from a verified Google Business Profile; medium if Surven guesses.
- **GEO impact:** High — Perplexity + Google AI Overviews rely on LocalBusiness for "near me" answers.

### 9. Organization schema
- **Site-wide.** Includes `name`, `logo`, `url`, `sameAs[]` (social profiles), `contactPoint`.

### 10. Product schema
- **Per product page.** Shopify auto-generates this in most themes; the fix is to *enrich* it with `aggregateRating`, `review`, `brand`, `gtin`/`mpn` if missing.

### 11. FAQ schema
- **Per page that has Q/A content.** Auto-detect Q/A pattern via headings ending in `?` followed by paragraphs.

### 12. HowTo schema
- **Per how-to article.** Auto-detect via numbered headings or "Step 1, Step 2" patterns.

### 13. Article / BlogPosting schema
- Headline, datePublished, dateModified, author (linked to Person), image, publisher.

### 14. Breadcrumb schema
- Generated from URL hierarchy.

### 15. Review / AggregateRating schema
- Pulled from Trustpilot/G2/Yotpo if connected; otherwise skipped (no fabrication).

### 16. Person schema (author bylines)
- Linked from Article.author with `sameAs` to LinkedIn / X / GitHub.

---

## Crawlability files (17–21)

### 17. `llms.txt` at root
- **What:** Markdown file at `/llms.txt` per the [llmstxt.org spec](https://llmstxt.org). H1 + blockquote summary + `## Docs` and `## Optional` sections of links.
- **How:** Generated from sitemap + page titles + meta descriptions. Committed to `/public/llms.txt` (Next.js), `/static/llms.txt` (Hugo), `wp-content/llms.txt` via plugin (WordPress). Yoast added llms.txt support natively in 2025; detect and defer.
- **Risk:** Very low.
- **GEO impact:** Direct. ChatGPT, Claude, and Perplexity all crawl `/llms.txt` when present.

### 18. `llms-full.txt`
- **What:** Same spec but contains the full page bodies inline (markdown).
- **How:** Generated by crawling and concatenating. Capped at 1 MB; if larger, split into `llms-full-1.txt`, `-2.txt`, etc.

### 19. `robots.txt` updates
- **What:** Ensure these crawlers are explicitly allowed: `GPTBot`, `ClaudeBot`, `Claude-User`, `Claude-SearchBot`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `CCBot`, `cohere-ai`, `anthropic-ai`, `Bytespider` (optional), `Applebot-Extended`.
- **How:** Patch existing `robots.txt`, never replace. Surven adds a `# surven-managed-block-start` / `end` fence and only edits between the fences.
- **Risk:** Low. The fence makes rollback trivial.
- **GEO impact:** Critical. A `Disallow: /` to GPTBot is the #1 cause of zero AI presence.

### 20. `sitemap.xml`
- **What:** Ensure sitemap exists, is referenced from robots.txt, contains current URLs, and includes `lastmod`.
- **How:** Use `next-sitemap` for Next, Yoast/RankMath for WP, Shopify auto-generates, Webflow auto-generates. For static sites, generate at build.

### 21. `humans.txt`
- Optional. Author/team credits. Low GEO impact — included for completeness.

---

## Image optimization (22–25)

### 22. Alt text on images (AI-generated)
- **What:** Add `alt` attribute to every `<img>` lacking one.
- **How:** Vision-LLM call (Claude with image input) on each image; output capped at 125 chars and forced to be descriptive, not keyword-stuffed.
- **Path:** GitHub PR for static; WP media REST `PUT /wp/v2/media/<id>` `alt_text`; Shopify `fileUpdate` `alt`; Webflow asset alt field.
- **Idempotency:** only fill `alt=""` or missing; never overwrite human-authored alt.
- **Risk:** Low if descriptive, medium if hallucinated. Always show a sample of generated alts in the diff preview before approval on first use.
- **GEO impact:** AI engines use alt text for image-driven answers and accessibility ranks higher in EEAT.

### 23. Image filename rewrites (CMS-permitting)
- Skip on Git-based sites (rewrites break links). WordPress media library only. Low priority.

### 24. `loading="lazy"` attribute
- Add on every below-fold `<img>`. Skip the LCP image.
- Risk: very low. Auto-merge.

### 25. Width/height attributes (CLS prevention)
- Read intrinsic dimensions, write `width` and `height`. Improves Core Web Vitals and indirectly SEO.
