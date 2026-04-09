"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useActiveBusiness } from "@/features/business/hooks/useActiveBusiness";
import { cn } from "@/utils/cn";

export function BusinessSwitcher() {
  const { businesses, activeBusiness, setActiveBusinessId } = useActiveBusiness();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!activeBusiness) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
          "text-[var(--color-fg)] hover:bg-[var(--color-surface)] border border-[var(--color-border)]"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="max-w-[140px] truncate">{activeBusiness.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--color-fg-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-50 py-1">
          {businesses.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setActiveBusinessId(b.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === activeBusiness.id && (
                <Check className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
              )}
            </button>
          ))}

          <div className="border-t border-[var(--color-border)] mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/onboarding/new");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Add new business
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
