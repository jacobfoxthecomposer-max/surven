# 07 — Workflow Multipliers (Features 42-53)

These features take individual users from "I run 1 audit a day" to "I run 30 audits a day." For agency workflows, this is the difference between trying the extension and depending on it.

---

## Feature 42 — Bulk-Audit All Open Tabs

**What it does.** "Audit all tabs" button. Iterates through every open tab (in the current window or all windows), runs a quick audit on each, results in a side-panel table.

**Why it matters for GEO.** Agency workflow: open competitor tabs from a Google search, hit one button, get a comparative score table.

**Technical implementation.**
- `chrome.tabs.query({})` → list of tabs.
- For each tab: `chrome.scripting.executeScript({tabId, files: ['content.js']})` to inject + extract data.
- Run lightweight audit (heatmap score + schema check + freshness). NO LLM calls — keep this fast and free.
- Aggregate to side panel table.

**External APIs.** None.

**Data flow.** Tab list → parallel inject → results → table.

**UI/UX.** "Audit all tabs" button. Modal: select scope (current window / all windows). Progress per tab. Results: sortable table with URL, score, top issue, "Open" button.

**Build complexity.** Medium. ~14-18 hours.

**Premium-worthiness.** Plus tier (Free: 5 tabs max, Plus: unlimited).

**Dependencies.** Local audit pipeline (features 6, 8, 11, 13).

**Competitor inspiration.** TabCloud, OneTab handle bulk tabs. Lighthouse Bulk Tester. Surven's angle: GEO-specific scoring.

---

## Feature 43 — Audit Any URL Without Visiting

**What it does.** Enter a URL in side panel, get a full audit without opening a tab. Backend fetches and audits server-side.

**Why it matters for GEO.** Audit URLs you can't visit (geofenced, paywalled), competitor pages without visit-counting, large batch URLs from spreadsheets.

**Technical implementation.**
- Side panel input: URL.
- POST to `/api/audit/url-only` with URL.
- Backend uses Playwright (or similar headless) to render JS, extracts DOM, runs same audit pipeline as content script.
- Returns JSON to side panel which renders the same UI as a live audit.

**External APIs.** None external. Surven backend headless browser.

**Data flow.** URL → backend Playwright → audit → JSON → side panel.

**UI/UX.** "Audit URL" tab. Input + "Run" button. Same result UI as live audit, marked "remote audit".

**Build complexity.** Medium-Large. ~24-32 hours (requires Playwright in Surven backend with browser pool).

**Premium-worthiness.** Premium (real backend cost).

**Dependencies.** Surven backend headless browser infrastructure.

**Competitor inspiration.** All major SEO tools do this; differentiation is GEO scoring.

---

## Feature 44 — Right-Click "Audit This Link"

**What it does.** Right-click any link on any page → "Audit this link with Surven" → opens side panel with audit of the link's destination (uses feature 43 backend).

**Why it matters for GEO.** Frictionless workflow when reviewing competitor SERPs, AI citations, Slack links, etc.

**Technical implementation.**
- `chrome.contextMenus.create({id, title, contexts: ['link']})`.
- On click, `info.linkUrl` → POST to `/api/audit/url-only` → render in side panel.

**External APIs.** None new.

**Data flow.** Right-click → context menu → backend → side panel.

**UI/UX.** Right-click menu item with Surven icon. Side panel auto-opens.

**Build complexity.** Small. ~4-6 hours.

**Premium-worthiness.** Premium (gates on feature 43).

**Dependencies.** Feature 43.

**Competitor inspiration.** Common pattern (Lighthouse, ahrefs SEO Toolbar).

---

## Feature 45 — Right-Click "Probe This Text in AI"

**What it does.** Select text on any page, right-click → "Probe this text in AI" → fires the selected text as a prompt to feature 1 simulator.

**Why it matters for GEO.** Hyper-fast "what does AI say about X?" workflow. Useful when reading articles and you spot a claim you want to verify.

