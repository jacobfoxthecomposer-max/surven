"use client";

/**
 * /visibility-preview — local-dev only standalone preview of the
 * AI Visibility Scanner section. Bypasses the auth gate on /dashboard
 * so you can visually QA the new section without Supabase credentials.
 */
import { VisibilityScannerSection } from "@/features/dashboard/pages/VisibilityScannerSection";

export default function VisibilityPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <VisibilityScannerSection variant="B" aiOverviewVariant="V1" />
      </div>
    </main>
  );
}
