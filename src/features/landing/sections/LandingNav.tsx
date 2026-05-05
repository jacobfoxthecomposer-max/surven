"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, ShieldCheck, Zap, Puzzle, ChevronDown, BookOpen, Newspaper, Users, Mail, HandCoins } from "lucide-react";
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

export function LandingNav() {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openFeatures() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setFeaturesOpen(true);
    setResourcesOpen(false);
  }

  function openResources() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setResourcesOpen(true);
    setFeaturesOpen(false);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => {
      setFeaturesOpen(false);
      setResourcesOpen(false);
    }, 120);
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 inset-x-0 z-50 bg-[var(--color-bg)] border-b border-[var(--color-border)]"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Left — logo */}
        <SurvenLogo size="lg" />

        {/* Center — nav links */}
        <nav className="hidden md:flex items-center gap-8">

          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={openFeatures}
            onMouseLeave={scheduleClose}
          >
            <button
              className="flex items-center gap-1 text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
              aria-expanded={featuresOpen}
            >
              Features
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{ transform: featuresOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            <AnimatePresence>
              {featuresOpen && (
                <motion.div
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
                          onClick={() => setFeaturesOpen(false)}
                          className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors group"
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
            className="text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/audit"
            className="text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
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
              className="flex items-center gap-1 text-[15px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
              aria-expanded={resourcesOpen}
            >
              Resources
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
                style={{ transform: resourcesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            <AnimatePresence>
              {resourcesOpen && (
                <motion.div
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
                          onClick={() => setResourcesOpen(false)}
                          className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors group"
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

        {/* Right — Sign In + Get Started */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
        </div>

      </div>
    </motion.header>
  );
}
