# Surven — n8n Workflow Blueprint

**Parent:** [[surven-main|Surven Main Tool]]

---

## Overview

**Stack:**
- **n8n** — Orchestration
- **Claude Haiku** — AI rewrites
- **Supabase** — Backups (`https://qmffhusxyzqscrdbjqsh.supabase.co`)
- **Discord** — Notifications + approval
- **CMS APIs** — WordPress, Webflow, Shopify, Wix, Squarespace

**Flow:** Scrape → Audit → Claude rewrites → Backup → Discord approval → Deploy to CMS

---

## Supabase Setup (Do This First)

Run this in **Supabase SQL Editor** before building n8n:

```sql
CREATE TABLE website_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  page_url TEXT NOT NULL,
  cms_type TEXT NOT NULL,
  original_html TEXT,
  original_sections JSONB,
  rewritten_sections JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Full Workflow — Node by Node

---

### Node 1: Manual Trigger
- **Type:** Manual Trigger
- **Purpose:** You trigger this manually for each client

---

### Node 2: Set Client Details
- **Type:** Set
- **Purpose:** Enter client info before running

**Fields to set:**
```
client_name    → "Joe's Plumbing"
client_url     → "https://joesplumbing.com"
cms_type       → "wordpress" (or webflow / shopify / wix / squarespace)
cms_api_key    → (client's CMS API key)
cms_site_id    → (only needed for Webflow/Shopify)
pages          → ["https://joesplumbing.com", "https://joesplumbing.com/services", "https://joesplumbing.com/about"]
```

---

### Node 3: Split Into Pages
- **Type:** Split In Batches
- **Batch Size:** 1
- **Purpose:** Process one page at a time

---

### Node 4: Scrape Page
- **Type:** HTTP Request
- **Method:** GET
- **URL:** `{{ $json.page_url }}`
- **Purpose:** Download full HTML of each page

---

### Node 5: Parse & Audit Page
- **Type:** Code (JavaScript)
- **Purpose:** Extract H2/H3 sections, run GEO audit, flag issues

```javascript
const html = $input.item.json.data;
const client_name = $input.item.json.client_name;
const page_url = $input.item.json.page_url;

// Simple H2/H3 section parser
function parseSections(html) {
  const sections = [];
  const headingRegex = /<(h2|h3)[^>]*>(.*?)<\/\1>([\s\S]*?)(?=<h[123]|$)/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const heading = match[2].replace(/<[^>]*>/g, '').trim();
    const content = match[3].replace(/<[^>]*>/g, '').trim();
    const words = content.split(/\s+/).filter(Boolean);

    sections.push({
      heading_tag: match[1].toUpperCase(),
      heading_text: heading,
      content: content,
      word_count: words.length
    });
  }
  return sections;
}

// GEO Audit
function auditSection(section) {
  const issues = [];
  const content = section.content;
  const words = content.split(/\s+/);

  // Check word count - first paragraph as capsule (40-60 words ideal)
  const firstParagraph = content.split('\n')[0];
  const fpWords = firstParagraph.split(/\s+/).filter(Boolean);
  if (fpWords.length < 40 || fpWords.length > 60) {
    issues.push('missing_answer_capsule');
  }

  // Thin section
  if (section.word_count < 100) {
    issues.push('thin_section');
  }

  // Long sentences
  const sentences = content.split(/[.!?]+/);
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 20);
  if (longSentences.length > 0) {
    issues.push('long_sentences');
  }

  // Vague language
  const vagueWords = ['many', 'some', 'widely', 'significantly', 'best', 
    'top-rated', 'industry-leading', 'game-changing', 'revolutionary', 
    'it is known', 'experts believe', 'best-in-class', 'widely used'];
  const hasVague = vagueWords.some(word => content.toLowerCase().includes(word));
  if (hasVague) {
    issues.push('vague_language');
  }

  // Question heading check
  const questionWords = ['who', 'what', 'when', 'where', 'why', 'how'];
  const isQuestion = section.heading_text.includes('?') || 
    questionWords.some(w => section.heading_text.toLowerCase().startsWith(w));
  if (!isQuestion) {
    issues.push('no_question_heading');
  }

  // Stats without source
  const hasStats = /\d+%|\$\d+|\d+ (hours|days|years|minutes)/.test(content);
  const hasSource = /according to|source:|citation|study|report/i.test(content);
  if (hasStats && !hasSource) {
    issues.push('stat_without_source');
  }

  return issues;
}

const sections = parseSections(html);
const flaggedSections = sections
  .map(section => ({
    ...section,
    issues: auditSection(section)
  }))
  .filter(section => section.issues.length > 0);

