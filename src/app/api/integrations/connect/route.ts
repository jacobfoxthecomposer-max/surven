import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createSupabaseSSR } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerClient } from "@/services/supabaseServer";
import { z } from "zod";
import { encryptCredentials } from "@/utils/credentialsEncryption";
import {
  validateGithub,
  validateVercel,
  validateWordpress,
  validateWebflow,
  validateWix,
  validateShopify,
  normalizeShopDomain,
} from "@/utils/platformValidators";
import { enqueueJob } from "@/services/jobQueue";
import { writeAuditLog, ipFromRequest } from "@/services/auditLog";

const PREMIUM_PLANS = ["premium", "admin"];

const ConnectSchema = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("github"),
    businessId: z.string().uuid(),
    token: z.string().min(10),
    repo: z.string().min(3),
    branch: z.string().optional(),
  }),
  z.object({
    platform: z.literal("vercel"),
    businessId: z.string().uuid(),
    token: z.string().min(10),
    projectId: z.string().min(1),
  }),
  z.object({
    platform: z.literal("wordpress"),
    businessId: z.string().uuid(),
    siteUrl: z.string().url(),
    username: z.string().min(1),
    applicationPassword: z.string().min(1),
  }),
  z.object({
    platform: z.literal("webflow"),
    businessId: z.string().uuid(),
    token: z.string().min(10),
    siteId: z.string().min(1),
  }),
  z.object({
    platform: z.literal("wix"),
    businessId: z.string().uuid(),
    apiKey: z.string().min(10),
    siteId: z.string().min(1),
    accountId: z.string().min(1),
    siteUrl: z.string().url(),
  }),
  z.object({
    platform: z.literal("shopify"),
    businessId: z.string().uuid(),
    shopDomain: z.string().min(3),
    clientId: z.string().min(10),
    clientSecret: z.string().min(10),
  }),
]);

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createSupabaseSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parse = ConnectSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request data", details: parse.error.flatten() }, { status: 400 });
  }

  const supabaseAdmin = createServerClient();

  // Premium plan gate
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  if (!PREMIUM_PLANS.includes(plan)) {
    return NextResponse.json({ error: "premium_required", plan }, { status: 403 });
  }

  // Verify business ownership
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("id", parse.data.businessId)
    .eq("user_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const data = parse.data;

  // Validate credentials with the actual platform
  let validation;
  let credsBlob: Record<string, unknown>;
  let row: {
    repo?: string;
    branch?: string;
    site_id?: string;
    site_url?: string;
  } = {};

  switch (data.platform) {
    case "github": {
      validation = await validateGithub({
        token: data.token,
        repo: data.repo,
        branch: data.branch,
      });
      credsBlob = { token: data.token };
      row = {
        repo: data.repo,
        branch: data.branch ?? validation.meta?.defaultBranch ?? "main",
      };
      break;
    }
    case "vercel": {
      validation = await validateVercel({
        token: data.token,
        projectId: data.projectId,
      });
      credsBlob = { token: data.token };
      row = { site_id: data.projectId };
      break;
    }
    case "wordpress": {
      validation = await validateWordpress({
        siteUrl: data.siteUrl,
        username: data.username,
        applicationPassword: data.applicationPassword,
      });
      credsBlob = {
        username: data.username,
        applicationPassword: data.applicationPassword,
      };
      row = { site_url: data.siteUrl };
      break;
    }
    case "webflow": {
      validation = await validateWebflow({
        token: data.token,
        siteId: data.siteId,
      });
      credsBlob = { token: data.token };
      row = { site_id: data.siteId };
      break;
    }
    case "wix": {
      validation = await validateWix({
        apiKey: data.apiKey,
        siteId: data.siteId,
        accountId: data.accountId,
      });
      credsBlob = {
        apiKey: data.apiKey,
        accountId: data.accountId,
      };
      row = { site_id: data.siteId, site_url: data.siteUrl };
      break;
    }
    case "shopify": {
      const shopDomain = normalizeShopDomain(data.shopDomain);
      if (!shopDomain) {
        return NextResponse.json(
          { error: "validation_failed", message: "Invalid shop domain. Use mystore.myshopify.com format." },
          { status: 422 }
        );
      }
      validation = await validateShopify({
        shopDomain,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
      });
      credsBlob = {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
      };
      row = {
        site_id: shopDomain,
        site_url: `https://${shopDomain}`,
      };
      break;
    }
  }

  if (!validation.ok) {
    return NextResponse.json(
      { error: "validation_failed", message: validation.error ?? "Could not verify credentials" },
      { status: 422 }
    );
  }

  // Encrypt credentials
  let encrypted;
  try {
    encrypted = encryptCredentials(credsBlob);
  } catch {
    return NextResponse.json(
      { error: "encryption_unavailable", message: "Server is missing the encryption key. Contact support." },
      { status: 500 }
    );
  }

  // Upsert connection (one per business per platform)
  const { data: saved, error } = await supabaseAdmin
    .from("site_connections")
    .upsert(
      {
        user_id: user.id,
        business_id: data.businessId,
        platform: data.platform,
        credentials: encrypted,
        ...row,
        status: "active",
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: "business_id,platform" }
    )
    .select("id, platform, repo, branch, site_id, site_url, status, last_verified_at, created_at")
    .single();

  if (error || !saved) {
    return NextResponse.json(
      { error: "save_failed", message: error?.message ?? "Could not save connection" },
      { status: 500 }
    );
  }

  await writeAuditLog({
    eventType: "connection_created",
    source: "api/integrations/connect",
    userId: user.id,
    businessId: data.businessId,
    connectionId: saved.id,
    payload: { platform: data.platform, validationMeta: validation.meta },
    ipAddress: ipFromRequest(request),
    userAgent: request.headers.get("user-agent"),
  });

  await enqueueJob({
    jobType: "detect-framework",
    userId: user.id,
    businessId: data.businessId,
    connectionId: saved.id,
    payload: { platform: data.platform },
    priority: 3,
  });

  return NextResponse.json({
    connection: saved,
    meta: validation.meta,
  });
}
