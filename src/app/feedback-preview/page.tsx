"use client";

/**
 * /feedback-preview — local-dev unauth preview of the feedback page.
 */
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { FeedbackSection } from "@/features/feedback/FeedbackSection";

export default function FeedbackPreviewPage() {
  return (
    <DashboardLayout>
      <FeedbackSection />
    </DashboardLayout>
  );
}
