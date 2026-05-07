import type { Variant, VariantBusinessContext, VariantFetchOptions, VariantSource } from "./types";

/**
 * Mock variant source — generates deterministic synthetic variants per
 * prompt without hitting any API. Used while real LLM wiring is pending.
 *
 * Algorithm: hashes (promptId + index) to pick from a phrasing-template
 * library and substitutes business context. Same inputs → same output, so
 * the UI is stable across reloads.
 */

const TEMPLATES_BY_INTENT_HINT: Array<(prompt: string, ctx: VariantBusinessContext) => string> = [
  (p) => `Can you recommend ${stripLeadingQuestion(p)}?`,
  (p) => `What's the ${stripLeadingQuestion(p)}?`,
  (p, ctx) => `Best ${stripLeadingQuestion(p)} ${ctx.city ? `near ${ctx.city}` : ""}`.trim(),
  (p, ctx) => `Top ${stripLeadingQuestion(p)} ${ctx.state ? `in ${ctx.state}` : ""}`.trim(),
  (p) => `Who's known for ${stripLeadingQuestion(p)}?`,
  (p) => `How do I find ${stripLeadingQuestion(p)}?`,
  (p) => `Compare ${stripLeadingQuestion(p)}`,
];

function stripLeadingQuestion(s: string): string {
  return s
    .replace(/^(how (do|can) i|what(?:'s| is)|where (?:can|do) i|who(?:'s| is)|tell me|recommend) /i, "")
    .replace(/[?]+$/, "")
    .trim();
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export const mockVariantSource: VariantSource = {
  async fetch(
    promptId: string,
    promptText: string,
    ctx: VariantBusinessContext,
    options: VariantFetchOptions = {},
  ): Promise<Variant[]> {
    const count = options.count ?? 5;
    const seed = hashSeed(`${promptId}|${ctx.businessId}`);
    const variants: Variant[] = [];
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      let t = (seed + i * 2654435761) >>> 0;
      let pick = t % TEMPLATES_BY_INTENT_HINT.length;
      // dodge duplicates — walk forward until we find an unused template
      while (used.has(pick) && used.size < TEMPLATES_BY_INTENT_HINT.length) {
        pick = (pick + 1) % TEMPLATES_BY_INTENT_HINT.length;
      }
      used.add(pick);
      variants.push({
        id: `${promptId}-v${i + 1}`,
        text: TEMPLATES_BY_INTENT_HINT[pick](promptText, ctx),
      });
    }
    return variants;
  },
};
