# Chrome Web Store Listing — Surven Auditor

Copy-paste-ready answers for every CWS form field. When the field has a hard char limit, the limit is shown in parens.

## Listing basics

**Item name** (45 char max)
> Surven Auditor

**Short description** (132 char max — appears in search results)
> Audit any site for AI-search visibility issues. See what ChatGPT, Claude, and Gemini can read on the page.

**Category** (pick one in dropdown)
> Productivity

**Language**
> English (United States)

**Homepage URL**
> https://surven.ai

**Support URL**
> https://surven.ai/contact

---

## Detailed description (16,000 char max)

```
Surven Auditor checks any open browser tab for issues that hurt your visibility in AI-driven search — ChatGPT, Claude, Gemini, Google AI Overviews, and Perplexity. It runs the same audit our paid AI Visibility Tracker uses, except instead of crawling your site, it checks whichever page you're looking at right now.

WHAT IT FINDS
• Missing or weak schema (Organization, LocalBusiness, FAQ, Product, Article)
• Duplicate page titles and meta descriptions across your site
• Missing canonical tags, viewport tags, OG tags
• Sitemap gaps (pages your sitemap doesn't list)
• Pages blocked from AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
• Image alt text gaps
• Missing llms.txt
• Outdated content
• 17 rules in total, weighted by GEO impact

ONE-CLICK FIXES (premium)
For users who connect a GitHub repo or WordPress site, Surven Auditor can apply most fixes automatically:
• Generate and commit a fresh sitemap.xml
• Inject canonical tags, viewport tags, OG tags, JSON-LD schema
• Rewrite duplicate titles and meta descriptions with distinct, AI-generated values
• Generate alt text for missing images using a vision model
• Build an llms.txt file from your site map
• Add or strip AI bot blocks in robots.txt

Every fix is logged to Fix History, and one click reverts any of them — the original commit is rolled back on GitHub or the previous value is restored on WordPress.

WHO IT'S FOR
• Marketers checking client sites for AI-search readiness
• Developers shipping fixes without leaving the browser
• Agencies running quick audits on competitor sites
• Anyone wondering "does ChatGPT actually know my site exists?"

REQUIREMENTS
• A free Surven account at https://surven.ai (1 free audit per session, no signup needed for basic findings)
• A paid Surven plan (Plus or Premium) for one-click fixes, Fix History, and Revert
• An API key from your Surven dashboard (Settings → API Keys), pasted into the extension's Settings panel

PRIVACY
The extension only reads page content when YOU click Run audit. It never reads forms, passwords, or pages you didn't audit. Page HTML is sent to surven.ai for analysis. Your API key is encrypted in chrome.storage. Full privacy policy at https://surven.ai/privacy.

SUPPORT
Questions or issues? Email hello@surven.ai or visit https://surven.ai/contact.
```

---

## Single purpose statement (mandatory CWS field)

```
Audit a website page for AI-search visibility (Generative Engine Optimization) issues, and optionally apply fixes by committing changes to the user's connected GitHub repo or WordPress site.
```

---

## Permission justifications (CWS asks one-by-one)

**Why do you need `sidePanel`?**
```
The extension renders the audit results, fix UI, and Fix History panel inside Chrome's side panel. The side panel is the user-visible surface of the extension — without it, there's nothing for the user to interact with.
```

**Why do you need `activeTab`?**
```
When the user clicks "Run audit" in the side panel, the extension reads the active tab's HTML — title, meta tags, schema, body content — to evaluate it against 17 GEO rules. activeTab grants access only to the tab the user is on, only when they trigger an audit, never in the background.
```

**Why do you need `scripting`?**
```
After an audit runs, users can click any finding to see the affected element highlighted on the page. The scripting permission injects a small content script that draws an outline around the matched element and scrolls it into view. Used purely for the highlight feature; never executes remote code.
```

**Why do you need `storage`?**
```
The extension stores three things in chrome.storage: (1) the user's encrypted Surven API key so they don't paste it on every audit, (2) per-hostname audit results cached for 24 hours to save the user a round-trip if they re-open the side panel, (3) the user's settings (API URL). No personal data, no tracking.
```

**Why do you need `<all_urls>` host permission?**
```
The extension is a website auditor — its core function is to audit any URL the user opens. We can't predict in advance which sites a marketer or developer will want to check, so the host permission must be open. The extension does not read any page until the user explicitly clicks Run audit on that tab; we never background-scan, never auto-track, never log URLs the user visits without a deliberate audit click.
```

---

## Privacy practices (CWS form)

**Does your extension collect or use any of the following user data?**

| Data | Used? | Why |
|---|---|---|
| Personally identifiable information | No | We accept an API key the user generates in their own Surven account; no name/email/address is collected by the extension itself. |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | Yes — limited | The user's Surven API key is stored locally (chrome.storage) and sent in the x-api-key header to surven.ai endpoints. Never to any third party. |
| Personal communications | No | |
| Location | No | |
| Web history | No | URLs are only logged when the user explicitly audits a tab; no background browsing history is captured. |
| User activity | Yes — limited | We log each audit (URL audited, findings generated, fixes applied) for the user's own Fix History view. Not shared. |
| Website content | Yes | The HTML of pages the user audits is sent to surven.ai for analysis. Required for the extension's core function. |

**I certify that the following disclosures are true:**
- ☑ I do not sell or transfer user data to third parties outside the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**
> https://surven.ai/privacy

---

## Distribution

**Visibility**
> Public

**Distribution regions**
> All regions

**Pricing**
> Free (the extension itself is free; one-click fixes require a paid Surven plan, but that's a separate purchase on surven.ai — the CWS listing should be marked Free)

---

## Screenshots needed (you take these — see SCREENSHOTS-SHOTLIST.md)

CWS requires 1–5 screenshots at 1280×800 (or 640×400). Recommended order:

1. **Side panel showing audit findings on a real website** — open extension on any popular site (your own Surven landing page is a good choice), click Run audit, capture the results list with severity colors and finding cards
2. **A finding expanded to show "Fix this for me" + finding details** — shows the auto-fix value
3. **Fix History panel** — shows the new feature you just shipped, with several rows visible
4. **Manual paste fallback card** — shows the platform-specific copy/paste UX for non-GitHub sites
5. **Settings panel** — shows API URL/key entry, which is how users connect to their Surven account

---

## Optional but recommended

- **Promotional tile** 440×280 PNG (small tile shown in CWS browse pages)
- **Marquee** 1400×560 PNG (only shown if Google features your extension)
- **YouTube demo** 30–60 second walkthrough URL

These can be added after first publish. Don't block submission on them tonight.
