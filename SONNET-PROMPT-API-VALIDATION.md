# Sonnet 4.6 Prompt: Add API Response Validation to Tracker

## Context
You are implementing API response validation for Surven Tracker. The Tracker queries 4 AI models (ChatGPT, Claude, Gemini, Google AI Overview) and stores responses in Supabase. Currently, responses are parsed naively without validation — if an API response is malformed, empty, or unexpectedly long, the system still stores it.

**Audit location:** `API-RESPONSE-VALIDATION-AUDIT.md` in this repo (read for full risk breakdown)

**Goal:** Validate all API responses before storage. Cap response length at 3000 characters. Detect parsing failures and log them. Update UI to handle edge cases gracefully.

---

## Implementation Steps

### Step 1: Add Validation Utilities to route.ts

In `src/app/api/scan/route.ts`, before the query functions (before line 79):

Add these 4 parsing validators and 2 safety utilities:

```typescript
// Parse response and extract text safely — returns null if parsing fails
function parseOpenAIResponse(data: unknown): string | null {
  try {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    const content = obj.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

function parseClaudeResponse(data: unknown): string | null {
  try {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    const content = obj.content?.[0]?.text;
    return typeof content === 'string' && content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

function parseGeminiResponse(data: unknown): string | null {
  try {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    const content = obj.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof content === 'string' && content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

function parseGoogleAIResponse(data: unknown): string | null {
  try {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    const blocks = obj.ai_overview?.text_blocks;
    if (!Array.isArray(blocks)) return null;
    const text = blocks
      .map((b: unknown) => {
        if (typeof b === 'object' && b !== null && 'snippet' in b) {
          return (b as { snippet?: unknown }).snippet;
        }
        return '';
      })
      .filter((s: unknown) => typeof s === 'string')
      .join(' ')
      .trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

// Cap response at 3000 chars and clean whitespace
function capAndCleanResponse(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.slice(0, 3000).trim();
}

// Remove control characters and ensure safe display
function sanitizeResponse(text: string): string {
  if (!text) return '';
  // Remove null bytes and control characters (except \n, \r, \t)
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '').trim();
}
```

### Step 2: Refactor Query Functions

Replace each of the 4 query functions (lines 79–148) with validated versions:

```typescript
// REPLACE lines 79-96 (queryOpenAI)
async function queryOpenAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return '';
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const parsed = parseOpenAIResponse(data);
    if (!parsed) {
      console.debug('[Tracker] OpenAI: parsing failed or empty response');
      return '';
    }
    return sanitizeResponse(capAndCleanResponse(parsed));
  } catch (e) {
    console.debug('[Tracker] OpenAI error:', e instanceof Error ? e.message : 'unknown');
    return '';
  }
}

// REPLACE lines 98-116 (queryClaude)
async function queryClaude(prompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return '';
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const parsed = parseClaudeResponse(data);
    if (!parsed) {
      console.debug('[Tracker] Claude: parsing failed or empty response');
      return '';
    }
    return sanitizeResponse(capAndCleanResponse(parsed));
  } catch (e) {
    console.debug('[Tracker] Claude error:', e instanceof Error ? e.message : 'unknown');
    return '';
  }
}

// REPLACE lines 118-133 (queryGemini)
async function queryGemini(prompt: string): Promise<string> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) return '';
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 600 },
        }),
      }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const parsed = parseGeminiResponse(data);
    if (!parsed) {
      console.debug('[Tracker] Gemini: parsing failed or empty response');
      return '';
    }
    return sanitizeResponse(capAndCleanResponse(parsed));
  } catch (e) {
    console.debug('[Tracker] Gemini error:', e instanceof Error ? e.message : 'unknown');
    return '';
  }
}

// REPLACE lines 135-148 (queryGoogleAI)
async function queryGoogleAI(prompt: string): Promise<string> {
  if (!process.env.GOOGLE_AI_OVERVIEW_API_KEY) return '';
  try {
    const SERP_API_ENDPOINT = "https://serpapi.com/search.json";
    const res = await fetch(
      `${SERP_API_ENDPOINT}?engine=google&q=${encodeURIComponent(prompt)}&api_key=${process.env.GOOGLE_AI_OVERVIEW_API_KEY}`,
      { method: "GET" }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const parsed = parseGoogleAIResponse(data);
    if (!parsed) {
      console.debug('[Tracker] Google AI: parsing failed or empty response');
      return '';
    }
    return sanitizeResponse(capAndCleanResponse(parsed));
  } catch (e) {
    console.debug('[Tracker] Google AI error:', e instanceof Error ? e.message : 'unknown');
    return '';
  }
}
```

### Step 3: Update Frontend Display (Optional but Recommended)

In `src/components/organisms/PromptResultItem.tsx`, update line 127–129:

**Old:**
```tsx
<p className="text-xs text-[var(--color-fg-muted)] leading-relaxed whitespace-pre-line">
  {highlightBusiness(result.response_text, businessName)}
</p>
```

**New:**
```tsx
<div className="text-xs text-[var(--color-fg-muted)] leading-relaxed whitespace-pre-line max-h-[200px] overflow-y-auto">
  {result.response_text ? (
    highlightBusiness(result.response_text, businessName)
  ) : (
    <span className="italic text-[var(--color-fg-muted)]">No response</span>
  )}
</div>
{result.response_text && result.response_text.length >= 2900 && (
  <p className="text-[10px] text-[var(--color-fg-muted)] italic mt-1">
    [Response truncated at 3000 characters]
  </p>
)}
```

This adds:
- Scroll on long responses instead of massive wall of text
- "No response" placeholder for empty results
- Indicator when response was capped

### Step 4: Test

**Manual testing** (use real API keys if available, mock data works too):
1. Trigger a scan with real clients (or stay on mock data)
2. Open browser console — verify no parse errors logged
3. Check Vercel logs for `[Tracker]` debug messages
4. Verify scan results display correctly
5. Export to CSV — verify response_text is readable

---

## Code Quality Notes

- Use try-catch for safety but prefer validation (check structure before accessing)
- All query functions follow the same pattern (consistent)
- Debug logging uses `[Tracker]` prefix for easy filtering
- No changes to database schema — text column is flexible
- All modifications are isolated to query layer — no breaking changes

---

## Deployment Checklist

- [ ] All 4 query functions refactored and tested
- [ ] No runtime errors on scan
- [ ] Vercel logs show no unexpected errors
- [ ] UI displays responses safely (no overflow, no corruption)
- [ ] CSV export works
- [ ] Dashboard renders without errors
- [ ] Ready for real API keys (final step after this)

---

## Success = Ready for Real API Keys

Once this validation is done and tested, you can safely add real API keys to Vercel environment variables:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `GOOGLE_AI_OVERVIEW_API_KEY`

The system will handle malformed or edge-case responses gracefully.
