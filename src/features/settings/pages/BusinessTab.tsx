"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "@/components/molecules/Toast";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
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
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

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
    <div className="space-y-6">
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
    </div>
  );
}
