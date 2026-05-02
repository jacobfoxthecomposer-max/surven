# 05 — Tracker + Optimizer Integration (Features 30-33)

These features close the loop. The extension creates findings; Surven Tracker stores history; Surven Optimizer ships fixes. Without integration, the extension is a one-off tool. With integration, it's the discovery layer of a complete platform.

---

## Feature 30 — "Send to Optimizer" Button on Every Finding

**What it does.** Every finding (heatmap rust paragraph, missing schema, weak meta, gap, etc.) has a "Send to Optimizer" CTA. Click → creates a ticket in Surven Optimizer with full context (URL, finding type, suggested fix, AI-generated rewrite if applicable).

**Why it matters for GEO.** Findings without action are noise. The Optimizer takes the finding and either auto-applies it (if Surven manages the client's CMS) or queues it for the implementation team. This is the moat — the extension feeds work into a paid pipeline.

**Technical implementation.**
- Universal `Finding` schema (TypeScript interface): `{id, url, type, severity, title, description, suggestedFix?: {type, content}, sourceFeature, createdAt}`.
- Every feature emits findings in this shape.
- "Send to Optimizer" button calls `POST /api/optimizer/tickets` on Surven backend with the finding payload + auth.
- Backend creates ticket, returns ticket URL.
- Extension shows toast "Sent to Optimizer ticket #1234" with link.

**External APIs.** None external. Surven backend only.

**Data flow.** Finding → POST to Surven → ticket created → toast confirmation.

**UI/UX.** Every finding card has 3 CTAs: "Copy fix", "Send to Optimizer", "Dismiss". Sent findings get a green checkmark + ticket number.

**Build complexity.** Medium. ~16-20 hours including the Optimizer ticket backend (most of which is presumably in development per CLAUDE.md context).

**Premium-worthiness.** Premium (the Optimizer itself is the paid product).

**Dependencies.** Surven Optimizer backend ticket endpoint.

**Competitor inspiration.** Linear/Jira-style integrations are standard. The differentiator is that Surven owns both ends — the extension creates the ticket and the Optimizer ships the fix.

---

## Feature 31 — "Add as Client" — Audit Prospect → Instant Surven Workspace

**What it does.** Sales scenario: user audits a prospect's site, finds gaps, clicks "Add as client" → Surven backend provisions a workspace, runs full Tracker audit, sends signed-up email with login + initial findings.

**Why it matters for GEO.** Removes the friction between sales discovery and onboarding. Conventional flow: audit → demo → contract → setup → first-week confusion. New flow: audit → click → client gets first email with insights.

**Technical implementation.**
- "Add as client" button (extension owner needs Surven agency-tier auth).
- Form: client name, contact email, plan tier.
- Backend:
  1. Creates workspace + user (or sends invite).
  2. Triggers full sitemap audit (existing `/api/audit/run`).
  3. Generates onboarding report (PDF) with extension findings + Tracker baseline.
  4. Emails contact with magic-link login + report.
- Extension shows "Workspace created → [link]".

**External APIs.** None external. Internal Surven services.

**Data flow.** Form → backend provisions → audit kicks off → email sent.

**UI/UX.** Top-right "Add as client" button visible only for agency-tier accounts. Modal form. Confirmation screen with workspace link.

**Build complexity.** Medium. ~20-24 hours (mostly backend orchestration).

**Premium-worthiness.** Agency-tier exclusive (Premium $199 or higher).

**Dependencies.** Surven workspace provisioning API, email service (Resend/Postmark).

**Competitor inspiration.** White-label SEO platforms (BrightLocal, AgencyAnalytics) do this for agencies. None do it from a browser audit context.

---

## Feature 32 — Historical Diff (This Scan vs Last)

**What it does.** Every audit is timestamped and stored. When a page is re-audited, show what changed: scores improved/declined, schema added/removed, paragraphs changed, new gaps, closed gaps.

**Why it matters for GEO.** Progress visibility. Clients pay $199/mo to see things get better; without diff they can't.

**Technical implementation.**
- Storage: every audit posts to `POST /api/audit/snapshot` with `{url, timestamp, scores, findings[], pageHash}`.
- Backend stores in Postgres (Surven's existing DB).
- On new audit, backend returns previous snapshot + computed diff.
- Diff computation: score deltas (numeric subtraction), finding deltas (set diff by `(type, location)`), paragraph deltas (text diff via `diff-match-patch` library).

**External APIs.** None.

**Data flow.** Audit → snapshot stored → next audit fetches previous → diff rendered.

**UI/UX.** When a page has previous snapshots, side panel shows "Changes since [date]" pill at top. Click → diff view: score sparkline + findings added (red) / closed (green) lists + paragraph-level diffs.

**Build complexity.** Medium. ~24-30 hours.

**Premium-worthiness.** Plus tier baseline, Premium gets full history.

**Dependencies.** Surven backend storage, audit pipeline (existing).

**Competitor inspiration.** Visualping, Hexowatch do change tracking. Lighthouse CI does score history. Distinctive Surven angle: diff is GEO-specific (heatmap changes, schema changes).

---

## Feature 33 — Push to Tracker Dashboard

**What it does.** "Push to Tracker" button on any audit result → adds the URL/page to the client's Tracker dashboard for ongoing monitoring (daily prompt runs, citation tracking, etc.).

**Why it matters for GEO.** Bridges one-off audits to ongoing monitoring — turns a discovery into a tracked KPI. Tracker is Surven's existing product; the extension becomes its primary data ingest.

**Technical implementation.**
- Button calls `POST /api/tracker/pages` with `{url, prompts: [...], category, brand}` (prompts come from feature 3).
- Tracker backend adds to its monitoring rotation.
- Extension shows toast "Now tracking — first run in 2 hours".

**External APIs.** None external.

**Data flow.** Audit context → POST → Tracker queue → confirmation.

**UI/UX.** "Track this page" button alongside "Send to Optimizer". Once tracked, the button changes to "Open in Tracker → [link]".

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Premium (Tracker is paid).

**Dependencies.** Tracker backend (exists per CLAUDE.md), feature 3.

**Competitor inspiration.** Profound and Peec.ai are tracker-native; their ingest is manual prompt entry. Surven's auto-prompt-from-page-content is the differentiator.

---

## Cross-Cutting Notes

- **Single auth flow.** Extension authenticates once via Surven OAuth (PKCE flow stored in `chrome.storage.local`). All four features share the auth context. Don't make the user re-auth per action.
- **Findings DB**. Define `Finding` schema once and reuse across all 89 features. Centralizes "what is a finding" and lets the Optimizer ingest a uniform stream.
- **Telemetry on findings.** Track per-finding-type: created → sent-to-optimizer rate. If a finding type has <5% send rate, it's noise. Cull.
- **Two-way sync.** When Optimizer closes a ticket, the extension should reflect "Fixed" status on that finding next audit. Build the webhook from Optimizer back to extension state.
- **Activity feed.** The Surven Tracker dashboard should have a "Recent extension activity" feed showing audits run, findings created, tickets opened — makes the integration visible to non-extension users on the team.