return [{
  json: {
    client_name,
    page_url,
    total_sections: sections.length,
    flagged_count: flaggedSections.length,
    flagged_sections: flaggedSections
  }
}];
```

---

### Node 6: Check If Issues Found
- **Type:** IF
- **Condition:** `{{ $json.flagged_count }} > 0`
- **True →** Continue to Claude
- **False →** Skip to next page (no issues found)

---

### Node 7: Loop Over Flagged Sections
- **Type:** Split In Batches
- **Input:** `{{ $json.flagged_sections }}`
- **Batch Size:** 1
- **Purpose:** Rewrite each flagged section one at a time

---

### Node 8: Call Claude Haiku API
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://api.anthropic.com/v1/messages`
- **Headers:**
  ```
  x-api-key: YOUR_CLAUDE_API_KEY
  anthropic-version: 2023-06-01
  content-type: application/json
  ```
- **Body (JSON):**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "You are a GEO (Generative Engine Optimization) content expert. Your job is to rewrite website content so it gets cited by ChatGPT, Perplexity, and Google AI Overviews.\n\nSECTION HEADING: {{ $json.heading_text }}\n\nORIGINAL CONTENT:\n{{ $json.content }}\n\nISSUES DETECTED: {{ $json.issues }}\n\nREWRITE RULES:\n1. Write an answer capsule: exactly 40-60 words, placed first under the heading\n2. Answer capsule must be completely standalone (no surrounding context needed)\n3. Include at least one specific number, percentage, or named entity\n4. Every sentence must be 15 words or fewer\n5. Zero hedging language (no: many, some, widely, best, industry-leading, game-changing)\n6. Replace vague language with specific metrics, named sources, or benchmarks\n7. If stats exist, add citations: 'according to [Source] ([Year])'\n8. Rephrase heading as a question if it isn't already (Who/What/When/Where/Why/How or add ?)\n9. If section is thin, expand to 120-180 words total with 2-3 supporting bullets\n\nFORMAT YOUR RESPONSE AS JSON:\n{\n  \"rewritten_heading\": \"Question-phrased heading here?\",\n  \"answer_capsule\": \"40-60 word direct factual answer here.\",\n  \"supporting_content\": \"150-300 words of supporting detail here.\",\n  \"word_count\": 52\n}"
    }
  ]
}
```

---

### Node 9: Validate Word Count
- **Type:** Code (JavaScript)
- **Purpose:** Ensure capsule is exactly 40-60 words, retry if not

```javascript
const response = JSON.parse($input.item.json.content[0].text);
const capsuleWords = response.answer_capsule.split(/\s+/).filter(Boolean).length;

if (capsuleWords < 40 || capsuleWords > 60) {
  // Flag for retry
  return [{
    json: {
      ...response,
      valid: false,
      word_count_actual: capsuleWords,
      retry_needed: true
    }
  }];
}

return [{
  json: {
    ...response,
    valid: true,
    word_count_actual: capsuleWords
  }
}];
```

---

### Node 10: Backup to Supabase
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://qmffhusxyzqscrdbjqsh.supabase.co/rest/v1/website_backups`
- **Headers:**
  ```
  apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY
  Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
  Content-Type: application/json
  Prefer: return=representation
  ```
- **Body (JSON):**
```json
{
  "client_name": "{{ $('Set Client Details').item.json.client_name }}",
  "page_url": "{{ $('Loop Over Flagged Sections').item.json.page_url }}",
  "cms_type": "{{ $('Set Client Details').item.json.cms_type }}",
  "original_sections": {{ $('Loop Over Flagged Sections').item.json }},
  "rewritten_sections": {{ $('Validate Word Count').item.json }},
  "status": "pending_approval"
}
```

---

### Node 11: Format Discord Message
- **Type:** Code (JavaScript)
- **Purpose:** Build the before/after message to send to Discord

```javascript
const original = $('Loop Over Flagged Sections').item.json;
const rewritten = $('Validate Word Count').item.json;
const backupId = $('Backup to Supabase').item.json[0].id;
const clientName = $('Set Client Details').item.json.client_name;
const pageUrl = $('Loop Over Flagged Sections').item.json.page_url;

// Approval webhook URLs (replace with your n8n webhook URL)
const approveUrl = `https://YOUR_N8N_WEBHOOK_URL/webhook/approve?id=${backupId}`;
const rejectUrl = `https://YOUR_N8N_WEBHOOK_URL/webhook/reject?id=${backupId}`;

const message = {
  embeds: [{
    title: `🔍 GEO Rewrite Ready — ${clientName}`,
    color: 4361518,
    fields: [
      {
        name: "📄 Page",
        value: pageUrl,
        inline: false
      },
      {
        name: "📌 Original Heading",
        value: original.heading_text,
        inline: true
      },
      {
        name: "✏️ New Heading",
        value: rewritten.rewritten_heading,
        inline: true
      },
      {
        name: "❌ Original Content (first 300 chars)",
        value: original.content.substring(0, 300) + "...",
        inline: false
      },
      {
        name: "✅ New Answer Capsule",
        value: rewritten.answer_capsule,
        inline: false
      },
      {
        name: "📊 Issues Fixed",
        value: original.issues.join(', '),
        inline: false
      },
      {
        name: "📝 Word Count",
        value: `${rewritten.word_count_actual} words`,
        inline: true
      }
    ],
    footer: {
      text: `Backup ID: ${backupId}`
    }
  }],
  content: `**APPROVE:** ${approveUrl}\n**REJECT:** ${rejectUrl}`
};

