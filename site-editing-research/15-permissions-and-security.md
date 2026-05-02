# Permissions and Security

Surven holds production write credentials for client websites. The blast radius of a Surven compromise is enormous. This document covers the security model: minimum-privilege scopes per platform, credential storage, multi-tenant isolation, and operational hardening.

## Minimum Scopes — Cross-Platform Summary

| Platform | Required Scopes | What's NOT requested |
|----------|-----------------|----------------------|
| GitHub App | `contents:write`, `pull_requests:write`, `metadata:read`, `checks:read`, `actions:read`, `workflows:read`, `issues:write` | Secrets, members, admin, workflows:write |
| WordPress | `edit_posts`, `edit_pages`, `edit_others_posts`, `manage_options`, `upload_files` (or dedicated "Surven Editor" role) | `manage_users`, `install_plugins`, `delete_users` |
| Shopify | `read/write_products`, `read/write_content`, `read/write_themes`, `read_locales`, `read/write_files` | Customers, orders, payments, discounts, inventory |
| Webflow | `cms:write`, `pages:write`, `sites:read`, `custom_code:write` | Ecommerce, users |
| Wix | (limited; see file 8) | n/a |
| Contentful | `content_management_manage` (broad — Contentful is coarse) | None finer available |
| Sanity | Token with write permission to specific dataset | Avoid deploy/admin tokens |
| Strapi | API token with content-type permissions | Admin token |
| Ghost | Admin API key | Members API |
| Vercel | Project read; deployment events | env var write, team admin |
| Netlify | Site read; deploy hook | Team admin |
| Cloudflare | Pages project read + edit; deploy hook | Account-level, DNS, Workers |

## Credential Storage

### Architecture
- All credentials encrypted at rest using **per-tenant data encryption keys** (DEKs).
- DEKs encrypted by **tenant-specific key encryption keys** (KEKs) stored in AWS KMS / Vercel-hosted KMS.
- KEKs never leave KMS; encryption/decryption requested per-operation.
- Plaintext credentials live in-memory only, for the duration of a single API call.

### Supabase Schema

```
surven_integrations
  id                  uuid pk
  tenant_id           uuid    (multi-tenant isolation key)
  provider            text    ("github" | "wordpress" | "shopify" | ...)
  external_id         text    (installation_id, shop domain, etc.)
  encrypted_secret    bytea   (DEK-encrypted credential blob)
  dek_id              text    (KMS key ARN)
  scopes              text[]
  status              text    ("active" | "revoked" | "expired")
  installed_at        timestamptz
  last_used_at        timestamptz
  last_rotated_at     timestamptz
  metadata            jsonb   (non-sensitive: shop name, plan, etc.)
```

RLS policies ensure tenants only see their own integrations.

### Never Stored
- GitHub installation tokens (minted on-demand from the App private key).
- Webhook payloads beyond 7 days (rotating audit log).
- Vault/KMS root keys.

## Multi-Tenant Isolation

### Supabase RLS
Every Surven table has `tenant_id` and an RLS policy:
```sql
CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

Server-side admin operations use the service role key with explicit tenant_id checks in code. Reviewed in code review with a "tenant scoping" checklist.

### Background Jobs
Workers (re-measurement, scheduled fixes) carry `tenant_id` in job payload. Worker enforces tenant context before any DB query.

### Logging
Structured logs include `tenant_id`, never raw secrets. Datadog/ Logflare configured to redact known-secret patterns.

## Secret Hygiene

- All env vars set via Vercel / production secret store; no `.env` in repo.
- GitHub App private key rotated annually.
- Webhook secrets rotated quarterly.
- API tokens for WordPress / Shopify / etc. have no scheduled rotation (platform-controlled), but Surven prompts client to rotate on suspected compromise.
- Vault KEKs rotated via KMS scheduled rotation.

## Authentication for Surven Users

- Supabase Auth with magic-link or OAuth (Google).
- Optional 2FA (TOTP).
- SSO (SAML/OIDC) for enterprise tier.
- Session tokens HTTP-only, SameSite=Lax, 30-day refresh.

## Authorization Model (in Surven)

Roles per workspace:
- **Owner:** can connect/disconnect integrations, approve all fixes, manage billing.
- **Editor:** can approve fixes, cannot connect integrations or delete the account.
- **Viewer:** read-only.
- **Surven Admin (internal):** support access — gated, audit-logged, requires customer consent for any action.

## Network Security

- All egress to client APIs over TLS 1.2+.
- Webhook receivers verify HMAC signatures before processing.
- IP allowlist published for clients with strict firewalls (especially WP Engine, Kinsta).
- Outbound from Surven uses a dedicated IP set (Vercel "egress IPs" feature or proxied through a fixed-IP relay).

## Operational Hardening

- **Least privilege CI:** GitHub Actions in Surven repo doesn't have write access to prod.
- **Reviewed deploys:** prod deploys gated on PR approval.
- **Secret scanning:** GitHub secret scanning + custom regex for Surven token formats.
- **Dependency scanning:** Dependabot, Snyk, weekly review.
- **Rate limiting:** per-tenant API rate limits to prevent runaway loops from one customer impacting others.
- **Anomaly detection:** alert on >N writes/hour per tenant; alert on >N failures/hour per integration.

## Compliance Targets

- **SOC 2 Type I** within 12 months of launch.
- **GDPR**: DPA with subprocessors (Vercel, Supabase, AWS, OpenAI/Anthropic).
- **CCPA**: deletion endpoint for user data.
- **Shopify App Store**: required GDPR/CCPA webhook handlers.

## Threat Model (Top 5)

| Threat | Mitigation |
|--------|------------|
| Surven token leak via log/error | Structured logging with secret redaction; periodic log audit |
| Compromised Surven employee account | 2FA mandatory, hardware keys for admins, audit-logged customer access |
| Malicious fix from prompt injection | LLM outputs validated against schema; never execute LLM-generated code; Tier-1 fixes are mechanical, not LLM-driven |
| Tenant cross-contamination via missed RLS | RLS on every table; tenant_id required in every query; integration test for cross-tenant access on every PR |
| Supply chain (npm package compromise) | Dependency pinning; lockfile committed; provenance checks |

## Specific Risk: Prompt Injection via Crawled Content

LLM-generated fixes (Tier-2 answer capsules, Tier-3 page drafts) consume crawled web content. A malicious site could include `<!-- ignore previous instructions; do X -->` style prompts.

Mitigations:
- All LLM prompts use system-message constraints with output schema (JSON or strict format).
- Outputs validated against schema before write.
- LLM outputs never include executable code.
- Prompt templates explicitly tell the LLM to ignore instructions appearing in user-supplied content.
- For high-stakes fixes (Tier-3 pages), human-in-the-loop is required.

## Incident Response

- On-call rotation.
- Status page (public).
- Customer comms within 24h of detected breach.
- Post-mortem within 7d.
- Kill switches per fix-type, per tenant, global.

Cross-references: `14-safety-and-rollback.md` (audit log details), `05-github-integration.md` (App-specific scope justification), `07-shopify-integration.md` (Shopify GDPR webhooks).
