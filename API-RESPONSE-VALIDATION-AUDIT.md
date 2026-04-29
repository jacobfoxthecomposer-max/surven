# Tracker API Response Validation — Audit & Implementation Plan

**Date:** 2026-04-15  
**Objective:** Identify what can go wrong with real API responses and build validation to prevent bad data from breaking the system.

---

## Current State: Vulnerabilities

### How Responses Flow (Without Validation)
1. **API calls** in `src/app/api/scan/route.ts` → 4 models (ChatGPT, Claude, Gemini, Google AI Overview)
2. **Response parsing** — Extract text, assume it exists and is valid
3. **Storage** — Save to Supabase `scan_results` table
4. **UI display** — `src/components/organisms/PromptResultItem.tsx` renders `response_text` directly

### Failure Points Identified

#### 1. **Empty/Missing Responses**
- **Risk**: API returns 200 but no text in response body
- **Current behavior**: Returns empty string (lines 79–96, 98–116, 118–133, 135–148 in route.ts)
- **Impact**: `isMentioned()` and sentiment analysis treat empty string as "not mentioned" ✓ SAFE
- **Status**: ✅ Handled adequately (empty string = no mention)

#### 2. **Malformed JSON / Parsing Failures**
- **Risk**: API response is not valid JSON, or structure doesn't match expected schema
- **Examples**:
  - OpenAI: `data.choices[0].message.content` doesn't exist
  - Claude: `data.content[0].text` is missing or null
  - Gemini: `data.candidates[0].content.parts[0].text` is deeply nested, any level could fail
  - Google AI (SerpAPI): `data.ai_overview.text_blocks` structure varies by provider
- **Current behavior**: Try to access nested properties, fall back to empty string if any level fails (using `??` operator)
- **Status**: ✅ Safe, but **silently fails** — we don't know if parsing failed vs. API returned empty
- **Action needed**: Add validation to detect and log parsing failures

#### 3. **Unexpectedly Long Responses**
- **Risk**: API returns 100KB+ response text
- **Impact on storage**: Supabase `text` column can handle large strings, but:
  - Increases DB size
  - Slower queries
  - Slow data loading for dashboard
- **Impact on UI**: `whitespace-pre-line` in PromptResultItem could show massive wall of text
- **Current safeguard**: OpenAI, Claude, Gemini all set `max_tokens: 600`
- **Exception**: Google AI Overview (SerpAPI) has no built-in length limit
- **Status**: ⚠️ Partially handled — Google AI Overview not capped
- **Action needed**: Cap response text length before storage and display

#### 4. **Null/Undefined Values**
- **Risk**: API returns `null`, `undefined`, or missing fields
- **Current behavior**: `??` operator falls back to empty string
- **Status**: ✅ Safe
- **But**: We don't know if API worked or not

#### 5. **Special Characters / Invalid UTF-8**
- **Risk**: API returns text with emoji, control characters, or invalid UTF-8 sequences
- **Impact**: Could break markdown parsing, database storage, or display
- **Current behavior**: Stored as-is, rendered as-is
- **Status**: ⚠️ Risky for display reliability
- **Action needed**: Sanitize for safe display

#### 6. **Sentiment Analysis on Bad Data**
- **Risk**: `analyzeSentiment()` (line 21–55) calls Claude with truncated response
- **Current**: Slices to 600 chars, passes to sentiment model
- **Edge case**: If response is empty string or malformed, sentiment analysis still fires (but returns "neutral")
- **Status**: ✅ Safe (returns default on error)

#### 7. **Citation Extraction on Invalid Text**
- **Risk**: `extractCitations()` (line 154–162) uses regex on raw response
- **Edge case**: If response contains URLs with invalid characters, regex could behave unexpectedly
- **Status**: ✅ Safe (regex just extracts domains, no parsing errors possible)

---

## Scope: What Needs Validation

### Backend (`src/app/api/scan/route.ts`)
1. **After each API call** — validate response structure before parsing
2. **Before storage** — cap response length, validate text quality
3. **Logging** — track what failed and why (for debugging)

### Frontend (`src/components/organisms/PromptResultItem.tsx`)
1. **On display** — ensure response_text is safe HTML/markdown
2. **Length handling** — graceful truncation if needed
3. **Error states** — show "Data unavailable" if response is corrupted

### Database
1. **Column constraint** — Consider `max_length` validation in UI before sending
2. **Migration** — No schema changes needed (text column is flexible)

---

## Implementation Targets

### File 1: `src/app/api/scan/route.ts`

**New validation utilities** (add before query functions):
```
✗ parseOpenAIResponse(data: unknown) → string | null
✗ parseClaudeResponse(data: unknown) → string | null
✗ parseGeminiResponse(data: unknown) → string | null
✗ parseGoogleAIResponse(data: unknown) → string | null
✗ validateResponseLength(text: string, maxLength: number = 3000) → string
✗ sanitizeForDisplay(text: string) → string
```

**Refactor each query function** (lines 79–148):
- Add try-catch around response parsing
- Replace property access with validation function
- Cap length before returning
- Log parse failures (DEBUG level)

### File 2: `src/components/organisms/PromptResultItem.tsx`

**Update display** (line 127–129):
- Add max-height container with scroll on overflow
- Show truncation indicator if response is capped
- Handle null/empty gracefully

### File 3: `src/utils/csvExport.ts`

**Check current CSV export** of response_text:
- Ensure values are capped for CSV readability
- No changes likely needed (just verify)

---

## Validation Rules by Model

| Model | Endpoint | Response Path | Risks | Cap |
|-------|----------|---------------|-------|-----|
| **ChatGPT** | `api.openai.com/v1/chat/completions` | `choices[0].message.content` | Parsing nested objects, null content | 3000 chars |
| **Claude** | `api.anthropic.com/v1/messages` | `content[0].text` | Parsing arrays, null text | 3000 chars |
| **Gemini** | `generativelanguage.googleapis.com` | `candidates[0].content.parts[0].text` | Deep nesting, null at any level | 3000 chars |
| **Google AI** | `serpapi.com/search.json` (SerpAPI) | `ai_overview.text_blocks[].snippet` | Variable structure, no max_tokens | 3000 chars |

---

## Testing Scenarios

Once implementation is done, test with:
1. **Empty response** — API returns 200 but empty content
2. **Missing field** — API structure doesn't match expected schema
3. **Long response** — Deliberately trigger max_tokens from API
4. **Invalid UTF-8** — Test with emoji and special characters
5. **Null values** — API returns `null` for content field
6. **Malformed JSON** — Simulated by testing with broken response

---

## Success Criteria

- ✅ All 4 models parse responses without throwing
- ✅ Response text capped at 3000 chars before storage
- ✅ Parsing failures logged (can see in dev console / Vercel logs)
- ✅ UI handles empty/corrupted responses gracefully
- ✅ No database errors from bad data
- ✅ CSV export works with all response types
- ✅ Deploy without errors

---

## Files to Modify

1. `src/app/api/scan/route.ts` — Add validation utils, refactor query functions
2. `src/components/organisms/PromptResultItem.tsx` — Add display safety
3. `src/utils/constants.ts` — Add response validation constants (optional)
4. `.env.local.example` — Document expected max response length (optional)

---

## Estimate

**Backend validation**: 2–3 functions, ~100 lines  
**Frontend display**: Update 1 component, ~20 lines  
**Testing**: Verify with real APIs, spot-check edge cases  

**Total time**: 30–45 min with Sonnet 4.6
