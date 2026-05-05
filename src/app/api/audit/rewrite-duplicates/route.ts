/**
 * POST /api/audit/rewrite-duplicates
 *
 * Auto-fixes the `duplicate_titles` and `duplicate_meta_descriptions` findings.
 * Strategy:
 *   1. Fetch each affected URL's HTML.
 *   2. Extract current title/description + a body excerpt per page.
 *   3. Single LLM call → distinct titles (or descriptions) for each page.
 *   4. Per-platform writes:
 *        GitHub Next.js → replaceMetadataField on each page.tsx + commitBatch
 *        GitHub plain HTML → string-replace <title> / meta in each .html + commitBatch
 *        WordPress → updatePageSeoTitle / updatePageMetaDescription per page (with capture-before)
 *   5. Insert one applied_fixes row per URL so the History view can revert per-page.
 *
 * Auth: x-api-key (extension), premium-gated.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabaseServer";
import { decryptCredentials } from "@/utils/credentialsEncryption";
import { writeAuditLog, ipFromRequest } from "@/services/auditLog";
import { PAID_PLANS, MANAGED_PLAN_CTA } from "@/utils/managedPlanCta";
import {
  rewriteDuplicateTitles,
  rewriteDuplicateMetaDescriptions,
  type DuplicatePageInput,
} from "@/services/llmRewriter";
import { GithubClient } from "@/services/github/githubClient";
import { resolveCandidatePaths } from "@/features/crawlability/services/applyFix/perPageHtmlInjector";
import { urlToPageCandidates } from "@/services/nextJsMetadataWriter";
import { replaceMetadataField } from "@/services/nextJsMetadataWriter";
import { WordPressClient } from "@/services/wordpressClient";

export const maxDuration = 60;

const Schema = z.object({
  findingId: z.enum(["duplicate_titles", "duplicate_meta_descriptions"]),
  siteUrl: z.string().url(),
  affectedUrls: z.array(z.string().url()).min(2).max(20),
  businessId: z.string().uuid().optional(),
});

interface ConnectionRow {
  id: string;
  user_id: string;
  business_id: string;
  platform: string;
  credentials: { iv: string; ciphertext: string; tag: string };
  repo: string | null;
  branch: string | null;
  site_url: string | null;
  status: string;
}

export async function POST(request: NextRequest) {
  // Auth
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: keyRows, error: keyErr } = await supabase.rpc("validate_extension_api_key", { p_key: apiKey });
  if (keyErr || !keyRows || keyRows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [keyData] = keyRows;
  if (!keyData.valid || !(PAID_PLANS as readonly string[]).includes(keyData.plan)) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }
  const userId = keyData.user_id as string;

  const body = await request.json().catch(() => null);
  const parse = Schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body", details: parse.error.flatten() }, { status: 400 });
  }
  const { findingId, siteUrl, affectedUrls } = parse.data;
  const isTitles = findingId === "duplicate_titles";
  const ipAddress = ipFromRequest(request);
  const supabaseAdmin = createServerClient();

  // Resolve connection by hostname.
  const hostname = (() => {
    try { return new URL(siteUrl).hostname.replace(/^www\./, ""); }
    catch { return null; }
  })();

  const { data: connections } = await supabaseAdmin
    .from("site_connections")
    .select("id, user_id, business_id, platform, credentials, repo, branch, site_url, status")
    .eq("user_id", userId)
    .in("platform", ["github", "wordpress"])
    .eq("status", "active")
    .returns<ConnectionRow[]>();

  let connection: ConnectionRow | null = null;
  if (hostname && connections) {
    connection = connections.find((c) => {
      if (!c.site_url) return false;
      try { return new URL(c.site_url).hostname.replace(/^www\./, "") === hostname; }
      catch { return false; }
    }) ?? null;
  }
  if (!connection) {
    return NextResponse.json(
      {
        error: "site_not_connected",
        message: `Connect ${hostname ?? "this site"} under Settings → Integrations to auto-fix duplicates.`,
        managedPlanCta: MANAGED_PLAN_CTA,
      },
      { status: 422 }
    );
  }

  // Fetch each affected URL's HTML to extract current title/description + body excerpt.
  // Best-effort: pages that fail to fetch get skipped from the LLM call but reported.
  const fetched = await Promise.all(
    affectedUrls.map(async (url) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "SurvenBot/1.0 (Duplicate Fixer)" } });
        if (!res.ok) return { url, ok: false as const, error: `HTTP ${res.status}` };
        const html = await res.text();
        return { url, ok: true as const, html };
      } catch (err) {
        return { url, ok: false as const, error: err instanceof Error ? err.message : "fetch failed" };
      }
    })
  );

  const fetchFailed = fetched.filter((f) => !f.ok) as Array<{ url: string; ok: false; error: string }>;
  const fetchOk = fetched.filter((f) => f.ok) as Array<{ url: string; ok: true; html: string }>;
  if (fetchOk.length < 2) {
    return NextResponse.json(
      { error: "fetch_failed", message: "Couldn't fetch enough pages to rewrite — at least 2 needed.", failures: fetchFailed },
      { status: 422 }
    );
  }

  const inputs: DuplicatePageInput[] = fetchOk.map((f) => ({
    url: f.url,
    currentTitle: extractTitle(f.html),
    currentDescription: extractMetaDescription(f.html),
    bodyExcerpt: extractBodyExcerpt(f.html),
  }));

  // Look up business name (used by the LLM prompt).
  let businessName: string | undefined;
  let businessIdResolved = connection.business_id;
  if (parse.data.businessId) businessIdResolved = parse.data.businessId;
  const { data: biz } = await supabaseAdmin
    .from("businesses")
    .select("name")
    .eq("id", businessIdResolved)
    .single();
  businessName = (biz?.name as string | undefined) ?? undefined;

  // LLM call.
  const llmResult = isTitles
    ? await rewriteDuplicateTitles(inputs, { businessName })
    : await rewriteDuplicateMetaDescriptions(inputs, { businessName });

  if (!llmResult.ok || !llmResult.data) {
    return NextResponse.json(
      { error: "llm_failed", message: llmResult.error ?? "Couldn't generate distinct values." },
      { status: 422 }
    );
  }

  // Build per-URL replacement map.
  const rewriteMap = new Map<string, string>();
  if (isTitles) {
    for (const t of (llmResult.data as { titles: Array<{ url: string; title: string }> }).titles) {
      rewriteMap.set(t.url, t.title);
    }
  } else {
    for (const d of (llmResult.data as { descriptions: Array<{ url: string; description: string }> }).descriptions) {
      rewriteMap.set(d.url, d.description);
    }
  }

  // Dispatch per platform.
  if (connection.platform === "github") {
    return await dispatchGithub(connection, inputs, rewriteMap, fetchOk, isTitles, supabaseAdmin, userId, ipAddress, fetchFailed);
  }
  if (connection.platform === "wordpress") {
    return await dispatchWordpress(connection, inputs, rewriteMap, isTitles, supabaseAdmin, userId, ipAddress, fetchFailed);
  }

  return NextResponse.json({ error: "unsupported_platform" }, { status: 422 });
}

async function dispatchGithub(
  connection: ConnectionRow,
  inputs: DuplicatePageInput[],
  rewriteMap: Map<string, string>,
  fetched: Array<{ url: string; ok: true; html: string }>,
  isTitles: boolean,
  supabaseAdmin: ReturnType<typeof createServerClient>,
  userId: string,
  ipAddress: string | null,
  fetchFailed: Array<{ url: string; error: string }>,
) {
  if (!connection.repo || !connection.branch) {
    return NextResponse.json({ error: "GitHub connection missing repo/branch" }, { status: 422 });
  }
  let token: string;
  try {
    token = decryptCredentials<{ token: string }>(connection.credentials).token;
  } catch {
    return NextResponse.json({ error: "encryption_unavailable", message: "Reconnect GitHub." }, { status: 500 });
  }

  const client = new GithubClient(token, connection.repo);

  let fileTree: Set<string>;
  try {
    fileTree = await client.getFileTree(connection.branch);
  } catch (err) {
    return NextResponse.json({ error: "tree_fetch_failed", message: err instanceof Error ? err.message : "" }, { status: 502 });
  }

  const isNextJs =
    fileTree.has("next.config.js") || fileTree.has("next.config.mjs") ||
    fileTree.has("next.config.ts") || fileTree.has("next.config.cjs");

  // Plan per-page edits.
  const writes: Array<{ path: string; content: string; url: string; oldValue: string; newValue: string }> = [];
  const failed: Array<{ url: string; reason: string }> = [];

  for (const input of inputs) {
    const newValue = rewriteMap.get(input.url);
    if (!newValue) { failed.push({ url: input.url, reason: "LLM didn't return a value" }); continue; }

    if (isNextJs) {
      const candidates = urlToPageCandidates(input.url);
      const resolved = candidates.candidates.find((p: string) => fileTree.has(p));
      if (!resolved) { failed.push({ url: input.url, reason: "Couldn't find a page.tsx for this URL" }); continue; }
      const file = await client.getFile(resolved, connection.branch);
      if (!file) { failed.push({ url: input.url, reason: "Couldn't read the page file" }); continue; }
      const result = replaceMetadataField(file.content, {
        path: [isTitles ? "title" : "description"],
        valueLiteral: JSON.stringify(newValue),
      });
      if (!result.ok) {
        failed.push({ url: input.url, reason: result.manualInstruction });
        continue;
      }
      const oldValue = isTitles ? (input.currentTitle ?? "") : (input.currentDescription ?? "");
      writes.push({ path: resolved, content: result.updated, url: input.url, oldValue, newValue });
    } else {
      const candidates = resolveCandidatePaths(input.url);
      const resolved = candidates.find((p) => fileTree.has(p));
      if (!resolved) { failed.push({ url: input.url, reason: `No HTML file found. Tried: ${candidates.slice(0, 3).join(", ")}` }); continue; }
      const file = await client.getFile(resolved, connection.branch);
      if (!file) { failed.push({ url: input.url, reason: "Couldn't read the HTML file" }); continue; }
      const replaceResult = isTitles
        ? replaceTitleTagInHtml(file.content, newValue)
        : replaceMetaDescInHtml(file.content, newValue);
      if (!replaceResult.ok) { failed.push({ url: input.url, reason: replaceResult.reason }); continue; }
      const oldValue = isTitles ? (input.currentTitle ?? "") : (input.currentDescription ?? "");
      writes.push({ path: resolved, content: replaceResult.updated, url: input.url, oldValue, newValue });
    }
  }

  if (writes.length === 0) {
    return NextResponse.json({
      error: "all_failed",
      message: "Couldn't auto-rewrite any pages — see per-URL details.",
      failed,
      llmResults: Array.from(rewriteMap.entries()).map(([url, value]) => ({ url, value })),
    }, { status: 422 });
  }

  // Atomic batch commit.
  const subject = isTitles ? "duplicate page titles" : "duplicate meta descriptions";
  const commitMessage = `fix(crawlability): rewrite ${writes.length} ${subject}\n\nApplied via Surven Optimizer (${writes.length} per-page edit${writes.length === 1 ? "" : "s"}).`;
  let commitSha: string;
  try {
    const result = await client.commitBatch(
      writes.map((w) => ({ path: w.path, content: w.content })),
      connection.branch!,
      commitMessage,
    );
    commitSha = result.commitSha;
  } catch (err) {
    return NextResponse.json({ error: "commit_failed", message: err instanceof Error ? err.message : "" }, { status: 502 });
  }
  const commitUrl = `https://github.com/${connection.repo}/commit/${commitSha}`;

  // Insert applied_fixes rows + audit_log per page.
  const fixIds: string[] = [];
  for (const w of writes) {
    const { data: row } = await supabaseAdmin
      .from("applied_fixes")
      .insert({
        business_id: connection.business_id,
        audit_id: null,
        finding_id: isTitles ? "duplicate_titles" : "duplicate_meta_descriptions",
        fix_type: isTitles ? "duplicate_title_rewrite" : "duplicate_meta_rewrite",
        platform: "github",
        status: "applied",
        committed_sha: commitSha,
        commit_url: commitUrl,
        file_path: `${w.path} (${w.url})`,
      })
      .select("id")
      .single();
    if (row) fixIds.push(row.id as string);
  }
  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/rewrite-duplicates",
    userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId: isTitles ? "duplicate_titles" : "duplicate_meta_descriptions",
      pageCount: writes.length,
      commitSha,
      platform: "github",
    },
    ipAddress,
  });

  return NextResponse.json({
    ok: true,
    platform: "github",
    commitUrl,
    commitSha,
    succeeded: writes.map((w) => ({ url: w.url, oldValue: w.oldValue, newValue: w.newValue, filePath: w.path })),
    failed,
    fetchFailed,
  });
}

async function dispatchWordpress(
  connection: ConnectionRow,
  inputs: DuplicatePageInput[],
  rewriteMap: Map<string, string>,
  isTitles: boolean,
  supabaseAdmin: ReturnType<typeof createServerClient>,
  userId: string,
  ipAddress: string | null,
  fetchFailed: Array<{ url: string; error: string }>,
) {
  if (!connection.site_url) {
    return NextResponse.json({ error: "WordPress connection missing site URL" }, { status: 422 });
  }
  let creds: { username: string; applicationPassword: string };
  try {
    creds = decryptCredentials<{ username: string; applicationPassword: string }>(connection.credentials);
  } catch {
    return NextResponse.json({ error: "encryption_unavailable", message: "Reconnect WordPress." }, { status: 500 });
  }

  const client = new WordPressClient({
    siteUrl: connection.site_url,
    username: creds.username,
    applicationPassword: creds.applicationPassword,
  });
  const plugin = await client.detectSeoPlugin();

  if (isTitles && !plugin) {
    return NextResponse.json({
      error: "no_seo_plugin",
      message: "WordPress site has no Yoast/RankMath/AIOSEO plugin installed — can't update SEO titles.",
    }, { status: 422 });
  }

  const succeeded: Array<{ url: string; oldValue: string; newValue: string }> = [];
  const failed: Array<{ url: string; reason: string }> = [];

  for (const input of inputs) {
    const newValue = rewriteMap.get(input.url);
    if (!newValue) { failed.push({ url: input.url, reason: "LLM didn't return a value" }); continue; }

    const page = await client.findPageOrPostByUrl(input.url);
    if (!page) { failed.push({ url: input.url, reason: "Page not found in WordPress" }); continue; }

    let oldValue = "";
    let previousValue: Record<string, unknown> = {};

    if (isTitles) {
      const before = await client.getPageSeoTitle(page, plugin);
      if (!before) { failed.push({ url: input.url, reason: "Couldn't read current title" }); continue; }
      oldValue = before.value;
      previousValue = {
        kind: "title_tag",
        postType: page.type,
        postId: page.id,
        plugin,
        metaKey: before.metaKey,
        oldValue,
      };
      const result = await client.updatePageSeoTitle(page, newValue, plugin);
      if (!result.ok) { failed.push({ url: input.url, reason: result.error ?? "WordPress update failed" }); continue; }
    } else {
      const before = await client.getPageMetaDescription(page, plugin);
      if (!before) { failed.push({ url: input.url, reason: "Couldn't read current description" }); continue; }
      oldValue = before.value;
      previousValue = {
        kind: "meta_desc",
        postType: page.type,
        postId: page.id,
        plugin,
        metaKey: before.metaKey,
        oldValue,
        usedExcerpt: before.usedExcerpt,
      };
      const result = await client.updatePageMetaDescription(page, newValue, plugin);
      if (!result.ok) { failed.push({ url: input.url, reason: result.error ?? "WordPress update failed" }); continue; }
    }

    await supabaseAdmin
      .from("applied_fixes")
      .insert({
        business_id: connection.business_id,
        audit_id: null,
        finding_id: isTitles ? "duplicate_titles" : "duplicate_meta_descriptions",
        fix_type: isTitles ? "duplicate_title_rewrite" : "duplicate_meta_rewrite",
        platform: "wordpress",
        status: "applied",
        commit_url: `${new URL(connection.site_url).origin}/wp-admin/post.php?post=${page.id}&action=edit`,
        file_path: `WordPress ${page.type}${page.title?.rendered ? ` "${page.title.rendered.slice(0, 40)}"` : ""}`,
        previous_value: previousValue,
      });
    succeeded.push({ url: input.url, oldValue, newValue });
  }

  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/rewrite-duplicates",
    userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId: isTitles ? "duplicate_titles" : "duplicate_meta_descriptions",
      pageCount: succeeded.length,
      platform: "wordpress",
    },
    ipAddress,
  });

  return NextResponse.json({
    ok: succeeded.length > 0,
    platform: "wordpress",
    succeeded,
    failed,
    fetchFailed,
  });
}

// --- HTML helpers ---

function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeBasicEntities(m[1]!.trim()) : "";
}

function extractMetaDescription(html: string): string {
  const m =
    /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*\scontent\s*=\s*["']([^"']*)["']/i.exec(html) ??
    /<meta\s+[^>]*content\s*=\s*["']([^"']*)["'][^>]*\sname\s*=\s*["']description["']/i.exec(html);
  return m ? decodeBasicEntities(m[1]!) : "";
}

function extractBodyExcerpt(html: string): string {
  // Strip script/style/head/comments, then collapse whitespace, return first ~800 chars.
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeBasicEntities(stripped.slice(0, 1500));
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function replaceTitleTagInHtml(html: string, newTitle: string): { ok: true; updated: string } | { ok: false; reason: string } {
  // Encode for HTML body content (not attribute) — only & and < matter inside <title>
  const escaped = newTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const titleRegex = /<title[^>]*>[\s\S]*?<\/title>/i;
  if (!titleRegex.test(html)) {
    // No <title> tag — inject one before </head>
    const headEnd = /<\/head>/i.exec(html);
    if (!headEnd) return { ok: false, reason: "No <title> tag and no </head> to inject one" };
    const updated = html.slice(0, headEnd.index) + `  <title>${escaped}</title>\n` + html.slice(headEnd.index);
    return { ok: true, updated };
  }
  return { ok: true, updated: html.replace(titleRegex, `<title>${escaped}</title>`) };
}

function replaceMetaDescInHtml(html: string, newDesc: string): { ok: true; updated: string } | { ok: false; reason: string } {
  const attrEscaped = newDesc.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const metaRegexA = /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*>/i;
  const metaRegexB = /<meta\s+[^>]*content\s*=\s*["'][^"']*["'][^>]*\sname\s*=\s*["']description["'][^>]*>/i;
  if (metaRegexA.test(html) || metaRegexB.test(html)) {
    const replaced = `<meta name="description" content="${attrEscaped}" />`;
    if (metaRegexA.test(html)) return { ok: true, updated: html.replace(metaRegexA, replaced) };
    return { ok: true, updated: html.replace(metaRegexB, replaced) };
  }
  // Inject before </head>
  const headEnd = /<\/head>/i.exec(html);
  if (!headEnd) return { ok: false, reason: "No description meta and no </head> to inject one" };
  const updated = html.slice(0, headEnd.index) + `  <meta name="description" content="${attrEscaped}" />\n` + html.slice(headEnd.index);
  return { ok: true, updated };
}
