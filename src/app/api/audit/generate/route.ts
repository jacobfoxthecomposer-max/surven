/**
 * /api/audit/generate
 *
 * Sprint 1 unified generator endpoint. Called by the Chrome extension to:
 *   - Build JSON-LD schemas from page data (deterministic, no LLM)
 *   - Rewrite meta descriptions and title tags (GPT-4o-mini)
 *   - Generate alt text for images (GPT-4o-mini vision)
 *   - Generate FAQPage schema from existing Q&A content
 *
 * Auth: x-api-key header (extension API key, validated against extension_api_keys).
 * Auto-commits via htmlInjectHandler. If the repo isn't supported (Next.js, etc.),
 * returns a manual snippet so the extension can show copy-to-clipboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/services/supabase";
import { createServerClient } from "@/services/supabaseServer";
import { decryptCredentials } from "@/utils/credentialsEncryption";
import { applyHtmlInject } from "@/features/crawlability/services/applyFix/htmlInjectHandler";
import { applyFixToWordpress } from "@/features/crawlability/services/applyFix/wordpressHandler";
import { applyFixToWix } from "@/features/crawlability/services/applyFix/wixHandler";
// Wix + Shopify dispatch are currently disabled — auto-deploy is GitHub + WordPress only.
// The handlers stay in the codebase (wixHandler.ts, shopifyHandler.ts) so re-enabling
// is a one-import + one-dispatch-branch + one-runner-function restore from git history.
// import { applyFixToWix } from "@/features/crawlability/services/applyFix/wixHandler";
// import { applyFixToShopify } from "@/features/crawlability/services/applyFix/shopifyHandler";

const MANAGED_PLAN_CTA = {
  url: "https://surven.vercel.app/pricing",
  headline: "Skip the paste — let our team handle this for you",
  body: "Surven Managed deploys every fix to your site automatically, gets you listed on the directories AI engines cite most, and refreshes your content monthly so your visibility keeps climbing. You focus on the business — we focus on getting you cited.",
  buttonLabel: "See Managed plans",
} as const;

/**
 * Inject the Managed-plan upsell into any commit result that didn't successfully auto-deploy.
 * This is a structured field the side panel can render — extension falls back gracefully
 * if it's missing.
 */
function withManagedPlanCta<T extends { ok?: boolean; manualSnippet?: string; manualNote?: string }>(
  result: T,
): T & { managedPlanCta?: typeof MANAGED_PLAN_CTA } {
  const isManualFallback = result.ok === false || !!result.manualSnippet || !!result.manualNote;
  if (!isManualFallback) return result;
  return { ...result, managedPlanCta: MANAGED_PLAN_CTA };
}
import { generateSchema, type SchemaKind, type PageContext } from "@/services/schemaGenerator";
import { rewriteMetaDescription, rewriteTitleTag, generateFaqPairs, generateAltText } from "@/services/llmRewriter";
import { writeAuditLog, ipFromRequest } from "@/services/auditLog";

export const maxDuration = 30;

const PAID_PLANS = ["plus", "premium", "admin"];

const PageContextSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  businessName: z.string().optional(),
  bodyContent: z.string().optional(),
  ambiguousPage: z.boolean().optional(),
  ambiguousReasons: z.array(z.string()).optional(),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  hours: z.array(z.object({ days: z.string(), opens: z.string(), closes: z.string() })).optional(),
  socials: z.array(z.string()).optional(),
  faqItems: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  reviewItems: z
    .array(z.object({ author: z.string().optional(), rating: z.number().optional(), text: z.string().optional() }))
    .optional(),
  productItems: z
    .array(z.object({ name: z.string(), price: z.string().optional(), image: z.string().optional(), description: z.string().optional() }))
    .optional(),
  serviceItems: z.array(z.object({ name: z.string(), description: z.string().optional() })).optional(),
  videoItems: z
    .array(z.object({ name: z.string().optional(), description: z.string().optional(), thumbnailUrl: z.string().optional(), embedUrl: z.string().optional() }))
    .optional(),
  personItems: z
    .array(z.object({ name: z.string(), jobTitle: z.string().optional(), image: z.string().optional(), bio: z.string().optional() }))
    .optional(),
  breadcrumbItems: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  articleHeadline: z.string().optional(),
  articleAuthor: z.string().optional(),
  articleDate: z.string().optional(),
  logo: z.string().optional(),
});

