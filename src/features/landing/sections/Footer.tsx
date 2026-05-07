import Link from "next/link";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";

const PRODUCT_LINKS = [
  { label: "AI Visibility Tracker", href: "/features/tracker" },
  { label: "Crawlability Audit", href: "/features/crawlability" },
  { label: "Optimizer", href: "/features/optimizer" },
  { label: "Chrome Extension", href: "/features/extension" },
  { label: "Pricing", href: "/pricing" },
];

const RESOURCE_LINKS = [
  { label: "What is GEO?", href: "/resources/what-is-geo" },
  { label: "Blog", href: "/resources/blog" },
  { label: "About", href: "/about" },
  { label: "Affiliate Program", href: "/affiliate" },
  { label: "Contact", href: "/contact" },
];

const ACCOUNT_LINKS = [
  { label: "Sign In", href: "/login" },
  { label: "Sign Up", href: "/signup" },
  { label: "Dashboard", href: "/dashboard" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] pt-16 pb-10 px-6">
      <div className="max-w-[1500px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2 space-y-4">
            <SurvenLogo size="lg" />
            <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed max-w-xs">
              Generative engine optimization for businesses that want to show up
              when AI recommends.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
          <FooterColumn title="Account" links={ACCOUNT_LINKS} />
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-fg-muted)]">
            © {new Date().getFullYear()} Surven. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fg)] mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
