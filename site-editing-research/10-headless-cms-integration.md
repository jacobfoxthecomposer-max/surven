# Headless CMS Integration (Contentful / Sanity / Strapi / Ghost)

Headless CMSs decouple the content store from the rendered site. For Surven this is a forked workflow: the rendered site lives on GitHub (edited via PR), but the *content* lives in the CMS (edited via Management API). For most fixes, Surven needs to edit the CMS, not the repo.

## Detection

Look for SDK packages in `package.json`:
- `contentful` / `@contentful/rich-text-html-renderer`
- `@sanity/client`, `next-sanity`
- `@strapi/strapi` (only if self-hosted in same repo)
- `@tryghost/content-api`, `@tryghost/admin-api`
- `@prismicio/client`
- `@hygraph/client`
- `@sanity-typed/types`
- `payload` / `@payloadcms/richtext-lexical`

Also look at GraphQL endpoints in env files (`.env.example`).

## Contentful

### Auth
**Content Management API (CMA)** uses Personal Access Tokens or OAuth. For multi-tenant Surven, OAuth is correct.

OAuth scopes: `content_management_manage` (broad).

### Editable
- Entry fields (text, rich text, references, assets).
- Asset metadata (title, description, alt — alt at locale level).
- Entry tags.

### API
```http
PUT /spaces/{space}/environments/{env}/entries/{entry_id}
X-Contentful-Version: <current_version>
Content-Type: application/vnd.contentful.management.v1+json

{ "fields": { "title": { "en-US": "..." }, "description": { "en-US": "..." } } }
```

Then publish:
```http
PUT /spaces/{space}/environments/{env}/entries/{entry_id}/published
X-Contentful-Version: <new_version>
```

### Idempotency
Entry has `sys.version`. Optimistic concurrency: include current version, request fails on mismatch. Surven re-fetches and merges on conflict.

### Rate limits
7 requests/sec on CMA, 55/sec on CDA (read).

### Notes
Contentful removed its free community tier in Q2 2025; many small projects migrated to Sanity/Payload. Surven supports Contentful for the enterprise tail.

---

## Sanity

### Auth
**Tokens** generated in project settings; per-token permissions (read / write / deploy).

For multi-tenant: Surven requests the client to generate a write token, paste in. (No OAuth flow as of 2026.) Future: Sanity OAuth if/when shipped.

### Editable
Sanity is schema-flexible. Documents have arbitrary fields per the project's schema. Surven reads the schema via `GROQ` introspection and adapts.

### API
**Mutations** via `/data/mutate/{dataset}`:
```json
{ "mutations": [
  { "patch": { "id": "post-123", "set": { "title": "...", "description": "..." } } }
]}
```

Mutations are atomic (transactional across multiple documents).

### Drafts
Sanity has separate `drafts.<id>` documents. Surven edits draft, lets client publish in Studio.

### Idempotency
Use `ifRevisionID` in patch to require optimistic concurrency.

### Portable Text
Sanity's rich text format (`Portable Text` / PT) is structured JSON, not HTML. Surven generates PT directly for content edits, not HTML→PT roundtrips (lossy).

### Rate limits
Generous; soft limits per project plan.

---

## Strapi

### Auth
Strapi is self-hosted. **API tokens** generated in admin (Settings → API Tokens). Per-token permissions.

OAuth not standard; Surven asks client to paste a token.

### Editable
Strapi content types are user-defined. Surven introspects `/api/content-type-builder/content-types` (admin endpoint) or relies on the response shape from sample fetches.

### API
```http
PUT /api/articles/123
Authorization: Bearer <token>
{ "data": { "title": "...", "seo": { "metaTitle": "...", "metaDescription": "..." } } }
```

### Drafts
Strapi 4+ has Draft & Publish workflow. `publishedAt: null` = draft. Surven creates drafts and surfaces them for client publish.

### Self-hosted security
Surven needs network access to the client's Strapi instance — often behind their VPN. Document the connectivity requirement; consider Surven-hosted relay for clients in private networks.

---

## Ghost

### Auth
**Admin API** uses Admin API Keys (issued in Integrations panel). JWT-signed requests.

### Editable
- Posts (`PUT /admin/api/posts/{id}`)
- Pages
- Tags
- Authors
- Settings (incl. SEO defaults, robots, code injection)
- Members (out of scope for Surven)

### Rich Content
Ghost uses **Lexical** (since 5.0) and **Mobiledoc** (legacy). Surven generates Lexical for new content, preserves whatever's there for existing.

### Code Injection
Ghost has built-in `codeinjection_head` and `codeinjection_foot` per-post and site-wide. Surven uses these for schema and llms.txt link.

### Routes.yaml
Ghost's routing is defined in `routes.yaml`, uploaded via API. Surven can manage redirects this way.

### Rate limits
Generous; not a constraint.

---

## Other Headless CMSs (lighter coverage)

### Prismic
- API: Migration API + Custom Types API.
- Tokens.
- Slice machine — rich-content stored as slices; Surven supports basic slice writes.

### Hygraph (formerly GraphCMS)
- GraphQL Management API.
- Token auth.
- Mutations on content models.

### Payload
- Self-hosted, like Strapi but more code-first.
- REST + GraphQL.
- API keys.

### Storyblok
- Management API + Stories API.
- OAuth supported.
- Bloks (component-based content); structured edits.

### Cosmic
- Object-based.
- Bucket API key.

### Directus
- Self-hosted/cloud.
- REST + GraphQL.
- Static tokens or OAuth.

---

## Cross-CMS Patterns

| Concern | Approach |
|---------|----------|
| Schema introspection | Always introspect before write; never assume field names |
| Optimistic concurrency | Use whatever revision/version mechanism the CMS provides |
| Drafts | Always edit drafts when supported; let client publish |
| Idempotency | Hash desired field state in a Surven-namespaced field |
| Rich content | Generate native format (PT, Lexical), not HTML→native conversion |
| Locales | Multi-locale CMSs require explicit locale handling per write |
| Asset upload | OG images uploaded as assets, then referenced by URL/ID |

## Site Repo Coordination

For headless CMSs paired with a static site, two PRs may be needed:
1. CMS write (content fields).
2. GitHub PR (e.g., to add a new page route, layout, or schema component).

Surven sequences these and shows a unified approval ("This fix requires updating Sanity AND opening a PR — approve both?").

## Failure Modes

| Failure | Recovery |
|---------|----------|
| 401 (token revoked) | Reconnect flow |
| 422 (schema validation) | Surface specific field errors |
| Rate limit | Backoff |
| Locale mismatch | Detect and prompt |
| Content reference missing (e.g., author entity) | Create the missing entity first or skip |
| Webhook for republish not firing | Poll deploy hook status |

Cross-references: `12-framework-detection.md` (CMS detection signals), `11-host-platform-integration.md` (deploy hooks for headless+static).
