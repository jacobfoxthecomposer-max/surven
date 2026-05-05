import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Surven",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          ← Back to Surven
        </Link>

        <h1
          className="mt-6 mb-2 text-4xl font-semibold text-[var(--color-fg)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Terms of Service
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mb-10">
          Last updated: 2026-05-04
        </p>

        <div
          className="prose space-y-6 text-[var(--color-fg-secondary)]"
          style={{ fontSize: 15, lineHeight: 1.7 }}
        >
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">1. Acceptance</h2>
            <p>
              By creating an account or using Surven, you agree to these Terms of Service.
              If you don&apos;t agree, please don&apos;t use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">2. Service description</h2>
            <p>
              Surven is a Generative Engine Optimization (GEO) platform that scans your business
              presence across AI tools (ChatGPT, Claude, Gemini, Google AI) and reports your
              visibility, mentions, and citation gaps. We may add, remove, or modify features
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">3. Your account</h2>
            <p>
              You&apos;re responsible for keeping your login credentials secure and for any
              activity under your account. Notify us immediately if you suspect unauthorized
              access. You must be at least 18 years old to use Surven.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">4. Acceptable use</h2>
            <p>
              You agree not to misuse the service — no scraping, abusing rate limits,
              attempting to break security, or using Surven to harass others or violate any law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">5. Billing</h2>
            <p>
              Paid plans are billed monthly or annually depending on your selection. You can
              cancel anytime; cancellations take effect at the end of the current billing period.
              Free trials require no credit card.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">6. Data &amp; privacy</h2>
            <p>
              How we collect and use your data is described in our{" "}
              <Link href="/privacy" className="text-[var(--color-primary)] hover:underline">
                Privacy Policy
              </Link>
              . You retain ownership of your data; you grant us a license to process it solely
              to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">7. Disclaimers</h2>
            <p>
              Surven is provided &quot;as is.&quot; AI tools change frequently, and visibility
              results may shift outside our control. We make no guarantees about specific
              ranking outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">8. Contact</h2>
            <p>
              Questions about these terms? Email us at{" "}
              <a
                href="mailto:hello@surven.ai"
                className="text-[var(--color-primary)] hover:underline"
              >
                hello@surven.ai
              </a>
              .
            </p>
          </section>

          <p className="text-xs text-[var(--color-fg-muted)] pt-6 border-t border-[var(--color-border)]">
            This is a placeholder. A full legal review is pending.
          </p>
        </div>
      </div>
    </main>
  );
}
