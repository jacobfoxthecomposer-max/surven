"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Plus, Building2 } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { useCompetitors } from "@/features/business/hooks/useCompetitors";
import { useToast } from "@/components/molecules/Toast";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Card } from "@/components/atoms/Card";
import { INDUSTRIES, US_STATES } from "@/utils/constants";

const businessSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  industry: z.string().min(1, "Industry is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export function BusinessTab() {
  const { business, updateBusinessAsync, isPending } = useSettings();
  const { competitors, isLoading: competitorsLoading, addCompetitor, deleteCompetitor, isAdding, isDeleting } =
    useCompetitors(business?.id);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    values: {
      name: business?.name ?? "",
      industry: business?.industry ?? "",
      city: business?.city ?? "",
      state: business?.state ?? "",
    },
  });

  const handleAddCompetitor = async () => {
    const name = newCompetitor.trim();
    if (!name) return;
    try {
      await addCompetitor(name);
      setNewCompetitor("");
      toast("Competitor added", "success");
    } catch {
      toast("Failed to add competitor", "error");
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await deleteCompetitor(id);
      toast("Competitor removed", "success");
    } catch {
      toast("Failed to remove competitor", "error");
    }
  };

  const onSubmit = async (data: BusinessFormData) => {
    if (!business?.id) return;

    try {
      await updateBusinessAsync({
        businessId: business.id,
        data,
      });
      toast("Business information updated", "success");
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast(message, "error");
    }
  };

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-fg-muted)]">No business found</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Business info section */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Business Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <Select
            label="Industry"
            options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
            {...register("industry")}
            error={errors.industry?.message}
          />

          <Input
            label="City"
            {...register("city")}
            error={errors.city?.message}
          />

          <Select
            label="State"
            options={US_STATES.map((state) => ({
              value: state,
              label: state,
            }))}
            {...register("state")}
            error={errors.state?.message}
          />

          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                reset();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
                Business Name
              </p>
              <p className="mt-2 text-lg font-semibold">{business.name}</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
                Industry
              </p>
              <p className="mt-2 text-lg font-semibold">{business.industry}</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
                City
              </p>
              <p className="mt-2 text-lg font-semibold">{business.city}</p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              <p className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wide">
                State
              </p>
              <p className="mt-2 text-lg font-semibold">{business.state}</p>
            </div>
          </div>
          <Button onClick={() => setIsEditing(true)}>Edit Information</Button>
        </div>
      )}

      {/* Competitors section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Competitors</h3>
          <p className="mt-1 text-sm text-[var(--color-fg-secondary)]">
            Add businesses you compete with. They'll be tracked in every scan.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="e.g. Acme Plumbing"
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
              aria-label="New competitor name"
            />
          </div>
          <Button
            onClick={handleAddCompetitor}
            disabled={!newCompetitor.trim() || isAdding}
            loading={isAdding}
            size="md"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {competitorsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-[var(--color-surface)] animate-pulse" />
            ))}
          </div>
        ) : competitors.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <Building2 className="h-8 w-8 text-[var(--color-fg-muted)]" />
            <p className="text-sm text-[var(--color-fg-muted)]">
              No competitors yet. Add one above to start benchmarking.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2" aria-label="Competitors">
            {competitors.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <Building2 className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="flex-1 text-sm">{c.name}</span>
                <button
                  onClick={() => handleDeleteCompetitor(c.id)}
                  disabled={isDeleting}
                  aria-label="Remove competitor"
                  className="p-1.5 rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-[var(--color-fg-muted)]">
          {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} tracked
        </p>
      </div>
    </div>
  );
}
