"use client";

import Link from "next/link";
import { useIsFirstTimeUser } from "@/features/auth/hooks/useIsFirstTimeUser";

type Variant = "primary" | "outline";

const baseClass =
  "block text-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors";

const variantClass: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-white hover:opacity-90",
  outline: "border border-[var(--color-border)] hover:bg-[var(--color-bg)]",
};

export function PlanCTA({
  planName,
  variant,
  className,
}: {
  planName: "Plus" | "Premium";
  variant: Variant;
  className?: string;
}) {
  const { isFirstTime } = useIsFirstTimeUser();

  const label = isFirstTime ? "Try Free Trial" : `Upgrade to ${planName}`;
  const href = isFirstTime ? "/signup" : "/pricing";

  return (
    <Link
      href={href}
      className={`${baseClass} ${variantClass[variant]} ${className ?? ""}`}
    >
      {label}
    </Link>
  );
}
