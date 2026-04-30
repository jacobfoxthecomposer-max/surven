"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface SurvenLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "text-base font-bold tracking-tight",
  md: "text-lg font-bold tracking-tight",
  lg: "text-2xl font-bold tracking-tight",
};

export function SurvenLogo({ className, size = "md" }: SurvenLogoProps) {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/";

  return (
    <Link href={href} className={className}>
      <span className={sizeStyles[size]}>
        <span className="text-[var(--color-primary)]">Sur</span>ven
      </span>
    </Link>
  );
}
