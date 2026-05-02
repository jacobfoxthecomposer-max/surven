# 03 — One-Click Fixes (Features 14-23)

The heatmap and citation probe make problems visible; this tier *fixes them in one click*. Conversion from "ooh interesting" → "I have to keep using this" happens here. Every fix produces output the user can paste into their CMS or copy into a code review.

---

## Feature 14 — JSON-LD Schema Generator

**What it does.** Reads the current page, infers schema type (LocalBusiness / Product / FAQPage / HowTo / Article / Recipe / Event / Organization), generates a complete JSON-LD `<script>` block, and offers copy-to-clipboard or "send to dev" via Surven backend.

**Why it matters for GEO.** Schema is consistently the highest-correlation signal with AI citation. Most clients have either no schema or wrong schema. Auto-generation from page content removes the entire "I don't know how to write JSON-LD" barrier.

**Technical implementation.**
- Type detection: heuristic + LLM hybrid.
  - URL pattern (`/product/`, `/blog/`, `/recipe/`, `/event/`, `/about/`) → strong signal.
  - DOM signals: price + add-to-cart → Product. Author byline + publish date → Article. Steps with numbered list → HowTo. Address + phone → LocalBusiness.
  - Fallback: send title + first 500 chars to Haiku → "Which schema.org type best fits this page? Return one of: LocalBusiness, Product, Article, FAQPage, HowTo, Recipe, Event, Organization, WebPage."
- Generation:
  - For each detected type, have a Sonnet template that maps DOM to schema fields.
  - Example for Article: `{author: extracted byline, datePublished: extracted date, headline: H1, image: og:image or first content img, articleBody: full text, publisher: configured client org}`.
- Validation: run output through `schemarama` (open-source schema validator that runs locally) OR call schema.org validator API.

**External APIs.** Anthropic Sonnet 4.6 ($3/$15) for generation, ~$0.01/page. Optional: schema.org validator (free, rate-limited).

**Data flow.** DOM extraction → type detection → Sonnet generates schema → local validation → side panel renders pretty-printed JSON-LD with "Copy" and "Email to dev" buttons.

**UI/UX.** Side panel "Generate Schema" section. Detected type chip ("Article ✓ confirmed") with edit dropdown. Full JSON-LD in code block with syntax highlighting. Copy / Download .json / Send to Optimizer buttons. Below: a "What this does" plain-English explanation per field.

**Build complexity.** Medium-Large. ~32-40 hours (10 schema types × extraction + validation + UX).

**Premium-worthiness.** Premium. This is a $50/page service if a client paid a freelancer. Killer paid-tier feature.

**Dependencies.** Feature 13 (visibility overlay) for context.

**Competitor inspiration.** Schema App ($), Merkle Schema Generator (free, manual), Schema.dev. None do automatic-from-page in a browser extension. Schema App is closest but is a $200/mo standalone tool.

---

## Feature 15 — `llms.txt` Builder

**What it does.** Takes the site's sitemap.xml + a list of "key pages" (auto-detected: homepage, /about, /pricing, /docs, /products), fetches each, summarizes, and assembles a spec-compliant llms.txt file.

**Why it matters for GEO.** llms.txt is the emerging standard (llmstxt.org spec, supported by Yoast/Mintlify/Firecrawl). Surven generating it for free in the browser is differentiating. Acts as a soft "we're AI-friendly" signal to crawlers.

**Technical implementation.**
- Sitemap fetch: try `/sitemap.xml`, `/sitemap_index.xml`, fall back to crawling links from homepage.
- Page selection: rank pages by URL importance heuristics (top-level paths, presence in nav, link count).
- For each page: fetch via Surven backend (avoids CORS), extract title + meta description + first 200 chars.
- Assemble per spec:
  ```markdown
  # Brand Name

  > One-line summary of what this site is.

  ## Docs
  - [Title](url): description

  ## Optional
  - [Title](url): description
  ```
- Generate both `llms.txt` (nav summary) and `llms-full.txt` (full content of key pages).

