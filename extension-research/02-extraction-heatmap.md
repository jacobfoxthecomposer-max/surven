# 02 — AI Extraction Heatmap (Features 8-13)

The heatmap is the visual identity of the extension. When a user clicks "Audit", the page tints sage/gold/rust by paragraph and they instantly understand which content AI will love and which AI will ignore. Build this first — it's what makes screenshots go viral on LinkedIn.

Anchored on the well-supported heuristic: **72% of pages cited by ChatGPT have an answer capsule of 40-60 words within the first 200 words**. Everything in this section serves that heuristic.

---

## Feature 8 — Color-Coded Extraction Overlay (Sage / Gold / Rust)

**What it does.** Overlays every paragraph (and every list item, table cell, h-tag chunk) on the live page with a translucent background tint based on its AI-extractability score. Sage = AI will love this, gold = OK, rust = AI will skip it.

**Why it matters for GEO.** Visualizes the invisible. A client looking at their About page can immediately see that 8 of 10 paragraphs are rust because they're brand fluff with no factual content.

**Technical implementation.**
- Content script walks DOM: `document.querySelectorAll('p, li, h2, h3, td, blockquote, dd')`.
- For each node, compute local features (no API call):
  - Word count (target 40-60)
  - Sentence count (target 1-3)
  - Entity density (count proper nouns via regex `\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b` or use winkNLP NER for accuracy)
  - Number/stat density (regex for `\d+(?:\.\d+)?\s*(?:%|million|billion|users|customers)`)
  - Hedge word penalty (count of "might", "could", "perhaps", "maybe")
  - Self-contained-ness (does it begin with "It", "This", "They" referring to outside context? Penalize.)
  - Has direct answer signal (begins with imperative or declarative — "X is...", "To Y, do Z.")
- Score 0-100, bucket: 0-39 rust, 40-69 gold, 70-100 sage.
- Inject CSS via `chrome.scripting.insertCSS`. Use `box-shadow: inset 0 0 0 9999px rgba(...)` for tint without changing layout.
- Toggle visibility with extension button. Remember per-tab via `chrome.storage.session`.

**External APIs.** None. Pure local. Optional: one Haiku call to refine top-10 ambiguous mid-scoring paragraphs.

**Data flow.** Page DOM → content script scoring → CSS injection → visible overlay → side panel shows aggregate (e.g., "47% sage, 31% gold, 22% rust").

**UI/UX.** Toggle button in side panel: "Show heatmap". When on, paragraphs are tinted in-page. Hover any paragraph: tooltip shows score breakdown ("Score 34: too long (89 words), uses 'we' 4× without antecedent, 0 entities").

**Build complexity.** Medium. ~20-24 hours including the local scoring engine.

**Premium-worthiness.** Free tier — this IS the marketing demo. Show the heatmap on the prospect's homepage in the first 10s of any sales call.

**Dependencies.** None.

**Competitor inspiration.** Frase's "Topic Score" is a single page-wide number. Surfer's content editor highlights keyword presence. None do per-paragraph color overlays in-browser. Genuinely novel.

---

## Feature 9 — Per-Paragraph Quote Score

**What it does.** Numeric 0-100 score on each paragraph driving feature 8, exposed on hover with a breakdown.

**Why it matters for GEO.** The number gives clients a target. "Get this paragraph from 34 to 70+" is actionable feedback.

**Technical implementation.**
- Same scoring function as feature 8, but expose each component:
  - Length score (gaussian centered on 50 words, σ=15)
  - Structure score (1-3 sentences = full credit)
  - Factual density score (entities + stats per 100 words, normalized)
  - Self-contained score (penalize anaphora to absent referents)
  - Entity coverage score (does it name the brand? a product? a place?)
- Total = weighted sum (length 0.25, structure 0.15, factual 0.30, self-contained 0.15, entity 0.15).
- Tunable weights stored in `chrome.storage.sync` so power users can adjust.

**External APIs.** None.

