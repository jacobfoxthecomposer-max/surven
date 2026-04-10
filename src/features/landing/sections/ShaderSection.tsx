"use client";

import { ShaderAnimation } from "@/components/ui/shader-animation";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

export function ShaderSection() {
  return (
    <section className="py-16 px-4 bg-[#0f172a]">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#334155]">
            <ShaderAnimation className="absolute inset-0 w-full h-full" />

            {/* Overlay gradient to blend with design system */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgb(15 23 42 / 0.3) 0%, transparent 30%, transparent 70%, rgb(15 23 42 / 0.5) 100%)",
              }}
            />

            <div className="relative z-10 text-center px-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#d946ef]">
                Real-time intelligence
              </p>
              <h3 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                Track. Analyze. Optimize.
              </h3>
              <p className="text-[#cbd5e1] text-sm sm:text-base max-w-md mx-auto">
                Every scan queries live AI models with real consumer prompts — giving you ground truth data on your AI visibility.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
