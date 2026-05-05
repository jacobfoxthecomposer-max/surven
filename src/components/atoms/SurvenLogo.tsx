"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface SurvenLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { text: "text-base font-bold tracking-tight", img: 22 },
  md: { text: "text-lg font-bold tracking-tight", img: 28 },
  lg: { text: "text-3xl font-bold tracking-tight", img: 34 },
};

export function SurvenLogo({ className, size = "md" }: SurvenLogoProps) {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/";
  const { text, img } = sizeStyles[size];

  return (
    <Link href={href} className={className}>
      <span className="flex items-center gap-1.5">
        <Image
          src="/surven-logo-transparent.png"
          alt="Surven logo"
          width={img}
          height={img}
          className="shrink-0"
          priority
        />
        <span className={text}>
          <span className="text-[var(--color-primary)]">Sur</span>ven
        </span>
      </span>
    </Link>
  );
}
