# Shopify Integration

Shopify is the second-largest e-commerce platform after WooCommerce and the most API-mature. Surven's Shopify integration covers product/collection content, theme files, metafields, and the storefront's robots and sitemap.

## Connection Method: Custom Public App + OAuth

Two app types:
- **Custom App (single store):** simple, scoped to one store, install via admin URL. Good for early customers and agency use.
- **Public App (Shopify App Store):** OAuth flow, distributable. Required for a self-serve product. Subject to App Store review (~2-week cycle).

Surven targets **Public App** for production. OAuth flow:

1. Client clicks "Connect Shopify" in Surven.
2. Surven asks for shop domain (`mystore.myshopify.com`).
3. Surven redirects to `https://mystore.myshopify.com/admin/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=...`.
4. Client approves scopes.
5. Shopify redirects to Surven callback with `code`.
6. Surven exchanges code for permanent **offline access token** via `POST /admin/oauth/access_token`.
7. Token stored encrypted per-tenant.

Tokens are **per-shop** and do not expire (offline tokens). Shopify also supports online tokens (24h, tied to user) — not what we want.

## Required Scopes

| Scope | Why |
|-------|-----|
| `read_products`, `write_products` | Product titles, descriptions, SEO fields, metafields. |
| `read_content`, `write_content` | Pages, blog articles. |
| `read_themes`, `write_themes` | Inject snippets into theme.liquid for schema/llms.txt/head. |
| `read_locales` | Multi-language sites. |
| `read_files`, `write_files` | OG image uploads. |
| `read_online_store_pages` | Storefront pages. |

We **do not** request:
- `write_customers`, `write_orders` — never needed for SEO.
- `write_payment_settings`, `write_discounts` — never.
- `read_all_orders` — never.

Minimum-scope discipline matters more on Shopify than anywhere else; merchants are scope-paranoid (rightly).

## API Versions

Shopify pins API versions quarterly (`2026-01`, `2026-04`, `2026-07`, `2026-10`). Versions supported for 12 months. Surven targets the latest stable and tracks deprecations via `X-Shopify-API-Deprecated-Reason` header.

## Editable Surfaces

### Products
GraphQL `productUpdate`:
```graphql
mutation {
  productUpdate(input: {
    id: "gid://shopify/Product/123",
    seo: { title: "...", description: "..." },
    descriptionHtml: "...",
    metafields: [
      { namespace: "surven", key: "faq_json", type: "json", value: "..." }
    ]
  }) { product { id } userErrors { field message } }
}
```

Bulk updates via `productSet` (replaces) or `productUpdate` (merges). For batch operations, use the **Bulk Operations API** which queues a job and returns a JSONL result file (best for >1000 products).

### Collections
`collectionUpdate` mutation. `descriptionHtml` and SEO fields.

### Pages and Articles
`pageUpdate`, `articleUpdate` (note: articles live under blogs).

### Theme Files
`themeFilesUpsert` (GraphQL, 2026-04+) writes to a theme:
```graphql
mutation {
  themeFilesUpsert(themeId: "gid://shopify/OnlineStoreTheme/...",
                   files: [{ filename: "snippets/surven-head.liquid", body: { type: TEXT, value: "..." } }])
  { upsertedThemeFiles { filename } userErrors { field message } }
}
```

**Critical pattern:** Surven creates `snippets/surven-head.liquid` and adds `{% render 'surven-head' %}` to `layout/theme.liquid` *once*. All subsequent Surven head edits go to the snippet only. Uninstall = delete snippet + remove one render line.

### Theme Safety

Shopify themes have a published version and unpublished versions. Surven's policy:
- Detect if the merchant uses a free theme (Dawn, etc.) or a paid theme.
- For initial setup, **duplicate the live theme** via `themeDuplicate`, edit the duplicate, let merchant preview at `?preview_theme_id=...` URL, then `themePublish`.
- For ongoing edits (post-initial setup), edit live theme directly because the snippet pattern isolates risk.

### Metafields
Shopify's first-class custom-data system. Surven uses `metafields` on Product/Collection/Article/Shop for:
- Storing FAQ JSON consumed by `surven-head.liquid` to render FAQ schema.
- Storing custom OG images per product.
- Storing Surven's last-applied state per resource (for idempotency).

Define metafields with namespaces — Surven uses the `surven` namespace exclusively.

### Robots.txt
Shopify supports `templates/robots.txt.liquid` for customization (since 2021). Surven appends Allow rules for AI crawlers without removing Shopify defaults.

### Sitemap
Auto-generated at `/sitemap.xml`. Not editable. Surven cannot add custom URLs but can verify all key pages are present.

## Idempotency Pattern

For each editable resource, Surven stores in a metafield `surven.last_applied` a hash of the desired state. Re-runs compare current state hash to last_applied hash:
- Equal → no-op.
- Different but Surven was last writer → overwrite.
- Different and someone else edited → flag conflict, prompt merchant.

## Rate Limits

- **GraphQL Admin:** point-bucket (1000 points/store, restored at 50/sec on standard, 100/sec on Plus).
- **REST Admin:** leaky bucket (40 buckets, 2/sec restore).
- `productUpdate` ~10 points; `themeFilesUpsert` ~20 points.
- Bulk API for >1000 records.
- Surven respects `X-Shopify-Shop-Api-Call-Limit` header; throttles before hitting cap.

## Checkout Extensibility

Surven does not touch checkout. Out of scope.

## App Distribution

Shopify App Store review checks:
- Scope justification.
- GDPR/CCPA webhook handlers (`customers/data_request`, `customers/redact`, `shop/redact`) — **mandatory**.
- Embedded app UI in Shopify Admin (Polaris design system) — Surven embeds a minimal "Connection status" page.
- Billing API integration if charging in-Shopify (otherwise Surven bills externally).

## Failure Modes

| Failure | Recovery |
|---------|----------|
| 401 (token revoked) | Trigger re-OAuth. |
| 422 (invalid metafield value) | Validate against Shopify's type system before write. |
| 429 (rate limit) | Respect `Retry-After`; back off. |
| Theme is locked by another editor | Wait + retry; if persistent, queue. |
| Merchant uninstalled the app mid-write | Webhook `app/uninstalled` triggers integration archive. |
| GDPR request | Required webhooks must respond within 30 days. |

## Mandatory Webhooks

```
customers/data_request   → return any customer data Surven holds (likely none)
customers/redact         → delete customer-tied data
shop/redact              → delete all merchant data 48h after uninstall
app/uninstalled          → archive integration immediately
```

## Storage of Shopify-Specific Data

Per shop, Surven stores: `shop_domain`, encrypted `access_token`, `installed_at`, `scopes`, `selected_theme_id`, last 100 audit log entries.

Cross-references: `12-framework-detection.md` (Shopify detection), `13-pr-workflow-and-ux.md` (Shopify changes don't use PRs — they use a draft-theme preview pattern instead).
