"use client";

/**
 * /prompts-preview — local-dev only standalone preview of the
 * Prompts Tracker section. Bypasses the auth gate on /prompts so you
 * can visually QA the new section without Supabase credentials.
 */
import { PromptsSection } from "@/features/dashboard/pages/PromptsSection";

export default function PromptsPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <PromptsSection />
      </div>
    </main>
  );
}
