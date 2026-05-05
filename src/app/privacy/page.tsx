import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Surven",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mb-10">
          Last updated: 2026-05-04
        </p>

        <div
          className="prose space-y-6 text-[var(--color-fg-secondary)]"
          style={{ fontSize: 15, lineHeight: 1.7 }}
        >
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">What we collect</h2>
            <p>
              We collect the email address you sign up with, the business details you enter
              (name, industry, location, competitors), and the scan results we generate when
              querying AI tools on your behalf. We also collect basic usage analytics to
              improve the product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">How we use it</h2>
            <p>
              Your data is used solely to provide the Surven service: running scans, displaying
              your dashboard, sending weekly scan summaries, and supporting your account. We
              don&apos;t sell your data to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">Third parties</h2>
            <p>
              We send your business details to OpenAI, Anthropic, and Google in order to query
              their AI models on your behalf. Each of those providers has its own privacy
              policy. We use Supabase for authentication and storage, and Vercel for hosting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">Your rights</h2>
            <p>
              You can export your scan data as CSV from the dashboard at any time. You can
              delete your account and all associated data from the Settings page — that
              action is immediate and permanent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">Cookies &amp; storage</h2>
            <p>
              We use browser localStorage to keep you signed in and remember your sidebar
              preference. We don&apos;t use third-party tracking cookies on the app. Marketing
              cookies on the public landing pages are described in our cookie banner.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">Security</h2>
            <p>
              Passwords are hashed by Supabase Auth. Sensitive data (API keys you enter) is
              encrypted at rest. We do our best, but no system is unbreakable — please use a
              strong password and contact us right away if you notice anything suspicious.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-fg)] mb-2">Contact</h2>
            <p>
              Questions, requests, or concerns? Email us at{" "}
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
