"use client";

import { Scan, BarChart3, TrendingUp, Eye, GitCompare, Bell, BrainCircuit, Download } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const features = [
  {
    icon: Scan,
    title: "Scan",
    description: "Query AI models with real consumer prompts about your industry and location.",
  },
  {
    icon: BarChart3,
    title: "Score",
    description: "Get a 0–100 visibility score showing how often AI recommends your business.",
  },
  {
    icon: TrendingUp,
    title: "Improve",
    description: "See where you're missing and what competitors are showing up instead.",
  },
  {
    icon: Eye,
    title: "Track",
    description: "Monitor your AI mentions over time and catch visibility changes the moment they happen.",
  },
  {
    icon: GitCompare,
    title: "Compare",
    description: "Head-to-head benchmarking against every competitor across each AI model.",
  },
  {
    icon: Bell,
    title: "Alerts",
    description: "Automated weekly scans notify you when your visibility score shifts significantly.",
  },
  {
    icon: BrainCircuit,
    title: "Analyze",
    description: "Sentiment and citation gap analysis reveals exactly how AI talks about your brand.",
  },
  {
    icon: Download,
    title: "Export",
    description: "Download full scan results as CSV for your reports, clients, or further analysis.",
  },
];

const duplicated = [...features, ...features];

export function ValuePropsSection() {
  return (
    <section className="py-24 px-4 bg-[var(--color-bg)] overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-light"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Everything you need to{" "}
            <em className="italic font-normal text-[var(--color-primary)]">own AI search</em>
          </h2>
          <p className="mt-4 text-[var(--color-fg-secondary)] max-w-xl mx-auto">
            Track your visibility across every major AI engine, score every prompt,
            spot every citation gap, and compare every competitor — from one dashboard.
          </p>
        </ScrollReveal>
      </div>

      {/* Full-width scrolling card strip */}
      <ScrollReveal delay={0.15}>
        <style>{`
          @keyframes card-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .card-track {
            animation: card-scroll 32s linear infinite;
          }
          .card-strip:hover .card-track {
            animation-play-state: paused;
          }
          .feature-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .feature-card:hover {
            transform: scale(1.04) translateY(-3px);
            box-shadow: var(--shadow-lg);
          }
          .card-mask {
            mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
            -webkit-mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
          }
        `}</style>

        <div className="card-strip w-full overflow-hidden">
          <div className="card-mask w-full">
            <div className="card-track flex gap-4 w-max py-4 px-2">
              {duplicated.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={i}
                    className="feature-card flex-shrink-0 w-60 p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3"
                  >
                    <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                      <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1 text-[var(--color-fg)]">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
