"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Plus, Check, Lock } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { useCompetitors } from "@/features/business/hooks/useCompetitors";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useIsFirstTimeUser } from "@/features/auth/hooks/useIsFirstTimeUser";

type Recommendation = { name: string; mentions: number };

type ApiResponse = {
  recommendations: Recommendation[];
  plan: "free" | "plus" | "premium" | "admin";
  limit: number;
};

async function fetchRecommendations(businessId: string): Promise<ApiResponse> {
  const res = await fetch("/api/scan/recommended-competitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId }),
  });
  if (!res.ok) throw new Error("Failed to load recommendations");
  return res.json();
}

export function RecommendedCompetitorsCard({
  businessId,
}: {
  businessId: string;
}) {
  const { plan, isLoading: planLoading } = useUserProfile();
  const { addCompetitor, isAdding } = useCompetitors(businessId);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["recommendedCompetitors", businessId],
    queryFn: () => fetchRecommendations(businessId),
    enabled: !!businessId && !planLoading,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  if (planLoading || isLoading) return null;

  const isFree = plan === "free";

  if (isFree) {
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-alt)]">
            <Lock className="h-4 w-4 text-[var(--color-fg-muted)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--color-fg)]">
              Recommended competitors
            </h3>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Plus shows your top recommended competitor based on your first
              scan. Premium shows your top 5.
            </p>
            <a
              href="/pricing"
              className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade to unlock
            </a>
          </div>
        </div>
      </Card>
    );
  }

  const recs = data?.recommendations ?? [];
  if (recs.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15">
          <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--color-fg)]">
            Recommended competitors
          </h3>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {recs.length === 1
              ? "Based on your latest scan, this business shows up most often alongside yours."
              : `Based on your latest scan, these ${recs.length} businesses show up most often alongside yours.`}
          </p>

          <ul className="mt-3 divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {recs.map((rec) => {
              const isAdded = added.has(rec.name);
              return (
                <li
                  key={rec.name}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-fg)]">
                      {rec.name}
                    </div>
                    <div className="text-xs text-[var(--color-fg-muted)]">
                      Mentioned in {rec.mentions}{" "}
                      {rec.mentions === 1 ? "response" : "responses"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isAdded || isAdding}
                    onClick={async () => {
                      try {
                        await addCompetitor(rec.name);
                        setAdded((prev) => new Set(prev).add(rec.name));
                      } catch {
                        // surfaced via React Query error state if needed
                      }
                    }}
                    className={
                      "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors " +
                      (isAdded
                        ? "bg-[var(--color-surface-alt)] text-[var(--color-fg-muted)] cursor-default"
                        : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50")
                    }
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3 w-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" />
                        Add
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}
