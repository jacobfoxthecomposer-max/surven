import { supabase } from "@/services/supabase";
import type { Variant, VariantBusinessContext, VariantFetchOptions, VariantSource } from "./types";
import { mockVariantSource } from "./mockVariantSource";

/**
 * LLM-backed variant source with Supabase caching.
 *
 * Plug-and-play contract — when real Anthropic API wiring is added:
 *   1. Implement `generateViaAnthropic` below (the only stub).
 *   2. Set env `NEXT_PUBLIC_VARIANT_SOURCE=llm`.
 *   3. Run `supabase/prompt_variants_migration.sql` on the project.
 * No UI or call-site changes needed; the orchestrator in `./index.ts`
 * picks the right source by env flag.
 *
 * Cache lifecycle (target behavior, currently stubbed):
 *   - keyed on (prompt_id, business_id)
 *   - row stores the generated variants JSONB + generated_at
 *   - cache HIT: return rows immediately
 *   - cache MISS: call Anthropic, persist, return
 *   - `options.force = true`: skip cache lookup, regenerate, upsert
 *
 * Until Anthropic is wired we fall back to `mockVariantSource` so the UI
 * stays functional. This means flipping the env flag today is a no-op for
 * users — the moment a real API key + Supabase table land, behavior shifts
 * automatically.
 */

const ANTHROPIC_WIRED = false; // flip to true once the generator below is implemented

interface CachedVariantsRow {
  prompt_id: string;
  business_id: string;
  variants: Variant[];
  generated_at: string;
}

async function readCache(
  promptId: string,
  businessId: string,
): Promise<Variant[] | null> {
  const { data, error } = await supabase
    .from("prompt_variants")
    .select("variants")
    .eq("prompt_id", promptId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Pick<CachedVariantsRow, "variants">;
  return Array.isArray(row.variants) ? row.variants : null;
}

async function writeCache(
  promptId: string,
  businessId: string,
  variants: Variant[],
): Promise<void> {
  await supabase.from("prompt_variants").upsert(
    {
      prompt_id: promptId,
      business_id: businessId,
      variants,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "prompt_id,business_id" },
  );
}

/**
 * STUB — not yet wired. When implementing:
 *  - call Anthropic Messages API (claude-haiku-4-5) with a system prompt
 *    that asks for N alternate phrasings of `promptText`, conditioned on
 *    the business context (industry, city, state).
 *  - return JSON-parsed variants. Total cost target: ~$0.0008 per call.
 *  - mirror the raw-fetch pattern in `src/services/openaiClient.ts` to
 *    avoid an SDK dependency.
 */
async function generateViaAnthropic(
  _promptId: string,
  _promptText: string,
  _ctx: VariantBusinessContext,
  _count: number,
): Promise<Variant[]> {
  throw new Error("Anthropic variant generator not yet wired. See llmVariantSource.ts.");
}

export const llmVariantSource: VariantSource = {
  async fetch(
    promptId: string,
    promptText: string,
    ctx: VariantBusinessContext,
    options: VariantFetchOptions = {},
  ): Promise<Variant[]> {
    if (!ANTHROPIC_WIRED) {
      // Graceful fallback — flipping the source env flag must never break
      // the page. Until the generator is wired, behave like the mock.
      return mockVariantSource.fetch(promptId, promptText, ctx, options);
    }

    if (!options.force) {
      const cached = await readCache(promptId, ctx.businessId);
      if (cached && cached.length > 0) return cached;
    }

    const generated = await generateViaAnthropic(
      promptId,
      promptText,
      ctx,
      options.count ?? 5,
    );
    await writeCache(promptId, ctx.businessId, generated);
    return generated;
  },
};
