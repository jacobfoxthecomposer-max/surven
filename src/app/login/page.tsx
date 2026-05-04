"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/types/auth";


import type { Metadata } from "next";
export const metadata: Metadata = {
  alternates: {
    canonical: "https://surven.vercel.app/login",
  },
};
export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading, unconfigured } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && !authLoading) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      toast("Welcome back!", "success");
      // navigation handled by useEffect once user state commits
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Surven account">
      {unconfigured && (
        <div
          role="status"
          className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-3"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          <p
            className="text-[var(--color-fg-secondary)] font-semibold mb-1"
            style={{ fontSize: 12, letterSpacing: "0.04em" }}
          >
            Local dev — auth not configured
          </p>
          <p className="text-[var(--color-fg-secondary)]">
            Sign-in requires Supabase credentials. View pages without signing
            in:{" "}
            <Link href="/dashboard-preview" className="text-[var(--color-primary)] hover:underline font-medium">
              /dashboard-preview
            </Link>
            {" · "}
            <Link href="/prompts-preview" className="text-[var(--color-primary)] hover:underline font-medium">
              /prompts-preview
            </Link>
            {" · "}
            <Link href="/visibility-preview" className="text-[var(--color-primary)] hover:underline font-medium">
              /visibility-preview
            </Link>
            {" · "}
            <Link href="/site-audit-preview" className="text-[var(--color-primary)] hover:underline font-medium">
              /site-audit-preview
            </Link>
            .
          </p>
        </div>
      )}
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
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--color-primary)] hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-fg-muted)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
