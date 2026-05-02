# Build Roadmap — Phased Order with Rationale

This roadmap sequences the build for fastest path to a defensible, billable Surven Site-Editing Engine. Each phase is opinionated about what ships, what doesn't, and why.

---

## Phase 0 — Foundation (Weeks 1–2)

Before any platform integration, the engine needs scaffolding.

**Build:**
1. `surven_integrations` Supabase table with RLS.
2. `surven_change_log` Supabase table.
3. KMS-backed credential encryption (per-tenant DEKs).
4. Job queue (Trigger.dev or Inngest — already in stack? confirm; otherwise add).
5. Webhook receiver service with signature verification helpers.
6. Audit log writer (used by every integration).
7. Detection service (HTTP probe + repo file-tree scanning).
8. Idempotency primitives (marker reader/writer for HTML, frontmatter editor, fenced-block editor).

**Why this first:** every integration depends on these. Built once, used 10×.

**Exit criteria:** detection works for Next.js / WP / Shopify / Webflow on a test fixture site each.

---

## Phase 1 — GitHub App + Tier 1 Fixes for Static & Next.js Sites (Weeks 3–6)

The largest editable surface, the cleanest UX (PRs), and Surven's existing customer base lives here.

**Build:**
1. GitHub App (manifest, OAuth flow, installation token minting).
2. Webhook handlers (`installation.*`, `pull_request`, `push`, `deployment_status`).
3. Octokit-based file write helpers (Contents API + Git Data API for batch).
4. PR template generator + label setup.
5. Tier-1 fix implementations: 1–7 (head/meta), 8–16 (schema), 17–21 (crawl files), 22–25 (images).
6. Dashboard: "Connect GitHub" → site detection → audit → propose-fix list → approval UI.
7. Deploy preview screenshot diff (Vercel/Netlify integration).
8. Re-measurement scheduler triggered on `deployment_status: success`.

**Why this:** highest-leverage. Covers Next.js / Astro / Hugo / Jekyll / 11ty / Gatsby / SvelteKit — the developer-heavy half of the market.

**Skip in this phase:** Tier 2 content rewrites, all non-GitHub integrations, all visual page editing.

**Exit criteria:** five real customer sites running with Tier-1 fixes auto-merged, re-measurement showing lift.

---

## Phase 2 — WordPress Integration (Weeks 7–10)

WordPress is ~43% of the web. The integration has well-trodden patterns.

**Build:**
1. Surven WordPress companion plugin (open-source on GitHub):
   - Registers Yoast/RankMath/ACF meta with `show_in_rest`.
   - Provides revision restore endpoint.
   - Hooks `wp_head` for schema/OG injection.
   - Hooks `robots_txt` for AI crawler allows.
   - Provides virtual `/llms.txt` and `/llms-full.txt` routes.
   - Audit log table.
2. WP Application Passwords OAuth-style connection flow.
3. WP REST client (encrypted credential storage, retry logic, rate-limit awareness).
4. Tier-1 fix implementations adapted for WP (head, schema, llms.txt, robots, alt text).
5. WP-specific dashboard: page-builder detection, plugin compatibility checks.
6. Submit plugin to WordPress.org Plugin Directory.

**Why second:** largest CMS install base. The companion plugin pattern is reusable for Tier 2 once content edit safety is proven.

**Skip in this phase:** page-builder content edits (Elementor/Divi/etc. — too fragile for v1).

**Exit criteria:** Surven plugin in WP directory, 10+ WP sites with Tier-1 fixes shipped, lift demonstrated.

---

## Phase 3 — Shopify Integration (Weeks 11–14)

GEO for ecommerce is underserved. Shopify is mature API-wise.

**Build:**
1. Public Shopify app (OAuth, scopes, embedded admin UI with Polaris).
2. Mandatory GDPR webhooks.
3. GraphQL Admin API client.
4. Tier-1 fixes adapted: product/collection SEO fields, `surven-head.liquid` snippet pattern, theme-duplicate-and-preview workflow, robots.txt customization.
5. Metafield-based idempotency state.
6. Shopify-specific dashboard: theme version awareness, product-level fix list.
7. Submit to Shopify App Store.

**Why third:** strong vertical, mature API, but smaller TAM than WP and slower review cycle. Good after WP is stable.

**Skip:** Shopify Plus exclusive features, checkout extensions.

**Exit criteria:** approved on Shopify App Store, 5+ stores running fixes.

---

## Phase 4 — Tier 2 Reviewable Fixes (Weeks 15–18)

Now content rewrites, with the safety scaffolding from Phases 0-3 in place.

