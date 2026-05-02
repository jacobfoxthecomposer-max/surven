"use client";

/**
 * /site-audit-preview — local-dev unauth preview of the site audit
 * scanner. Bypasses auth so the URL input + scan flow + results UI
 * can be visually QA'd without Supabase credentials.
 */
import { AeoAuditSection } from "@/features/aeo-audit/AeoAuditSection";

export default function SiteAuditPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <AeoAuditSection />
      </div>
    </main>
  );
}
