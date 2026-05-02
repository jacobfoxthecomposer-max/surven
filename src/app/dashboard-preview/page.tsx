"use client";

/**
 * /dashboard-preview — local-dev only standalone preview of the
 * dashboard's new 2-column layout with WhatsNextCard pinned to the
 * right rail. Bypasses auth + Supabase data so you can visually QA
 * the layout without credentials. The left column is filler that
 * roughly mimics the real dashboard section heights.
 */
import { WhatsNextCard } from "@/components/organisms/WhatsNextCard";

export default function DashboardPreviewPage() {
  const fillerSections = [
    { title: "Visibility gauge", height: 360 },
    { title: "AI overview", height: 92 },
    { title: "AI model breakdown", height: 320 },
    { title: "Brand sentiment", height: 280 },
    { title: "Prompt results", height: 480 },
    { title: "Competitor comparison", height: 360 },
    { title: "Citation gaps", height: 320 },
  ];

  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          <div className="space-y-10 min-w-0">
            {fillerSections.map((s) => (
              <div
                key={s.title}
                className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-fg-muted)]"
                style={{ height: s.height, fontSize: 13 }}
              >
                {s.title} (filler)
              </div>
            ))}
          </div>
          <aside className="hidden xl:block">
            <div className="sticky top-6">
              <WhatsNextCard />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
