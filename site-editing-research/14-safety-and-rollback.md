# Safety, Idempotency, Rollback, Audit

Surven writes to client production sites. Safety is the product. This document covers the four mechanisms that make automated edits trustworthy: idempotency, rollback, audit log, and conflict resolution.

## Idempotency

**Goal:** running the same fix twice in a row produces the same end state with zero side effects.

### Patterns

#### 1. HTML Comment Markers (for in-content edits)
```html
<!-- surven:fix=meta-description v=2 hash=a1b2c3 -->
<meta name="description" content="...">
<!-- /surven:fix=meta-description -->
```

The `hash` is a hash of the desired value. Re-runs:
1. Find the marker block.
2. Compare hash to desired.
3. If equal → no-op.
4. If different → replace block atomically.
5. If marker missing → insert new block.

`v=` lets Surven evolve the marker format. v1 markers are upgraded in place when seen.

#### 2. Stable IDs (for JSON-LD and inline scripts)
```html
<script type="application/ld+json" id="surven-organization">
{ "@type": "Organization", ... }
</script>
```

Replace by ID selector. Idempotent by construction.

#### 3. Frontmatter Key-Value (for MD/MDX)
```yaml
title: "..."
description: "..."   # surven-managed
ogImage: "..."       # surven-managed
```

Comments after value mark the field as Surven-owned. Re-runs overwrite Surven-owned keys, never others.

#### 4. Fenced Edits (for robots.txt and similar)
```
# surven-managed-block-start v=1
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
# surven-managed-block-end
```

Surven only edits content between the fences. The rest of the file is sacrosanct.

#### 5. Side-Files Pattern (for Shopify, WordPress, headless CMS)
Instead of editing client-owned resources, Surven creates a side-file it owns:
- Shopify: `snippets/surven-head.liquid` rendered from `theme.liquid` once.
- WordPress: companion plugin's `wp_head` hook.
- Webflow: site-wide custom code block keyed by Surven ID.

Side-files are 100% Surven-owned and trivially idempotent.

#### 6. State Hashing (for CMS edits)
For CMS resources, Surven stores `surven.last_applied_hash` as a metafield/custom field. Re-runs:
- Compute desired-state hash.
- Compare to last_applied_hash.
- Equal → no-op.
- Different → write + update hash.

#### 7. Optimistic Concurrency (where the API supports it)
- Contentful: `X-Contentful-Version` header.
- Sanity: `ifRevisionID` patch param.
- WordPress: ETag (when present).
- GitHub: branch SHA in PR base.

Always prefer optimistic concurrency over read-modify-write where supported.

## Rollback

**Goal:** every Surven change is one click from undone.

### Per-platform rollback paths

| Platform | Rollback |
|----------|----------|
| GitHub | "Revert" button on merged PR → opens revert PR → merge |
| GitLab | "Revert" on merged MR |
| Shopify | Restore previous theme version (Shopify keeps theme history); for product/collection edits, write back the prior value Surven cached |
| WordPress | `POST /surven/v1/restore-revision/{post_id}/{rev_id}` (companion plugin endpoint) |
| Webflow | Patch back the prior `fieldData` Surven cached |
| Contentful | Roll back to prior version (`X-Contentful-Version`); CMA supports this directly |
| Sanity | Mutate to prior content using stored revision |
| Ghost | Patch back prior content |

### Surven UI

Every Surven dashboard event has a "Rollback" button. Clicking it:
1. Opens a confirmation modal showing what will revert.
2. Executes the platform-specific rollback.
3. Logs the rollback as an audit event.
4. Triggers re-measurement to confirm the rollback impact.

### Bulk rollback

For an "everything Surven did this week, undo it" emergency button:
- List all Surven runs in the last N days.
- Group by integration.
- Execute reverts in reverse chronological order.
- Show progress.

This is a "break glass" feature, not a daily tool.

### Pre-write snapshots

Before every write, Surven stores the prior value in `surven_change_log` (Supabase table) keyed by `<integration_id, resource_type, resource_id, run_id>`. This is the source of truth for rollback even if the platform doesn't keep history.

## Audit Log

**Goal:** every change Surven makes is queryable, attributed, and retained.

### Schema

```
surven_change_log
  id                  uuid pk
  tenant_id           uuid
  integration_id      uuid
  user_id             uuid    (who triggered, null = automated)
  fix_id              text    (e.g., "llms-txt")
  resource_type       text    (e.g., "github_file", "wp_post", "shopify_product")
  resource_id         text
  prior_state_hash    text
  prior_state         jsonb
  new_state_hash      text
  new_state           jsonb
  api_request         jsonb   (method, path, body summary)
  api_response_status int
  result              text    (success/failure/skipped/conflict)
  error               text
  created_at          timestamptz
  rolled_back_at      timestamptz
  rolled_back_by      uuid
```

Retention: 1 year by default; configurable per tenant. Sensitive payload bodies redacted (PII from prior_state).

### Surfacing

- Per-fix history page: every change to a given resource over time.
- Per-tenant audit export: CSV / JSON download for compliance.
- Webhook stream: tenants can pipe audit events to their own SIEM.

### Compliance

- SOC 2 mapping: audit log covers CC7.2 (system monitoring), CC7.3 (anomaly detection), CC8.1 (change management).
- GDPR: rollback events trigger downstream PII purge if relevant; not typically applicable for SEO.

## Conflict Resolution

**Goal:** when client made manual edits between Surven runs, Surven detects and stops.

### Detection
1. Before write: re-fetch current state from the source.
2. Compute hash.
3. Compare to `last_applied_hash` in surven_change_log for the same resource.
4. **No drift:** safe to write.
5. **Drift detected (someone changed it since Surven last touched):**
   - If drift is inside Surven marker → still safe (Surven owns the marker, will overwrite).
   - If drift is outside Surven marker → safe (we don't touch outside markers).
   - If drift means the resource is gone or schema changed → **abort, raise conflict**.

### Resolution UX
A conflict in the dashboard shows:
- Last Surven state.
- Current state.
- Diff.
- Three options:
  1. **Accept manual change** — update Surven's last_applied_hash to current; skip the fix.
  2. **Re-apply Surven fix** — overwrite manual change (with explicit confirmation).
  3. **Open issue for human review** — file a GitHub issue or Surven task.

Default to "Open issue" — never silently overwrite.

## Pre-Write Validation

Before any write:
1. Schema validation against the platform's API.
2. Idempotency check (already-applied? skip).
3. Rate-limit headroom check.
4. Local dry-run for static-site PRs (run `next build` / `hugo` / `astro build` in a sandbox container, fail fast on build break).
5. Visual smoke test (Chrome render, no JS errors, no layout collapse).

## Failure Recovery

Every write is wrapped:
```
1. snapshot prior state
2. write
3. verify (re-fetch + compare)
4. if verify fails → roll back automatically + log
5. if verify passes → commit audit log entry
```

Step 3 is critical. APIs sometimes return 200 but don't actually persist (Webflow CMS edge cases, Shopify caching). Verify is non-negotiable.

## Disaster Recovery

If Surven itself has a bug that pushes bad fixes broadly:
1. Kill switch: feature flag per fix-id, per tenant, global.
2. Bulk rollback tooling.
3. Status page with incident comms.
4. Post-mortem published; client trust depends on it.

Cross-references: `05-github-integration.md`, `13-pr-workflow-and-ux.md`, `15-permissions-and-security.md`.
