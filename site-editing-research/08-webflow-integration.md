# Webflow Integration

Webflow occupies a meaningful slice of the design-led / agency-built site market. The Webflow Data API v2 (post the July 2025 changes) is solid for CMS edits; for visual page edits Webflow is more restrictive than its competitors.

## Connection Method: OAuth 2.0

Webflow apps use OAuth. Surven registers a Webflow App in the Webflow Developer Portal:

1. Client clicks "Connect Webflow" in Surven.
2. Surven redirects to `https://webflow.com/oauth/authorize?client_id=...&response_type=code&scope=...&state=...`.
3. Client picks the workspace and site(s) to authorize.
4. Webflow redirects to callback with `code`.
5. Surven exchanges for an access token via `POST /oauth/access_token`.
6. Tokens are long-lived; no refresh token needed.

## Required Scopes

| Scope | Why |
|-------|-----|
| `cms:read`, `cms:write` | Edit CMS items (blog posts, dynamic content). |
| `pages:read`, `pages:write` | Page-level meta (title, description, OG). |
| `sites:read` | List sites for the user. |
| `custom_code:read`, `custom_code:write` | Inject schema/llms.txt/head code site-wide and per-page. |
| `forms:read` | (Optional) detect and ignore form pages. |

Surven does **not** request: `ecommerce:write` (unless the client is on Webflow Ecommerce), `users:write`, `assets:write` (we'll request `assets:write` if alt-text editing is enabled).

## API Versions

Webflow Data API v2 became stable in 2024; the major change was July 2025 which split CMS publishing rate limits and added bulk operations. Surven uses v2 exclusively. v1 is deprecated.

## What's Editable

### CMS Items
`PATCH /v2/collections/{collection_id}/items/{item_id}`:
```json
{ "fieldData": { "name": "...", "slug": "...", "post-body": "...", "meta-title": "...", "meta-description": "..." } }
```
Bulk: `PATCH /v2/collections/{collection_id}/items/bulk` (up to 100 items per request).

Drafts: items can be created as draft (`isDraft: true`); only published items appear on the live site.

### Pages
`PUT /v2/pages/{page_id}` updates settings:
```json
{ "title": "...", "seo": { "title": "...", "description": "..." }, "openGraph": { "title": "...", "description": "...", "image": "..." } }
```

Page **content** (the visual canvas) is NOT editable via API — that's a Webflow Designer-only operation. This is Webflow's biggest constraint for Surven.

### Custom Code Injection
`PUT /v2/sites/{site_id}/custom_code`:
```json
{ "scripts": [{ "id": "...", "location": "header", "version": "..." }] }
```
Per-page: `PUT /v2/pages/{page_id}/custom_code`.

This is how Surven injects:
- Schema/JSON-LD blocks (in header).
- llms.txt → can't be served from custom code; instead Surven hosts on a Surven-controlled subdomain that the client CNAMEs OR uses Webflow's "URL redirects" feature to point `/llms.txt` to a Surven-hosted file. Workaround. Not great. Document as a known limitation.

### Robots.txt
Webflow lets users edit robots.txt in Site Settings → SEO → Robots.txt. **Editable via API** since 2024 via `PUT /v2/sites/{site_id}/robots_txt`.

### Sitemap
Auto-generated. Not editable.

### Publishing
Publishing is a separate API call: `POST /v2/sites/{site_id}/publish` with `publishToWebflowSubdomain: true` and/or `customDomains`.

**Rate limit on publish:** historically 5/min, eased somewhat in mid-2025. Still tighter than the rest of the API. Surven batches CMS changes and publishes once per batch.

## Rate Limits

| Plan | Per-minute |
|------|------------|
| Free / Starter | 60 |
| CMS / Business | 120 |
| Enterprise | Custom |
| Publish (any plan) | ~5/min |
| Bulk write | up to 100 items per request |

Surven respects `X-RateLimit-Remaining` header.

## CMS Limits (Hard Caps Per Plan)

| Plan | Items per collection | Collections |
|------|----------------------|-------------|
| Basic | 0 | 0 (no CMS) |
| CMS | 2,000 | 20 |
| Business | 10,000 | 40 |
| Enterprise | Custom | Custom |

If a client wants Surven to generate Tier-3 spoke pages on Webflow CMS, plan limits matter — surface them in the UI.

## Idempotency Pattern

CMS items have a stable `id`. Custom code blocks have an `id` Surven assigns and reuses. For schema injection, Surven uses a single `<script id="surven-schema">` block per page; re-runs replace the script body.

## Failure Modes

| Failure | Recovery |
|---------|----------|
| 401 | Token revoked; re-OAuth. |
| 429 | Backoff with `Retry-After`. |
| Validation error on CMS field | Many fields have type constraints (rich text, number, etc.). Validate against the collection schema before write. |
| Publish queued but not published | `POST /publish` returns immediately; status check via `GET /v2/sites/{id}` `lastPublished`. |
| Item is draft, write expected to live | Explicit `isDraft: false` + publish call. |
| Site disconnected | Webhook `site_publish` failed; mark integration stale. |

## What Surven Cannot Do on Webflow

- Edit visual page layout (no Designer API).
- Add new pages with custom layouts (only CMS-templated pages).
- Edit symbols/components programmatically.
- Modify form configurations.

These constraints push Surven on Webflow toward CMS-heavy workflows: blog content, FAQ collections, location pages built from a CMS template. For static visual pages, only meta + custom code edits.

## Webhooks

Webflow supports webhooks for `collection_item_created`, `collection_item_changed`, `collection_item_deleted`, `site_publish`, `form_submission`, `ecomm_*`. Surven listens to the first three to detect manual edits and to `site_publish` to know when to re-measure.

## Webhook Verification

`X-Webflow-Signature` header HMAC-SHA256 of the request body using the app's webhook secret.

Cross-references: `04-tier4-framework-specific.md` for the Webflow row in the editable matrix.
