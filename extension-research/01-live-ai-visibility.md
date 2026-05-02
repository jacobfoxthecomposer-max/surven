# 01 — Live AI Visibility (Features 1-7)

The "wow" tier. Every demo of Surven should open with one of these. Competitors (Profound, Peec, Athena) report on AI visibility *after the fact* on a daily/weekly cadence; we run it **live, in the page, in seconds**. That delta is the entire pitch.

---

## Feature 1 — Multi-Engine Prompt Simulator

**What it does.** User types a prompt in the side panel. Extension fires it in parallel at OpenAI (ChatGPT-equivalent), Anthropic (Claude), Google Gemini, and Google AI Overview (via SerpAPI). Returns the full response from each, with citations parsed.

**Why it matters for GEO.** Clients ask one question: "what does AI say when someone asks about us?" This answers it directly, without leaving the tab they're auditing. It's also the foundation for features 2, 3, 4, 5.

**Technical implementation.**
- Prompt goes to background service worker via `chrome.runtime.sendMessage`.
- Background fans out 4 parallel `fetch()` calls. Use `Promise.allSettled` so a slow Gemini doesn't block ChatGPT.
- Each engine gets a wrapper module (`src/engines/openai.ts`, `claude.ts`, `gemini.ts`, `aio.ts`) with a uniform `runPrompt(prompt, opts) -> {answer, citations[], latencyMs}` signature.
- API keys stored in Surven backend, NOT the extension. Extension calls `surven.vercel.app/api/ai/proxy` which fans out server-side. Reasons: (a) per-client rate limits, (b) key rotation, (c) usage tracking for billing, (d) no MV3 secrets-in-bundle problem.
- Use SSE streaming back to the side panel so first tokens show in <1s.

**External APIs.** OpenAI ($2.50/$10 per M tokens, GPT-4o), Anthropic ($3/$15 Sonnet 4.6 or $1/$5 Haiku 4.5), Gemini ($0.50/$3 Flash 3.0 or $2/$12 Pro 3.0), SerpAPI for AI Overview ($25/1k requests, 68% AIO detection — best in market). Total per-prompt cost: roughly **$0.01-$0.05** depending on output length.

**Data flow.** Page URL + prompt → Surven proxy → 4 LLM APIs in parallel → streamed responses → side panel. Cache by `hash(prompt + engine + model_version)` for 24h to keep costs sane on demos.

**UI/UX.** Side panel tab: "Ask AI". Single textarea, "Run" button, then a 2x2 grid of engine cards (logo + answer + citation chips). Loading skeletons per card. Latency badge ("ChatGPT 1.4s"). "Copy answer" + "Save to audit" buttons per card.

**Build complexity.** Medium. ~24-32 hours including the proxy endpoint.

**Premium-worthiness.** Premium-only. Each fire costs real money; gate behind plan. Free tier gets 5 sims/day, Plus 100/day, Premium unlimited soft-cap.

**Dependencies.** Surven backend `/api/ai/proxy` endpoint, API keys in Surven Vercel env vars.

**Competitor inspiration.** Profound and Peec.ai both do prompt-level tracking but on a fixed prompt set — they don't let you ad-hoc fire a prompt and see all 4 answers in 5 seconds. Athena is closest but their prompt runner is async (queue-based, takes minutes).

---

## Feature 2 — Citation Probe

**What it does.** For the URL the user is currently viewing, asks each engine "given the user prompt X, would you cite this URL?" and if yes, returns the verbatim quote each engine extracts. Highlights that quote in the page DOM via the existing sage-green content script.

**Why it matters for GEO.** This is the **single most valuable feature in the entire backlog**. No GEO competitor offers per-URL citation diagnostics with a verbatim quote. It turns abstract "your visibility is 34/100" into concrete "Claude cites paragraph 3, but only the second sentence — your first sentence is filler".

**Technical implementation.**
- Two-step prompt per engine. Step 1: "What sources would you cite to answer: {prompt}?" → look for the URL in returned citations. Step 2 (only if cited): "Quote the exact passage from {url} that supports your answer."
- For Perplexity Sonar, use single call — it returns structured `citations[]` with URLs and snippets natively. **Use Perplexity as the primary citation backend.**
- For ChatGPT/Claude/Gemini that don't natively cite by URL, use a workaround: fetch the page text server-side, embed in the prompt as `<source url="...">...</source>`, ask the model whether it would use that source, and to quote the relevant span. This is approximate but useful.
- For Google AI Overview, SerpAPI returns the actual `references[]` array.
- Quote-to-DOM matching: send the returned quote string to the content script via `chrome.tabs.sendMessage`. Content script does a normalized text search (collapse whitespace, lowercase) across all `<p>`, `<li>`, `<h*>` text nodes. On hit, wrap with `<span class="surven-quoted">` and `scrollIntoView`.

**External APIs.** Perplexity Sonar ($1/M tokens + $5/1k requests) is best-fit. Backup: Anthropic Haiku ($1/$5) for the "would you quote this?" simulation when Perplexity says no.