**Data flow.** Paragraph node → score function → JSON `{total, breakdown, suggestions}` → tooltip on hover.

**UI/UX.** Tooltip: bar chart of 5 sub-scores + 1-line "Top fix: shorten from 89 to ~50 words."

**Build complexity.** Small (rolls into feature 8). +~6 hours.

**Premium-worthiness.** Free tier (rolls in with heatmap).

**Dependencies.** Feature 8.

**Competitor inspiration.** Lighthouse's per-rule breakdown is a similar pattern. Nobody does this for AI extractability.

---

## Feature 10 — Entity Overlay (Brand / Product / Location / Competitor)

**What it does.** Highlights every named entity on the page in color: brand name = blue, product = teal, location = green, competitor = red.

**Why it matters for GEO.** AI search is entity-driven. Clients can see "we mention our own brand 3 times but our competitor 8 times" or "this page never names the city we serve".

**Technical implementation.**
- Use `winkNLP` with `wink-eng-lite-web-model` (load from CDN as content script asset, ~5MB).
- Run NER on full page text. Get entity spans with types (PERSON, ORG, GPE, PRODUCT).
- Cross-reference user-configured brand/competitor list (settings).
- Wrap entity spans with `<mark class="surven-entity-{type}">` via DOM walker (skip script/style tags).

**External APIs.** None — local NLP. Optional fallback: OpenAI GPT-4o-mini structured output if winkNLP misses domain-specific entities.

**Data flow.** Page text → winkNLP NER → categorized entities → DOM mark wrap → side panel "Entity Map" with counts.

**UI/UX.** Toggle "Show entities" in side panel. Entity legend chips with counts: "Brand × 3, Competitor × 8, Location × 2, Product × 5". Click chip filters which entities are highlighted.

**Build complexity.** Medium. ~16-20 hours (winkNLP integration + DOM walker performance for big pages).

**Premium-worthiness.** Plus tier. Power-user feature.

**Dependencies.** Settings for brand/competitor list (overlaps with feature 7, 24).

**Competitor inspiration.** Diffbot, Dandelion API do entity extraction. None show it as an in-page overlay in a Chrome extension.

---

## Feature 11 — Answer-Capsule Detector

**What it does.** Identifies paragraphs that *are* answer-capsule shaped (40-60 words, self-contained, declarative, lead a section). Flags pages that have NO answer capsule.

**Why it matters for GEO.** This is the single highest-leverage GEO fix. A page with no answer capsule + no schema is invisible to AI. Detecting absence is as important as detecting presence.

**Technical implementation.**
- Walk the DOM in document order.
- For each `<h2>` or `<h3>`, find the next text-bearing element (`<p>` or `<div>` containing text).
- Check: word count between 40-60 (allow 35-75 with reduced score), 1-3 sentences, no leading anaphora, contains a noun phrase matching the heading topic.
- Score each H2 → capsule mapping.
- Aggregate: `{totalH2s, withCapsule, withoutCapsule, weakCapsule}`.

**External APIs.** None.

**Data flow.** DOM headings + paragraphs → capsule detector → aggregate stats + per-heading status → side panel "Answer Capsules" panel with checkmarks/x's per H2.

**UI/UX.** Side panel section: "Answer Capsules: 3 of 8 sections have one." Below: list of all H2s with green check ✓ or red × and "Generate" button (links to feature 16).

**Build complexity.** Small-Medium. ~12 hours.

**Premium-worthiness.** Free tier (drives upgrades to feature 16 rewriter, which is Premium).

**Dependencies.** Feature 16 (rewriter) for the action.

**Competitor inspiration.** None — answer-capsule terminology is recent (2025). Surven can own this concept.

---

## Feature 12 — Question-Answer Block Detector

**What it does.** Finds Q&A patterns on the page (FAQ sections, "What is..." headings, definition lists). Scores them for AI-readiness. Suggests upgrade to FAQPage schema.