**External APIs.** None for fetching (Surven proxy). One Haiku call to write the summary blockquote (~$0.001).

**Data flow.** Sitemap → Surven backend crawls → Haiku summarizes → assembled markdown → side panel preview + Download.

**UI/UX.** "Generate llms.txt" button. Progress bar while crawling (10-25 pages typically). Markdown preview with "Download llms.txt" + "Download llms-full.txt" + "Upload to root" instructions ("place this file at https://yoursite.com/llms.txt").

**Build complexity.** Medium. ~20-24 hours including the backend crawl endpoint.

**Premium-worthiness.** Plus tier. Free for first generation, Premium for re-generation/scheduling.

**Dependencies.** Surven backend `/api/crawl/sitemap` endpoint.

**Competitor inspiration.** Firecrawl has an llms.txt generator (paid). Mintlify auto-generates for hosted docs. Yoast for WordPress. Surven can be the universal browser-based alternative.

---

## Feature 16 — Answer-Capsule Rewriter

**What it does.** User pastes (or selects via right-click) a paragraph. Returns 3 variants: 40-60 word AI-extractable rewrite, optimized for the page topic.

**Why it matters for GEO.** The capsule is the single most leveraged GEO unit. Rewriting is faster than writing from scratch and produces consistent quality.

**Technical implementation.**
- Trigger: side panel paste, OR right-click selected text → "Rewrite as answer capsule" (feature 45 sibling).
- Sonnet prompt:
  ```
  Rewrite the following paragraph as a 40-60 word "answer capsule":
  - Begin with a declarative answer to the implied question.
  - Self-contained (no "this", "they", "we" referring outside).
  - Include 1-2 specific facts or entities from the original.
  - 1-3 sentences.
  Provide 3 variants tuned for: (1) ChatGPT (analytical), (2) Claude (conversational, hedge-aware), (3) Gemini (concise, factual).
  Return JSON: {variants: [{engine, text, wordCount}]}.
  ```
- Show variants side-by-side. "Use this" copies to clipboard.

**External APIs.** Sonnet 4.6, ~$0.003 per rewrite.

**Data flow.** Selected text → Sonnet → 3 variants → side panel cards.

**UI/UX.** Tab "Rewriter". Textarea (autofills with right-click selection). 3 variant cards stacked, with word count, "Copy" button, and "Replace in page (preview)" button that shows what the page would look like with the variant inserted (no actual save — just preview).

**Build complexity.** Small. ~8-12 hours.

**Premium-worthiness.** Premium. Free tier: 3 rewrites/day, Premium: unlimited.

**Dependencies.** None (standalone).

**Competitor inspiration.** Frase, Surfer have AI-rewrite features but not answer-capsule-specific. Differentiated by the explicit format constraint.

---

## Feature 17 — Meta Description Rewriter (GEO-Optimized)

**What it does.** Rewrites the page's meta description as 5 GEO-optimized variants (140-160 chars, includes primary entity, declarative, includes a citation-friendly fact).

**Why it matters for GEO.** AI engines (especially AIO and Perplexity) often surface meta descriptions verbatim as snippet previews. A GEO-tuned description = more clicks from AI surfaces.

**Technical implementation.**
- Same pattern as feature 16. Sonnet template tuned for meta length + structure.
- Pre-fill with current `<meta name="description">`.
- Variants vary on: primary intent (informational/transactional/comparison), tone, entity placement.

**External APIs.** Haiku 4.5 ($1/$5) — meta is short enough that Haiku is fine. ~$0.0005 per call.

**Data flow.** Current meta + H1 + first paragraph → Haiku → 5 variants → side panel.

**UI/UX.** "Meta" tab. Current meta shown with character count. 5 variant cards, each with char count + "Copy". Highlight if any exceed 160 chars (Google truncation).

**Build complexity.** Small. ~6-8 hours.

**Premium-worthiness.** Plus tier.

**Dependencies.** None.

