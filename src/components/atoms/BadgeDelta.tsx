import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "@/utils/cn";

const GROW = "#7D8E6C";
const LOSE = "#B54631";
const GROW_BG = "rgba(150,162,131,0.18)";
const LOSE_BG = "rgba(181,70,49,0.12)";
const GROW_BG_STRONG = "rgba(150,162,131,0.28)";
const LOSE_BG_STRONG = "rgba(181,70,49,0.18)";

const badgeDeltaVariants = cva(
  "inline-flex items-center text-xs font-semibold rounded-md tabular-nums whitespace-nowrap",
  {
    variants: {
      variant: {
        outline: "gap-x-1 px-2 py-0.5 ring-1 ring-inset",
        solid: "gap-x-1 px-2 py-0.5",
        complex:
          "space-x-2 rounded-lg py-1 pl-2.5 pr-1 ring-1 ring-inset ring-[var(--color-border)] bg-[var(--color-surface)]",
      },
      deltaType: { increase: "", decrease: "", neutral: "" },
    },
    compoundVariants: [
      { variant: "outline", deltaType: "increase", className: "ring-[rgba(150,162,131,0.45)]" },
      { variant: "outline", deltaType: "decrease", className: "ring-[rgba(181,70,49,0.45)]" },
      { variant: "outline", deltaType: "neutral", className: "ring-[var(--color-border)]" },
    ],
  },
);

interface BadgeDeltaProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeDeltaVariants> {
  value: string | number;
}

const ICONS = {
  increase: ArrowUp,
  decrease: ArrowDown,
  neutral: ArrowRight,
} as const;

function deltaInlineStyle(
  variant: "outline" | "solid" | "complex",
  deltaType: "increase" | "decrease" | "neutral",
): React.CSSProperties {
  if (deltaType === "neutral") {
    return variant === "solid"
      ? { color: "var(--color-fg-muted)", backgroundColor: "var(--color-surface-alt)" }
      : { color: "var(--color-fg-muted)" };
  }
  const text = deltaType === "increase" ? GROW : LOSE;
  if (variant === "solid") {
    return { color: text, backgroundColor: deltaType === "increase" ? GROW_BG : LOSE_BG };
  }
  return { color: text };
}

export function BadgeDelta({
  className,
  variant = "outline",
  deltaType = "neutral",
  value,
  style,
  ...props
}: BadgeDeltaProps) {
  const v = variant ?? "outline";
  const d = deltaType ?? "neutral";
  const Icon = ICONS[d];

  if (v === "complex") {
    const valueColor =
      d === "increase" ? GROW : d === "decrease" ? LOSE : "var(--color-fg-secondary)";
    const iconBg =
      d === "increase"
        ? GROW_BG_STRONG
        : d === "decrease"
        ? LOSE_BG_STRONG
        : "var(--color-surface-alt)";
    const iconColor = d === "neutral" ? "var(--color-fg-muted)" : valueColor;

    return (
      <span
        className={cn(badgeDeltaVariants({ variant: v, className }))}
        style={style}
        {...props}
      >
        <span className="text-xs font-semibold tabular-nums" style={{ color: valueColor }}>
          {value}
        </span>
        <span
          className="inline-flex items-center justify-center rounded-md p-1"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} aria-hidden />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(badgeDeltaVariants({ variant: v, deltaType: d, className }))}
      style={{ ...deltaInlineStyle(v, d), ...style }}
      {...props}
    >
      <Icon className="-ml-0.5 h-3.5 w-3.5" aria-hidden />
      <span>{value}</span>
    </span>
  );
}
