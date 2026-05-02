import { createServerClient } from "@/services/supabaseServer";
import { writeAuditLog } from "@/services/auditLog";
import { decryptCredentials } from "@/utils/credentialsEncryption";
import { detectFromUrl } from "@/utils/frameworkDetection";
import { detectFromRepo } from "@/utils/frameworkDetectionRepo";
import type { ClaimedJob } from "@/services/jobQueue";

interface SiteConnectionRow {
  id: string;
  business_id: string;
  user_id: string;
  platform: string;
  credentials: { iv: string; ciphertext: string; tag: string };
  repo: string | null;
  branch: string | null;
  site_url: string | null;
}

export async function runDetectFramework(job: ClaimedJob): Promise<void> {
  if (!job.connectionId) {
    throw new Error("detect-framework job missing connectionId");
  }

  const supabase = createServerClient();
  const { data: conn, error: connErr } = await supabase
    .from("site_connections")
    .select("id, business_id, user_id, platform, credentials, repo, branch, site_url")
    .eq("id", job.connectionId)
    .single<SiteConnectionRow>();

  if (connErr || !conn) {
    throw new Error(`Connection not found: ${job.connectionId}`);
  }

  let detectedFramework: string | null = null;
  let frameworkMeta: Record<string, unknown> = {};

  // GitHub: prefer repo file-tree (more authoritative)
  if (conn.platform === "github" && conn.repo) {
    const creds = decryptCredentials<{ token: string }>(conn.credentials);
    const result = await detectFromRepo(creds.token, conn.repo, conn.branch ?? "main");
    detectedFramework = result.platform === "unknown" ? null : result.platform;
    frameworkMeta = {
      source: "repo",
      confidence: result.confidence,
      signals: result.signals,
      ...result.meta,
    };
  }
  // URL-based detection for Vercel/WP/Webflow/Shopify (and GitHub fallback)
  else if (conn.site_url) {
    const result = await detectFromUrl(conn.site_url);
    detectedFramework = result.platform === "unknown" ? null : result.platform;
    frameworkMeta = {
      source: "url",
      host: result.host,
      confidence: result.confidence,
      signals: result.signals,
      ssr: result.ssr,
      ...result.meta,
    };
  } else if (conn.platform === "wordpress") {
    // WP creds include site URL
    const creds = decryptCredentials<{ username: string; applicationPassword: string }>(conn.credentials);
    void creds;
    detectedFramework = "wordpress";
    frameworkMeta = { source: "platform_assumption" };
  }

  await supabase
    .from("site_connections")
    .update({
      detected_framework: detectedFramework,
      framework_meta: frameworkMeta,
      detected_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  await writeAuditLog({
    eventType: "framework_detected",
    source: "job/detect-framework",
    userId: conn.user_id,
    businessId: conn.business_id,
    connectionId: conn.id,
    payload: { detectedFramework, frameworkMeta },
  });
}
