"use client";

import { ScrollReveal } from "@/components/molecules/ScrollReveal";
import { Radar, IconContainer } from "@/components/ui/radar-effect";
import {
  Eye,
  Bot,
  Search,
  TrendingUp,
  Zap,
  BarChart3,
  Link2,
} from "lucide-react";

const iconClass = "h-6 w-6 text-[#4361ee]";

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-[#0f172a]">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4361ee]">
            What we track
          </span>
        </ScrollReveal>
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Complete AI visibility{" "}
            <span className="text-[#06d6a0]">intelligence</span>
          </h2>
          <p className="mt-4 text-[#cbd5e1] max-w-xl mx-auto text-sm sm:text-base">
            Surven monitors every signal that determines whether AI recommends your business — across every model, every prompt, every day.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="relative flex h-[420px] w-full flex-col items-center justify-center space-y-4 overflow-hidden">
            {/* Row 1 */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex w-full items-center justify-center space-x-10 md:justify-between md:space-x-0">
                <IconContainer
                  text="Mention Tracking"
                  delay={0.2}
                  icon={<Eye className={iconClass} />}
                />
                <IconContainer
                  delay={0.4}
                  text="Multi-Model"
                  icon={<Bot className={iconClass} />}
                />
                <IconContainer
                  text="Real Prompts"
                  delay={0.3}
                  icon={<Search className={iconClass} />}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="mx-auto w-full max-w-md">
              <div className="flex w-full items-center justify-center space-x-10 md:justify-between md:space-x-0">
                <IconContainer
                  text="Trend Analysis"
                  delay={0.5}
                  icon={<TrendingUp className={iconClass} />}
                />
                <IconContainer
                  text="Auto Scans"
                  delay={0.8}
                  icon={<Zap className={iconClass} />}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex w-full items-center justify-center space-x-10 md:justify-between md:space-x-0">
                <IconContainer
                  delay={0.6}
                  text="Competitor Bench"
                  icon={<BarChart3 className={iconClass} />}
                />
                <IconContainer
                  delay={0.7}
                  text="Citation Gaps"
                  icon={<Link2 className={iconClass} />}
                />
              </div>
            </div>

            <Radar className="absolute -bottom-12" />
            <div className="absolute bottom-0 z-[41] h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
