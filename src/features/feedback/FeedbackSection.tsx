"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  MessageSquare,
  Bug,
  Lightbulb,
  BarChart3,
  HelpCircle,
  Send,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/atoms/Card";
import { Button } from "@/components/atoms/Button";
import { COLORS } from "@/utils/constants";

const EASE = [0.16, 1, 0.3, 1] as const;

type Category = "feature" | "bug" | "data" | "other";

const CATEGORIES: {
  id: Category;
  label: string;
  Icon: typeof MessageSquare;
  color: string;
}[] = [
  { id: "feature", label: "Feature request", Icon: Lightbulb, color: "#96A283" },
  { id: "bug", label: "Bug report", Icon: Bug, color: "#B54631" },
  { id: "data", label: "Data request", Icon: BarChart3, color: "#B8A030" },
  { id: "other", label: "Other", Icon: HelpCircle, color: "#7A8FA6" },
];

export function FeedbackSection() {
  const [category, setCategory] = useState<Category>("feature");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, email: email.trim(), message: message.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Couldn't send. Please try again or email hello@surven.ai.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSubmitted(false);
    setError(null);
    setCategory("feature");
    setEmail("");
    setMessage("");
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      {/* Beta badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="flex justify-center"
      >
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border"
          style={{
            borderColor: "rgba(150,162,131,0.45)",
            background:
              "linear-gradient(135deg, rgba(150,162,131,0.18) 0%, rgba(184,160,48,0.10) 100%)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: COLORS.primary }} />
          <span
            className="uppercase font-semibold"
            style={{
              fontSize: 11.5,
              letterSpacing: "0.14em",
              color: COLORS.primaryHover,
            }}
          >
            Surven is still in beta
          </span>
        </div>
      </motion.div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
        className="text-center space-y-2"
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(34px, 4vw, 48px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
            color: "var(--color-fg)",
          }}
        >
          What would make Surven better?
        </h1>
        <p
          className="text-[var(--color-fg-secondary)] mx-auto"
          style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 520 }}
        >
          We&apos;re building this in the open with our first customers. Tell
          us what&apos;s broken, what you wish existed, or what data you want
          to see — every note shapes what ships next.
        </p>
      </motion.div>

      {!submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        >
          <Card>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category pills */}
              <div>
                <p
                  className="uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-2.5"
                  style={{ fontSize: 11, letterSpacing: "0.12em" }}
                >
                  What kind of feedback?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(({ id, label, Icon, color }) => {
                    const active = category === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCategory(id)}
                        aria-pressed={active}
                        className="rounded-[var(--radius-md)] border px-3 py-2.5 flex items-center gap-2 transition-colors text-left"
                        style={{
                          borderColor: active
                            ? `${color}66`
                            : "var(--color-border)",
                          backgroundColor: active
                            ? `${color}14`
                            : "var(--color-surface)",
                          color: active ? color : "var(--color-fg-secondary)",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: active ? color : "var(--color-fg-muted)" }}
                        />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="feedback-email"
                  className="block uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-1.5"
                  style={{ fontSize: 11, letterSpacing: "0.12em" }}
                >
                  Email <span className="opacity-70">(optional)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-primary)] transition-colors"
                  style={{ fontSize: 14 }}
                />
                <p
                  className="text-[var(--color-fg-muted)] mt-1"
                  style={{ fontSize: 12 }}
                >
                  Drop your email if you want us to follow up.
                </p>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="feedback-message"
                  className="block uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold mb-1.5"
                  style={{ fontSize: 11, letterSpacing: "0.12em" }}
                >
                  Your feedback
                </label>
                <textarea
                  id="feedback-message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  rows={6}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none focus:border-[var(--color-primary)] transition-colors resize-y"
                  style={{ fontSize: 14, lineHeight: 1.55, minHeight: 140 }}
                />
                <p
                  className="text-[var(--color-fg-muted)] mt-1 flex items-center justify-between"
                  style={{ fontSize: 12 }}
                >
                  <span>Specifics help — page name, screenshots, steps to reproduce.</span>
                  <span className="tabular-nums">{message.length} chars</span>
                </p>
              </div>

              {error && (
                <div
                  className="text-sm rounded-[var(--radius-md)] p-3 border-l-4"
                  style={{
                    color: "#B54631",
                    borderLeftColor: "#B54631",
                    backgroundColor: "rgba(181,70,49,0.06)",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <p
                  className="text-[var(--color-fg-muted)]"
                  style={{ fontSize: 12.5, lineHeight: 1.45 }}
                >
                  Read directly by Joey + Jake. We personally respond in
                  1–3 days.
                </p>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={submitting || !message.trim()}
                >
                  <Send className="h-4 w-4" />
                  Send feedback
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <Card>
            <div className="flex flex-col items-center text-center py-10 gap-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(150,162,131,0.20)" }}
              >
                <Check className="h-8 w-8" style={{ color: COLORS.primary }} />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 30,
                    fontWeight: 600,
                    color: "var(--color-fg)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Thank you for your feedback
                </h2>
                <p
                  className="text-[var(--color-fg-secondary)]"
                  style={{ fontSize: 15, lineHeight: 1.55 }}
                >
                  Much appreciated — every note like this directly shapes
                  what we ship next. We&apos;ll follow up if you left an email.
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 mt-2 text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors font-medium"
                style={{ fontSize: 13 }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Submit another
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Other ways to reach us */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
        className="text-center text-[var(--color-fg-muted)] pt-4 border-t border-[var(--color-border)]"
        style={{ fontSize: 12.5 }}
      >
        Prefer email?{" "}
        <a
          href="mailto:hello@surven.ai"
          className="font-medium hover:underline"
          style={{ color: COLORS.primaryHover }}
        >
          hello@surven.ai
        </a>
      </motion.div>
    </div>
  );
}