return [{ json: { discord_payload: message, backup_id: backupId } }];
```

---

### Node 12: Send to Discord
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://discord.com/api/webhooks/1492251140279107765/44nLsUx0RV3h7pF0G9UgHLY_au3yyUdY2e7wr9tbBKCYeQ114BLzel0EBfcl2MvoqqC7`
- **Body:** `{{ $json.discord_payload }}`

---

### Node 13: Wait for Your Approval
- **Type:** Wait
- **Resume:** On Webhook Call
- **Purpose:** Pauses workflow, you click Approve or Reject in Discord

---

### Node 14: Check Approval
- **Type:** IF
- **Condition:** `{{ $json.action }} === "approve"`
- **True →** Deploy to CMS
- **False →** Send rejection notice, stop

---

### Node 15: Route to Correct CMS
- **Type:** Switch
- **Value:** `{{ $('Set Client Details').item.json.cms_type }}`
- **Cases:**
  - `wordpress` → WordPress Deploy node
  - `webflow` → Webflow Deploy node
  - `shopify` → Shopify Deploy node
  - `wix` → Wix Deploy node
  - `squarespace` → Squarespace Deploy node

---

### Node 16a: Deploy to WordPress
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `{{ $('Set Client Details').item.json.cms_url }}/wp-json/wp/v2/pages/{{ $json.page_id }}`
- **Headers:**
  ```
  Authorization: Bearer {{ $('Set Client Details').item.json.cms_api_key }}
  Content-Type: application/json
  ```
- **Body:**
```json
{
  "content": "{{ $('Validate Word Count').item.json.rewritten_heading }}\n{{ $('Validate Word Count').item.json.answer_capsule }}\n{{ $('Validate Word Count').item.json.supporting_content }}"
}
```

---

### Node 16b: Deploy to Webflow
- **Type:** HTTP Request
- **Method:** PATCH
- **URL:** `https://api.webflow.com/v2/collections/{{ $json.collection_id }}/items/{{ $json.item_id }}`
- **Headers:**
  ```
  Authorization: Bearer {{ $('Set Client Details').item.json.cms_api_key }}
  Content-Type: application/json
  ```

---

### Node 16c: Deploy to Shopify
- **Type:** HTTP Request
- **Method:** PUT
- **URL:** `https://{{ $json.shop_domain }}/admin/api/2024-01/pages/{{ $json.page_id }}.json`
- **Headers:**
  ```
  X-Shopify-Access-Token: {{ $('Set Client Details').item.json.cms_api_key }}
  Content-Type: application/json
  ```

---

### Node 17: Update Supabase Status
- **Type:** HTTP Request
- **Method:** PATCH
- **URL:** `https://qmffhusxyzqscrdbjqsh.supabase.co/rest/v1/website_backups?id=eq.{{ $json.backup_id }}`
- **Body:**
```json
{
  "status": "deployed"
}
```

---

### Node 18: Completion Report to Discord
- **Type:** HTTP Request
- **Method:** POST
- **URL:** (same Discord webhook)
- **Body:**
```json
{
  "content": "✅ **DEPLOYED** — {{ $('Set Client Details').item.json.client_name }}\n📄 Page: {{ $json.page_url }}\n🕐 Completed: {{ $now }}\n💾 Backup saved in Supabase (ID: {{ $json.backup_id }})\n\nClient can revert at any time using the backup ID above."
}
```

---

## Rollback Workflow (Separate n8n Workflow)

When a client wants to revert, run this:

1. **Manual Trigger** + **Set** backup ID
2. **Supabase Query** — fetch original content by backup ID
3. **Switch** — route to correct CMS
4. **HTTP Request** — push original content back to CMS
5. **Update Supabase** — mark status as "reverted"
6. **Discord notification** — confirm rollback complete

---

## What to Configure in n8n Credentials

Store these in **n8n → Settings → Credentials:**

| Credential | Where to Get It |
|-----------|----------------|
| Claude API Key | console.anthropic.com |
| Supabase Service Role Key | Supabase → Settings → API |
| WordPress API Token | WordPress → Users → Application Passwords |
| Webflow API Key | Webflow → Account → API Access |
| Shopify API Token | Shopify → Apps → Private Apps |
| Wix API Key | Wix → Settings → API Keys |

---

## Per-Client Setup Checklist

Before running workflow for a new client:

- [ ] Get their CMS type (WordPress, Webflow, etc.)
- [ ] Get their CMS API key
- [ ] Get their website URL + list of pages to optimize
- [ ] Get their CMS page IDs (for each page you'll update)
- [ ] Update Node 2 (Set Client Details) with their info
- [ ] Run workflow
