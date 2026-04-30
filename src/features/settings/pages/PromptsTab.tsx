"use client";

import { useState } from "react";
import { Trash2, Plus, Search } from "lucide-react";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { useSearchPrompts } from "@/features/business/hooks/useSearchPrompts";
import { useToast } from "@/components/molecules/Toast";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Card } from "@/components/atoms/Card";

export function PromptsTab() {
  const { business } = useBusiness();
  const { prompts, isLoading, addPrompt, deletePrompt, isAdding, isDeleting } =
    useSearchPrompts(business?.id);
  const { toast } = useToast();
  const [newPrompt, setNewPrompt] = useState("");

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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Custom Search Prompts</h3>
        <p className="mt-1 text-sm text-[var(--color-fg-secondary)]">
          Add specific queries to monitor. These run alongside the default prompts
          every time a scan executes.
        </p>
      </div>

      {/* Add prompt */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="e.g. Who is the best dentist for kids in Austin, TX?"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            aria-label="New search prompt"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!newPrompt.trim() || isAdding || !business}
          loading={isAdding}
          size="md"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Prompt list */}
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
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Search className="h-8 w-8 text-[var(--color-fg-muted)]" />
          <p className="text-sm text-[var(--color-fg-muted)]">
            No custom prompts yet. Add one above to start monitoring specific queries.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2" aria-label="Custom search prompts">
          {prompts.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <Search className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              <span className="flex-1 text-sm">{p.prompt_text}</span>
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

      <p className="text-xs text-[var(--color-fg-muted)]">
        {prompts.length} custom prompt{prompts.length !== 1 ? "s" : ""} ·{" "}
        {6 + prompts.length} total prompts per scan
      </p>
    </div>
  );
}
