"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Puzzle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Newspaper,
  Users,
  Mail,
  HandCoins,
  Menu,
  X,
} from "lucide-react";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";

const FEATURES = [
  {
    href: "/features/tracker",
    icon: TrendingUp,
    label: "AI Visibility Tracker",
    description: "See where your business ranks on ChatGPT, Claude, Gemini, and Google AI",
  },
  {
    href: "/features/crawlability",
    icon: ShieldCheck,
    label: "Crawlability Audit",
    description: "Find and fix every blocker stopping AI from reading your site",
  },
  {
    href: "/features/optimizer",
    icon: Zap,
    label: "Optimizer",
    description: "Automate your AI presence improvements — coming soon",
  },
  {
    href: "/features/extension",
    icon: Puzzle,
    label: "Chrome Extension",
    description: "Audit and fix any page in seconds without leaving your browser",
  },
];

const RESOURCES = [
  {
    href: "/resources/what-is-geo",
    icon: BookOpen,
    label: "What is GEO?",
    description: "Learn what Generative Engine Optimization is and why it matters for your business",
  },
  {
    href: "/resources/blog",
    icon: Newspaper,
    label: "Blog",
    description: "Guides, strategies, and insights on AI visibility and GEO",
  },
  {
    href: "/about",
    icon: Users,
    label: "About",
    description: "Our story and why we built Surven",
  },
  {
    href: "/affiliate",
    icon: HandCoins,
    label: "Affiliate Program",
    description: "Earn recurring revenue by referring clients to Surven",
  },
  {
    href: "/contact",
    icon: Mail,
    label: "Contact",
    description: "Get in touch with our team",
  },
];

type DropdownKey = "features" | "resources" | null;