**Competitor inspiration.** Surfer, Frase, ahrefs all have meta rewriters. We differentiate by GEO framing (entity-first, fact-first).

---

## Feature 18 — Title Tag Rewriter

**What it does.** Same as feature 17 for `<title>`. 5 variants ≤60 chars, optimized for AI extraction (primary entity early, qualifier late, no clickbait).

**Why it matters for GEO.** Title is a heavy signal for both AI and SERPs.

**Technical implementation.** Identical pattern to feature 17.

**External APIs.** Haiku, ~$0.0003.

**Data flow / UI/UX.** Same as feature 17 with 60-char limit.

**Build complexity.** Small. ~4 hours (rolls in with feature 17).

**Premium-worthiness.** Plus tier.

**Dependencies.** Feature 17 share infra.

**Competitor inspiration.** Standard SEO tool feature.

---

## Feature 19 — FAQ Block Generator

**What it does.** Takes the page content and generates a JSON-LD FAQPage schema with 5-8 Q&A pairs derived from the actual page topic.

**Why it matters for GEO.** FAQ schema wins outsized AI extraction because Q&A maps directly to user prompts. Even pages without prose Q&A can benefit from a generated FAQPage block in the footer.

**Technical implementation.**
- Read page text. Sonnet prompt: "Generate 5-8 question-answer pairs that a reader of this page would actually ask. Each answer must be 40-80 words, factually grounded in the source text. Return as schema.org FAQPage JSON-LD."
- Validate output against schema.org FAQPage required fields.

**External APIs.** Sonnet, ~$0.005.

**Data flow.** Page text → Sonnet → JSON-LD → side panel.

**UI/UX.** "Generate FAQ" button (also offered as the action on feature 12 detector). Output: editable Q&A pairs (in case user wants to tweak) + final JSON-LD copy.

**Build complexity.** Small-Medium. ~12 hours.

**Premium-worthiness.** Premium.

**Dependencies.** Feature 12 detector for context, feature 14 schema infra.

**Competitor inspiration.** Schema App's FAQ generator is the closest. Frase's FAQ tool. We win on auto-from-page-content.

---

## Feature 20 — HowTo Schema Generator

**What it does.** For pages with step-by-step content (recipes, tutorials, guides), generates HowTo JSON-LD with steps, tools, supplies, time.

**Why it matters for GEO.** HowTo is heavily extracted by AI for "how to..." prompts. Required schema for AI Overview's step displays.

**Technical implementation.**
- Detection: numbered lists ≥3 items, OR `<ol>` of length ≥3, OR headings matching `Step \d+`.
- Generation: Sonnet extracts steps + descriptions, optional tools/supplies, total time estimate.

**External APIs.** Sonnet, ~$0.005.

**Data flow.** Detected step blocks → Sonnet → HowTo JSON-LD → side panel.

**UI/UX.** "HowTo" tab visible only when steps detected. Editable step list + JSON-LD output.

**Build complexity.** Small. ~10 hours (rolls in with feature 14).

**Premium-worthiness.** Premium.

**Dependencies.** Feature 14.

**Competitor inspiration.** Same as feature 19.

---

## Feature 21 — Alt-Text Generator for Images

**What it does.** Finds all `<img>` without `alt` attribute (or alt="") and generates descriptive, GEO-friendly alt text via vision model.

**Why it matters for GEO.** Image alt-text is a citation signal AI uses to "see" images. Also accessibility win. Often missed.

**Technical implementation.**
- Content script collects all `<img>` lacking alt: `[{src, surroundingText, idx}]`.
- Background sends image URLs (not base64 — let the model fetch) to Surven proxy.
- Use **GPT-4o-mini with vision** ($0.15/$0.60 per M, ~$0.001 per image) — cheaper than Claude Haiku for vision currently.
- Prompt: "Describe this image in 8-15 words for SEO/AI alt text. Include any visible text, brand, product, or location. Don't start with 'Image of...'."
- Return alt strings, render as side-by-side list.

