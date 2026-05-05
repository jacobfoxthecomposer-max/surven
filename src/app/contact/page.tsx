"use client";

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { LandingNav } from "@/features/landing/sections/LandingNav";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />

      <main className="pt-16">
        <section className="max-w-xl mx-auto px-6 pt-24 pb-24">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: "rgba(150,162,131,0.15)", color: "var(--color-primary)" }}
          >
            <Mail className="h-3.5 w-3.5" />
            Contact
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 600,
              lineHeight: 1.15,
              color: "var(--color-fg)",
            }}
          >
            Get in touch
          </h1>
          <p className="mt-3 text-[var(--color-fg-muted)] leading-relaxed">
            Questions about Surven, the Managed plan, or anything else — we read every message.
          </p>

          {submitted ? (
            <div
              className="mt-10 flex items-start gap-3 p-5 rounded-xl border"
              style={{
                backgroundColor: "rgba(150,162,131,0.08)",
                borderColor: "rgba(150,162,131,0.3)",
              }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
              <div>
                <p className="font-semibold text-[var(--color-fg)]">Message sent</p>
                <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">We&apos;ll get back to you within one business day.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--color-fg-secondary)]">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="What can we help you with?"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Send message
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
