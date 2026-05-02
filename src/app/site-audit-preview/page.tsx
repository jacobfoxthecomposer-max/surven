"use client";

/**
 * /site-audit-preview — local-dev unauth preview of the site audit
 * scanner. Bypasses auth + Supabase so the URL input + scan flow +
 * results UI can be visually QA'd without credentials.
 *
 * Wraps in DashboardLayout so the Sidebar (with current section
 * order) is visible alongside the page — useful for QA-ing sidebar
 * changes too.
 *
 * Defaults to plan="plus" so the scan form renders. Free-plan paywall
 * variant is reachable by appending ?plan=free.
 */
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AeoAuditSection } from "@/features/aeo-audit/AeoAuditSection";

function Inner() {
  const sp = useSearchParams();
  const plan = (sp.get("plan") as "free" | "plus" | "premium" | "admin" | null) ?? "plus";
  return <AeoAuditSection plan={plan} businessName="TheCurbSkateshop" />;
}

export default function SiteAuditPreviewPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <Inner />
      </Suspense>
    </DashboardLayout>
  );
}
