"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Plus, Trash2, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useToast } from "@/components/molecules/Toast";
import { useSearchPrompts } from "@/features/business/hooks/useSearchPrompts";
import { useUserProfile } from "@/features/auth/hooks/useUserProfile";
import { useIsFirstTimeUser } from "@/features/auth/hooks/useIsFirstTimeUser";

export function CustomPromptsSection({
  businessId,
}: {
  businessId: string | undefined;
}) {
  const { plan, isLoading: planLoading } = useUserProfile();
  const { isFirstTime } = useIsFirstTimeUser();
  const { prompts, isLoading, addPrompt, deletePrompt, isAdding, isDeleting } =
    useSearchPrompts(businessId);
  const { toast } = useToast();
  const [newPrompt, setNewPrompt] = useState("");

  const isPremium = plan === "premium" || plan === "admin";

  const handleAdd = async () => {
    const text = newPrompt.trim();
    if (!text) return;
    try {
      await addPrompt(text);
      setNewPrompt("");
      toast("Prompt added", "success");
    } catch {
      toast("Failed to add prompt", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePrompt(id);
      toast("Prompt removed", "success");
    } catch {
      toast("Failed to remove prompt", "error");
    }
  };

  if (planLoading) return null;

  if (!isPremium) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
          >
            <Lock
              className="h-6 w-6"
              style={{ color: "var(--color-primary)" }}
            />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-semibold text-[var(--color-fg)]">
              Custom prompts are a Premium feature
            </h3>
            <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
              Track your own queries alongside the default prompts every time a
              scan runs. Available on the Premium plan.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-sm shadow-md transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            {isFirstTime ? "Try Free Trial" : "Upgrade to Premium"}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--color-fg)]">
          Your custom prompts
        </h3>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Add specific queries to monitor. These run alongside the default
          prompts every time a scan executes.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="e.g. Who is the best dentist for kids in Austin, TX?"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            aria-label="New custom prompt"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!newPrompt.trim() || isAdding || !businessId}
          loading={isAdding}
          size="md"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-[var(--color-surface)] animate-pulse"
            />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <Search className="h-7 w-7 text-[var(--color-fg-muted)]" />
          <p className="text-sm text-[var(--color-fg-muted)]">
            No custom prompts yet. Add one above to start monitoring specific
            queries.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Custom search prompts">
          {prompts.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <Search className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              <span className="flex-1 text-sm text-[var(--color-fg)]">
                {p.prompt_text}
              </span>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={isDeleting}
                aria-label="Remove prompt"
                className="p-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-[var(--color-fg-muted)]">
        {prompts.length} custom prompt{prompts.length !== 1 ? "s" : ""} · runs
        on every scan
      </p>
    </Card>
  );
}
