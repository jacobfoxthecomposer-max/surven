"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, BarChart3, GitCompare, RefreshCw, ArrowRight, X, Eye, EyeOff } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { humanizeAuthError } from "@/utils/authErrors";

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Multi-engine scanning",
    body: "Every scan runs real prompts against ChatGPT, Claude, Gemini, and Google AI simultaneously — so you see your full AI footprint, not just one platform.",
  },
  {
    icon: GitCompare,
    title: "Competitor comparison",
    body: "Add up to 5 competitors and see exactly which prompts they show up in that you don't. Know the gap, close the gap.",
  },
  {
    icon: BarChart3,
    title: "Visibility score",
    body: "A single 0–100 score derived from mention rate, engine coverage, and prompt volume — so you know at a glance whether your AI presence is growing or shrinking.",
  },
  {
    icon: RefreshCw,
    title: "Weekly automatic scans",
    body: "Every Monday your business is rescanned automatically. Catch ranking changes before your competitors do.",
  },
];

function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.push("/ai-visibility-tracker");
    } catch (err: unknown) {
      setError(humanizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-xl p-8"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-[var(--color-fg)] mb-6">
          Log in
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">
              Enter your password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-[#B54631]">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-5 text-sm text-center text-[var(--color-fg-muted)]">
          Don&apos;t have a Surven account?{" "}
          <Link
            href="/signup"
            className="font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function TrackerFeaturePage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}

      <main className="pt-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: "rgba(150,162,131,0.15)", color: "var(--color-primary)" }}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            AI Visibility Tracker
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5vw, 62px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-fg)",
            }}
          >
            See exactly where your business{" "}
            <span style={{ color: "var(--color-primary)" }}>shows up on AI</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--color-fg-muted)] leading-relaxed max-w-2xl mx-auto">
            The Tracker runs the real prompts your customers are typing — "best dentist near me", "top restaurants in Austin" — and shows you which AI engines mention your business, where you rank, and how your competitors are doing.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Start tracking for free
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Features grid */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.title}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <h3 className="font-semibold text-[var(--color-fg)] mb-2">{h.title}</h3>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{h.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