const BodySchema = z.object({
  kind: z.enum(["schema_org", "meta_desc", "title_tag", "faq_page", "alt_text", "llms_txt"]),
  schemaType: z
    .enum([
      "Organization",
      "LocalBusiness",
      "WebSite",
      "BreadcrumbList",
      "FAQPage",
      "Article",
      "Review",
      "Product",
      "Service",
      "VideoObject",
      "Event",
      "Recipe",
      "Person",
    ])
    .optional(),
  pageContext: PageContextSchema,
  commit: z.boolean().default(true),
  findingId: z.string().min(1),
  findingTitle: z.string().min(1),
  /**
   * Pre-approved content from a previous preview call. When the side panel shows the user
   * a suggested rewrite and they click "Use this version," it sends the exact text back
   * so we commit what they saw — not a fresh LLM regeneration.
   */
  approvedContent: z.string().optional(),
  /**
   * For alt_text kind: list of images to generate descriptions for.
   * Sent as the FIRST step (no commit). Side panel then sends `replacements` to commit.
   */
  images: z.array(z.object({ src: z.string(), surroundingText: z.string().optional() })).optional(),
  /**
   * For alt_text kind: pre-approved alt text per image, ready to commit.
   */
  replacements: z.array(z.object({ src: z.string(), alt: z.string() })).optional(),
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
  site_id: string | null;
  status: string;
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: keyRows, error: keyErr } = await supabase.rpc("validate_extension_api_key", { p_key: apiKey });
  if (keyErr || !keyRows || keyRows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [keyData] = keyRows;
  if (!keyData.valid || !PAID_PLANS.includes(keyData.plan)) {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }

  const userId = keyData.user_id as string;

  const body = await request.json().catch(() => null);
  const parse = BodySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request", details: parse.error.flatten() }, { status: 400 });
  }

  const { kind, pageContext, commit, findingId, findingTitle, schemaType, approvedContent, images, replacements } = parse.data;

  // Block LLM-driven generators on ambiguous pages (dashboards, directories, agency portfolios)
  // because the LLM might describe a featured entity instead of the site itself.
  // Deterministic schema generation (schema_org) is safe — the extractor uses only head-level
  // signals on ambiguous pages, so businessName / address come from og:site_name / footer, not
  // displayed customer data.
  // alt_text is also safe — it describes images, not site identity.
  // The escape hatch (commit + approvedContent) lets the user force a commit if they really
  // know what they're doing, since they'd have already seen the warning in the preview UX.
  const LLM_DRIVEN_KINDS = new Set(["meta_desc", "title_tag", "faq_page"]);
  if (pageContext.ambiguousPage && LLM_DRIVEN_KINDS.has(kind) && !(commit && approvedContent)) {
    const reasons = pageContext.ambiguousReasons ?? [];
    return NextResponse.json(
      {
        error: "ambiguous_page",
        message: "This page looks like a dashboard, directory, or admin panel that displays data about other entities. AI-generated descriptions on these pages tend to describe the wrong business. Try this on a real business homepage (your client's actual site) instead.",
        reasons,
      },
      { status: 422 },
    );
  }

  if (kind === "schema_org") {
    if (!schemaType) {
      return NextResponse.json({ error: "schemaType is required for schema_org" }, { status: 400 });
    }
    const result = generateSchema(schemaType as SchemaKind, pageContext as PageContext);
    if (!result.ok || !result.jsonLd) {
      return NextResponse.json({ error: result.error ?? "schema_build_failed" }, { status: 422 });
    }

    if (!commit) {
      return NextResponse.json({ ok: true, snippet: result.jsonLd, kind: "schema_org", schemaType });
    }

    const commitResult = await commitToConnectedRepo({
      userId,
      siteUrl: pageContext.url,
      kind: "schema_org",
      payload: { kind: "schema_org", jsonLd: result.jsonLd, schemaType },
      findingId,
      findingTitle,
      origin: request.nextUrl.origin,
      ipAddress: ipFromRequest(request),
    });
    return NextResponse.json(withManagedPlanCta({ ...commitResult, snippet: result.jsonLd, schemaType }));
  }

  if (kind === "meta_desc") {
    let description: string;
    if (approvedContent && commit) {
      description = approvedContent;
    } else {
      const result = await rewriteMetaDescription(pageContext as PageContext);
      if (!result.ok || !result.data) {
        return NextResponse.json({ error: result.error ?? "rewrite_failed" }, { status: 422 });
      }
      description = result.data.description;
    }

    if (!commit) {
      return NextResponse.json({
        ok: true,
        kind: "meta_desc",
        suggested: description,
        current: pageContext.description ?? null,
      });
    }

    const commitResult = await commitToConnectedRepo({
      userId,
      siteUrl: pageContext.url,
      kind: "meta_desc",
      payload: { kind: "meta_desc", description },
      findingId,
      findingTitle,
      origin: request.nextUrl.origin,
      ipAddress: ipFromRequest(request),
    });
    return NextResponse.json(withManagedPlanCta({ ...commitResult, suggested: description, current: pageContext.description ?? null }));
  }

  if (kind === "title_tag") {
    let title: string;
    if (approvedContent && commit) {
      title = approvedContent;
    } else {
      const result = await rewriteTitleTag(pageContext as PageContext);
      if (!result.ok || !result.data) {
        return NextResponse.json({ error: result.error ?? "rewrite_failed" }, { status: 422 });
      }
      title = result.data.title;
    }

    if (!commit) {
      return NextResponse.json({
        ok: true,
        kind: "title_tag",
        suggested: title,
        current: pageContext.title ?? null,
      });
    }

    const commitResult = await commitToConnectedRepo({
      userId,
      siteUrl: pageContext.url,
      kind: "title_tag",
      payload: { kind: "title_tag", title },
      findingId,
      findingTitle,
      origin: request.nextUrl.origin,
      ipAddress: ipFromRequest(request),
    });
    return NextResponse.json(withManagedPlanCta({ ...commitResult, suggested: title, current: pageContext.title ?? null }));
  }

  if (kind === "faq_page") {
    let pairs: Array<{ question: string; answer: string }>;

    if (approvedContent && commit) {
      try {
        pairs = JSON.parse(approvedContent);
        if (!Array.isArray(pairs)) throw new Error("not an array");
      } catch {
        return NextResponse.json({ error: "approvedContent must be a JSON array of {question, answer} pairs" }, { status: 400 });
      }
    } else {
      const result = await generateFaqPairs(pageContext as PageContext);
      if (!result.ok || !result.data) {
        return NextResponse.json({ error: result.error ?? "faq_generation_failed" }, { status: 422 });
      }
      pairs = result.data.pairs;
    }

    const ctxWithFaq: PageContext = { ...(pageContext as PageContext), faqItems: pairs };
    const schemaResult = generateSchema("FAQPage", ctxWithFaq);
    if (!schemaResult.ok || !schemaResult.jsonLd) {
      return NextResponse.json({ error: schemaResult.error ?? "schema_build_failed" }, { status: 422 });
    }

    if (!commit) {
      return NextResponse.json({
        ok: true,
        kind: "faq_page",
        pairs,
        snippet: schemaResult.jsonLd,
      });
    }

    const commitResult = await commitToConnectedRepo({
      userId,
      siteUrl: pageContext.url,
      kind: "schema_org",
      payload: { kind: "schema_org", jsonLd: schemaResult.jsonLd, schemaType: "FAQPage" },
      findingId,
      findingTitle,
      origin: request.nextUrl.origin,
      ipAddress: ipFromRequest(request),
    });
    return NextResponse.json(withManagedPlanCta({ ...commitResult, snippet: schemaResult.jsonLd, pairs, schemaType: "FAQPage" }));
  }

  if (kind === "alt_text") {
    if (replacements && commit) {
      const commitResult = await commitToConnectedRepo({
        userId,
        siteUrl: pageContext.url,
        kind: "alt_text",
        payload: { kind: "alt_text", replacements },
        findingId,
        findingTitle,
        origin: request.nextUrl.origin,
        ipAddress: ipFromRequest(request),
      });
      return NextResponse.json(withManagedPlanCta({ ...commitResult, replacements }));
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "alt_text requires images array (first call) or replacements array (commit call)" }, { status: 400 });
    }

    const capped = images.slice(0, 12);
    const results = await Promise.all(
      capped.map(async (img) => {
        const result = await generateAltText(img.src, {
          surroundingText: img.surroundingText,
          pageTitle: pageContext.title,
        });
        return { src: img.src, alt: result.ok ? result.data?.alt : null, error: result.ok ? null : result.error };
      }),
    );

    return NextResponse.json({ ok: true, kind: "alt_text", suggestions: results });
  }

  return NextResponse.json(
    { error: "kind_not_implemented", message: `${kind} ships in a later step of Sprint 1.` },
    { status: 501 },
  );
}

