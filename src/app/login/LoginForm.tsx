"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/types/auth";
import { humanizeAuthError } from "@/utils/authErrors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const { signIn, user, loading: authLoading, unconfigured } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

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
      // Mark this as a temporary session so AuthProvider clears it on tab close.
      try {
        if (rememberMe) {
          sessionStorage.removeItem("surven.tempSession");
        } else {
          sessionStorage.setItem("surven.tempSession", "1");
        }
      } catch {
        // Storage blocked — silently ignore.
      }
      toast("Welcome back!", "success");
    } catch (err: unknown) {
      toast(humanizeAuthError(err), "error");
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

        <div className="flex items-center justify-between -mt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
            />
            <span className="text-sm text-[var(--color-fg-secondary)]">Remember me</span>
          </label>
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
