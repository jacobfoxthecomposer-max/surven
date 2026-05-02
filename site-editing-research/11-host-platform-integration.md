# Host Platform Integration (Vercel / Netlify / Cloudflare)

Host platforms aren't where content edits happen — those are in Git or the CMS. But host integration matters for: (1) deploy preview URLs used in Surven's diff UX, (2) deploy hooks to trigger rebuilds after CMS edits, (3) environment variable management for Surven-required secrets, (4) detecting deploy success before re-measurement.

## Vercel

### Auth
Vercel API tokens (Account Settings → Tokens). For multi-tenant: OAuth via Vercel Integrations (preferred for App Marketplace).

OAuth scopes: `read` for project list, `read+write` for env vars and deploy hooks.

### Useful APIs

| Endpoint | Use |
|----------|-----|
| `GET /v9/projects` | List projects |
| `GET /v6/deployments?projectId=` | Get deploy history; latest preview URL |
| `POST /v1/integrations/deployments/{id}/redeploy` | Trigger rebuild after CMS edit |
| `POST /v1/projects/{id}/env` | Set env vars |
| Deploy Hooks | Per-project URL; POST to trigger rebuild |

### Preview Deployments
Every PR opened by Surven's GitHub App triggers an automatic Vercel preview if the project is connected. Surven reads the preview URL from the GitHub PR's deploy status check, takes a screenshot via headless Chrome, and renders before/after diffs in the approval UI.

### Re-measurement Trigger
After PR merge, Vercel deploys to production. Surven listens for the GitHub `deployment_status` webhook with `state: success`, environment=`Production`. Then schedules re-scan (24-48h delay to let AI engines re-crawl).

### Env Vars
Surven only reads project metadata; it does **not** request access to environment variables. (Documenting because this is a common scope concern.)

---

## Netlify

### Auth
Personal Access Tokens or OAuth via Netlify Integrations.

### Useful APIs

| Endpoint | Use |
|----------|-----|
| `GET /api/v1/sites` | List sites |
| `GET /api/v1/sites/{id}/deploys` | Deploys list, includes preview URLs |
| Build Hooks | Per-site URL; POST to trigger rebuild |
| `POST /api/v1/sites/{id}/builds` | Trigger build |

### Deploy Previews
Same pattern as Vercel: PR triggers preview, Surven uses URL for diff screenshots.

### `_headers` and `_redirects` files
Netlify-specific files in repo root. Surven uses these for redirects and to set `Content-Type: text/markdown` on `/llms.txt`.

```
# _headers
/llms.txt
  Content-Type: text/markdown; charset=utf-8
  Cache-Control: public, max-age=3600
```

---

## Cloudflare Pages / Workers

### Auth
API tokens with scoped permissions (recommended over Global API Key). For Surven multi-tenant: OAuth not yet available; use scoped API tokens.

### Useful APIs

| Endpoint | Use |
|----------|-----|
| `GET /accounts/{id}/pages/projects` | List projects |
| `GET /accounts/{id}/pages/projects/{name}/deployments` | Deploys |
| Deploy Hooks | Per-project; POST to trigger |

### Wrangler Config
`wrangler.toml` is in-repo. Surven detects and may need to edit for static asset configuration or Worker routes.

### Cloudflare Workers (vs Pages)
Workers run JS at the edge. Surven generally doesn't edit Workers code (out of scope for SEO), but does support `wrangler deploy` triggered after content updates if the client uses Workers Sites.

### Pages Functions
File-based serverless under `functions/`. Surven leaves these alone unless an SEO fix requires a redirect (in which case `_redirects` file is preferred).

---

## Deploy-Hook Workflow for Headless CMS Sites

When the source of truth is a headless CMS (Contentful, Sanity, Ghost), edits to the CMS don't auto-trigger a host rebuild. Surven's flow:

1. Edit CMS via Management API.
2. (Optional) Edit GitHub repo via PR (e.g., new page component).
3. After PR merge OR after CMS edit on a non-Git site: POST to deploy hook.
4. Listen for build completion (Vercel deployment_status webhook, Netlify build_done, Cloudflare via polling).
5. Re-measurement scheduler kicks in.

Deploy hooks are URL-only secrets — Surven stores per-project, encrypted.

---

## Environment Variable Management

For Surven's GitHub App webhook payload signing or other secret needs, Surven does NOT push secrets into client repos. Anything Surven needs is held server-side.

If a fix requires a client-side env var (rare — e.g., turning on a Surven analytics widget), Surven proposes the var name + value via PR comment, asks the client to add it via the host's UI, and never writes it via API.

---

## Detection Heuristics

| Signal | Host |
|--------|------|
| `vercel.json` in repo OR `*.vercel.app` URL OR `x-vercel-id` header | Vercel |
| `netlify.toml`, `_headers`, `_redirects` OR `*.netlify.app` URL OR `x-nf-request-id` header | Netlify |
| `wrangler.toml` OR `*.pages.dev` URL OR `cf-ray` header | Cloudflare Pages |
| `.github/workflows/deploy.yml` mentioning `aws s3 sync` | AWS S3/CloudFront |
| `firebase.json` | Firebase Hosting |
| `now.json` | Legacy Vercel — alert for migration |

---

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Deploy hook URL leaked publicly | Document risk; recommend rotation; never log the URL |
| Build fails after Surven PR | Detect via deployment_status webhook; auto-revert PR (if auto-revert enabled) |
| Preview URL not generated (Vercel project not linked to repo) | Skip screenshot diff; show source diff only |
| Build queue backed up (multiple deploys queued) | Re-measurement waits for queue clear |
| Cloudflare API token expired | Re-auth flow |

---

## Why Host Integration Is Optional (But Recommended)

Surven's core flow (PR → review → merge → re-measure) works without host integration — GitHub's deployment_status events suffice. Host integration is *strongly* recommended because:

1. Preview URLs make diff approval 10x clearer.
2. CMS-driven sites can't rely on push events; deploy hooks are required.
3. Host-specific files (`_headers`, `_redirects`, `wrangler.toml`) can only be edited intelligently with host knowledge.

Surven's UI shows host integration as a "boost your trust signals" upgrade, not a blocker.

Cross-references: `13-pr-workflow-and-ux.md` (preview URL usage in diff UX), `16-re-measurement-loop.md` (deploy success → scan trigger).