interface CommitArgs {
  userId: string;
  siteUrl: string;
  kind: "schema_org" | "meta_desc" | "title_tag" | "alt_text";
  payload: Parameters<typeof applyHtmlInject>[0]["payload"];
  findingId: string;
  findingTitle: string;
  origin: string;
  ipAddress: string | null;
}

async function commitToConnectedRepo(args: CommitArgs) {
  const supabaseAdmin = createServerClient();
  const hostname = (() => {
    try {
      return new URL(args.siteUrl).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  })();

  // Fetch ALL active connections for this user (GitHub + WordPress + Wix + future platforms).
  // We pick the one whose site_url or site_id matches the audited URL.
  const { data: connections } = await supabaseAdmin
    .from("site_connections")
    .select("id, user_id, business_id, platform, credentials, repo, branch, site_url, site_id, status")
    .eq("user_id", args.userId)
    // Auto-deploy: GitHub + WordPress only. Wix + Shopify connections are stored
    // for verification/future-use but route to manual paste with a Managed-plan CTA.
    .in("platform", ["github", "wordpress"])
    .eq("status", "active")
    .returns<ConnectionRow[]>();

  if (!connections || connections.length === 0) {
    return {
      ok: false,
      error: "no_connection",
      message: "Connect a site (GitHub, WordPress, or Shopify) to your Surven account to enable auto-update.",
      connectUrl: `${args.origin}/settings`,
      manualNote: "No site connection — copy the snippet below and paste it into your site manually.",
    };
  }

  // Pick the connection that matches this audited URL by hostname.
  // Without a hostname match, we don't auto-pick — would be too risky to commit to the
  // wrong site. Tell the user what's connected vs. what they audited.
  let connection: ConnectionRow | null = null;
  if (hostname) {
    connection =
      connections.find((c) => {
        if (!c.site_url) return false;
        try {
          return new URL(c.site_url).hostname.replace(/^www\./, "") === hostname;
        } catch {
          return false;
        }
      }) ?? null;
  }

  if (!connection) {
    const connectedHosts = connections.map((c) => {
      try { return c.site_url ? new URL(c.site_url).hostname.replace(/^www\./, "") : null; } catch { return null; }
    }).filter(Boolean);
    return {
      ok: false,
      error: "site_not_connected",
      message: hostname
        ? `You audited ${hostname} but it's not connected to Surven. Your connected sites: ${connectedHosts.join(", ") || "(none)"}. Add this site under Settings → Integrations or run the audit on a connected site.`
        : "Couldn't determine which site to update.",
      connectUrl: `${args.origin}/settings`,
    };
  }

  // Dispatch by platform.
  if (connection.platform === "wordpress") {
    return await runWordpressCommit(supabaseAdmin, connection, args);
  }
  // Wix + Shopify dispatch disabled — handlers stay dormant for one-line re-enable.
  // if (connection.platform === "wix") return await runWixCommit(supabaseAdmin, connection, args);
  // if (connection.platform === "shopify") return await runShopifyCommit(supabaseAdmin, connection, args);
  if (connection.platform === "github") {
    return await runGithubCommit(supabaseAdmin, connection, args);
  }

  return {
    ok: false,
    error: "unsupported_platform",
    message: `Auto-update for ${connection.platform} isn't wired yet. Use the copy-paste flow.`,
  };
}

async function runGithubCommit(
  supabaseAdmin: ReturnType<typeof createServerClient>,
  connection: ConnectionRow,
  args: CommitArgs,
) {
  if (!connection.repo) {
    return { ok: false, error: "Connection missing repo" };
  }

  let token: string;
  try {
    const creds = decryptCredentials<{ token: string }>(connection.credentials);
    token = creds.token;
  } catch {
    return { ok: false, error: "encryption_unavailable", message: "Stored credentials couldn't be decrypted. Reconnect GitHub." };
  }

  const { data: pendingRow } = await supabaseAdmin
    .from("applied_fixes")
    .insert({
      business_id: connection.business_id,
      audit_id: null,
      finding_id: args.findingId,
      fix_type: args.kind,
      platform: "github",
      status: "pending",
    })
    .select("id")
    .single();

  const result = await applyHtmlInject({
    token,
    repo: connection.repo,
    branch: connection.branch ?? "main",
    kind: args.kind,
    payload: args.payload,
    findingId: args.findingId,
    findingTitle: args.findingTitle,
  });

  if (!result.ok) {
    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({ status: result.manualSnippet ? "skipped" : "failed", error_message: result.error ?? result.manualNote ?? null })
        .eq("id", pendingRow.id);
    }
    return {
      ok: false,
      error: result.error,
      manualNote: result.manualNote,
    };
  }

  if (pendingRow) {
    await supabaseAdmin
      .from("applied_fixes")
      .update({
        status: "applied",
        committed_sha: result.committedSha,
        commit_url: result.commitUrl,
        file_path: result.filePath,
      })
      .eq("id", pendingRow.id);
  }

  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/generate",
    userId: args.userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId: args.findingId,
      kind: args.kind,
      filePath: result.filePath,
      commitSha: result.committedSha,
      commitUrl: result.commitUrl,
      source: "extension",
    },
    ipAddress: args.ipAddress,
  });

  return {
    ok: true,
    committedSha: result.committedSha,
    commitUrl: result.commitUrl,
    filePath: result.filePath,
  };
}