**Why it matters for GEO.** FAQ blocks are gold for AI extraction — they map directly to question-answering. But most are unstructured HTML; AI can extract them but they perform 3-5× better with FAQPage schema.

**Technical implementation.**
- Pattern detection:
  - Headings starting with "What/Why/How/When/Where/Who/Is/Are/Can/Do/Does"
  - `<dl>`/`<dt>`/`<dd>` definition lists
  - Adjacent `<details>`/`<summary>` accordions
  - "Q:" / "A:" prefixed paragraphs (regex)
- For each detected Q&A pair, check whether parent has FAQPage schema. Score: has-schema = 100, structured-but-no-schema = 60, prose-only = 30.

**External APIs.** None.

**Data flow.** DOM → Q&A pattern detector → list of pairs with status → side panel + "Generate FAQPage schema" CTA (feature 19).

**UI/UX.** "Q&A Blocks" panel. Detected pairs as cards. Bulk "Generate FAQ schema for all" button.

**Build complexity.** Small-Medium. ~10-14 hours.

**Premium-worthiness.** Free tier detector, Premium auto-generate.

**Dependencies.** Feature 19 (FAQ schema generator).

**Competitor inspiration.** Schema App, Merkle's schema generator detect existing schema. None proactively detect *prose* Q&A pairs and suggest schema upgrade.

---

## Feature 13 — Schema Visibility Overlay

**What it does.** Highlights DOM regions that ARE covered by JSON-LD schema in sage. Highlights regions that SHOULD have schema but don't (Product cards without Product schema, FAQ blocks without FAQPage, etc.) in rust.

**Why it matters for GEO.** Schema is the cleanest signal AI uses to extract structured data. Showing the "schema-covered" vs "schema-naked" regions is impossible in any current dev tool.

**Technical implementation.**
- Parse all `<script type="application/ld+json">` tags. Build a list of `{type, properties, mainEntityOfPage?}`.
- For each schema entity, attempt to map back to DOM:
  - Match `name` property to nearest H1/H2 by string similarity.
  - Match `image` URLs to `<img src>` on page.
  - Match `description` to nearest paragraph by string similarity (>0.6).
  - For Product schema: bracket the matched region.
- For unmapped DOM regions, run heuristic detectors:
  - Price + name + image triplet → should be Product schema.
  - Star rating + reviewer name → should be Review schema.
  - Author + date + headline → should be Article schema.
  - Address + phone → should be LocalBusiness or PostalAddress.
- Outline matched regions with sage border. Outline "should have schema" regions with rust dashed border + tooltip "Add Product schema".

**External APIs.** None local. Optional: schema.org validator API (free, rate-limited) for validation step.

**Data flow.** JSON-LD scripts + DOM → mapping algorithm → outlined regions + side panel summary.

**UI/UX.** Side panel "Schema" tab: list of all schemas detected with type + node count. Toggle "Show schema overlay" outlines the regions in-page.

**Build complexity.** Medium-Large. ~24-32 hours — DOM mapping is fiddly.

**Premium-worthiness.** Plus tier (detection), Premium (auto-generation via feature 14).

**Dependencies.** Feature 14 for the "fix" action.

**Competitor inspiration.** Google's Rich Results Test shows schema in isolation. Schema.dev highlights JSON-LD. None visualize the *gap* between schema and DOM.

---

## Cross-Cutting Notes

- **Performance**: For pages with >500 paragraphs (long blogs), debounce the heatmap to lazy-render only viewport+next-screen. Use `IntersectionObserver`.
- **Shadow DOM**: For overlays/badges (features 6, 8, 10), use Shadow DOM to avoid CSS bleed from the host page. Critical for overlay reliability.
- **Reading mode**: Add a "Reading Mode" detector — if Mozilla Readability extracts <30% of body text, the page is mostly chrome (nav/footer/ads) and the heatmap should focus only on the article region.
- **Accessibility**: Heatmap colors must pass contrast for users with color blindness — provide a "patterns" toggle (stripes/dots/solid instead of color).
