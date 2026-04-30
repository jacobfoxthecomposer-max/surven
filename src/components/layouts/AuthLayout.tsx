"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8">
        <SurvenLogo size="lg" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-lg)]"
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-[var(--color-fg-muted)]">{subtitle}</p>
          )}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
