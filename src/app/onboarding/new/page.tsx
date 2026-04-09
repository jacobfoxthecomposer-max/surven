"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";
import { createBusiness } from "@/features/business/services/businessService";
import { onboardingSchema, type OnboardingInput } from "@/types/auth";
import { INDUSTRIES, US_STATES } from "@/utils/constants";

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setActiveBusinessId, refetchBusinesses } = useActiveBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: { competitors: [] },
  });

  async function onSubmit(data: OnboardingInput) {
    if (!user) return;
    setLoading(true);
    try {
      const business = await createBusiness(user.id, {
        name: data.businessName,
        industry: data.industry,
        city: data.city,
        state: data.state,
      });
      await refetchBusinesses();
      setActiveBusinessId(business.id);
      toast(`${business.name} added!`, "success");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message ?? "Failed to save. Please try again.";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Add new client"
      subtitle="Set up a new business to track its AI visibility"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Business Name"
          placeholder="e.g. Smith Family Dental"
          error={errors.businessName?.message}
          {...register("businessName")}
        />

        <Select
          label="Industry"
          placeholder="Select industry"
          options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
          error={errors.industry?.message}
          {...register("industry")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            placeholder="e.g. Hartford"
            error={errors.city?.message}
            {...register("city")}
          />
          <Select
            label="State"
            placeholder="State"
            options={US_STATES.map((s) => ({ value: s, label: s }))}
            error={errors.state?.message}
            {...register("state")}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            Add Client
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
