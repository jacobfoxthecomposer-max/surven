# Screenshots — exact shot list for CWS submission

CWS requires **1–5 screenshots at 1280×800** (or 640×400). Provide 5 — gives reviewers and prospective users the most context, and lets you tell the story of the product in order.

## How to capture at 1280×800 on macOS

The Surven side panel itself is around 380px wide — too narrow to fill 1280px alone. Each screenshot should show **the side panel with the audited webpage visible behind it** so the panel makes sense in context. Easy way:

1. Open Chrome, hit Cmd+Ctrl+F to enter fullscreen (or just maximize — fullscreen is cleaner because it hides the OS chrome).
2. Open the Surven side panel on the right.
3. Use **Cmd+Shift+4** to draw a screenshot region. Hold **Space** while dragging to nudge the rect.
4. Hit **Cmd+Shift+5** for a guided screenshot tool with options.
5. After capture, open the file in Preview → Tools → Adjust Size → set Width to 1280, Height to 800. Or skip resizing and let CWS resize for you.

Alternative: Use **Polypane** or Chrome DevTools device emulation to set viewport to exactly 1280×800.

## Shot 1 — Side panel with real audit results
**What to capture:** Open extension on https://surven.ai (or any of your client sites), click Run audit, wait for findings to load. Capture the side panel showing several findings of mixed severity (red, gold, sage). The webpage in the background should be visible so it's clear the extension is auditing what's on screen.
**Key visible elements:** Severity badges, finding titles, the cream sage Surven branding, "Run audit" button area at top.
**Why it sells:** This is the money shot — viewers see what the product does in 1 second.

## Shot 2 — A finding expanded with "Fix this for me"
**What to capture:** Click any finding card to expand it. Show the "What is this?" explanation, the suggested fix code in a dark code block, and the blue "Fix this for me" button. Ideally pick a Schema or Canonical finding so the code preview is meaningful.
**Why it sells:** Shows the unique selling proposition — Surven doesn't just diagnose, it fixes.

## Shot 3 — Fix History panel
**What to capture:** Open Settings → click Fix History. Show the panel with several rows visible — ideally a mix of statuses (Applied, Reverted) across both GitHub and WordPress platforms. The platform badges should be visible.
**Why it sells:** Differentiator — shows that Surven keeps you in control. "Every change is logged. Reversible in one click."

## Shot 4 — Manual paste fallback with Managed-plan CTA
**What to capture:** Trigger a fix on a site that doesn't have GitHub/WordPress connected (or click the manual fallback variant). Show the copy-to-clipboard snippet card AND the sage "Skip the paste — let our team handle this" Managed-plan upsell card below it.
**Why it sells:** Shows the extension is honest about its limits AND has a real upgrade path. CWS reviewers like seeing a clear monetization model.

## Shot 5 — Settings panel
**What to capture:** Open Settings (gear icon). Show the API URL field, API Key field (mask the value if real), the new Fix History row, and the Save button. Clean, organized.
**Why it sells:** Reviewers check that setup is straightforward. Also reassures users that the extension is configurable, not locked-in.

---

## Filename convention
Save the 5 shots as:
- `cws-screenshot-1-audit-results.png`
- `cws-screenshot-2-fix-finding.png`
- `cws-screenshot-3-fix-history.png`
- `cws-screenshot-4-manual-paste.png`
- `cws-screenshot-5-settings.png`

Drop them in `extension/cws-screenshots/` (gitignored — they're build artifacts, not source).

## Don't worry about
- Pixel-perfect framing — CWS resizes
- The exact contents of the audit findings — pick whatever real audit you've already run
- Showing all 17 rules — variety beats completeness
