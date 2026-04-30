# Homepage AI Visibility Research Findings

**Date:** 2026-04-27  
**Scope:** What actually drives business homepage ranking/visibility in ChatGPT, Google AI, and Gemini  
**Focus:** Homepage + key landing pages, schema markup, ChatGPT & Google AI priority  
**Status:** Research phase — ready to validate with Jake before building audit rules

---

## Executive Summary

This document synthesizes research on 80+ industry sources on how businesses actually rank in AI searches. Key finding: **Schema markup is infrastructure, not a magic bullet.** It works best alongside these four pillars:

1. **Structured Data (Schema Markup)** — Tells AI systems what your content is about
2. **Content Freshness** — Pages updated within 30 days get 3.2x more citations
3. **Third-Party Authority** — Citations from Yelp, BBB, Google Business Profile, industry directories
4. **E-E-A-T Signals** — Experience, Expertise, Authoritativeness, Trustworthiness on your homepage

AI models don't rank sites by a single factor. They rank by combining signals across all four pillars. A site weak in schema but strong in fresh content + third-party mentions will still rank well.

---

## Part 1: Structured Data (Schema Markup)

### What Works

**Schema markup acts as a highlighting mechanism, not a ranking signal.**

Key findings:
- Pages with **schema + matching visible content** show significantly better extraction in AI responses
- Schema-only pages (info in schema tags but not visible on page) are **completely ignored by ChatGPT, Claude, Gemini, Perplexity**
- Tier 1 schema types generate **3:1 improvement in AI citation rate vs. unstructured content**
- Schema can boost **chances of appearing in AI summaries by 36%+**

**Why it matters for homepage:**
AI systems struggle to parse unstructured HTML. Schema markup makes your content machine-legible. Instead of the AI trying to guess "Is this person a dentist or a lawyer?", schema says clearly: `"@type": "LocalBusiness", "areaServed": ["Austin, TX", "San Antonio, TX"]`

### Top Priority Schema Types for Business Homepages

**Tier 1 (Must Have — Highest Impact)**

1. **Organization Schema**
   - What it does: Tells AI systems your company name, logo, contact info, areas served
   - Why it matters: Establishes your brand identity, feeds into knowledge panels
   - Impact: 40% of AI responses include Organization info
   - Example: `"name": "Acme Plumbing", "areaServed": "Austin, TX", "telephone": "+1-512-555-1234"`

2. **LocalBusiness Schema (or Service-Specific: Plumber, Dentist, Lawyer, etc.)**
   - What it does: Adds geographic context + service type
   - Why it matters: AI models answer "best plumber near me" by pulling LocalBusiness schema
   - Impact: **Critical for service-based businesses** — without it, you're invisible in "near me" searches
   - Example: `"@type": "Plumber", "areaServed": "Austin, TX", "priceRange": "$$"`

3. **FAQPage Schema**
   - What it does: Structures Q&A content so AI systems recognize answer-capsule-eligible questions
   - Why it matters: **28-40% higher citation probability** vs. unstructured FAQ content
   - Impact: **78% of AI-generated answers are in list/Q&A format** — FAQ schema matches this perfectly
   - Best for: Service businesses with common customer questions ("How much does a plumbing inspection cost?", "What should I do about low water pressure?")

**Tier 2 (High Impact — Implement if Relevant)**

4. **BreadcrumbList Schema**
   - What it does: Shows page hierarchy to AI systems
   - Impact: Helps AI understand site structure; 15% citation improvement
   - When to use: If homepage links to service pages, about page, contact, etc.

### Schema Implementation Reality Check

**What the research shows:**
- Schema alone doesn't guarantee AI mentions
- If your dentist homepage has perfect Organization + LocalBusiness schema but no third-party mentions (no Yelp, no Google reviews), you're still low-ranking
- Schema works best when: **visible content matches the schema** (e.g., homepage text says "We serve Austin, TX" AND schema says `"areaServed": "Austin, TX"`)

**Common mistakes:**
- ❌ Adding Organization schema but leaving address blank
- ❌ FAQ schema with AI-generated FAQs (not real customer questions)
- ❌ LocalBusiness schema with missing phone/hours

---

## Part 2: Content Freshness & Recency

### The Freshness Signal

**AI models heavily favor recent content:**

- Pages **updated within 30 days** are cited by ChatGPT at **3.2x the rate** of older pages
- **76.4% of ChatGPT's most-cited pages were updated within 30 days**
- Content updated within 3 months gets **nearly 2x more citations** vs. older content
- Content is **25.7% fresher in AI results** than traditional Google search results

