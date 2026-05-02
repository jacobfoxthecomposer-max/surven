"use client";

/**
 * /site-audit-preview — local-dev unauth preview of the site audit
 * scanner. Bypasses auth + Supabase so the URL input + scan flow +
 * results UI can be visually QA'd without credentials.
 *
 * Defaults to plan="plus" so the scan form renders. Free-plan paywall
 * variant is reachable by appending ?plan=free.
 */
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AeoAuditSection } from "@/features/aeo-audit/AeoAuditSection";

function Inner() {
  const sp = useSearchParams();
  const plan = (sp.get("plan") as "free" | "plus" | "premium" | "admin" | null) ?? "plus";
  return <AeoAuditSection plan={plan} businessName="TheCurbSkateshop" />;
}

export default function SiteAuditPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={null}>
          <Inner />
        </Suspense>
      </div>
    </main>
  );
}
