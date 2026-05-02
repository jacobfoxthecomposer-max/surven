# GitHub Integration — App Architecture

GitHub is Surven's primary editing surface. This document covers the GitHub App design, OAuth flow, webhook events, permission justification, and rate-limit strategy.

## Why a GitHub App, not OAuth or PAT

| Approach | Pros | Cons | Surven choice |
|----------|------|------|---------------|
| Personal Access Token | Trivial to ship | Scoped to one user, risky to store, no granular permission, leaks blast-radius | No |
| OAuth User Token | Acts as user, easy install | Tied to one user; if they leave the company, integration breaks | No |
| **GitHub App** | Per-installation tokens, granular permissions, lives across user changes, ships with branding, can be installed at org level | More setup, requires public-or-internal hosting, webhooks needed | **Yes** |

A GitHub App is also the only integration type that gets the "Verified by GitHub" checkmark eventually, which matters for B2B trust.

## App Manifest (initial config)

```yaml
name: Surven Site Editor
description: Generative Engine Optimization fixes via PRs.
url: https://surven.com
public: true
default_permissions:
  contents: write
  pull_requests: write
  metadata: read
  workflows: read         # to detect framework via CI config
  actions: read           # to read deploy preview URLs
  checks: read            # to wait for CI on PRs
  issues: write           # to comment with re-measurement results
default_events:
  - pull_request          # know when client merges/closes Surven PRs
  - push                  # detect manual edits to files Surven manages
  - installation
  - installation_repositories
```

### Permission justification (this matters for the listing review and for client trust)

| Permission | Why |
|------------|-----|
| `contents: write` | Required to create branches and commit files (head tags, schema, llms.txt, robots.txt, sitemap.xml). |
| `pull_requests: write` | Required to open PRs and to enable auto-merge on opt-in repos. |
| `metadata: read` | Auto-included; provides repo info. |
| `workflows: read` | Detect frameworks via CI config (e.g., `vercel`, `netlify` workflows reveal hosting). |
| `actions: read` | Read deploy preview URLs to render before/after diffs. |
| `checks: read` | Wait for CI to pass before enabling auto-merge. |
| `issues: write` | Post re-measurement reports as a comment on the merged PR's linked issue. |

We **do not** request:
- `workflows: write` (could let Surven exfiltrate via CI — explicit no).
- `secrets` (never).
- `members` or org admin scopes (never).
- `code` push to default branch (we always go via PR).

## Installation Flow

1. Client clicks "Connect GitHub" in Surven dashboard.
2. Surven redirects to `https://github.com/apps/surven-site-editor/installations/new?state=<csrf>`.
3. Client picks org + repos (encourage "select repositories", not "all").
4. GitHub redirects to `https://app.surven.com/integrations/github/callback?installation_id=...&state=...`.
5. Surven exchanges installation_id for a short-lived installation token via JWT signed by the app's private key.
6. Surven stores **only the installation_id** in Supabase. Tokens are minted on demand and never persisted.

### Token lifecycle
- App private key signs a JWT (10-min TTL).
- JWT exchanged for installation token (1-hour TTL) via `POST /app/installations/{id}/access_tokens`.
- Cache installation tokens in Redis for ~50 minutes; refresh on demand.

## Webhook Events Surven Listens To

| Event | Action |
|-------|--------|
| `installation.created` | Provision tenant; trigger initial site scan. |
| `installation.deleted` | Soft-delete the integration; halt all open PRs. |
| `installation_repositories.added` / `removed` | Sync repo list. |
| `pull_request.closed` (merged=true on a Surven branch) | Trigger re-measurement workflow. |
| `pull_request.closed` (merged=false on Surven branch) | Mark fix as rejected; learn from rejection reason. |
| `push` on default branch | Detect if files Surven manages were edited manually; flag for conflict resolution. |

Webhook signatures verified with HMAC-SHA256 (`X-Hub-Signature-256`).

## PR Workflow (high-level — full detail in `13-pr-workflow-and-ux.md`)

- **Branch name:** `surven/<fix-id>/<short-slug>` e.g. `surven/llms-txt/initial`, `surven/og-tags/homepage`.
- **Commit message:** Conventional Commits format. `feat(seo): add llms.txt for AI crawler discovery [surven]`.
- **PR title:** human-readable. `Add llms.txt for AI crawler discovery`.
- **PR body template:** see `13-pr-workflow-and-ux.md`.
- **Labels:** `surven`, `surven:tier-1`, `surven:auto-merge` (when applicable), `surven:re-measure`.
- **Assignee:** the integration installer by default; configurable per repo.
- **Status checks:** Surven waits for the repo's existing CI to pass before any auto-merge.

## Octokit SDK

Surven uses `@octokit/auth-app` + `@octokit/rest` server-side. Key calls:

```ts
import { App } from "@octokit/app";

const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_PRIVATE_KEY!,
});

const octokit = await app.getInstallationOctokit(installationId);

// Create a branch
const { data: ref } = await octokit.rest.git.getRef({
  owner, repo, ref: `heads/${defaultBranch}`,
});
await octokit.rest.git.createRef({
  owner, repo,
  ref: `refs/heads/surven/llms-txt/initial`,
  sha: ref.object.sha,
});

// Create or update a file
await octokit.rest.repos.createOrUpdateFileContents({
  owner, repo,
  path: "public/llms.txt",
  message: "feat(seo): add llms.txt [surven]",
  content: Buffer.from(content).toString("base64"),
  branch: "surven/llms-txt/initial",
});

// Open the PR
await octokit.rest.pulls.create({
  owner, repo,
  head: "surven/llms-txt/initial",
  base: defaultBranch,
  title: "Add llms.txt for AI crawler discovery",
  body: PR_BODY_TEMPLATE,
});
```

For multi-file commits, use the lower-level Git Data API (build a tree, create a commit, update the ref) — it's atomic and produces a single commit instead of N.

## Rate Limits

- **REST API:** 5,000 requests/hour per installation. Plenty for normal usage; Surven batches to stay under 1,000/hr per repo.
- **GraphQL:** points-based (5,000 points/hour). Use GraphQL for bulk file reads.
- **Secondary rate limits** trigger on >100 concurrent requests or >900 content-creating requests/min. Surven serializes per-repo writes.
- **Exponential backoff** with jitter on 403/429.

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Installation token expired mid-write | Refresh and retry once; surface error if second attempt fails. |
| Branch already exists (re-run) | Append `-v2`, `-v3`. |
| PR conflicts with main (someone pushed) | Rebase Surven branch; if conflict in Surven-managed file, open issue and pause. |
| Auto-merge blocked by branch protection | Detect via `branch_protection` API; switch to manual-merge mode and notify. |
| Repo archived or deleted | Detect via webhook; archive integration. |
| File too large (>1 MB via Contents API) | Fall back to Git Data API. |

## App Distribution

- Public listing on GitHub Marketplace once stable (paid listing requires GitHub revenue share; Surven likely keeps app free-to-install with paid backend).
- Pre-listing: install via direct link `https://github.com/apps/surven-site-editor`.
- Org admins can install for the whole org; member access controlled via Surven dashboard, not GitHub.

## Security

- App private key stored in a KMS (AWS KMS or Vercel-hosted secret), never in code or Supabase.
- Installation tokens never logged.
- Webhook secret rotated quarterly.
- Audit log of every API call (path, status, ms, repo, user) retained 90 days.

Cross-references: `13-pr-workflow-and-ux.md` for the merge UX, `14-safety-and-rollback.md` for revert flow, `15-permissions-and-security.md` for cross-platform scope summary.
