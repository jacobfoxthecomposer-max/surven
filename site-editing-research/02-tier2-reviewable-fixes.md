# Tier 2 — Reviewable Fixes (Fixes 26–41)

Tier 2 fixes change visible content. They cannot auto-merge by default. Every Tier-2 fix opens a PR (or a draft change in the CMS) and requires explicit client approval. The diff preview MUST include a rendered before/after, not just code.

The implementation pattern is the same across the tier: **propose → preview → approve → write → re-measure**. The differences are in *what* is generated.

---

## Content rewrites (26–33)

### 26. Answer-capsule rewrites (40–60 word AI-extractable answers)
- **What:** Rewrite the first paragraph (or insert a new lead paragraph) of any page that has a clear question intent so it answers the question in 40–60 words, in plain declarative prose, with the entity name in the first sentence.
- **Why:** AI engines preferentially extract the first paragraph that answers the implicit query. A page that buries the answer in paragraph 4 loses the citation.
- **How:** LLM rewrite, constrained by a strict template: `[Entity] is [definition]. [Differentiator]. [Concrete fact / number].` Capped at 60 words.
- **PR shape:** one-paragraph diff per page. Bulk PRs across 5–20 pages are common.
- **Idempotency:** wrap in `<!-- surven:answer-capsule v=N -->` so re-runs detect prior version.
- **Risk:** Medium-high. Always preview rendered output. Surven offers 3 variants per capsule.
- **GEO impact:** This is the single highest-leverage Tier-2 fix.

### 27. Heading hierarchy fixes (H1/H2 errors)
- **What:** Ensure exactly one H1, no skipped levels (H2→H4), no styled-as-heading paragraphs.
- **How:** AST transform on MDX/HTML; for WP/Shopify rich text, use a sanitizer pass that promotes/demotes tags.
- **Risk:** Medium. Visible styling may shift; preview must show rendered output.

### 28. FAQ block insertion on thin pages
- **What:** Append an `<h2>FAQ</h2>` section with 3–6 generated Q/A pairs and matching FAQ schema (#11).
- **How:** Generate Q/A from page topic + competitor PAA scrape; force questions to match real search intent.
- **Risk:** High — fabricated answers are a brand risk. Approval required on every page.

### 29. Paragraph restructure (split walls of text)
- **What:** Split paragraphs >120 words into 2–3 shorter paragraphs at natural break points.
- **Risk:** Low — non-content-changing.

### 30. Bullet/numbered list conversion
- Detect comma-separated enumeration prose and convert to `<ul>` / `<ol>`.

### 31. Table of contents insertion
- For pages >800 words with ≥3 H2s, insert anchor-linked TOC after the lead paragraph.

### 32. Definition blocks for entity association
- Insert `<dl>` definition lists for technical terms; helps AI engines associate the page with its entity.

### 33. Author byline section
- If author exists in CMS but not rendered, add a byline block linking to author page (which gets Person schema #16).

---

## Internal linking (34–37)

### 34. Suggest + add internal links (orphan pages)
- **What:** Find orphan pages (no inbound internal links) and propose 1–3 mention sites where a contextual link makes sense.
- **How:** Embeddings index of the site; rank candidate paragraphs by cosine sim to orphan page; LLM verifies the suggested anchor reads naturally.
- **PR shape:** one PR per orphan page, modifying 1–3 source files.
- **Risk:** Medium — anchor text may read awkwardly. Always preview.

### 35. Anchor links for long pages
- Add `id` attributes to H2/H3 to enable deep-linking. AI engines can cite specific sections.

### 36. Related articles sections
- Append a "Related" component at the end of articles; populated from same-cluster pages.
- Framework-specific: Next.js inserts a React component; WP uses `the_content` filter; Shopify section.

### 37. Broken internal link fixes
- Crawler finds 4xx internal links; PR rewrites them to the redirected target or removes if dead.
- Risk: low. Often safely auto-merge after first manual review.

---

## Freshness (38–41)

### 38. Update last-modified dates
- **What:** Update `dateModified` in Article schema and any visible "Last updated" field when Surven made non-trivial changes (>20% content delta or any answer-capsule rewrite).
- **Idempotency:** only update when content actually changed; never bump dates without a real change (Google penalizes this).

### 39. "Updated [date]" badges on evergreen pages
- Visible badge near the H1. Improves CTR and AI freshness signals.

### 40. Refresh stale stats/dates in content
- Detect "as of 2023", "in the last 12 months", named years; LLM proposes updates with citations.
- Risk: high — fabrication risk. Always require approval and source citation.

### 41. Publication date schema
- Add `datePublished` if missing. Auto-merge eligible if a real publication date exists in the CMS.

---

## Risk Summary Table

| Fix | Auto-merge eligible? | Default approval gate | Risk |
|-----|----------------------|------------------------|------|
| 26 Answer capsule | No | Per-page | Medium-high |
| 27 Heading fix | No | First-time per site | Medium |
| 28 FAQ insertion | No | Per-page | High |
| 29 Paragraph split | Yes after first review | Per-site | Low |
| 30 List conversion | Yes after first review | Per-site | Low |
| 31 TOC | Yes after first review | Per-site | Low |
| 32 Definition blocks | No | Per-page | Medium |
| 33 Byline | Yes | Per-site | Low |
| 34 Internal links | No | Per-page | Medium |
| 35 Anchor links | Yes | None | Very low |
| 36 Related sections | No | Per-site | Low |
| 37 Broken link fix | Yes after first review | Per-site | Low |
| 38 Last-modified | Yes (only on real change) | None | Low |
| 39 Updated badge | Yes | Per-site | Low |
| 40 Stale stats | No | Per-page | High |
| 41 Pub date schema | Yes | None | Low |

## Diff Preview UX Requirements

For Tier-2, the approval screen must show:
1. **Rendered before/after** (Vercel preview deploy or screenshot diff).
2. **Word-level diff** of the source.
3. **GEO rationale** in one sentence: "Why does this matter? Surven detected this page lacks an answer-capsule for the query 'X', which is why ChatGPT does not cite it."
4. **Re-measurement promise:** "Surven will re-scan in 48 hours and report whether AI mentions increased."
5. **One-click revert** post-merge in case the change misfires.
