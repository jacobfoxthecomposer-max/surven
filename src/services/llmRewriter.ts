/**
 * LLM-powered content rewriter — handles Sprint 1 features:
 *   - Meta description rewrite (GEO-optimized)
 *   - Title tag rewrite (GEO-optimized)
 *   - FAQ Q&A pair generation (Sprint 1 #4 — used later)
 *   - Alt text generation (Sprint 1 #5 — used later)
 *
 * Each rewriter uses tight, JSON-mode prompts so output is parseable.
 * Models are currently hardcoded to gpt-4o-mini via openaiClient.ts.
 */

import { openaiChatJson } from "./openaiClient";
import type { PageContext } from "./schemaGenerator";

interface RewriteResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const META_SYSTEM = `You rewrite website meta descriptions so AI engines (ChatGPT, Claude, Gemini, Google AI) are more likely to cite the site when answering questions about businesses like it.

Rules for your output:
- 140-160 characters total (no shorter, no longer)
- Lead with what the business does + where it's located (specific entities)
- Mention 1-2 concrete products / services / categories
- Use specific names (city, state, business name, signature offering)
- AVOID buzzwords: "world-class", "cutting-edge", "industry-leading", "passionate about", "best-in-class", "synergy", "innovative solutions"
- AVOID hedge words: "we believe", "we strive", "we aim", "may be", "could be"
- Read like a direct factual answer to "What is [business name]?"
- Plain prose, no emoji, no marketing fluff

Return ONLY JSON: {"description": "your rewritten text"}`;

const TITLE_SYSTEM = `You rewrite website <title> tags so AI engines and search engines understand the business better and cite it more often.

Rules for your output:
- 50-65 characters total
- Format options (pick whichever fits best): "[Service/Category] in [City] | [Brand Name]" or "[Brand Name] — [What They Do] in [City]" or "[Brand Name] | [Specific Offering]"
- Include the business name + their primary category/service
- Include city or region if it's a local business
- AVOID buzzwords: "world-class", "best", "premier", "top-rated"
- AVOID emoji, special characters, ALL CAPS
- Read like a clear headline a real human would write

Return ONLY JSON: {"title": "your rewritten title"}`;

function buildBusinessSummary(ctx: PageContext): string {
  const parts: string[] = [];
  if (ctx.businessName) parts.push(`Business: ${ctx.businessName}`);
  if (ctx.url) parts.push(`URL: ${ctx.url}`);
  if (ctx.title) parts.push(`Current <title>: "${ctx.title}"`);
  if (ctx.description) parts.push(`Current meta description: "${ctx.description}"`);
  if (ctx.address) {
    const a = ctx.address;
    const loc = [a.city, a.region].filter(Boolean).join(", ");
    if (loc) parts.push(`Location: ${loc}`);
    if (a.street) parts.push(`Address: ${a.street}${loc ? ", " + loc : ""}`);
  }
  if (ctx.phone) parts.push(`Phone: ${ctx.phone}`);
  if (ctx.serviceItems && ctx.serviceItems.length > 0) {
    parts.push(`Services: ${ctx.serviceItems.slice(0, 5).map((s) => s.name).join(", ")}`);
  }
  if (ctx.productItems && ctx.productItems.length > 0) {
    parts.push(`Products: ${ctx.productItems.slice(0, 5).map((p) => p.name).join(", ")}`);
  }
  return parts.join("\n");
}

function buildPageContent(ctx: PageContext, maxChars = 1500): string {
  const body = ctx.bodyContent ?? "";
  return body.length > maxChars ? body.slice(0, maxChars) + "…" : body;
}

export async function rewriteMetaDescription(ctx: PageContext): Promise<RewriteResult<{ description: string }>> {
  const businessSummary = buildBusinessSummary(ctx);
  const pageContent = buildPageContent(ctx);

  if (!ctx.businessName && !ctx.title && !pageContent) {
    return { ok: false, error: "Not enough page data to write a meta description (no business name or page content found)" };
  }

  const userPrompt = `BUSINESS DATA:
${businessSummary}

PAGE CONTENT (first 1500 chars):
${pageContent || "(no extractable body content)"}

Write a fresh meta description following the rules. Output JSON only.`;

  const result = await openaiChatJson<{ description: string }>({
    messages: [
      { role: "system", content: META_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 200,
    temperature: 0.5,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error ?? "LLM did not return a valid response" };
  }

  const text = (result.data.description ?? "").trim();
  if (text.length < 50) {
    return { ok: false, error: "Generated description was too short" };
  }
  if (text.length > 200) {
    return { ok: true, data: { description: text.slice(0, 158) + "…" } };
  }

  return { ok: true, data: { description: text } };
}

export async function rewriteTitleTag(ctx: PageContext): Promise<RewriteResult<{ title: string }>> {
  const businessSummary = buildBusinessSummary(ctx);
  const pageContent = buildPageContent(ctx, 1000);

  if (!ctx.businessName && !ctx.title) {
    return { ok: false, error: "Not enough page data to write a title (no business name or current title found)" };
  }

  const userPrompt = `BUSINESS DATA:
${businessSummary}

PAGE CONTENT (first 1000 chars):
${pageContent || "(no extractable body content)"}

Write a fresh <title> tag following the rules. Output JSON only.`;

  const result = await openaiChatJson<{ title: string }>({
    messages: [
      { role: "system", content: TITLE_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 100,
    temperature: 0.5,
  });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error ?? "LLM did not return a valid response" };
  }

  const text = (result.data.title ?? "").trim();
  if (text.length < 10) {
    return { ok: false, error: "Generated title was too short" };
  }
  if (text.length > 75) {
    return { ok: true, data: { title: text.slice(0, 70) } };
  }

  return { ok: true, data: { title: text } };
}
