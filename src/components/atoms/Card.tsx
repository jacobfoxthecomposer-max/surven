"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/utils/cn";

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
}

export function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: "var(--shadow-lg)" } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] p-6",
        "shadow-[var(--shadow-sm)]",
        hover && "cursor-pointer transition-colors duration-[var(--duration-fast)]",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
