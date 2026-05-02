"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { requestPasswordReset } from "@/features/auth/services/authService";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/types/auth";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setLoading(true);
    try {
      await requestPasswordReset(data.email);
      setSentTo(data.email);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't send reset link. Please try again.";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`We sent a password reset link to ${sentTo}.`}
      >
        <p className="text-sm text-[var(--color-fg-muted)] text-center">
          The link expires in 1 hour. If you don&apos;t see the email, check
          your spam folder.
        </p>
        <div className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
          <Link
            href="/login"
            className="text-[var(--color-primary)] hover:underline font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset it."
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

        <Button type="submit" loading={loading} fullWidth size="lg">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