**Technical implementation.**
- `chrome.contextMenus.create({contexts: ['selection']})`.
- On click, `info.selectionText` → side panel opens → feature 1 fires.

**External APIs.** From feature 1.

**Data flow.** Selection → context menu → side panel simulator → engine results.

**UI/UX.** Right-click menu item. Side panel opens with prompt prefilled.

**Build complexity.** Small. ~3-5 hours.

**Premium-worthiness.** Plus tier (consumes simulator quota).

**Dependencies.** Feature 1.

**Competitor inspiration.** ChatGPT browser extension does similar. Surven differentiator: 4-engine fan-out.

---

## Feature 46 — Keyboard Shortcuts

**What it does.** Configurable hotkeys: open side panel (Cmd/Ctrl+Shift+A), run audit (Cmd/Ctrl+Shift+R), toggle heatmap (H), citation probe (P), etc.

**Why it matters for GEO.** Power users live in keyboard. Massively boosts daily-active retention.

**Technical implementation.**
- `manifest.json` `commands` field with default shortcuts.
- `chrome.commands.onCommand` listener in background.
- Settings UI for rebinding (Chrome's `chrome://extensions/shortcuts`).

**External APIs.** None.

**Data flow.** Keypress → background → action.

**UI/UX.** Settings tab "Shortcuts" with current bindings + link to Chrome's rebind page. Cheat sheet shown on first install.

**Build complexity.** Small. ~4 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** None.

**Competitor inspiration.** Standard.

---

## Feature 47 — Audit History Sidebar (Last 50)

**What it does.** Side panel "History" tab showing last 50 audits with timestamp, URL, score. Click to re-open.

**Why it matters for GEO.** Cross-session context. Lets users return to yesterday's audit without re-running.

**Technical implementation.**
- After every audit, append to `chrome.storage.local` (`auditHistory` array, FIFO max 50, ~10MB limit per chrome.storage.local).
- For larger history, mirror to backend if user is signed in.
- On extension restart, history is restored.

**External APIs.** None local. Backend mirror optional.

**Data flow.** Audit → append to local storage → "History" tab reads.

**UI/UX.** History list with thumbnails (favicon), URL, time-ago, score. Filter by domain, date range. Click → loads cached snapshot or re-runs.

**Build complexity.** Small. ~6-8 hours.

**Premium-worthiness.** Free tier (50 limit), Premium gets unlimited via backend mirror.

**Dependencies.** Audit pipeline.

**Competitor inspiration.** Standard.

---

## Feature 48 — Pin/Star Findings

**What it does.** User can pin findings (across all features) for follow-up. Pinned findings show in a dedicated "Starred" tab and persist across sessions.

**Why it matters for GEO.** Curation. Some findings need a 2-week follow-up rather than immediate action.

**Technical implementation.**
- Star button on every finding card.
- `chrome.storage.local.starredFindings` array.

**External APIs.** None.

**Data flow.** Star click → storage → tab.

**UI/UX.** Star icon on every finding. "Starred" tab in side panel.

**Build complexity.** Small. ~4 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Universal `Finding` schema (feature 30).

**Competitor inspiration.** Standard.

---

## Feature 49 — Export Audit as PDF

**What it does.** "Export PDF" button on any audit → generates a branded PDF report (cover, summary, all findings, recommendations).

**Why it matters for GEO.** Agencies deliver PDFs to clients. This is the single most-requested export format in SEO/GEO tools.

**Technical implementation.**
- Backend renders audit as HTML using a server template, converts via Puppeteer/Playwright PDF export.
- Or: client-side using `jsPDF` + `html2canvas` (cheaper, but less polished).
- Recommendation: server-side for branded layouts.

**External APIs.** None external (Surven backend Puppeteer).

**Data flow.** Audit ID → backend renders → PDF response → side panel download.

**UI/UX.** "Export" dropdown: PDF, CSV (feature 50). PDF option opens preview modal first.

**Build complexity.** Medium. ~16-20 hours including the template design.

**Premium-worthiness.** Plus tier (Free: 1 PDF/month, Plus: unlimited).

**Dependencies.** Backend PDF generator.

**Competitor inspiration.** Every SEO tool. Surven's angle: clean GEO-focused report design.

---

## Feature 50 — Export Findings as CSV

**What it does.** "Export CSV" button → downloads findings table as CSV.

**Why it matters for GEO.** Engineers and project managers want data in spreadsheets to triage in JIRA/Linear.

**Technical implementation.**
- Client-side CSV serialization of findings array. No backend needed.

**External APIs.** None.

**Data flow.** Findings → CSV string → download.

**UI/UX.** "CSV" option in export dropdown.

**Build complexity.** Small. ~3 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Universal `Finding` schema.

**Competitor inspiration.** Universal.

---

## Feature 51 — Scheduled Re-Audit

**What it does.** "Re-audit weekly/monthly" toggle on any audit. Backend runs the audit on schedule, emails the diff (feature 32).

**Why it matters for GEO.** Set-and-forget monitoring. Keeps Surven top-of-mind via the email.

**Technical implementation.**
- POST to `/api/schedule/audit` with `{url, cadence: 'weekly'|'monthly', notifyEmails}`.
- Backend Vercel cron triggers audit on schedule.
- Diff against previous (feature 32) → email if material changes.

**External APIs.** Email (Resend, ~$0.001/email).

**Data flow.** Schedule create → cron → audit → diff → email.

**UI/UX.** "Schedule" toggle on audit results. Settings tab lists all scheduled audits with pause/edit/delete.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Backend cron, feature 32, email service.

**Competitor inspiration.** Standard SaaS pattern.

---

## Feature 52 — Slack/Email Digest

**What it does.** Weekly digest delivered to Slack channel or email summarizing all scheduled audits + leaderboard movement (feature 28) + new gaps.

**Why it matters for GEO.** Keeps the agency team aware of client GEO activity without anyone logging in.

**Technical implementation.**
- Slack: incoming webhook URL configured per workspace.
- Email: Resend HTML template.
- Backend cron (weekly Mondays).

**External APIs.** Slack incoming webhooks (free), Resend.

**Data flow.** Cron → aggregate week's data → format → send.

**UI/UX.** Settings: "Add Slack" (paste webhook), "Email recipients" (comma list). Preview button.

**Build complexity.** Medium. ~14 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Backend cron, scheduled audits.

**Competitor inspiration.** Profound has weekly emails. Standard pattern.

---

## Feature 53 — Public Shareable Audit Link

**What it does.** "Share" button on any audit → generates a public URL (e.g., `surven.vercel.app/share/abc123`) that anyone can view (read-only, hides agency-private data).

**Why it matters for GEO.** Sales tool. "Here's an audit of your site" link sent in cold email = high open rate.

**Technical implementation.**
- POST `/api/share/create` with audit ID. Returns public token URL.
- Public route renders read-only audit view (no auth needed).
- Token expires in 30/90 days (configurable).
- Optional password protection.

**External APIs.** None.

**Data flow.** Audit → POST share → token → public render.

**UI/UX.** Share icon → modal with copy link + expiry + password options.

**Build complexity.** Medium. ~14-18 hours.

**Premium-worthiness.** Premium (also doubles as marketing — every share has a "Try Surven" CTA).

**Dependencies.** Public route on Surven web app.

**Competitor inspiration.** Loom, Notion, Figma all do shareable links. ahrefs has shareable reports. Differentiated by being a sales asset.

---

## Cross-Cutting Notes

- **Side panel state management.** With this many tabs, use a router (React Router or wouter) inside the side panel. Persist last-active tab to `chrome.storage.session`.
- **Background work indicator.** Multi-tab audits (42), site crawls (37), scheduled audits (51) all run in background. Show extension icon badge with "..." while jobs run, ✓ on completion. Use `chrome.action.setBadgeText`.
- **Quotas visible.** Always show "X/Y daily quota used" in the side panel for features that consume credits. Surfaces upgrade nudges (feature 76) at the right moment.