### Why Freshness Matters

AI models have recency bias because:
1. Training data is time-bound (ChatGPT's training cut-off is April 2024)
2. Current-year content is more likely to be accurate (especially for time-sensitive topics)
3. Fresh updates signal that the business is active and trustworthy

### Homepage Freshness Best Practices

**What counts as "fresh":**
- Last update date is within 30 days (ideal)
- Last update date is within 90 days (good)
- Last update date is >6 months ago (stale, hurts ranking)

**What to update on homepage:**
1. **Services offered** — Remove discontinued services, add new ones
2. **Team members** — Add new staff photos, update bios
3. **Pricing** — Update if prices changed
4. **Testimonials/Case studies** — Add recent client reviews or projects
5. **News/Blog** — Link to recent blog posts about industry trends
6. **Hours/Contact info** — Ensure current
7. **Meta description** — Refresh to reflect current offerings

**Update frequency:**
- Ideal: Every 2-4 weeks
- Minimum: Every 90 days
- Death spiral: >6 months without update = AI models deprioritize you

### Recency Lag

Important caveat: There's a **6-12 week lag between updating your page and ChatGPT citing it.** This is because:
- ChatGPT's training data is a snapshot (not real-time)
- Perplexity and Google AI are fresher (1-2 week lag) because they do real-time web crawling

---

## Part 3: Third-Party Authority & Citations

### The Authority Gap

**Finding: Traditional backlinks and domain authority have minimal impact on AI citations.**

- 95% of AI citation behavior is unexplained by traffic metrics
- 97.2% of AI citation behavior is unexplained by backlink profiles
- **47% of AI Overview citations come from pages ranking below position #5 in Google Search**

**Translation:** You don't need to rank #1 in Google to rank #1 in AI. But you do need third-party mentions.

### What AI Systems Trust

**Tier 1: Trusted Third-Party Data Sources**

1. **Google Business Profile**
   - Why: Google's own product, directly feeds into AI Overviews
   - Critical fields: Name, address, phone, hours, photos, categories, posts
   - Impact: Inconsistencies here actively undermine AI trust (e.g., address on GBP ≠ address on website = AI confusion)

2. **Yelp**
   - Why: ChatGPT pulls up to **70% of local business data from Foursquare**, and Yelp appears in ~1/3 of AI searches
   - Critical info: Business name, category, ratings, reviews
   - Impact: Being on Yelp = 2-3x higher citation rate

3. **BBB (Better Business Bureau)**
   - Why: Strong trust signal (accreditation, ratings)
   - Impact: BBB-listed businesses cited more often

4. **Industry-Specific Directories**
   - Dentists: Zocdoc, Healthgrades
   - Lawyers: Avvo, FindLaw
   - Restaurants: OpenTable, Grubhub
   - Plumbers: HomeAdvisor, Angie's List
   - Why: AI trusts these as authoritative sources for that industry

5. **Review Sites**
   - Google Reviews
   - Trustpilot
   - Industry-specific (e.g., Cleanboss for house cleaning)
   - Why: High review count = social proof of real customers

### Citation Consistency Matters

**Critical finding:** Inconsistencies actively hurt AI ranking.

Example: If your business info is inconsistent across sources:
- Name: "Acme Plumbing" vs. "ACME Plumbing LLC"
- Address: "123 Main St, Austin, TX" vs. "123 Main Street, Austin TX 78701"
- Phone: "(512) 555-1234" vs. "512-555-1234"

**Result:** AI systems see conflicting information about your entity and either:
- Don't cite you at all (safest option)
- Cite you with wrong info (phone number, address, hours)

### Multi-Platform Presence

**Major finding:** Businesses present on 4+ platforms are **2.8x more likely** to appear in ChatGPT responses than single-platform presence.

**Minimum platforms for AI visibility:**
1. Website (homepage optimized)
2. Google Business Profile
3. Yelp
4. BBB or industry-specific directory

**Ideal for service businesses:**
1. Website + homepage
2. Google Business Profile
3. Yelp
4. BBB
5. Industry directory (Zocdoc, Avvo, Cleanboss, etc.)
6. Review site (Google Reviews, Trustpilot)

---

## Part 4: E-E-A-T Signals

### What is E-E-A-T?

**E-E-A-T = Experience, Expertise, Authoritativeness, Trustworthiness**

- **Experience:** First-hand knowledge (e.g., dentist performing procedures, not just reading about them)
- **Expertise:** Credentials, education, proven track record
- **Authoritativeness:** External recognition (other sources cite you, mention you, link to you)
- **Trustworthiness:** Accuracy, transparency, reliability

### Why AI Systems Care

**Finding: 96% of AI Overview content comes from sources with verified E-E-A-T signals.**

AI models use E-E-A-T as a proxy for "Should I cite this source?" If a page demonstrates E-E-A-T, it's eligible for citation.

### Demonstrating E-E-A-T on Homepage

**Experience:**
- Show photos of your team working with clients
- Tell the story of how you started (personal background builds experience credibility)
- Feature case studies/before-and-after photos
- Highlight time in business ("Serving Austin since 1995")

**Expertise:**
- List certifications (licensed dentist, certified plumber, bar-licensed lawyer)
- Show degrees and educational background
- Link to speaking engagements, publications, industry awards
- Team member bios with detailed credentials

**Authoritativeness:**
- Feature third-party mentions ("Featured in Austin Business Journal")
- Display award badges (BBB, Best of Austin, etc.)
- Show high review scores from Yelp, Google, Trustpilot
- Link to interviews or media features
- Industry association memberships (CDA, ADA, etc.)

**Trustworthiness:**
- Clear contact information (phone, email, address, hours)
- Transparent pricing (or "call for quote" with clear expectations)
- Client reviews visible on homepage (pull from Yelp, Google, Trustpilot)
- Author information for content (who wrote this, what are their credentials)
- Updated copyright, privacy policy, terms
- Secure website (HTTPS, not HTTP)

### The Trust Hierarchy

**Critical insight:** "Trust is the most important member of the E-E-A-T family. Untrustworthy pages have low E-E-A-T no matter how Experienced, Expert, or Authoritative they may seem."

**Trust hierarchy for AI systems:**
1. **Trustworthiness** (foundation) — Without this, the others don't matter
2. **Authoritativeness** (proof) — External validation that you're real
3. **Expertise** (credentials) — Your qualifications
4. **Experience** (story) — How you got here

---

## Part 5: Homepage-Specific Optimization

### Meta Description & Title Tags

**Meta Title (Page `<title>` tag):**
- Length: 50-60 characters (ensures full display)
- Include primary keyword
- Front-load important info (company name + main service)
- Example: "Acme Plumbing | Austin TX Plumber | 24/7 Emergency Service"

**Meta Description:**
- Length: 155 characters
- Should match visible content on page
- Include primary keyword naturally
- Example: "Trusted Austin plumber since 1995. Emergency repairs, installations, inspections. Licensed, insured. 24/7 service."

**Important note:** Google (and AI systems) override and rewrite >62% of meta descriptions dynamically. So don't stress over perfection — just ensure they're honest and match your content.

### Homepage Content Structure

**AI systems prefer structured content:**
- **44.2% of all LLM citations come from the first 30% of text** on a page
- Use clear headings (H1, H2, H3)
- Use bullet lists, not paragraphs
- Use step-by-step lists
- Short paragraphs (2-3 sentences max)

**Homepage sections that boost AI visibility:**
1. **Hero section:** Clear value proposition + primary keyword
2. **Services list:** Bulleted or card-based (not paragraph prose)
3. **Credentials section:** Licenses, certifications, awards
4. **Recent work/testimonials:** Case studies, client quotes (recent = fresh signal)
5. **FAQ section:** With FAQPage schema
6. **Contact information:** Clear CTA (call, email, form)

### Position Bias in AI Results

**Critical finding:** "Position bias is brutal. Being mentioned fifth in a list is almost the same as not being mentioned at all."

**Translation:** If AI lists 10 plumbers and you're #6, users rarely see you. You need to be in the top 3.

**To rank in top 3, you need:**
1. Organization + LocalBusiness schema (technical foundation)
2. Fresh content (updated within 30 days)
3. Strong third-party presence (4+ platforms, consistent info)
4. E-E-A-T signals (reviews, credentials, third-party mentions)

---

## Part 6: What Doesn't Work (or is Minimal Impact)

**These have minimal impact on AI visibility:**

- ❌ Domain Authority (r = 0.18, vs. 0.23 in 2024 — declining)
- ❌ Backlinks (97.2% of AI citation behavior unexplained by backlink profiles)
- ❌ Traffic metrics (95% unexplained)
- ❌ Page load speed (not a ranking factor)
- ❌ Mobile responsiveness (not a ranking factor, though good practice)
- ❌ Keyword density (AI systems understand semantic meaning, not keyword count)
- ❌ Schema-only content (schema markup without visible matching content is ignored)

**These have minimal but non-zero impact:**

- ~ Keyword placement in title (helps slightly, but not huge)
- ~ SSL certificate (good for trust, but minor signal)
- ~ Page length (longer isn't always better, structure matters more)

---

## Part 7: Audit Rules — What We Should Check

Based on research above, here are the **high-confidence audit rules** we should implement in Phase 1:

### Rule 1: Organization Schema Missing
- **Severity:** CRITICAL
- **Why:** Establishes your identity; 40% of AI responses use this
- **Check:** Look for `<script type="application/ld+json">` with `"@type": "Organization"` and fields: name, logo, contact, URL, areaServed
- **Time to fix:** 30 minutes
- **Impact:** 8/10

### Rule 2: LocalBusiness Schema Missing
- **Severity:** HIGH (for service-based/local businesses)
- **Why:** Essential for "near me" searches; 2.8x visibility improvement with 4+ platforms
- **Check:** Look for `"@type": "LocalBusiness"` or service-specific (Plumber, Dentist, etc.) with: address, phone, hours, areaServed
- **Time to fix:** 45 minutes
- **Impact:** 9/10 (for local/service businesses)

### Rule 3: FAQPage Schema Missing
- **Severity:** HIGH
- **Why:** 28-40% higher citation probability; 78% of AI answers are Q&A format
- **Check:** Look for `"@type": "FAQPage"` with mainEntity array of question-answer pairs
- **When to apply:** Only if homepage has 3+ common customer questions
- **Time to fix:** 1 hour
- **Impact:** 8/10

### Rule 4: Content Freshness — Page Not Updated in 90+ Days
- **Severity:** HIGH
- **Why:** Pages updated in 30 days get 3.2x more citations
- **Check:** Look for last-modified date in HTTP headers, `<meta>` tags, or page footer
- **Time to fix:** 15 minutes (quick update to a section)
- **Impact:** 7/10

### Rule 5: Meta Description Missing or Too Short
- **Severity:** MEDIUM
- **Why:** Shows up in AI contexts; should match visible content
- **Check:** Look for `<meta name="description">` tag, length 100-160 characters
- **Time to fix:** 10 minutes
- **Impact:** 4/10

### Rule 6: No Visible Credentials/Authority Signals
- **Severity:** MEDIUM
- **Why:** E-E-A-T signals (certifications, licenses, awards, third-party mentions) boost trust
- **Check:** Look for visible elements: licenses, certifications, awards, review scores, "Featured in" mentions
- **Time to fix:** 30 minutes to 2 hours (depends on what you add)
- **Impact:** 6/10

### Rule 7: Missing Citation Consistency Check
- **Severity:** HIGH
- **Why:** Inconsistencies between website, Google Business Profile, Yelp, BBB actively hurt AI trust
- **Check:** Manual verification (out of scope for automated crawl, but flag for user to review)
- **Time to fix:** 1-2 hours (manual audit across platforms)
- **Impact:** 8/10

### Rule 8: Title Tag Missing or Too Long
- **Severity:** LOW-MEDIUM
- **Why:** Should be 50-60 characters, include primary keyword
- **Check:** Look at `<title>` tag length and keyword inclusion
- **Time to fix:** 5 minutes
- **Impact:** 3/10

---

## Part 8: What We're NOT Auditing (Phase 1)

**Out of scope:**

- ❌ Backlink analysis (too complex, not controllable by business)
- ❌ Keyword research (outside AI visibility scope)
- ❌ Page load speed (not an AI ranking factor)
- ❌ Mobile responsiveness (good to have, not AI-specific)
- ❌ Accessibility/WCAG compliance (important, but separate from AI)
- ❌ Multiple schema types (focus on top 3: Organization, LocalBusiness, FAQ)
- ❌ Competitive benchmarking (Phase 2)
- ❌ Site authority/domain age (not controllable)

---

## Part 9: Audit Accuracy Validation Checklist

**Before we launch the audit, we need to validate these assumptions:**

- [ ] **Does Organization schema actually correlate with better AI mentions?** (Run on 10 test sites, measure mentions before/after adding it)
- [ ] **Does fresh content (30-day update) actually improve rankings?** (Compare sites updated recently vs. stale)
- [ ] **Do sites with 4+ citations actually rank 2.8x higher?** (Validate the multi-platform claim)
- [ ] **Do FAQPage schema pages really get 28-40% more citations?** (Spot-check 5 FAQ pages)
- [ ] **Is E-E-A-T visibility real?** (Do pages with clear credentials rank higher than those without?)

**Success bar:** Before shipping, we need to confirm at least 3 of these 5 assumptions are correct in our testing.

---

## Sources

### Schema Markup & Structured Data
- [Schema Markup and AI in 2025 — SearchViu](https://www.searchviu.com/en/schema-markup-and-ai-in-2025-what-chatgpt-claude-perplexity-gemini-really-see/)
- [Generative Engine Optimization — Sid Bharath](https://www.siddharthbharath.com/generative-engine-optimization/)
- [The Semantic Value of Schema Markup in 2025 — Schema App Solutions](https://www.schemaapp.com/schema-markup/)
- [Schema Markup for AI Search — SEOtimer](https://www.seoptimer.com/blog/schema-markup-for-ai-search/)

### FAQ Schema Specifically
- [FAQPage Schema — Am I Cited](https://www.amicited.com/blog/faqpage-schema-ai-answers/)
- [FAQ Schema for AI Visibility — Snezzi](https://snezzi.com/blog/faq-schema-for-ai-visibility-transform-support-pages/)
- [FAQ Schema AI Answers — Frase.io](https://www.frase.io/blog/faq-schema-ai-search-geo-aeo/)

### Content Freshness
- [AI Search & Content Freshness — Quattr](https://www.quattr.com/blog/content-freshness)
- [Content Freshness in ChatGPT — Matt A Kumar](https://www.mattakumar.com/blog/how-to-rank-in-chatgpt-using-recency-bias/)
- [The 13-Week Rule — Rank and Convert](https://rank-and-convert.ghost.io/the-13-week-rule-how-content-freshness-drives-ai-search-citations/)
- [AI Search Optimization Insights — SEOmator](https://seomator.com/blog/ai-search-optimization-insights)

### Citations & Third-Party Authority
- [Why Third-Party Sites Are the Secret Weapon — Real Internet Sales](https://www.realinternetsales.com/third-party-sites-ai-marketing-secret-weapon/)
- [Brand Mentions vs. Citations — Wellows](https://wellows.com/blog/brand-mentions-vs-citation/)
- [Guide to Unstructured Citations — Whitespark](https://whitespark.ca/guides/whitesparks-guide-to-unstructured-citations-for-ai-visibility/)

### E-E-A-T Signals
- [E-E-A-T as a Ranking Signal in AI Search — Clickpoint Software](https://blog.clickpointsoftware.com/google-e-e-a-t)
- [E-E-A-T and Domain Authority — Chris Raulf](https://chrisraulf.com/ai-seo-success-eeat-and-domain-authority-are-the-foundation/)
- [E-E-A-T Signals for AEO — NORG AI](https://home.norg.ai/digital-marketing-search-optimization/answer-engine-optimization-aeo/e-e-a-t-signals-for-aeo-how-to-build-the-authority-ai-systems-trust-and-cite/)

### Meta Tags & Titles
- [How to Optimize Title Tags & Meta Descriptions — Straight North](https://www.straightnorth.com/blog/title-tags-and-meta-descriptions-how-to-write-and-optimize-them-in-2026/)
- [Meta Descriptions — Yoast](https://yoast.com/meta-descriptions/)
- [Page Titles for SEO — Yoast](https://yoast.com/page-titles-seo/)

### General AI Search Optimization
- [How to Optimize Content for AI Search Engines — Semrush](https://www.semrush.com/blog/how-to-optimize-content-for-ai-search-engines/)
- [AI Overviews Optimization Guide — Search Engine Land](https://searchengineland.com/guide/how-to-optimize-for-ai-overviews)
- [AI Search Optimization in 2025 — SEOmator](https://seomator.com/blog/ai-search-optimization-insights)

---

## Next Steps

1. **Validate with Jake:** Does this research match Surven's internal data? Any signals we should prioritize/deprioritize?
2. **Build audit rules:** Based on above, implement the 8 rules (all 8, or just the top 4?)
3. **Create test suite:** Audit 10 real business sites, manually verify findings, confirm rules are accurate
4. **Set success bar:** Before launch, >80% of findings must be actionable and accurate

---

**Document Owner:** Research Phase  
**Last Updated:** 2026-04-27  
**Next Review:** After Jake validates findings
