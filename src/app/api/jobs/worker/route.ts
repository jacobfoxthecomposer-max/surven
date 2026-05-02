import { NextRequest, NextResponse } from "next/server";
import { claimNextJob, completeJob, failJob, type ClaimedJob, type JobType } from "@/services/jobQueue";
import { runDetectFramework } from "@/services/jobs/detectFramework";

const MAX_JOBS_PER_INVOCATION = 10;
const SUPPORTED_JOB_TYPES: JobType[] = ["detect-framework"];

export const maxDuration = 60;

async function dispatch(job: ClaimedJob): Promise<void> {
  switch (job.jobType) {
    case "detect-framework":
      return runDetectFramework(job);
    default:
      throw new Error(`No handler for job type: ${job.jobType}`);
  }
}

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && auth === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
  const processed: { id: string; type: JobType; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < MAX_JOBS_PER_INVOCATION; i++) {
    const job = await claimNextJob(workerId, SUPPORTED_JOB_TYPES);
    if (!job) break;

    try {
      await dispatch(job);
      await completeJob(job.id);
      processed.push({ id: job.id, type: job.jobType, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await failJob(job.id, message);
      processed.push({ id: job.id, type: job.jobType, ok: false, error: message });
    }
  }

  return NextResponse.json({ workerId, processed, count: processed.length });
}

// GET allowed for Vercel cron pings (cron sends GET by default).
export async function GET(request: NextRequest) {
  return POST(request);
}
