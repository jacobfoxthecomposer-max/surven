# Surven Website Audit Rules — Final Definition

**Date:** 2026-04-27  
**Status:** Ready for implementation  
**Rules:** 8 (all launching Phase 1)  
**Success Bar:** User implements fixes within 1 month → sees measurable improvement in AI mentions  
**Based on:** HOMEPAGE-AI-VISIBILITY-RESEARCH-2026.md

---

## Rule 1: Organization Schema Missing

**Severity:** 🔴 CRITICAL  
**Impact Score:** 8/10  
**Time to Fix:** 30 minutes  
**Affects:** ~40% of AI responses (per research)

### What We Check

Look for `<script type="application/ld+json">` tag containing:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Business Name]",
  "url": "[Website URL]",
  "logo": "[Logo URL]",
  "contact": { ... },
  "areaServed": [ ... ]
}
```

**Required fields:**
- ✅ `name` (business name)
- ✅ `url` (homepage URL)
- ✅ `contact` (phone or email)

**Ideal fields (boost ranking):**
- ✅ `logo` (brand image)
- ✅ `areaServed` (geographic focus)
- ✅ `foundingDate` (establishes longevity)

### Why It Matters

Organization schema tells AI systems "This is a real business called [X], here's how to contact them." Without it, AI systems struggle to parse your basic identity.

**Research finding:** 40% of AI responses include Organization information. Pages with clear Organization schema are more likely to be cited correctly (with correct business name, phone, address).

### User-Facing Explanation

> **Organization Schema Missing**
>
> AI systems need to know who you are. Organization schema is like a business card in machine-readable format. It tells ChatGPT, Google AI, and Gemini: "This is Acme Plumbing, founded in 1995, serving Austin, TX. Here's the phone number: 512-555-1234."
>
> Without it, AI systems guess who you are based on visible text alone—which often leads to mistakes or omissions.
>
> **How to fix:** Add Organization schema to your homepage `<head>`. Include your business name, website URL, phone number, and service areas. Should take 15-30 minutes.
>
> **Impact:** High. This is foundational for AI visibility. Fix this first.

---

## Rule 2: LocalBusiness Schema Missing

**Severity:** 🔴 CRITICAL  
**Impact Score:** 9/10  
**Time to Fix:** 45 minutes  
**Affects:** Local "near me" searches; 2.8x visibility boost with multi-platform presence

### What We Check

Look for `<script type="application/ld+json">` containing:
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness" OR "[ServiceType]",
  "name": "[Business Name]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Address]",
    "addressLocality": "[City]",
    "addressRegion": "[State]",
    "postalCode": "[ZIP]"
  },
  "telephone": "[Phone]",
  "openingHoursSpecification": [ ... ],
  "areaServed": [ ... ]
}
```

**Accepted `@type` values** (service-specific is better):
- ✅ `LocalBusiness` (generic)
- ✅ `Plumber`, `Dentist`, `Lawyer`, `Restaurant`, `Salon` (service-specific — preferred)

**Required fields:**
- ✅ `name` (business name)
- ✅ `address` (full postal address)
- ✅ `telephone` (phone number)

**Ideal fields:**
- ✅ `openingHoursSpecification` (hours of operation)
- ✅ `areaServed` (service area, e.g., "Austin, TX, San Antonio, TX")
- ✅ `priceRange` (e.g., "$$" for moderate pricing)

### Why It Matters

LocalBusiness schema is critical for "near me" searches. When someone asks ChatGPT or Google AI "best plumber near me in Austin," the AI systems look for pages with LocalBusiness or Plumber schema tagged with `areaServed: "Austin, TX"`.

**Research finding:** Businesses with LocalBusiness schema + multi-platform citations (4+) are 2.8x more likely to appear in AI recommendations. Without it, you're invisible in location-based searches.

### User-Facing Explanation

> **LocalBusiness Schema Missing**
>
> When someone searches "best dentist near me," AI systems use LocalBusiness schema to find matches. Without it, they can't tell if you serve that area or not.
>
> This schema tells AI: "We're a dentist in Austin, TX, open Mon-Fri 8am-5pm, phone: 512-555-1234, and we serve Austin, Round Rock, and Cedar Park."
>
> **How to fix:** Add LocalBusiness (or your specific service type like "Dentist", "Plumber", etc.) schema to your homepage. Include your full address, phone, hours, and service areas. Should take 30-45 minutes.
>
> **Impact:** CRITICAL. This determines if you show up in location-based AI searches. Fix immediately after Organization schema.

---

## Rule 3: FAQPage Schema Missing

**Severity:** 🟠 HIGH  
**Impact Score:** 8/10  
**Time to Fix:** 1 hour  
**Affects:** Answer capsule eligibility; 28-40% higher citation probability