async function runWordpressCommit(
  supabaseAdmin: ReturnType<typeof createServerClient>,
  connection: ConnectionRow,
  args: CommitArgs,
) {
  if (!connection.site_url) {
    return { ok: false, error: "WordPress connection is missing site URL" };
  }

  let creds: { username: string; applicationPassword: string };
  try {
    creds = decryptCredentials<{ username: string; applicationPassword: string }>(connection.credentials);
  } catch {
    return {
      ok: false,
      error: "encryption_unavailable",
      message: "Stored credentials couldn't be decrypted. Reconnect WordPress.",
    };
  }

  const { data: pendingRow } = await supabaseAdmin
    .from("applied_fixes")
    .insert({
      business_id: connection.business_id,
      audit_id: null,
      finding_id: args.findingId,
      fix_type: args.kind,
      platform: "wordpress",
      status: "pending",
    })
    .select("id")
    .single();

  const result = await applyFixToWordpress({
    creds,
    siteUrl: connection.site_url,
    pageUrl: args.siteUrl,
    payload: args.payload,
    findingId: args.findingId,
    findingTitle: args.findingTitle,
  });

  if (!result.ok) {
    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({
          status: result.manualSnippet || result.manualNote ? "skipped" : "failed",
          error_message: result.error ?? result.manualNote ?? null,
        })
        .eq("id", pendingRow.id);
    }
    return {
      ok: false,
      error: result.error,
      manualNote: result.manualNote,
      manualSnippet: result.manualSnippet,
    };
  }

  if (pendingRow) {
    await supabaseAdmin
      .from("applied_fixes")
      .update({
        status: "applied",
        commit_url: result.commitUrl ?? null,
        file_path: result.filePath ?? null,
      })
      .eq("id", pendingRow.id);
  }

  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/generate",
    userId: args.userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId: args.findingId,
      kind: args.kind,
      filePath: result.filePath,
      commitUrl: result.commitUrl,
      source: "extension",
      platform: "wordpress",
    },
    ipAddress: args.ipAddress,
  });

  return {
    ok: true,
    commitUrl: result.commitUrl,
    filePath: result.filePath,
  };
}