export function LandingNav() {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featuresButtonRef = useRef<HTMLButtonElement>(null);
  const resourcesButtonRef = useRef<HTMLButtonElement>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openFeatures = useCallback(() => {
    cancelClose();
    setOpenDropdown("features");
  }, [cancelClose]);

  const openResources = useCallback(() => {
    cancelClose();
    setOpenDropdown("resources");
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 120);
  }, []);

  const closeNow = useCallback(() => {
    cancelClose();
    setOpenDropdown(null);
  }, [cancelClose]);

  // Close dropdowns on Escape
  useEffect(() => {
    if (openDropdown === null && !mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mobileOpen) {
          setMobileOpen(false);
        } else {
          closeNow();
          // Return focus to trigger
          if (openDropdown === "features") featuresButtonRef.current?.focus();
          if (openDropdown === "resources") resourcesButtonRef.current?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown, mobileOpen, closeNow]);

  // Close mobile drawer when window resizes up
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768 && mobileOpen) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleDropdown(key: "features" | "resources") {
    cancelClose();
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 inset-x-0 z-50 bg-[var(--color-bg)] border-b border-[var(--color-border)]"
    >
      <div className="max-w-[1500px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left — logo */}
        <SurvenLogo size="lg" />

        {/* Center — nav links (desktop only) */}
        <nav className="hidden md:flex items-center gap-8">
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={openFeatures}
            onMouseLeave={scheduleClose}
          >
            <button
              ref={featuresButtonRef}
              type="button"
              onClick={() => toggleDropdown("features")}
              className="flex items-center gap-1 text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] focus-visible:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded transition-colors"
              aria-expanded={openDropdown === "features"}
              aria-haspopup="menu"
              aria-controls="nav-features-menu"
            >
              Features
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{
                  transform: openDropdown === "features" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "features" && (
                <motion.div
                  id="nav-features-menu"
                  role="menu"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  onMouseEnter={openFeatures}
                  onMouseLeave={scheduleClose}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg overflow-hidden"
                >
                  <div className="p-2">
                    {FEATURES.map((f) => {
                      const Icon = f.icon;
                      return (
                        <Link
                          key={f.href}
                          href={f.href}
                          role="menuitem"
                          onClick={closeNow}
                          className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)] focus-visible:outline-none transition-colors group"
                        >
                          <div
                            className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
                          >
                            <Icon className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-primary)] transition-colors">
                              {f.label}
                            </p>
                            <p className="text-xs text-[var(--color-fg-muted)] mt-0.5 leading-relaxed">
                              {f.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/pricing"
            className="text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] focus-visible:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/audit"
            className="text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] focus-visible:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded transition-colors"
          >
            Audit
          </Link>

          {/* Resources dropdown */}
          <div
            className="relative"
            onMouseEnter={openResources}
            onMouseLeave={scheduleClose}
          >
            <button
              ref={resourcesButtonRef}
              type="button"
              onClick={() => toggleDropdown("resources")}
              className="flex items-center gap-1 text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] focus-visible:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded transition-colors"
              aria-expanded={openDropdown === "resources"}
              aria-haspopup="menu"
              aria-controls="nav-resources-menu"
            >
              Resources
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{
                  transform: openDropdown === "resources" ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <AnimatePresence>
              {openDropdown === "resources" && (
                <motion.div
                  id="nav-resources-menu"
                  role="menu"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  onMouseEnter={openResources}
                  onMouseLeave={scheduleClose}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg overflow-hidden"
                >
                  <div className="p-2">
                    {RESOURCES.map((r) => {
                      const Icon = r.icon;
                      return (
                        <Link
                          key={r.href}
                          href={r.href}
                          role="menuitem"
                          onClick={closeNow}
                          className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)] focus-visible:outline-none transition-colors group"
                        >
                          <div
                            className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
                          >
                            <Icon className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-primary)] transition-colors">
                              {r.label}
                            </p>
                            <p className="text-xs text-[var(--color-fg-muted)] mt-0.5 leading-relaxed">
                              {r.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right — Sign In + Get Started (desktop) / hamburger (mobile) */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden md:inline-flex items-center px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>

          {/* Hamburger toggle (mobile only) */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] transition-colors"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 top-16 z-40 bg-black/40"
              aria-hidden="true"
            />
            <motion.div
              id="mobile-nav-drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute left-0 right-0 top-full z-50 max-h-[calc(100vh-4rem)] overflow-y-auto bg-[var(--color-bg)] border-b border-[var(--color-border)] shadow-lg"
            >
              <nav className="px-6 py-4 space-y-1" aria-label="Mobile navigation">
                {/* Features collapsible */}
                <MobileGroup
                  label="Features"
                  open={mobileFeaturesOpen}
                  onToggle={() => setMobileFeaturesOpen((v) => !v)}
                  items={FEATURES}
                  onItemClick={() => setMobileOpen(false)}
                />

                <MobileLink href="/pricing" onClick={() => setMobileOpen(false)}>
                  Pricing
                </MobileLink>
                <MobileLink href="/audit" onClick={() => setMobileOpen(false)}>
                  Audit
                </MobileLink>

                {/* Resources collapsible */}
                <MobileGroup
                  label="Resources"
                  open={mobileResourcesOpen}
                  onToggle={() => setMobileResourcesOpen((v) => !v)}
                  items={RESOURCES}
                  onItemClick={() => setMobileOpen(false)}
                />

                <div className="pt-4 mt-2 border-t border-[var(--color-border)] flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Get Started Free
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-3 py-3 rounded-lg text-[15px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
    >
      {children}
    </Link>
  );
}

type MobileItem = {
  href: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  description: string;
};

function MobileGroup({
  label,
  open,
  onToggle,
  items,
  onItemClick,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  items: MobileItem[];
  onItemClick: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-[15px] font-medium text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors"
      >
        {label}
        <ChevronRight
          className="h-4 w-4 transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pl-2 pb-2 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <div
                      className="mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(150,162,131,0.15)" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-primary)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-fg)]">{item.label}</p>
                      <p className="text-xs text-[var(--color-fg-muted)] mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
