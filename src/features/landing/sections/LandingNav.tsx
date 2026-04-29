"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll } from "framer-motion";
import { Button } from "@/components/atoms/Button";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";
import { cn } from "@/utils/cn";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 20));
    return unsub;
  }, [scrollY]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <SurvenLogo size="md" />

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors hidden sm:block"
          >
            Sign In
          </Link>
          <Link href="/signup">
            <Button size="sm" className="text-sm">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
