"use client";

import { Scan, BarChart3, TrendingUp, Eye, GitCompare, Bell, BrainCircuit, Download } from "lucide-react";
import { ScrollReveal } from "@/components/molecules/ScrollReveal";

const features = [
  {
    icon: Scan,
    title: "Scan",
    description: "See the exact questions your customers are asking AI — and find out if your name is in the answer.",
  },
  {
    icon: BarChart3,
    title: "Score",
    description: "A 0–100 score that shows exactly how visible your business is across every major AI engine.",
  },
  {
    icon: TrendingUp,
    title: "Improve",
    description: "See every gap where a competitor appeared instead of you — and know exactly what to fix.",
  },
  {
    icon: Eye,
    title: "Track",
    description: "Watch your visibility trend over time and catch any change the moment it happens.",
  },
  {
    icon: GitCompare,
    title: "Compare",
    description: "See which AI engines favor your competitor — and by exactly how much.",
  },
  {
    icon: Bell,
    title: "Alerts",
    description: "Weekly scans run automatically — just log in and your latest results are already waiting for you.",
  },
  {
    icon: BrainCircuit,
    title: "Analyze",
    description: "Find out whether AI describes your business positively, neutrally, or not at all.",
  },
  {
    icon: Download,
    title: "Export",
    description: "Take your data anywhere — for client reports, strategy sessions, or internal reviews.",
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
            Stop losing customers{" "}
            <em className="italic font-normal text-[var(--color-primary)]">you never knew you were losing</em>
          </h2>
          <p className="mt-4 text-[var(--color-fg-secondary)] max-w-xl mx-auto">
            Right now AI is directing customers in your city to businesses it trusts. Surven shows you
            whether you&apos;re one of them — and what to do when you&apos;re not.
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
