# 13 — Collaboration (Features 81-84)

These features turn the extension from a solo tool into a team workflow. Critical for agencies (multiple seats, multiple clients) and for in-house GEO teams (multiple stakeholders per finding).

---

## Feature 81 — Comments on Findings

**What it does.** Each finding can have threaded comments. Comments visible to all users in the same Surven workspace.

**Why it matters for GEO.** Collaboration context. "Why isn't this fixed yet?" → "Waiting on dev to deploy" — visible inline rather than in Slack.

**Technical implementation.**
- Findings stored in Surven backend (feature 30 schema).
- Comment table: `{id, findingId, userId, body, createdAt, parentCommentId}`.
- API: `GET/POST /api/findings/:id/comments`.
- Side panel renders thread, websocket optional for live updates.

**External APIs.** None.

**Data flow.** Comment write → API → DB → other users see on next fetch (or via websocket).

**UI/UX.** Each finding card has a comment count badge → click expands thread → reply box.

**Build complexity.** Medium. ~14-18 hours.

**Premium-worthiness.** Premium (multi-seat feature).

**Dependencies.** Feature 30 finding storage, multi-user workspace.

**Competitor inspiration.** Linear, Notion, Figma all have inline comments. Standard.

---

## Feature 82 — Assign Findings to Teammates

**What it does.** Each finding can be assigned to a workspace member. Assignee gets email + finding shows in their "Assigned to me" view.

**Why it matters for GEO.** Workload distribution. Agency lead audits, distributes findings to writers/devs/strategists by expertise.

**Technical implementation.**
- Finding schema gets `assigneeId` field.
- "Assign" dropdown on each finding → list of workspace members.
- Email notification via Resend.
- "Assigned to me" tab in side panel.

**External APIs.** Email (Resend).

**Data flow.** Assign → DB update → notification → assignee's queue.

**UI/UX.** Assignee avatar on each finding. Click to reassign. Filter "My findings" tab.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 81 collab infra.

**Competitor inspiration.** Linear, Asana. Standard.

---

## Feature 83 — Findings Status (Open / In-Progress / Done / Won't-Fix)

**What it does.** Workflow status per finding. Filterable. Closed findings remove from main view.

**Why it matters for GEO.** Triage. Without status, every audit drowns the team in old findings.

**Technical implementation.**
- Finding schema: `status: 'open' | 'in_progress' | 'done' | 'wont_fix'`.
- Status dropdown per card.
- Filter chips at top of findings list.
- "Done" findings auto-verify on next audit (if the underlying issue is gone, mark verified-done).

**External APIs.** None.

**Data flow.** Status change → DB → re-render. Re-audit → verification.

**UI/UX.** Status pill per card with dropdown. Default filter: open + in_progress.

**Build complexity.** Small-Medium. ~10-12 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Finding storage.

**Competitor inspiration.** Linear, GitHub Issues. Standard.

---

## Feature 84 — Client Portal Link

**What it does.** Each Surven workspace can generate a per-client portal URL where the client (read-only) can see findings, scores, sparklines for their domains. Branded with white-label (feature 74) if enabled.

**Why it matters for GEO.** Agencies don't want to give clients full Surven access (cost + complexity) but need a "transparency window". The portal is that window.

**Technical implementation.**
- Backend route `/portal/:token` rendering read-only Surven dashboard scoped to one client's data.
- Tokens generated per client, expirable, password-protectable.
- Portal pulls same data as agency view but filters/redacts internal comments and pricing.

**External APIs.** None.

**Data flow.** Token → server-side scope filter → read-only render.

**UI/UX.** Settings: "Client Portals" tab. List clients with portal URL + share button. Portal itself is a Surven web app route.

**Build complexity.** Large. ~32-40 hours (entirely new portal route + perms).

**Premium-worthiness.** Enterprise tier.

**Dependencies.** Feature 74 white-label, multi-tenant data model.

**Competitor inspiration.** AgencyAnalytics, ReportGarden, BrightLocal — agency-portal feature is universal.

---

## Cross-Cutting Notes

- **Realtime is nice-to-have, not need-to-have.** Polling every 30s on side panel open is fine for v1. Don't add Pusher/websocket complexity until users complain.
- **Activity feed**. Per workspace, surface "Jane closed finding #45 on acme.com/about" — gives team awareness.
- **Mention syntax** in comments (`@jane`) → push notification. Standard expectation.
- **Audit trail** required for enterprise: every finding mutation (assign, status, comment) logged with user + timestamp. Sellable feature for compliance-conscious clients.
