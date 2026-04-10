"use client";

import { Scan, BarChart3, TrendingUp, Eye, GitCompare, Bell, BrainCircuit, Download } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const features = [
  {
    icon: Scan,
    color: "#7c3aed",
    title: "Scan",
    description: "Query AI models with real consumer prompts about your industry and location.",
  },
  {
    icon: BarChart3,
    color: "#d946ef",
    title: "Score",
    description: "Get a 0–100 visibility score showing how often AI recommends your business.",
  },
  {
    icon: TrendingUp,
    color: "#f97316",
    title: "Improve",
    description: "See where you're missing and what competitors are showing up instead.",
  },
  {
    icon: Eye,
    color: "#7c3aed",
    title: "Track",
    description: "Monitor your AI mentions over time and catch visibility changes the moment they happen.",
  },
  {
    icon: GitCompare,
    color: "#d946ef",
    title: "Compare",
    description: "Head-to-head benchmarking against every competitor across each AI model.",
  },
  {
    icon: Bell,
    color: "#fbbf24",
    title: "Alerts",
    description: "Automated weekly scans notify you when your visibility score shifts significantly.",
  },
  {
    icon: BrainCircuit,
    color: "#f97316",
    title: "Analyze",
    description: "Sentiment and citation gap analysis reveals exactly how AI talks about your brand.",
  },
  {
    icon: Download,
    color: "#7c3aed",
    title: "Export",
    description: "Download full scan results as CSV for your reports, clients, or further analysis.",
  },
];

const duplicated = [...features, ...features];

export function ValuePropsSection() {
  return (
    <section className="py-24 px-4 bg-[#0f172a] overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything you need to dominate{" "}
            <span className="text-[var(--color-primary)]">AI search</span>
          </h2>
          <p className="mt-4 text-[var(--color-fg-secondary)] max-w-xl mx-auto">
            Surven gives you the same intelligence as enterprise GEO tools — without the
            enterprise price tag.
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
            transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
          }
          .feature-card:hover {
            transform: scale(1.06) translateY(-4px);
            box-shadow: 0 20px 40px -8px rgb(0 0 0 / 0.5);
          }
          .card-mask {
            mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
            -webkit-mask: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
          }
        `}</style>

        <div className="card-strip w-full overflow-hidden">
          <div className="card-mask w-full">
            <div className="card-track flex gap-5 w-max py-4 px-2">
              {duplicated.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={i}
                    className="feature-card flex-shrink-0 w-64 p-6 rounded-2xl border border-[#334155] bg-[#1e293b] space-y-4"
                    style={{ "--card-color": feat.color } as React.CSSProperties}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${feat.color}22`, border: `1px solid ${feat.color}40` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: feat.color }} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold mb-1.5 text-[#f1f5f9]">{feat.title}</h3>
                      <p className="text-sm text-[#94a3b8] leading-relaxed">{feat.description}</p>
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