**External APIs.** OpenAI GPT-4o-mini vision. Cost: ~$0.001 per image.

**Data flow.** `<img>` URLs → backend → vision model → alt strings → side panel + "copy all as HTML attributes" export.

**UI/UX.** "Images" tab. Grid of thumbnails with current alt (or empty) + suggested alt + Copy. "Copy all as HTML diff" gives a paste-into-CMS block.

**Build complexity.** Small-Medium. ~12-16 hours.

**Premium-worthiness.** Plus tier (10 images/day free, unlimited Premium).

**Dependencies.** None.

**Competitor inspiration.** Alt Text Generator (Chrome extension, basic), Frase. Differentiated by GEO framing + bulk export.

---

## Feature 22 — Canonical URL Fixer

**What it does.** Detects pages missing `<link rel="canonical">` or with mismatched/wrong canonical (canonical points to different page than the one being viewed). Suggests correct canonical.

**Why it matters for GEO.** AI crawlers respect canonical signals. Multiple pages with the same content fragment dilute citations across URLs. Wrong canonical = wrong URL gets cited.

**Technical implementation.**
- Read `<link rel="canonical" href>`. Compare to `window.location`.
- If missing: suggest `window.location.href` (without query strings unless they're meaningful).
- If mismatched: warn and suggest the user verify intent.
- Detect duplicate-content risk: if other URLs in the user's audit history have the same H1 + first paragraph, flag.

**External APIs.** None.

**Data flow.** Page DOM + history → fixer → side panel warning + suggested HTML snippet.

**UI/UX.** Single "Canonical" status row in the page audit. Green if correct, gold if missing, rust if mismatched. Suggested HTML snippet to paste.

**Build complexity.** Small. ~4-6 hours.

**Premium-worthiness.** Free tier.

**Dependencies.** Audit history (feature 47).

**Competitor inspiration.** Standard SEO tool feature (Screaming Frog, Sitebulb).

---

## Feature 23 — OpenGraph + Twitter Card Generator

**What it does.** Generates `og:*` and `twitter:*` meta tags from page content, with a preview of how the link will look when shared on Twitter, LinkedIn, Facebook, Slack, Discord, iMessage.

**Why it matters for GEO.** OG data is increasingly used by AI engines (Perplexity, AIO) as fallback citation metadata. Also drives social distribution which feeds back into AI training data.

**Technical implementation.**
- Read existing OG/Twitter tags. Identify missing/incomplete.
- Generate suggestions: `og:title` from `<title>`, `og:description` from meta or feature 17, `og:image` from largest in-page image (or generate dimensions warning if not 1200×630), `og:type` from schema type detection.
- Render link previews as static HTML snapshots matching each platform's renderer.

**External APIs.** None for generation. Optional: og-image generation API (Vercel OG, free) for missing images.

**Data flow.** DOM meta + Sonnet for description → suggested tags + previews.

**UI/UX.** "Social" tab. 6 platform preview cards (Twitter/X, LinkedIn, FB, Slack, Discord, iMessage) showing current vs. proposed. Final HTML block to copy.

**Build complexity.** Medium. ~14-18 hours (the previews are the bulk of the work).

**Premium-worthiness.** Plus tier.

**Dependencies.** Feature 17 for description.

**Competitor inspiration.** Metatags.io, opengraph.xyz. None integrated into a GEO audit flow.

---

## Cross-Cutting Notes

- **Shared "Generator" architecture.** Build a `Generator` interface: `{detect(page), generate(input) -> output, validate(output)}`. Every fix slots in. Reduces per-feature code and lets Surven add new schema types (Recipe, Event, Course) trivially later.
- **"Send to Optimizer" button** (feature 30) is the universal CTA on every fix output — turns each fix into a Surven backend ticket.
- **Diff preview**. For features that suggest replacement HTML (16, 17, 18, 21), build a single "preview diff" component that renders before/after side-by-side. Reusable across all fixes.
- **Telemetry**. Track which fixes are most-used and which clients use them. This data tells you what to build next.
