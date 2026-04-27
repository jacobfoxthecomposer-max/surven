import Link from "next/link";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sign Up", href: "/signup" },
  { label: "Sign In", href: "/login" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="text-base font-medium tracking-wide text-[var(--color-fg)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Surven
        </Link>

        <nav className="flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-[var(--color-fg-muted)]">
          © {new Date().getFullYear()} Surven. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
