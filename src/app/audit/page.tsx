"use client";

import { motion } from "framer-motion";
import { Globe, ChevronDown, Search, Settings, AlertCircle, Clock, FileText } from "lucide-react";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";

// ─── Mock extension data ──────────────────────────────────────────────────────

const MOCK_FINDINGS = [
  {
    id: "org_schema",
    title: "Organization Schema Missing",
    severity: "critical" as const,
    fixTime: 30,
    impact: 8,
    expanded: false,
  },
  {
    id: "content_freshness",
    title: "Content Not Recently Updated",
    severity: "high" as const,
    fixTime: 15,
    impact: 7,
    expanded: false,
  },
  {
    id: "meta_desc",
    title: "Meta Description Too Short",
    severity: "medium" as const,
    fixTime: 10,
    impact: 6,
    expanded: false,
  },
  {
    id: "faq_schema",
    title: "FAQ Schema Missing",
    severity: "high" as const,
    fixTime: 45,
    impact: 7,
    expanded: false,
  },
];

const SEVERITY: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  critical: { bg: "#FEE2E2", text: "#B54631", border: "#F9A8A0", badge: "bg-[#FEE2E2] text-[#B54631]" },
  high:     { bg: "#FEF3C7", text: "#C97B45", border: "#FDE68A", badge: "bg-[#FEF3C7] text-[#C97B45]" },
  medium:   { bg: "#F0FDF4", text: "#5E8A4E", border: "#BBF7D0", badge: "bg-[#F0FDF4] text-[#5E8A4E]" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function BrowserMockup() {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: "#E8E2D5", borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        {/* Address bar */}
        <div
          className="flex-1 mx-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
          style={{ background: "#F2EEE3", color: "#6B6D6B", border: "1px solid var(--color-border)" }}
        >
          <Globe size={11} />
          thecurbskateshop.com
        </div>
        {/* Extension icon — glowing to draw eye */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
          style={{ background: "#96A283" }}
          title="Surven Auditor"
        >
          <Search size={11} color="white" />
        </motion.div>
      </div>

      {/* Browser content + side panel */}
      <div className="flex" style={{ height: "460px" }}>

        {/* Fake webpage */}
        <div
          className="flex-1 p-6 overflow-hidden"
          style={{ background: "#FAFAF8" }}
        >
          {/* Fake nav */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-24 h-4 rounded" style={{ background: "#D1CBC0" }} />
            <div className="flex gap-3">
              {[48, 36, 44].map((w, i) => (
                <div key={i} className="h-3 rounded" style={{ width: w, background: "#E0DAD0" }} />
              ))}
            </div>
          </div>
          {/* Fake hero */}
          <div className="mb-6">
            <div className="w-3/4 h-6 rounded mb-2" style={{ background: "#C8C2B4" }} />
            <div className="w-1/2 h-6 rounded mb-4" style={{ background: "#C8C2B4" }} />
            <div className="w-full h-3 rounded mb-1.5" style={{ background: "#E0DAD0" }} />
            <div className="w-5/6 h-3 rounded mb-4" style={{ background: "#E0DAD0" }} />
            <div className="w-28 h-8 rounded-lg" style={{ background: "#96A283" }} />
          </div>
          {/* Fake image block */}
          <div className="w-full h-28 rounded-lg" style={{ background: "#DDD7CB" }} />
        </div>

        {/* Extension side panel */}
        <motion.div
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: 256,
            background: "#F2EEE3",
            borderLeft: "1px solid #C8C2B4",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {/* Panel header */}
          <div style={{ padding: "12px", borderBottom: "1px solid #C8C2B4" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#1A1C1A" }}>
                <span style={{ color: "#96A283" }}>Sur</span>ven Auditor
              </span>
              <Settings size={13} style={{ color: "#6B6D6B" }} />
            </div>
            <div
              style={{
                width: "100%",
                padding: "7px 10px",
                background: "#96A283",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Search size={12} />
              Run Audit
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5DFCF" }}>
            <div style={{ fontSize: "11px", color: "#1A1C1A" }}>
              <strong>4</strong> issues found
              <span style={{ color: "#B54631", marginLeft: "8px" }}>• 1 critical</span>
              <span style={{ color: "#C97B45", marginLeft: "6px" }}>• 2 high</span>
            </div>
            <div style={{ fontSize: "10px", color: "#6B6D6B", marginTop: "2px" }}>12 pages crawled</div>
          </div>

          {/* Findings */}
          <div style={{ flex: 1, overflow: "hidden", padding: "8px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {MOCK_FINDINGS.map((finding, i) => {
                const s = SEVERITY[finding.severity];
                const isFirst = i === 0;
                return (
                  <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 0.3 }}
                    style={{
                      border: `1px solid ${s.border}`,
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 10px",
                        background: s.bg,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "6px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: s.text, marginBottom: "2px", lineHeight: 1.3 }}>
                          {finding.title}
                        </div>
                        <div style={{ fontSize: "10px", color: "#6B6D6B" }}>
                          {finding.fixTime} min fix · Impact {finding.impact}/10
                        </div>
                      </div>
                      <ChevronDown
                        size={13}
                        style={{ color: s.text, marginTop: "1px", flexShrink: 0, transform: isFirst ? "rotate(180deg)" : undefined }}
                      />
                    </div>
                    {isFirst && (
                      <div style={{ padding: "8px 10px", background: "#E5DFCF", fontSize: "10px", color: "#3D3F3D", lineHeight: 1.5 }}>
                        Add Organization schema to your homepage &lt;head&gt; so AI systems know your business name, phone, and location.
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-fg)", fontFamily: "var(--font-sans)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(242,238,227,0.9)", backdropFilter: "blur(12px)" }}
      >
        <SurvenLogo size="md" />
        <motion.a
          href="#"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--color-primary)" }}
          title="Coming soon to the Chrome Web Store"
        >
          <Globe size={14} />
          Add to Chrome
        </motion.a>
      </nav>

      {/* Hero — fills remaining viewport */}
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-fg-muted)" }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--color-primary)" }}
              />
              Chrome Extension · Coming Soon
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.25rem, 4vw, 3.75rem)",
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              See exactly what's stopping AI from recommending you
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 text-lg leading-relaxed"
              style={{ color: "var(--color-fg-muted)", maxWidth: "480px" }}
            >
              Surven Auditor crawls up to 100 pages of any website and surfaces the exact GEO issues
              preventing AI from recommending that business.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex items-center gap-4 flex-wrap"
            >
              <motion.a
                href="#"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white"
                style={{
                  background: "var(--color-primary)",
                  boxShadow: "0 4px 20px rgba(150,162,131,0.4)",
                }}
                title="Coming soon to the Chrome Web Store"
              >
                <Globe size={17} />
                Add to Chrome
              </motion.a>
              <span className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
                Chrome Web Store · launching soon
              </span>
            </motion.div>

            {/* Micro stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-10 flex items-center gap-8"
            >
              {[
                { icon: AlertCircle, label: "8 GEO checks" },
                { icon: FileText,    label: "100 pages crawled" },
                { icon: Clock,       label: "~30s per audit" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-fg-muted)" }}>
                  <Icon size={14} style={{ color: "var(--color-primary)" }} />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: browser mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <BrowserMockup />
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <footer
        className="px-8 py-5 text-sm flex items-center justify-between"
        style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-fg-muted)" }}
      >
        <SurvenLogo size="sm" />
        <span>Generative Engine Optimization</span>
      </footer>
    </div>
  );
}
