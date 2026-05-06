"use client";

/**
 * /site-audit-preview — local-dev unauth preview of the site audit
 * scanner. Bypasses auth + Supabase so the URL input + scan flow +
 * results UI can be visually QA'd without credentials.
 *
 * Wraps in DashboardLayout so the Sidebar (with current section
 * order) is visible alongside the page.
 *
 * Always runs a real scan automatically. Default target is
 * `https://surven.ai` — override with ?url=<https://...>
 * to scan any URL.
 */
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AeoAuditSection } from "@/features/aeo-audit/AeoAuditSection";

const DEFAULT_PREVIEW_URL = "https://surven.ai";

function Inner() {
  const sp = useSearchParams();
  const plan =
    (sp.get("plan") as "free" | "plus" | "premium" | "admin" | null) ?? "plus";
  const url = sp.get("url") || DEFAULT_PREVIEW_URL;
  return (
    <AeoAuditSection
      plan={plan}
      businessName="TheCurbSkateshop"
      siteUrl={url}
    />
  );
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
