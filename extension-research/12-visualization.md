# 12 — Visualization (Features 77-80)

How information is shown matters as much as what's shown. This tier turns Surven from a list of findings into a glanceable dashboard.

---

## Feature 77 — Floating Mini-Dashboard

**What it does.** Persistent floating widget (toggle-able) on every page showing: visibility score (feature 6), brand mentions (feature 7), freshness (feature 36), top 1-line finding.

**Why it matters for GEO.** Glanceability. User doesn't have to open the side panel to know whether the page is healthy.

**Technical implementation.**
- Shadow DOM widget injected via content script.
- Pulls cached state from `chrome.storage.session` for the current tab.
- Draggable, dockable to corners, hideable per-domain.
- 200×120px collapsed, expands to 400×300px on click.

**External APIs.** None.

**Data flow.** Audit cache → widget render.

**UI/UX.** Bottom-right by default. Surven logo + score + 3 metric chips. Click expands to show top finding + "Open side panel" CTA.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Free tier (it IS the marketing).

**Dependencies.** Features 6, 7, 36.

**Competitor inspiration.** Wappalyzer, BuiltWith use floating widgets. SimilarWeb extension. Differentiated by GEO-specificity.

---

## Feature 78 — Trend Sparkline (30-Day)

**What it does.** For any audited URL, shows a 30-day sparkline of its visibility score, citation count, and freshness. Inline in the side panel and PDF reports.

**Why it matters for GEO.** Progress visibility. Sparklines compress 30 datapoints into one glance — perfect for client reports.

**Technical implementation.**
- Audit history stored per URL with daily snapshots (rolls in with feature 32).
- Render with `react-sparklines` or hand-rolled SVG.
- Three sparklines: score, citations, freshness.

**External APIs.** None.

**Data flow.** Backend audit history → sparkline data → SVG.

**UI/UX.** Tiny sparklines next to each major metric. Hover for tooltip with value/date.

**Build complexity.** Small. ~6-8 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** Feature 32 audit snapshots.

**Competitor inspiration.** Datadog, Grafana, ahrefs all use sparklines. Universal.

---

## Feature 79 — Citation Source Timeline

**What it does.** For a tracked brand, shows a timeline of every AI citation detected over time across all engines. "Brand cited by ChatGPT for prompt X on May 1, by Claude on May 3, dropped from Perplexity on May 7."

**Why it matters for GEO.** Narrative arc. Replaces "your visibility went from 41 to 47" with "you gained Claude citation for 3 prompts and lost Perplexity for 1 — here's why".

**Technical implementation.**
- Backend Tracker captures every citation event (engine, prompt, URL, timestamp).
- Extension queries `/api/tracker/citations?brand=&since=` → events array.
- Render as vertical timeline with engine icons + event descriptions.

**External APIs.** None new (uses existing engine probes, batched).

**Data flow.** Tracker DB → API → timeline render.

**UI/UX.** "Citation Timeline" tab. Vertical timeline grouped by week. Filter by engine.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Tracker citation tracking, feature 28.

**Competitor inspiration.** Profound has citation logs. Surven angle: timeline UX + per-prompt context.

---

## Feature 80 — Notification Badges on Extension Icon

**What it does.** Badge on the extension toolbar icon shows: number of unread findings since last open, scheduled audit completions, citation alerts.

**Why it matters for GEO.** Re-engagement. Users forget about the extension; the badge brings them back.

**Technical implementation.**
- Background service worker tracks "unseen events" counter.
- `chrome.action.setBadgeText({text: '3'})` and `setBadgeBackgroundColor`.
- Cleared when side panel opens.

**External APIs.** None.

**Data flow.** Background events → counter → badge.

**UI/UX.** Red badge with number on extension icon. Tooltip lists what's unread.

**Build complexity.** Small. ~4-6 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Background event stream.

**Competitor inspiration.** Standard.

---

## Cross-Cutting Notes

- **Charting library**. Use `recharts` or `visx` for in-side-panel charts; `react-sparklines` for inline sparks. Avoid heavy libs (D3 full) — bundle size matters in extensions.
- **Dark mode**. Side panel respects browser dark mode via `prefers-color-scheme`. Match Surven brand for both modes.
- **Animation**. Tasteful only. Reveal-on-scroll for lists (matches Surven brand per CLAUDE.md). No bouncy nonsense.
- **Color discipline**. Stick to the established Surven palette (sage / gold / rust per the brand kit). Don't introduce new colors per feature.
