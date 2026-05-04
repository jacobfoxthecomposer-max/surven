/**
 * Concept preview for the "Prompt-cluster dominance" gap card. Renders
 * three plan variants side-by-side so you can see how empty-slot CTAs
 * scale across free / plus / premium tiers without leaving the page.
 */
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { PromptClusterDominance } from "@/features/competitor-comparison/PromptClusterDominance";

export default function ClusterDominancePreviewPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3vw, 40px)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--color-fg)",
              lineHeight: 1.15,
            }}
          >
            Prompt-cluster dominance{" "}
            <span style={{ color: "var(--color-primary)", fontStyle: "italic" }}>
              concept
            </span>
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-2 max-w-prose">
            Mockup of the proposed gap-metric for /competitor-comparison.
            Auto-generated topic clusters per business; mini-leaderboard inside
            each cluster shows you + every tracked competitor. Same empty-slot
            CTA pattern as the main Visibility Leaderboard so plan limits feel
            consistent across the page.
          </p>
        </div>

        <section className="space-y-3">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            Premium tier — you + 5 competitors
          </h2>
          <p className="text-xs text-[var(--color-fg-muted)] -mt-1">
            All 6 brand slots filled. No upgrade CTAs. The cluster card scales
            to its tallest variant here.
          </p>
          <PromptClusterDominance competitorLimit={5} />
        </section>

        <section className="space-y-3">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            Plus tier — you + 1 competitor
          </h2>
          <p className="text-xs text-[var(--color-fg-muted)] -mt-1">
            One brand row + 4 dashed &ldquo;Upgrade to add&rdquo; rows in every
            cluster. Same pattern as the leaderboard cards.
          </p>
          <PromptClusterDominance competitorLimit={1} />
        </section>

        <section className="space-y-3">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--color-fg)",
            }}
          >
            Free tier — you only
          </h2>
          <p className="text-xs text-[var(--color-fg-muted)] -mt-1">
            Just your row + 5 dashed CTAs. Sparse on purpose — the card still
            shows the shape of the value, just gated.
          </p>
          <PromptClusterDominance competitorLimit={0} />
        </section>

        <p className="text-xs text-[var(--color-fg-muted)] text-center pt-4 border-t border-[var(--color-border)]">
          Static mockup — cluster labels (Personal injury, Class actions, etc.)
          would be AI-generated per business at onboarding. Tell Claude to
          mount it on /competitor-comparison if you want to ship it.
        </p>
      </div>
    </DashboardLayout>
  );
}