async function runWixCommit(
  supabaseAdmin: ReturnType<typeof createServerClient>,
  connection: ConnectionRow,
  args: CommitArgs,
) {
  if (!connection.site_id) {
    return { ok: false, error: "Wix connection is missing Site ID" };
  }

  let creds: { apiKey: string; accountId: string };
  try {
    creds = decryptCredentials<{ apiKey: string; accountId: string }>(connection.credentials);
  } catch {
    return {
      ok: false,
      error: "encryption_unavailable",
      message: "Stored credentials couldn't be decrypted. Reconnect Wix.",
    };
  }

  const { data: pendingRow } = await supabaseAdmin
    .from("applied_fixes")
    .insert({
      business_id: connection.business_id,
      audit_id: null,
      finding_id: args.findingId,
      fix_type: args.kind,
      platform: "wix",
      status: "pending",
    })
    .select("id")
    .single();

  const result = await applyFixToWix({
    creds,
    siteId: connection.site_id,
    pageUrl: args.siteUrl,
    payload: args.payload,
    findingId: args.findingId,
    findingTitle: args.findingTitle,
  });

  if (!result.ok) {
    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({
          status: result.manualSnippet || result.manualNote ? "skipped" : "failed",
          error_message: result.error ?? result.manualNote ?? null,
        })
        .eq("id", pendingRow.id);
    }
    return {
      ok: false,
      error: result.error,
      manualNote: result.manualNote,
      manualSnippet: result.manualSnippet,
    };
  }

  if (pendingRow) {
    await supabaseAdmin
      .from("applied_fixes")
      .update({
        status: "applied",
        commit_url: result.commitUrl ?? null,
        file_path: result.filePath ?? null,
      })
      .eq("id", pendingRow.id);
  }

  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/generate",
    userId: args.userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId: args.findingId,
      kind: args.kind,
      filePath: result.filePath,
      commitUrl: result.commitUrl,
      source: "extension",
      platform: "wix",
    },
    ipAddress: args.ipAddress,
  });

  return {
    ok: true,
    commitUrl: result.commitUrl,
    filePath: result.filePath,
  };
}

