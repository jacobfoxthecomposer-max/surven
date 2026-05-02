import { createServerClient } from "@/services/supabaseServer";

export type AuditEventType =
  | "connection_created"
  | "connection_verified"
  | "connection_revoked"
  | "credentials_rotated"
  | "scan_started"
  | "scan_completed"
  | "scan_failed"
  | "webhook_received"
  | "webhook_verified"
  | "webhook_rejected"
  | "fix_proposed"
  | "fix_applied"
  | "fix_reverted"
  | "fix_failed"
  | "framework_detected"
  | "premium_granted"
  | "premium_revoked"
  | "job_enqueued"
  | "job_completed"
  | "job_failed";

export type AuditSeverity = "debug" | "info" | "warn" | "error";

export interface AuditLogEntry {
  eventType: AuditEventType;
  source: string;
  severity?: AuditSeverity;
  userId?: string | null;
  businessId?: string | null;
  connectionId?: string | null;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("surven_audit_log").insert({
    event_type: entry.eventType,
    source: entry.source,
    severity: entry.severity ?? "info",
    user_id: entry.userId ?? null,
    business_id: entry.businessId ?? null,
    connection_id: entry.connectionId ?? null,
    payload: entry.payload ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });
  if (error) {
    console.error("[auditLog] write failed", error.message, entry.eventType);
  }
}

export function ipFromRequest(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}
