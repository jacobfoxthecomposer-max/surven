"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Settings, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { PageTransition } from "./PageTransition";
import { BusinessSwitcher } from "@/components/organisms/BusinessSwitcher";
import { cn } from "@/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo + switcher */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-[var(--color-primary)]">Sur</span>ven
              </span>
            </Link>
            <BusinessSwitcher />
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--color-surface)] text-[var(--color-fg)]"
                      : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer ml-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTransition key={pathname}>{children}</PageTransition>
      </main>
    </div>
  );
}