### What We Check

Look for `<script type="application/ld+json">` containing:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Question text]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer text]"
      }
    }
  ]
}
```

**Requirements:**
- ✅ Must have `FAQPage` type
- ✅ Must have 3+ question-answer pairs (minimum)
- ✅ Questions must be real customer questions (not generic)
- ✅ Answers must be self-contained and complete (not "see more")

**Quality checks:**
- ✅ Questions should be 5-15 words (natural questions)
- ✅ Answers should be 50-300 words (complete, not snippets)
- ✅ Questions should match visible content on page

### Why It Matters

78% of AI-generated answers are in Q&A or list format. FAQPage schema tells AI systems: "Here are the questions customers actually ask, and here are the answers." This makes your content eligible for answer capsules.

**Research finding:** Pages with FAQPage schema see 28-40% higher citation probability. Pages with FAQ-structured content but NO schema see much lower citations.

### User-Facing Explanation

> **FAQ Schema Missing**
>
> AI systems love answering questions. If your homepage has a "Common Questions" section, adding FAQ schema tells AI: "Here are real customer questions and your answers."
>
> Example questions for a dentist:
> - "How much does a cleaning cost?"
> - "Do you take my insurance?"
> - "What should I do about tooth sensitivity?"
>
> With FAQPage schema, these questions are 28-40% more likely to trigger AI citations.
>
> **How to fix:** Add 5-10 real customer questions to your FAQ section (if you don't have one, create one). Wrap them in FAQPage schema. Should take 45 min to 1 hour.
>
> **Impact:** High. This directly increases answer capsule visibility. Do this after Organization and LocalBusiness schemas.

---

## Rule 4: Content Not Updated in 90+ Days

**Severity:** 🟠 HIGH  
**Impact Score:** 7/10  
**Time to Fix:** 15 minutes  
**Affects:** Recency signals; 3.2x more citations for content updated within 30 days

### What We Check

Look for last-modified date from:
1. HTTP `Last-Modified` header
2. `<meta property="article:modified_time">` tag
3. Visible text on page (e.g., footer "Last updated: April 2026")
4. File modification timestamp (if accessible)

**Flags raised when:**
- ⚠️ **CRITICAL:** No update date found, or date is >180 days old
- ⚠️ **HIGH:** Last updated 90-180 days ago
- ✅ **GOOD:** Updated within 90 days
- ✅ **EXCELLENT:** Updated within 30 days

### Why It Matters

AI models heavily favor recent content. Pages updated within 30 days get cited 3.2x more than stale pages. This makes sense: recent content is more likely to be accurate, especially for service businesses (prices change, new services added, team updates, etc.).

**Research finding:** 76.4% of ChatGPT's most-cited pages were updated within 30 days. Content freshness is now more important than traditional backlinks.

### User-Facing Explanation

> **Homepage Content Is Stale**
>
> AI systems prefer fresh content. If your homepage hasn't been updated since 2023, ChatGPT and Google AI assume your business info might be outdated (old prices, old team, old services).
>
> Pages updated within 30 days get cited 3.2x more often than pages older than 6 months.
>
> **How to fix:** Update at least one section of your homepage. Examples:
> - Add a new team photo
> - Update pricing
> - Add a recent client testimonial or project
> - Write a brief "What's new" section
> - Update hours or services offered
>
> Set a calendar reminder to update your homepage every 4 weeks.
>
> **Impact:** High. This directly improves your citation frequency. Don't skip this.

---

## Rule 5: Meta Description Missing or Too Short

**Severity:** 🟡 MEDIUM  
**Impact Score:** 4/10  
**Time to Fix:** 10 minutes  
**Affects:** Snippet display in AI responses

### What We Check

Look for `<meta name="description">` tag.

**Flags raised when:**
- ❌ **CRITICAL:** Meta description is missing entirely
- ⚠️ **MEDIUM:** Meta description is <100 characters
- ⚠️ **MEDIUM:** Meta description is >160 characters
- ✅ **GOOD:** 100-160 characters, includes primary keyword, matches visible content

### Why It Matters

Meta descriptions don't directly rank you, but they affect how your page appears in AI snippets. A good meta description:
- Summarizes your value proposition
- Includes your primary keyword
- Matches the visible content above-the-fold

**Note:** Google and AI systems override ~62% of meta descriptions, but having a good one helps.

### User-Facing Explanation

> **Meta Description Missing/Too Short**
>
> Your meta description is like a movie trailer for your homepage. It shows up in search results and AI snippets.
>
> Example (too short): "Dentist in Austin"  
> Example (good): "Trusted Austin dentist since 1995. Family & cosmetic dentistry. New patients welcome. Call (512) 555-1234."
>
> **How to fix:** Write a 100-160 character description that:
> - Includes your business name + main service
> - Includes your location
> - Includes a benefit or CTA
> - Matches what's actually on your homepage
>
> Should take 5-10 minutes.
>
> **Impact:** Medium. This is polish, not critical, but worth doing.

---

## Rule 6: No Visible Credentials/Authority Signals

**Severity:** 🟡 MEDIUM  
**Impact Score:** 6/10  
**Time to Fix:** 30 minutes to 2 hours  
**Affects:** E-E-A-T signals; 96% of AI content comes from sources with verified E-E-A-T

### What We Check

Look for visible elements on homepage:
- ✅ Licenses/certifications (e.g., "Licensed Dentist", "BBB Accredited", "Certified Plumber")
- ✅ Years in business (e.g., "Serving Austin since 1995")
- ✅ Awards/recognition (e.g., "Best of Austin 2024", "Award-winning")
- ✅ Client reviews/testimonials (star ratings, quotes)
- ✅ Team credentials (team member bios with titles/experience)
- ✅ "Featured in" badges (media mentions, industry publications)
- ✅ Third-party validation (Yelp reviews, Google reviews, BBB rating)

**Flags raised when:**
- ❌ **CRITICAL:** None of the above are visible on homepage
- ⚠️ **MEDIUM:** Only 1-2 of the above present
- ✅ **GOOD:** 3+ of the above present
- ✅ **EXCELLENT:** 5+ of the above present

### Why It Matters

AI systems look for E-E-A-T signals:
- **Experience:** Visible story (since 1995, X years in business)
- **Expertise:** Visible credentials (licenses, degrees, certifications)
- **Authoritativeness:** External validation (awards, media mentions, high reviews)
- **Trustworthiness:** Clear contact info, reviews, credentials

**Research finding:** 96% of AI Overview content comes from sources with verified E-E-A-T signals. Without visible credentials, AI systems see your site as less trustworthy.

### User-Facing Explanation

> **Missing Credentials & Authority Signals**
>
> AI systems ask: "Should I trust this source?" Your homepage should answer:
> - Who are you? (name, years in business)
> - Are you qualified? (licenses, degrees, certifications)
> - Do others trust you? (reviews, awards, mentions)
>
> **How to fix:** Add visible elements to your homepage:
> 1. **Years in business:** "Serving Austin since 1995" or "20+ years experience"
> 2. **Licenses:** Display your licenses (CPA, DDS, Plumbing License, etc.)
> 3. **Reviews:** Show Google or Yelp star ratings
> 4. **Team bios:** Link to staff credentials
> 5. **Awards:** Display any "Best of" badges, awards, or recognition
> 6. **"Featured in":** If you've been mentioned in media, add badges
>
> Pick the 3-5 that apply to your business. Should take 30 min to 2 hours.
>
> **Impact:** Medium-High. This builds trust with AI systems. Do this before launching.

---

## Rule 7: Citation Consistency Not Verified

**Severity:** 🔴 CRITICAL (manual audit required)  
**Impact Score:** 8/10  
**Time to Fix:** 1-2 hours  
**Affects:** Multi-platform consistency; inconsistencies actively hurt AI trust

### What We Check

**Note:** This is a **manual audit**, not automated. We flag it, user reviews.

Check for consistency across:
1. **Your website:** Business name, address, phone, hours
2. **Google Business Profile:** Matching info
3. **Yelp:** Matching info
4. **BBB:** Matching info
5. **Industry directory** (Zocdoc, Avvo, HomeAdvisor, etc.): Matching info

**Flags raised when:**
- ❌ **CRITICAL:** Info differs across platforms (e.g., "Acme Plumbing" vs. "ACME Plumbing LLC")
- ❌ **CRITICAL:** Phone number differs across platforms
- ❌ **CRITICAL:** Address differs (e.g., "123 Main St" vs. "123 Main Street")
- ⚠️ **MEDIUM:** Hours differ slightly
- ✅ **GOOD:** All info consistent across all platforms

### Why It Matters

**Research finding:** Inconsistencies between sources actively undermine AI trust. If ChatGPT sees:
- Website says: "512-555-1234"
- Yelp says: "512-555-5678"
- Google says: "512-555-1234"

ChatGPT gets confused and either:
- Doesn't cite you (safe option)
- Cites you with wrong phone number (bad outcome)

Businesses with consistent info across 4+ platforms are 2.8x more likely to appear in AI responses.

### User-Facing Explanation

> **Citation Consistency Audit**
>
> AI systems trust information more when it appears consistently across multiple sources. If your phone number is different on your website, Yelp, and Google Business Profile, AI systems get confused.
>
> **How to fix:** Audit your presence across these platforms:
> 1. Your website
> 2. Google Business Profile (Google.com/business)
> 3. Yelp
> 4. BBB (bbb.org)
> 5. Industry directory (Zocdoc for dentists, Avvo for lawyers, etc.)
>
> Ensure these are consistent:
> - Business name (exactly as registered)
> - Full address
> - Phone number
> - Hours of operation
> - Website URL
>
> Update any that are wrong. Should take 30 min to 2 hours.
>
> **Impact:** Critical. Inconsistencies actively hurt your AI visibility. Fix before launching.

---

## Rule 8: Title Tag Missing or Poorly Optimized

**Severity:** 🟡 MEDIUM  
**Impact Score:** 3/10  
**Time to Fix:** 5 minutes  
**Affects:** Snippet display; keyword relevance signal

### What We Check

Look at `<title>` tag (shows in browser tab).

**Flags raised when:**
- ❌ **CRITICAL:** Title tag is missing
- ⚠️ **MEDIUM:** Title is <30 characters
- ⚠️ **MEDIUM:** Title is >70 characters
- ⚠️ **MEDIUM:** Title doesn't include primary keyword
- ⚠️ **MEDIUM:** Title is generic ("Home" or "Welcome")
- ✅ **GOOD:** 50-70 characters, includes keyword, matches content

### Why It Matters

Title tags don't rank you directly, but they:
- Help AI systems understand your page topic
- Affect how your snippet appears in AI results
- Should match your primary keyword

Good title: "Austin Dentist | Family & Cosmetic Dental Care | Dr. Smith DDS"  
Bad title: "Home" or "Dentist Austin TX Best Affordable Cosmetic Emergency"

### User-Facing Explanation

> **Title Tag Missing or Poorly Optimized**
>
> Your title tag is what shows in the browser tab and in search results. It's the first thing people (and AI systems) see.
>
> Good example: "Austin Dentist | Family & Cosmetic Dental Care | Dr. Smith"  
> Bad example: "Home" or "Welcome to my website"
>
> **How to fix:** Write a 50-70 character title that includes:
> - Your primary service (Dentist, Plumber, Lawyer)
> - Your location (Austin, TX)
> - Your unique angle (if any: "Affordable", "Emergency", "Cosmetic")
>
> Example formats:
> - "[Service] in [City] | [Business Name] | [Unique angle]"
> - "[Business Name] | [Service] in [City]"
>
> Should take 5 minutes.
>
> **Impact:** Low-Medium. This is polish, not critical. Do this last.

---

## Summary: Which Rules to Fix First

**Priority order based on impact + ease:**

1. **Rule 2: LocalBusiness Schema** (CRITICAL, 45 min, 9/10 impact)
2. **Rule 1: Organization Schema** (CRITICAL, 30 min, 8/10 impact)
3. **Rule 3: FAQPage Schema** (HIGH, 1 hr, 8/10 impact)
4. **Rule 4: Content Freshness** (HIGH, 15 min, 7/10 impact) ← Quick win
5. **Rule 7: Citation Consistency** (CRITICAL, 1-2 hr, 8/10 impact) ← Time-heavy but important
6. **Rule 6: Credentials/E-E-A-T** (MEDIUM, 30 min-2 hr, 6/10 impact)
7. **Rule 5: Meta Description** (MEDIUM, 10 min, 4/10 impact) ← Quick win
8. **Rule 8: Title Tag** (MEDIUM, 5 min, 3/10 impact) ← Quick win

**Time to implement all 8:** ~4-5 hours total  
**Expected improvement timeline:** 1 month (as per research: 6-12 week lag for ChatGPT, 1-2 week lag for Google AI)

---

## Implementation Notes for Developers

### Crawler Checks

The crawler should check for:
- `<script type="application/ld+json">` tags with specific `@type` values
- `<meta name="description">` tag and length
- `<title>` tag content and length
- Last-modified date from headers or meta tags
- Visible content for credentials (requires text extraction + keyword matching)

### User-Facing Explanations

Each finding should show:
1. **What's missing/wrong** (brief)
2. **Why it matters** (AI visibility benefit)
3. **How to fix it** (step-by-step, non-technical)
4. **Time estimate** (realistic)
5. **Impact score** (1-10 scale)

### Accuracy Validation

Before launch, spot-check:
- [ ] Test on 5 real business sites with different service types (dentist, plumber, agency, restaurant, salon)
- [ ] Verify each rule fires when expected
- [ ] Verify no false positives (rule fires on good content)
- [ ] Verify explanations are clear to non-technical users
- [ ] Verify time estimates are realistic

---

**Document Status:** Ready for implementation  
**Next Step:** Build audit feature using these 8 rules  
**Questions:** None — ready to code
