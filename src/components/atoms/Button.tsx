"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const variantStyles = {
  primary:
    "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-md",
  secondary:
    "bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-fg)] border border-[var(--color-border)]",
  danger:
    "bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-white",
  ghost:
    "bg-transparent hover:bg-[var(--color-surface)] text-[var(--color-fg-secondary)]",
  outline:
    "bg-transparent border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-fg)] hover:text-[var(--color-primary)]",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
};

interface ButtonProps {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  form?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      onClick,
      type,
      form,
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium cursor-pointer",
          "transition-colors duration-[var(--duration-fast)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        disabled={isDisabled}
        onClick={onClick}
        type={type}
        form={form}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