async function runShopifyCommit(
  supabaseAdmin: ReturnType<typeof createServerClient>,
  connection: ConnectionRow,
  args: CommitArgs,
) {
  if (!connection.site_id) {
    return { ok: false, error: "Shopify connection is missing shop domain" };
  }

  let creds: { clientId: string; clientSecret: string };
  try {
    creds = decryptCredentials<{ clientId: string; clientSecret: string }>(connection.credentials);
  } catch {
    return {
      ok: false,
      error: "encryption_unavailable",
      message: "Stored credentials couldn't be decrypted. Reconnect Shopify.",
    };
  }

  const { data: pendingRow } = await supabaseAdmin
    .from("applied_fixes")
    .insert({
      business_id: connection.business_id,
      audit_id: null,
      finding_id: args.findingId,
      fix_type: args.kind,
      platform: "shopify",
      status: "pending",
    })
    .select("id")
    .single();

  const result = await applyFixToShopify({
    creds,
    shopDomain: connection.site_id,
    pageUrl: args.siteUrl,
    payload: args.payload,
    findingId: args.findingId,
    findingTitle: args.findingTitle,
  });

  if (!result.ok) {
    if (pendingRow) {
      await supabaseAdmin
        .from("applied_fixes")
        .update({
          status: result.manualSnippet || result.manualNote ? "skipped" : "failed",
          error_message: result.error ?? result.manualNote ?? null,
        })
        .eq("id", pendingRow.id);
    }
    return {
      ok: false,
      error: result.error,
      manualNote: result.manualNote,
      manualSnippet: result.manualSnippet,
    };
  }

  if (pendingRow) {
    await supabaseAdmin
      .from("applied_fixes")
      .update({
        status: "applied",
        commit_url: result.commitUrl ?? null,
        file_path: result.filePath ?? null,
      })
      .eq("id", pendingRow.id);
  }

  await writeAuditLog({
    eventType: "fix_applied",
    source: "api/audit/generate",
    userId: args.userId,
    businessId: connection.business_id,
    connectionId: connection.id,
    payload: {
      findingId: args.findingId,
      kind: args.kind,
      filePath: result.filePath,
      commitUrl: result.commitUrl,
      source: "extension",
      platform: "shopify",
    },
    ipAddress: args.ipAddress,
  });

  return {
    ok: true,
    commitUrl: result.commitUrl,
    filePath: result.filePath,
  };
}

export async function GET() {
  return NextResponse.json(
    { error: "POST only", hint: "Send {kind, schemaType?, pageContext, commit, findingId, findingTitle}" },
    { status: 405 },
  );
}
