"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { signUpSchema, type SignUpInput } from "@/types/auth";

export function SignupForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
  });

  async function onSubmit(data: SignUpInput) {
    setLoading(true);
    try {
      await signUp(data.email, data.password);
      toast("Account created! Let's set up your business.", "success");
      router.push("/onboarding");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign up failed. Please try again.";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your AI visibility in minutes"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={loading} fullWidth size="lg">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
