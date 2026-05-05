/**
 * WordPress revert dispatcher. Reads `previous_value` (captured at apply time)
 * and PATCHes the original value back into the page/post/media.
 *
 * Supported kinds (must match what wordpressHandler captures on apply):
 *   - meta_desc   → restore meta key OR excerpt to oldValue
 *   - title_tag   → restore meta key to oldValue
 *   - alt_text    → restore each media item's alt to its oldValue
 *   - schema_org  → strip the surven-fix marker block from page content
 */

import { WordPressClient } from "@/services/wordpressClient";
import { decryptCredentials, type EncryptedBlob } from "@/utils/credentialsEncryption";

export interface WordpressRevertOptions {
  credsBlob: EncryptedBlob;
  siteUrl: string;
  previousValue: Record<string, unknown> | null;
}

export interface WordpressRevertResult {
  ok: boolean;
  error?: string;
}

export async function revertWordpressFix(opts: WordpressRevertOptions): Promise<WordpressRevertResult> {
  if (!opts.previousValue || typeof opts.previousValue !== "object") {
    return {
      ok: false,
      error: "No previous value captured for this fix. It can't be reverted automatically — edit it manually in WordPress admin.",
    };
  }

  let creds: { username: string; applicationPassword: string };
  try {
    creds = decryptCredentials<{ username: string; applicationPassword: string }>(opts.credsBlob);
  } catch {
    return { ok: false, error: "Couldn't decrypt WordPress credentials. Reconnect WordPress." };
  }

  let client: WordPressClient;
  try {
    client = new WordPressClient({
      siteUrl: opts.siteUrl,
      username: creds.username,
      applicationPassword: creds.applicationPassword,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WordPress client init failed" };
  }

  const pv = opts.previousValue as { kind?: string };

  switch (pv.kind) {
    case "meta_desc":
      return await revertMetaDesc(client, opts.previousValue);
    case "title_tag":
      return await revertTitleTag(client, opts.previousValue);
    case "alt_text":
      return await revertAltText(client, opts.previousValue);
    case "schema_org":
      return await revertSchema(client, opts.previousValue);
    default:
      return { ok: false, error: `Unknown previous_value kind '${pv.kind}'. This fix can't be auto-reverted.` };
  }
}

async function revertMetaDesc(client: WordPressClient, pv: Record<string, unknown>): Promise<WordpressRevertResult> {
  const postType = pv.postType as "page" | "post" | undefined;
  const postId = pv.postId as number | undefined;
  const oldValue = pv.oldValue as string | undefined;
  const metaKey = pv.metaKey as string | null;
  const usedExcerpt = pv.usedExcerpt as boolean | undefined;
  if (!postType || !postId || oldValue === undefined) {
    return { ok: false, error: "Previous-value blob is missing required fields." };
  }
  const result = await client.setPageMetaDescriptionRaw(
    { id: postId, type: postType, link: "", slug: "" },
    oldValue,
    metaKey ?? null,
    Boolean(usedExcerpt),
  );
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

async function revertTitleTag(client: WordPressClient, pv: Record<string, unknown>): Promise<WordpressRevertResult> {
  const postType = pv.postType as "page" | "post" | undefined;
  const postId = pv.postId as number | undefined;
  const oldValue = pv.oldValue as string | undefined;
  const metaKey = pv.metaKey as string | undefined;
  if (!postType || !postId || oldValue === undefined || !metaKey) {
    return { ok: false, error: "Previous-value blob is missing required fields." };
  }
  const result = await client.setPageSeoTitleRaw(
    { id: postId, type: postType, link: "", slug: "" },
    oldValue,
    metaKey,
  );
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

async function revertAltText(client: WordPressClient, pv: Record<string, unknown>): Promise<WordpressRevertResult> {
  const items = pv.items as Array<{ mediaId: number; oldValue: string }> | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "No media items captured in previous value." };
  }
  const failures: string[] = [];
  for (const item of items) {
    const r = await client.updateMediaAlt(item.mediaId, item.oldValue);
    if (!r.ok) failures.push(`media ${item.mediaId}: ${r.error ?? "unknown error"}`);
  }
  if (failures.length === items.length) {
    return { ok: false, error: `All ${items.length} alt text reverts failed: ${failures[0]}` };
  }
  if (failures.length > 0) {
    return { ok: true, error: `Reverted ${items.length - failures.length} of ${items.length}; failures: ${failures.join("; ")}` };
  }
  return { ok: true };
}

async function revertSchema(client: WordPressClient, pv: Record<string, unknown>): Promise<WordpressRevertResult> {
  const postType = pv.postType as "page" | "post" | undefined;
  const postId = pv.postId as number | undefined;
  const markerId = pv.markerId as string | undefined;
  if (!postType || !postId || !markerId) {
    return { ok: false, error: "Previous-value blob is missing required fields." };
  }
  const page = { id: postId, type: postType, link: "", slug: "" };
  const current = await client.getPageContentRaw(page);
  if (current === null) {
    return { ok: false, error: "Couldn't fetch current page content for revert." };
  }
  // Strip the marker block. Pattern: <!--surven-fix:{markerId}-->...<!--/surven-fix:{markerId}-->
  const escapedId = markerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(
    `\\s*<!--surven-fix:${escapedId}-->[\\s\\S]*?<!--/surven-fix:${escapedId}-->\\s*`,
    "g",
  );
  if (!blockRegex.test(current)) {
    return { ok: false, error: "Couldn't find Surven's schema marker on this page. The schema may have been edited or removed manually." };
  }
  const stripped = current.replace(blockRegex, "\n");
  const result = await client.setPageContentRaw(page, stripped);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
