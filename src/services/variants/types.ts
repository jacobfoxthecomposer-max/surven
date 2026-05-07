/**
 * Variant pipeline — types shared by mock + LLM sources.
 *
 * A "variant" is one phrasing of a tracked prompt. A user typically tracks
 * the canonical phrasing of an intent (e.g. "best lawyer in Hartford") and
 * we generate 5–7 alternate phrasings real users would actually type into
 * ChatGPT. Variants get scanned alongside the canonical so we measure the
 * intent across phrasings, not just the literal one.
 */

export interface Variant {
  /** Stable id, typically `${promptId}-v${index}`. */
  id: string;
  /** The variant phrasing the scanner runs against. */
  text: string;
}

export interface VariantBusinessContext {
  businessId: string;
  industry?: string;
  city?: string;
  state?: string;
}

export interface VariantSource {
  /**
   * Returns variants for a single prompt. Implementations may cache
   * (Supabase) and may invoke an LLM (Anthropic) — callers don't need to
   * care. The contract: deterministic for a given (promptId, ctx); fast on
   * cache hit; idempotent on cache miss.
   */
  fetch(
    promptId: string,
    promptText: string,
    ctx: VariantBusinessContext,
    options?: VariantFetchOptions,
  ): Promise<Variant[]>;
}

export interface VariantFetchOptions {
  /** Override the default count (5). */
  count?: number;
  /** When true, bypass cache and force re-generation. */
  force?: boolean;
}