**Data flow.** URL + page text (already in content script) → background → Surven proxy → engines → quoted spans → content script highlights → side panel shows engine-by-engine quote cards.

**UI/UX.** Side panel "Citation" tab. Big "Probe this page" button. Auto-suggests the prompt from feature 3 if not provided. Result: 4 engine cards, each showing ✅ Cited / ❌ Not cited. Cited cards show the quote with "Highlight in page" button.

**Build complexity.** Medium-Large. ~32-40 hours, mostly because of the quote-to-DOM matching edge cases (text inside `<strong>`, broken across nodes, etc).

**Premium-worthiness.** Premium killer feature. Free tier: 1 probe/day, gated by signup.

**Dependencies.** Feature 1 (engines plumbing), feature 3 (auto-prompt) for best UX.

**Competitor inspiration.** None do this at the per-URL level. Profound shows "you were cited 12 times this week" but not "this URL would be cited for these prompts with this quote." Massive differentiation.

---

## Feature 3 — Auto-Prompt Generator

**What it does.** Reads the current page (title, h1, h2s, first 2000 chars). Generates 5-10 natural user prompts a person would type into ChatGPT that *should* surface this page.

**Why it matters for GEO.** Removes the "what should I even ask?" blocker. Most clients can't articulate the prompts their customers use. We generate them automatically and run them.

**Technical implementation.**
- Content script extracts: `<title>`, `<meta description>`, all `<h1>`/`<h2>`/`<h3>` text, first 200 words of body.
- Send to background → Surven proxy `/api/ai/generate-prompts`.
- Single Haiku call, prompt template:
  ```
  Given a webpage with title "{title}", description "{desc}", and headings {headings},
  generate 8 distinct natural-language questions a user might ask ChatGPT
  where this page would be a good answer. Mix transactional, informational,
  and comparison intents. Return JSON: {"prompts": ["..."]}.
  ```
- Cache by URL hash for 7 days.

**External APIs.** Anthropic Haiku 4.5 ($1/$5). Cost: ~$0.001 per page. This should NOT be billed to the user.

**Data flow.** Page metadata → Haiku → JSON list of prompts → side panel as clickable chips → click → fires feature 1.

**UI/UX.** Auto-runs on every audit. Shows 8 prompt chips at top of side panel. Click chip = run feature 1 with that prompt prefilled. "Generate more" button.

**Build complexity.** Small. ~8 hours.

**Premium-worthiness.** Free-tier OK. Cost is negligible and it's the gateway drug for features 1 and 2.

**Dependencies.** Surven proxy endpoint for Haiku.

**Competitor inspiration.** AlsoAsked and AnswerThePublic do something similar from search-data perspective. Frase has a "questions" panel. Nobody does it from a *page-context* angle in a browser extension.

---

## Feature 4 — Engine Diff View

**What it does.** Side-by-side comparison of feature-1 outputs. Highlights factual contradictions between engines, flags claims that appear in only one engine (likely hallucination or unique source).

**Why it matters for GEO.** Clients are terrified of being misrepresented by AI. This shows them exactly *where* engines disagree about their brand — and which engine is the "wrong" one.

**Technical implementation.**
- Take all 4 engine answers from feature 1.
- Single Sonnet call: "These four answers were given by different AI systems to the same prompt. Identify (a) facts present in all 4, (b) facts present in some but not others, (c) any factual contradictions between them. Return JSON: `{consensus: [], partial: [{fact, engines: []}], contradictions: [{claim_a, engine_a, claim_b, engine_b}]}`."
- Render with color: consensus = sage, partial = gold, contradictions = rust.

**External APIs.** Anthropic Sonnet 4.6 ($3/$15). Cost: ~$0.005 per diff (long context, short output).

**Data flow.** 4 answers → Sonnet aggregator → structured diff → side panel diff renderer.

**UI/UX.** Tab in the simulator panel: "Diff". 3 sections: "All engines agree", "Partial coverage", "Contradictions". Each contradiction is its own card with the two opposing claims.

**Build complexity.** Small-Medium. ~12-16 hours.

**Premium-worthiness.** Plus tier and up. Free = run sim only, Plus = unlock diff.

**Dependencies.** Feature 1.

**Competitor inspiration.** None do this. Closest analog is BrightLocal's review-platform diff. Genuinely novel for GEO.

---

## Feature 5 — "What Would AI Quote From This Page?"

**What it does.** For the current page, predicts the exact paragraph each of the 4 engines would extract as their citation, without requiring a prompt.

**Why it matters for GEO.** Answers the question: "if AI cites me, what will it say?" Lets clients fix that paragraph until the quote is on-message.

