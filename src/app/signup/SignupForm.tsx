"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useToast } from "@/components/molecules/Toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { signUpSchema, type SignUpInput } from "@/types/auth";
import { humanizeAuthError } from "@/utils/authErrors";
import { cn } from "@/utils/cn";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface RuleProps {
  met: boolean;
  label: string;
}

function Rule({ met, label }: RuleProps) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <Check className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 text-[var(--color-fg-muted)] shrink-0" />
      )}
      <span
        className={cn(
          "text-xs",
          met ? "text-[var(--color-fg-secondary)]" : "text-[var(--color-fg-muted)]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    defaultValues: { acceptedTerms: false as unknown as true },
  });

  const password = watch("password") ?? "";
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  async function onSubmit(data: SignUpInput) {
    setLoading(true);
    try {
      // Bot-check: only enforced when site key is configured. Without keys
      // (local dev), the verify route short-circuits to success.
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        toast("Please complete the bot check before submitting.", "error");
        setLoading(false);
        return;
      }

      const verifyRes = await fetch("/api/auth/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const verifyData = (await verifyRes.json()) as { success: boolean };
      if (!verifyData.success) {
        toast("Bot check failed. Please try again.", "error");
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setLoading(false);
        return;
      }

      await signUp(data.email, data.password);
      toast("Account created! Let's set up your business.", "success");
      router.push("/onboarding");
    } catch (err: unknown) {
      toast(humanizeAuthError(err), "error");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
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
        <div className="space-y-2">
          <Input
            label="Password"
            type="password"
            placeholder="Choose a strong password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="grid grid-cols-1 gap-1 px-1">
            <Rule met={rules.length} label="At least 8 characters" />
            <Rule met={rules.uppercase} label="One uppercase letter" />
            <Rule met={rules.number} label="One number" />
          </div>
        </div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <div className="space-y-1.5">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("acceptedTerms")}
              className="h-4 w-4 mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer shrink-0"
            />
            <span className="text-xs text-[var(--color-fg-secondary)] leading-relaxed">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline font-medium"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline font-medium"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptedTerms && (
            <p role="alert" className="text-xs text-[var(--color-danger)] pl-6">
              {errors.acceptedTerms.message}
            </p>
          )}
        </div>

        {TURNSTILE_SITE_KEY && (
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
              options={{ theme: "light", size: "normal" }}
            />
          </div>
        )}

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
