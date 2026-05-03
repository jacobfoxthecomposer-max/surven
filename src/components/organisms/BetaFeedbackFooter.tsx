"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const SAGE = "#96A283";

/**
 * Page-bottom beta callout. Two-tier: full-width rust→amber→sage stripe up
 * top with the unmissable "SURVEN IS STILL IN BETA" label; softer body
 * underneath with the "Help shape what ships next" headline + Send feedback
 * CTA. Originally lived as a local `FeedbackFooter` inside `AeoAuditSection`;
 * promoted to a shared organism 2026-05-03 so other tool pages can mount the
 * same beta affordance without forking the markup.
 */
export function BetaFeedbackFooter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-[var(--radius-lg)] border overflow-hidden mt-2"
      style={{ borderColor: "rgba(150,162,131,0.55)" }}
    >
      {/* Top BETA stripe — full-width, unmissable */}
      <div
        className="px-5 py-2.5 flex items-center justify-center gap-2 border-b"
        style={{
          background:
            "linear-gradient(90deg, rgba(150,162,131,0.55) 0%, rgba(184,160,48,0.45) 50%, rgba(201,123,69,0.45) 100%)",
          borderBottomColor: "rgba(150,162,131,0.55)",
        }}
      >
        <Sparkles className="h-4 w-4" style={{ color: "#3D3F3D" }} />
        <span
          className="uppercase font-bold"
          style={{
            fontSize: 12.5,
            letterSpacing: "0.16em",
            color: "#1A1C1A",
          }}
        >
          Surven is still in beta
        </span>
        <Sparkles className="h-4 w-4" style={{ color: "#3D3F3D" }} />
      </div>

      <div
        className="px-6 py-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,162,131,0.20) 0%, rgba(184,160,48,0.10) 50%, rgba(201,123,69,0.08) 100%)",
        }}
      >
        <div className="min-w-0">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--color-fg)",
              lineHeight: 1.15,
            }}
          >
            Help shape what ships next
          </h3>
          <p
            className="text-[var(--color-fg-secondary)] mt-0.5"
            style={{ fontSize: 14, lineHeight: 1.5 }}
          >
            Spot a bug, want a feature, or wish a different metric was here?
          </p>
        </div>

        <a
          href="/feedback"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[var(--radius-md)] font-semibold shadow-md transition-colors text-white shrink-0"
          style={{
            fontSize: 14,
            backgroundColor: SAGE,
          }}
        >
          <Sparkles className="h-4 w-4" />
          Send feedback
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
}