**Technical implementation.**
- Content script extracts paragraphs as `[{idx, text, headingContext}]`.
- Background sends to Surven proxy → single Sonnet call: "Below are the paragraphs of a webpage. For each AI engine (ChatGPT, Claude, Gemini, AIO), identify the paragraph index that engine would most likely extract as its citation snippet, and the 1-2 sentence verbatim quote it would pull. Score each from 0-100 for extractability. Heuristics: factual density, self-contained answer, length 40-60 words preferred, presence of entities, schema-friendly structure."
- Highlight the predicted paragraph in the page with engine-specific border colors.

**External APIs.** Sonnet 4.6 ($3/$15), one call per audit (~$0.01).

**Data flow.** Page paragraphs → Sonnet → `{engine, paragraphIdx, quote, score}[]` → content script highlights + side panel cards.

**UI/UX.** Side panel: "Predicted Quotes" section, 4 cards (one per engine). Each card shows the predicted quote + "Show in page" button that scrolls + flashes the paragraph.

**Build complexity.** Medium. ~16-20 hours.

**Premium-worthiness.** Premium. This is a daily-use feature for active optimizers.

**Dependencies.** Content script paragraph extraction (already exists per CLAUDE.md context).

**Competitor inspiration.** None. This is a Surven invention.

---

## Feature 6 — Visibility Score Per Page (0-100) Floating Badge

**What it does.** A small floating badge (corner of the page) that shows a 0-100 GEO score for the current page, computed locally + with one cheap API call. Updates as the user browses.

**Why it matters for GEO.** Ambient awareness. Clients leave the extension on during normal browsing and start to develop intuition for what "good GEO" looks like across the web.

**Technical implementation.**
- Composite score from local-only signals (no API hit on every page load):
  - Schema present (LocalBusiness/Product/FAQ/etc.) — 20 pts
  - Answer capsule (40-60 word paragraph in first 200 words after H1) — 20 pts
  - Meta description quality (length 140-160, includes h1 keyword) — 10 pts
  - Heading structure (H1 + H2s present) — 10 pts
  - llms.txt at root — 10 pts (cached per origin)
  - Word count between 600-3000 — 5 pts
  - Internal links ≥3 — 5 pts
  - Author byline / publish date present — 10 pts
  - Image alt-text coverage ≥80% — 10 pts
- Compute in content script in <50ms.
- Inject a small badge via Shadow DOM (avoid CSS collisions). User can drag, hide, or click → opens side panel.

**External APIs.** None for the score itself.

**Data flow.** Page load → content script computes score → injects badge via Shadow DOM → click → opens side panel with breakdown.

**UI/UX.** 56px circular badge bottom-right. Score in center, color ring (sage/gold/rust). Hover: tooltip with top 3 issues. Click: opens side panel.

**Build complexity.** Medium. ~16 hours including the badge UX (drag, hide-per-domain, etc.).

**Premium-worthiness.** Free-tier hook. The badge IS the marketing — clients see it on every page and want to know more.

**Dependencies.** Score formula must align with one-click-fix categories (feature 14-23) so scores improve when fixes are applied.

**Competitor inspiration.** Wappalyzer and BuiltWith use floating badges. Lighthouse browser extension shows a numeric score. None are GEO-specific.

---

## Feature 7 — Live Brand Mention Counter (Per Domain Visit)

**What it does.** Tracks across an entire browsing session: every time the user visits any page, fires lightweight checks for "is the configured client brand mentioned on this page?" and tallies. Shows running counter in extension popup ("Brand X seen on 12 of 47 pages this session").

**Why it matters for GEO.** Lets agencies do "presence sweeps" — open 50 competitor or industry pages, see how often their client appears. Useful for share-of-voice reporting.

**Technical implementation.**
- Side panel settings: "Tracked brand: [Acme Corp]" + aliases.
- Content script on every page: case-insensitive text search across body for brand name + aliases. Count mentions, capture surrounding 80-char context.
- Send to background → store in `chrome.storage.session` per session, `chrome.storage.local` per all-time tally.
- Reset on browser restart or manual clear.

**External APIs.** None. Pure local.

**Data flow.** Page text → regex match → counter increment → storage → popup readout.

**UI/UX.** Extension icon badge shows current session count. Popup shows: "12 mentions across 47 pages this session" + scrollable list of `{url, count, snippet}`. Export CSV.

**Build complexity.** Small. ~8-10 hours.

**Premium-worthiness.** Plus tier. Niche but power-users love it.

**Dependencies.** Settings UI for brand config.

**Competitor inspiration.** Brand24, Mention.com do social listening but not browser-side. Genuinely useful gap.

---

## Cross-Cutting Notes for This Tier

- All 7 features share the **engine wrapper layer** (`src/engines/*.ts`) and the **Surven proxy** (`/api/ai/proxy`). Build the proxy first; everything else slots in.
- Cache aggressively. A single `(url, prompt, engine, day)` cache key in Vercel KV cuts API spend by 80%+ on agency clients who probe the same pages repeatedly.
- Stream everything via SSE. Users abandon if the side panel sits at "Loading..." for >2s.
- Rate-limit per Surven account, not per-extension-install (extensions are easy to clone).
