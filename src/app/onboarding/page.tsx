"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";
import { createBusiness, addCompetitors } from "@/features/business/services/businessService";
import { onboardingSchema, type OnboardingInput } from "@/types/auth";
import { INDUSTRIES, US_STATES } from "@/utils/constants";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { businesses, isLoading: bizLoading, setActiveBusinessId, refetchBusinesses } = useActiveBusiness();
  const { toast } = useToast();

  // If user already has a business, skip to dashboard
  useEffect(() => {
    if (!authLoading && !bizLoading && businesses.length > 0) {
      router.replace("/dashboard");
    }
  }, [authLoading, bizLoading, businesses]);
  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: {
      competitors: [],
    },
  });

  function addCompetitor() {
    const name = competitorInput.trim();
    if (!name || competitors.length >= 3) return;
    setCompetitors((prev) => [...prev, name]);
    setCompetitorInput("");
  }

  function removeCompetitor(index: number) {
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(data: OnboardingInput) {
    if (authLoading) return;
    if (!user) {
      toast("Please sign in first", "error");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const business = await createBusiness(user.id, {
        name: data.businessName,
        industry: data.industry,
        city: data.city,
        state: data.state,
      });

      if (competitors.length > 0) {
        await addCompetitors(business.id, competitors);
      }

      await refetchBusinesses();
      setActiveBusinessId(business.id);
      toast("Business added! Running your first scan...", "success");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to save. Please try again.";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  const industryOptions = INDUSTRIES.map((i) => ({ value: i, label: i }));
  const stateOptions = US_STATES.map((s) => ({ value: s, label: s }));

  return (
    <AuthLayout
      title="Set up your business"
      subtitle="Tell us about your business so we can track your AI visibility"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Business Details */}
        <Input
          label="Business Name"
          placeholder="e.g. Smith Family Dental"
          error={errors.businessName?.message}
          {...register("businessName")}
        />

        <Select
          label="Industry"
          placeholder="Select your industry"
          options={industryOptions}
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
            options={stateOptions}
            error={errors.state?.message}
            {...register("state")}
          />
        </div>

        {/* Competitors */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">
            Competitors{" "}
            <span className="text-[var(--color-fg-muted)] font-normal">(optional, up to 3)</span>
          </label>

          <AnimatePresence mode="popLayout">
            {competitors.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="flex-1 px-3 py-2 text-sm bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() => removeCompetitor(i)}
                  className="p-2 text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] cursor-pointer"
                  aria-label={`Remove ${name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {competitors.length < 3 && (
            <div className="flex items-center gap-2">
              <input
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCompetitor();
                  }
                }}
                placeholder="Competitor business name"
                className="flex-1 px-3 py-2 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={addCompetitor}
                disabled={!competitorInput.trim()}
                className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Add competitor"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Start My First Scan
        </Button>
      </form>
    </AuthLayout>
  );
}
