import { cn } from "@/utils/cn";

const variants = {
  success: "bg-[#96A283]/15 text-[#566A47] border-[#96A283]/25",
  warning: "bg-[#C97B45]/15 text-[#9A5D28] border-[#C97B45]/25",
  danger: "bg-[#B54631]/15 text-[#8C3522] border-[#B54631]/25",
  info: "bg-[#6BA3F5]/15 text-[#2E6ACF] border-[#6BA3F5]/25",
  neutral: "bg-[#8A8578]/15 text-[#6B6460] border-[#8A8578]/25",
};

interface BadgeProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
