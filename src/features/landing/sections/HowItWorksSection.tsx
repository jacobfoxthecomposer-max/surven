"use client";

import React, { useState } from "react";
import { Building2, Target, LineChart } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

interface TimelineStep {
  id: number;
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeBg: string;
  glow: string;
}

const timelineSteps: TimelineStep[] = [
  {
    id: 1,
    number: "01",
    title: "Add your business",
    description:
      "Enter your business name, industry, and location. Optionally add competitors you want to track alongside.",
    icon: <Building2 className="w-7 h-7" />,
    iconBg: "bg-[#7c3aed]",
    badgeBg: "bg-[#7c3aed]",
    glow: "rgb(124 58 237 / 0.25)",
  },
  {
    id: 2,
    number: "02",
    title: "Run a scan",
    description:
      "Surven generates realistic consumer prompts and queries ChatGPT, Claude, Gemini, and Google AI to see who gets recommended.",
    icon: <Target className="w-7 h-7" />,
    iconBg: "bg-[#d946ef]",
    badgeBg: "bg-[#d946ef]",
    glow: "rgb(217 70 239 / 0.25)",
  },
  {
    id: 3,
    number: "03",
    title: "See your results",
    description:
      "Get a Visibility Score, per-model breakdown, and the exact prompts that mentioned — or missed — your business.",
    icon: <LineChart className="w-7 h-7" />,
    iconBg: "bg-[#f97316]",
    badgeBg: "bg-[#f97316]",
    glow: "rgb(249 115 22 / 0.2)",
  },
];

export function HowItWorksSection() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <section className="py-24 px-4 bg-[#0f172a]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#7c3aed] mb-3 block">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            From setup to insights in minutes
          </h2>
        </ScrollReveal>

        {/* Timeline */}
        <ScrollReveal delay={0.1}>
          <div className="relative flex flex-col md:flex-row items-stretch md:items-center justify-center gap-6 md:gap-0">
            {timelineSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Card */}
                <div
                  className="relative md:w-72 lg:w-80"
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                  style={{ zIndex: hoveredStep === step.id ? 10 : 1 }}
                >
                  <div
                    className="h-full p-6 rounded-2xl border border-[#334155] bg-[#1e293b]/70 backdrop-blur-sm cursor-pointer"
                    style={{
                      transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
                      transform:
                        hoveredStep === step.id
                          ? "scale(1.06) translateY(-6px)"
                          : "scale(1) translateY(0)",
                      boxShadow:
                        hoveredStep === step.id
                          ? `0 24px 48px -8px rgb(0 0 0 / 0.5), 0 0 0 1px ${step.glow}`
                          : "0 4px 12px -2px rgb(0 0 0 / 0.3)",
                      borderColor:
                        hoveredStep === step.id ? "rgba(255,255,255,0.12)" : "#334155",
                    }}
                  >
                    {/* Icon + badge */}
                    <div className="relative w-fit mb-6">
                      <div
                        className={`${step.iconBg} rounded-2xl p-4 text-white`}
                        style={{
                          transition: "transform 0.3s ease",
                          transform: hoveredStep === step.id ? "scale(1.12)" : "scale(1)",
                        }}
                      >
                        {step.icon}
                      </div>
                      <span
                        className={`absolute -top-2 -right-2 ${step.badgeBg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}
                      >
                        {step.number}
                      </span>
                    </div>

                    {/* Text */}
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* Connector */}
                {index < timelineSteps.length - 1 && (
                  <div className="hidden md:flex items-center mx-4 flex-shrink-0">
                    <div className="w-16 h-px bg-gradient-to-r from-[#7c3aed]/50 via-[#d946ef]/50 to-[#f97316]/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#334155] -ml-px" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
