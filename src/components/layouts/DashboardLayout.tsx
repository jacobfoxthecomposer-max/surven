"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, LogOut, FileSearch, Menu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { PageTransition } from "./PageTransition";
import { BusinessSwitcher } from "@/components/organisms/BusinessSwitcher";
import { Sidebar } from "@/components/organisms/Sidebar";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";
import { useSidebarContext } from "@/features/sidebar/context/SidebarContext";
import { PostPurchaseIntegrationsModal } from "@/features/onboarding/PostPurchaseIntegrationsModal";
import { cn } from "@/utils/cn";

const navItems = [
  { href: "/audit", label: "Optimize", icon: FileSearch },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isExpanded, isMobileOpen, setIsMobileOpen } = useSidebarContext();

  async function handleSignOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md h-14">
        <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Hamburger (mobile only) + Logo + switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[var(--color-fg-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <SurvenLogo size="md" />
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

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Content — sidebar overlays on mobile (no margin), reserves space on md+ */}
        <main
          className={cn(
            "flex-1 px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300",
            "ml-0",
            isExpanded ? "md:ml-64" : "md:ml-20",
          )}
        >
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>

      <Suspense fallback={null}>
        <PostPurchaseIntegrationsModal />
      </Suspense>
    </div>
  );
}
