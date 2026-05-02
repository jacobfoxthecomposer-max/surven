import { createServerClient } from "@/services/supabaseServer";
import { writeAuditLog } from "@/services/auditLog";

export type JobType =
  | "detect-framework"
  | "first-scan"
  | "apply-fix"
  | "send-webhook"
  | "re-measure"
  | "rotate-credentials"
  | "validate-connection";

export interface EnqueueOptions {
  jobType: JobType;
  payload?: Record<string, unknown>;
  priority?: number;
  scheduledFor?: Date;
  maxAttempts?: number;
  userId?: string | null;
  businessId?: string | null;
  connectionId?: string | null;
}

export interface QueuedJob {
  id: string;
  jobType: JobType;
  status: string;
  scheduledFor: string;
}

export async function enqueueJob(opts: EnqueueOptions): Promise<QueuedJob | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("surven_jobs")
    .insert({
      job_type: opts.jobType,
      payload: opts.payload ?? {},
      priority: opts.priority ?? 5,
      scheduled_for: (opts.scheduledFor ?? new Date()).toISOString(),
      max_attempts: opts.maxAttempts ?? 3,
      user_id: opts.userId ?? null,
      business_id: opts.businessId ?? null,
      connection_id: opts.connectionId ?? null,
    })
    .select("id, job_type, status, scheduled_for")
    .single();

  if (error || !data) {
    console.error("[jobQueue] enqueue failed", error?.message, opts.jobType);
    return null;
  }

  await writeAuditLog({
    eventType: "job_enqueued",
    source: "jobQueue.enqueueJob",
    userId: opts.userId,
    businessId: opts.businessId,
    connectionId: opts.connectionId,
    payload: { jobType: opts.jobType, jobId: data.id, priority: opts.priority ?? 5 },
  });

  return {
    id: data.id,
    jobType: data.job_type as JobType,
    status: data.status,
    scheduledFor: data.scheduled_for,
  };
}

export interface ClaimedJob {
  id: string;
  jobType: JobType;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  businessId: string | null;
  connectionId: string | null;
  userId: string | null;
}

export async function claimNextJob(
  workerId: string,
  jobTypes?: JobType[]
): Promise<ClaimedJob | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("claim_next_job", {
    worker_id: workerId,
    job_types: jobTypes ?? null,
  });

  if (error) {
    console.error("[jobQueue] claim failed", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    jobType: data.job_type,
    payload: data.payload ?? {},
    attempts: data.attempts,
    maxAttempts: data.max_attempts,
    businessId: data.business_id,
    connectionId: data.connection_id,
    userId: data.user_id,
  };
}

export async function completeJob(
  jobId: string,
  result?: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("surven_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result: result ?? null,
    })
    .eq("id", jobId);

  if (error) {
    console.error("[jobQueue] complete failed", error.message, jobId);
    return;
  }

  await writeAuditLog({
    eventType: "job_completed",
    source: "jobQueue.completeJob",
    payload: { jobId },
  });
}

export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = createServerClient();
  const { data: job } = await supabase
    .from("surven_jobs")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const finalStatus =
    job && job.attempts >= job.max_attempts ? "failed" : "queued";

  await supabase
    .from("surven_jobs")
    .update({
      status: finalStatus,
      locked_at: null,
      locked_by: null,
      error_message: errorMessage,
      completed_at: finalStatus === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", jobId);

  if (finalStatus === "failed") {
    await writeAuditLog({
      eventType: "job_failed",
      source: "jobQueue.failJob",
      severity: "error",
      payload: { jobId, errorMessage },
    });
  }
}
