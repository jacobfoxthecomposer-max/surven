/**
 * Variant pipeline — orchestrator. Picks the active source by env flag so
 * downstream callers never reach into a specific implementation directly.
 *
 *   NEXT_PUBLIC_VARIANT_SOURCE=mock  (default) — synthetic, deterministic
 *   NEXT_PUBLIC_VARIANT_SOURCE=llm            — Anthropic + Supabase cache
 *
 * The `llm` source currently falls back to `mock` until the Anthropic
 * generator stub is implemented (see llmVariantSource.ts). That means
 * flipping the flag is safe today — UI stays identical — and once the
 * stub is implemented the switch is live with no further code changes.
 */

import { llmVariantSource } from "./llmVariantSource";
import { mockVariantSource } from "./mockVariantSource";
import type { Variant, VariantBusinessContext, VariantFetchOptions, VariantSource } from "./types";

export type { Variant, VariantBusinessContext, VariantFetchOptions, VariantSource };

export const variantSource: VariantSource =
  (process.env.NEXT_PUBLIC_VARIANT_SOURCE ?? "mock") === "llm"
    ? llmVariantSource
    : mockVariantSource;

export async function fetchVariantsFor(
  promptId: string,
  promptText: string,
  ctx: VariantBusinessContext,
  options?: VariantFetchOptions,
): Promise<Variant[]> {
  return variantSource.fetch(promptId, promptText, ctx, options);
}