**Build:**
1. LLM rewrite pipeline (answer capsules, FAQ generation, paragraph restructure).
2. Validation layer (output-schema enforcement, prompt-injection defense).
3. Diff preview UX with rendered before/after.
4. "Trust ladder" auto-merge config (auto-merge enabled per fix-type after first 3 manual approvals).
5. Internal linking proposer (embeddings index of site).
6. Implement fixes 26–41 across GitHub / WP / Shopify.

**Why now:** high-risk fixes need the audit/rollback layer to be battle-tested first. Customer-trust UX matters more here than technical complexity.

**Exit criteria:** Tier 2 fixes shipping at >50% acceptance rate; <1% revert rate.

---

## Phase 5 — Webflow + Headless CMS (Weeks 19–22)

Smaller TAM each but together they round out the addressable market.

**Build:**
1. Webflow OAuth + Data API v2 client.
2. Webflow-specific fixes (CMS, page meta, custom code).
3. Sanity + Contentful + Ghost + Strapi connectors (per `10-headless-cms-integration.md`).
4. Coordination logic for "headless CMS + Git repo for the rendered site" (paired writes).

**Exit criteria:** at least 3 customers per platform, lift demonstrated.

---

## Phase 6 — Tier 3 High-Touch (Weeks 23–26)

Tier 3 isn't a feature shipped once; it's a workflow. Build it after the platform is stable.

**Build:**
1. Brief generator (LLM + competitor scrape + content brief format).
2. Brief approval UI.
3. Draft generator + Surven-hosted Markdown editor with live preview.
4. Two-stage approval workflow.
5. Integration with billing (per-page line items).
6. Fixes 42–49.

**Why last among editing features:** most labor-intensive on Surven side; biggest revenue per fix; should ship after the automated fixes have demonstrated value.

---

## Phase 7 — Polish & Scale (Weeks 27+)

- Closed-loop learning across tenants.
- Wix limited support.
- Squarespace manual-instructions library.
- GitLab + Bitbucket parity.
- SOC 2 Type I.
- Self-serve enterprise SSO.

---

## What Surven Does NOT Build (Explicit Non-Goals)

| Out of Scope | Why |
|--------------|-----|
| FTP/SFTP credentials | Security risk; legacy; tiny TAM. Document as manual instructions. |
| Visual page builders (Elementor/Divi/WPBakery) content edits | Fragile, non-standard, high support burden. |
| Wix Editor (non-headless) | No API. |
| Squarespace API edits | No API. |
| Email marketing edits | Out of GEO scope. |
| Schema markup for things that don't ship products (Recipe, Event for non-event sites) | Niche; ship on demand. |
| Translation / localization fixes | Adjacent product, separate roadmap. |

---

## Why This Order (Not the Obvious One)

The temptation is to build "all integrations first, then all fixes." Wrong. Each integration has long-tail edge cases (page builders, theme compatibility, host firewalls) that take longer than estimated. Shipping Tier-1 on GitHub-only first builds confidence and reveals the real safety/UX requirements before they have to be implemented N times.

Similarly, the temptation is to build Tier-3 (net-new pages) early because it sounds impressive. Wrong. Tier-3 requires Tier-2 LLM safety scaffolding to be solid AND requires Tier-1 to be shipping lift consistently so customers trust Surven enough to let it generate full pages.

---

## Success Metrics Per Phase

| Phase | Primary metric | Target |
|-------|----------------|--------|
| 0 | Detection accuracy | >95% on test fixtures |
| 1 | Tier-1 fixes shipped per site | ≥10 within first week |
| 1 | Lift on Tier-1 (citation count delta) | ≥+2 citations per site within 30d |
| 2 | WP plugin install count | 500+ in 90d |
| 2 | WP sites under management | 50+ |
| 3 | Shopify App Store approval | First-attempt pass |
| 3 | Shopify stores | 10+ |
| 4 | Tier-2 acceptance rate | >50% |
| 4 | Tier-2 revert rate | <1% |
| 5 | Total platforms supported | 8 |
| 6 | Tier-3 brief-to-publish rate | >70% |
| 7 | SOC 2 Type I attestation | Achieved |

---

## Cross-References

- `01-tier1-safe-fixes.md`, `02-tier2-reviewable-fixes.md`, `03-tier3-high-touch.md`, `04-tier4-framework-specific.md` — fix detail.
- `05-github-integration.md` through `11-host-platform-integration.md` — per-platform integration detail.
- `12-framework-detection.md` — detection logic.
- `13-pr-workflow-and-ux.md` — approval UX.
- `14-safety-and-rollback.md` — safety requirements.
- `15-permissions-and-security.md` — security baseline.
- `16-re-measurement-loop.md` — closing the loop.
- `EDITABLE-MATRIX.md` — coverage at a glance.
