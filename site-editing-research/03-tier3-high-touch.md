# Tier 3 — High-Touch Fixes (Fixes 42–49)

Tier 3 are net-new pages or substantial rewrites of major site sections. These always require approval, often require multiple rounds of human review, and represent the biggest GEO-lift potential per fix because they create surface area where there was none.

Operationally, Tier-3 fixes are not a single PR — they are usually a "draft → review → revise → publish" workflow handled in Surven's UI before a final PR is opened. Treat them as collaborative content briefs that happen to ship as code.

---

## 42. Net-new answer-intent pages

**What:** Surven identifies high-volume queries the client has zero presence on and proposes a brand-new page targeted at that query.

**Trigger conditions:**
- Query has measurable AI search volume (Perplexity / ChatGPT browsing data).
- Client's competitors are cited on this query but client is not.
- The query has a clear informational intent (not transactional, not navigational).
- Client doesn't already have a page targeting it.

**How:**
1. Surven generates a content brief (H1, target word count, suggested H2s, target answer-capsule, internal-link plan, schema requirements).
2. Client reviews the brief, adjusts.
3. Surven drafts the page (LLM, prompted with brief + 3 top-cited competitor pages + brand voice guide).
4. Client reviews/edits in a Surven-hosted markdown editor with live preview.
5. On approval, Surven opens a PR (or creates a CMS draft).
6. Client clicks "publish."

**Framework paths:**
- **Next.js / Astro / Hugo:** new file at `app/<slug>/page.mdx` or `content/posts/<slug>.md` with frontmatter.
- **WordPress:** `POST /wp/v2/pages` with `status: draft`.
- **Shopify:** `articleCreate` mutation under a blog, draft state.
- **Webflow:** `POST /v2/collections/<id>/items` draft.

**Risk:** Highest of any fix. New pages can cannibalize existing rankings, dilute topical authority, or conflict with brand voice. Approval is mandatory at brief stage AND at draft stage.

**GEO impact:** Massive when done right — net-new citation surface. Net-negative when done wrong (low-quality programmatic SEO has been actively de-ranked since 2024).

---

## 43. Net-new FAQ pages

**What:** Standalone FAQ pages (not just FAQ blocks on existing pages, which is fix #28).

**When to use:** High-volume questions that don't fit thematically on any existing page.

**Pattern:** 8–15 Q/As per page, all with FAQ schema, each Q answered in 60–80 words, page H1 = "[Topic] FAQs."

**Risk:** Medium-high. Lower than #42 because the format is constrained.

---

## 44. Comparison pages (X vs competitor)

**What:** "Surven vs Profound", "Surven vs Frase" style pages.

**Pattern:** Comparison table + per-row prose explanation + verdict + CTA. Always includes Product schema and Comparison schema (`@type: ItemList` with reviews).

**Risk:** Brand-sensitive (must be defensible) and legally sensitive (cannot make false claims about competitors). Surven generates a *fact-grid* from competitor's public pricing and feature pages, then asks the client to verify each cell before drafting.

**GEO impact:** Very high. AI engines surface comparison content disproportionately for "X vs Y" and "best X" queries.

---

## 45. Location/service combo pages

**What:** Programmatic location + service pages — "Plumbing in Austin", "Plumbing in Dallas", etc.

**Critical safeguards:**
- Each page must have ≥150 words of *unique* content (real local data: phone, address, testimonials, neighborhood mentions).
- Pages share a template but generated content differs per location.
- Internal-link structure must form a hub-and-spoke (state hub → city pages).
- LocalBusiness schema per page with correct geo coordinates.

**Risk:** This is the playbook that has been most abused by spam SEO. Surven's posture: hard refuse to generate location pages without verified local data per page. We are not in the doorway-page business.

**GEO impact:** High when grounded in real local data; catastrophic when not.

---

## 46. Topic cluster expansion

**What:** Identify a topic the client ranks well on (the "pillar") and propose 5–15 supporting "spoke" pages with bidirectional internal linking.

**Output:** A cluster brief that lists the pillar, proposed spokes, target queries, and link plan. Then individual page drafts (each handled like #42).

**Risk:** Medium. Largest investment of client time. Best run as a quarterly engagement, not a continuous fix.

---

## 47. Product description rewrites

**Shopify-specific.** Bulk rewrite product descriptions to add: answer-capsule lead, structured spec table, FAQ block, and review excerpts.

**Idempotency:** marker stored in `descriptionHtml` as a hidden span.

**Risk:** Conversion rate impact possible. A/B test if the store has the volume; otherwise approve in batches of 5.

---

## 48. Category page intros

**Shopify / WooCommerce / generic ecommerce.** Most category pages are just product grids. Adding 200–400 words of intro copy with internal links and schema lifts them substantially.

**Risk:** Low if the copy is well-grounded; medium if generic.

---

## 49. About-page E-E-A-T enhancement

**What:** Rebuild the About page to maximize trust signals: real names, real photos, credentials, years of experience, certifications, third-party validations (press, awards), Person schema for each team member, Organization schema with `sameAs` links to LinkedIn, etc.

**Pattern:** Surven proposes a content brief, client provides bios + photos + credentials, Surven assembles the page.

**Risk:** Low (the client is the source of truth).

**GEO impact:** Very high. EEAT-rich About pages are a leading indicator of which sites AI engines cite as authoritative.

---

## Cross-Tier-3 UX Notes

- **Two-stage approval:** brief approval, then draft approval. Don't burn LLM tokens on a draft the client doesn't want.
- **Track to publish:** Tier-3 items often stall in client review. Surven shows a Kanban (Brief → Draft → Approval → Published) so neither side loses items.
- **Per-item pricing line item:** Tier-3 fixes consume real human attention; surface them as billable items in the agency dashboard.
- **No silent regen:** never regenerate a Tier-3 draft without explicit client request. Drafts are not idempotent and silent regen will overwrite client edits.

---

## Why the Tier Split Matters

The 49 fixes ship as a single product, but the *operational* difference is huge. Tier-1 is Surven's automation moat (run nightly, ship dozens of fixes, client barely notices). Tier-3 is Surven's human-loop offering (run weekly, ship a handful of fixes, client deeply involved). Pricing should reflect both: a flat monthly platform fee for Tier-1+2 automation and a per-page or retainer fee for Tier-3.
