"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Globe, ChevronDown, Search, Settings, AlertCircle, Clock, FileText, X } from "lucide-react";
import { SurvenLogo } from "@/components/atoms/SurvenLogo";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_FINDINGS = [
  {
    id: "org_schema",
    title: "Organization Schema Missing",
    severity: "critical" as const,
    fixTime: 30,
    impact: 8,
    whatIsIt: "Schema markup is invisible code added to your website's <head> that acts like a structured business card only AI and search engines can read. Organization schema tells AI systems your business name, website URL, phone number, logo, and service area — in a format they can understand without guessing.",
    whyItMatters: "Organization schema tells AI systems exactly who your business is. Without it, ChatGPT, Gemini, and Google AI have to guess your business identity from visible text alone — which often leads to mistakes or omissions. Pages with clear Organization schema are more likely to be cited with the correct business name, phone, and address.",
    howToFix: "Add Organization schema to your homepage <head>. Minimum required fields: name, url, and contact (phone or email). Bonus fields: logo, areaServed, foundingDate.\n\nShould take 15–30 minutes.",
  },
  {
    id: "content_freshness",
    title: "Content Not Recently Updated",
    severity: "high" as const,
    fixTime: 15,
    impact: 7,
    whatIsIt: "Content freshness is how AI systems determine whether your website's information is current. They check a hidden signal called the Last-Modified date — a timestamp set by your website that tells crawlers when the page was last updated.",
    whyItMatters: "Pages that haven't been updated in months get deprioritized because AI assumes your hours, prices, or services may have changed. AI actively surfaces content updated in the last 3 months.",
    howToFix: "Update at least one page on your site every 4–6 weeks. Even small changes to hours, team info, or adding a new FAQ question resets the freshness clock.\n\nShould take 10–15 minutes.",
  },
  {
    id: "meta_desc",
    title: "Meta Description Too Short",
    severity: "medium" as const,
    fixTime: 10,
    impact: 6,
    whatIsIt: "The meta description is a 1–2 sentence summary of your page that lives in the <head> of your website's code — invisible to visitors but read by search engines and AI. It's the grey description text that appears under your business name in Google search results.",
    whyItMatters: "A strong meta description helps AI systems understand and summarize what your business does. Short or missing descriptions leave AI to guess — and the guesses are often wrong.",
    howToFix: "Write a 140–160 character meta description that includes your business type, location, and primary service. Example: \"Family-owned Italian restaurant in Austin, TX. Fresh pasta, wood-fired pizza, and private dining. Open daily 11am–10pm.\"\n\nShould take 10 minutes.",
  },
  {
    id: "faq_schema",
    title: "FAQ Schema Missing",
    severity: "high" as const,
    fixTime: 45,
    impact: 7,
    whatIsIt: "FAQPage schema is invisible code that marks up your Q&A content so AI systems can read it as a structured list of questions and answers. Without it, AI has to guess which text on your page is a question and which is an answer.",
    whyItMatters: "AI systems love structured Q&A content. FAQPage schema makes your content directly extractable as answer sources. Pages with FAQ schema are cited significantly more often in AI responses.",
    howToFix: "Add FAQPage schema to any page that has questions and answers. Minimum 5 Q&A pairs for AI to treat the page as a real FAQ source.\n\nShould take 30–45 minutes.",
  },
];

const SEVERITY: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#FEE2E2", text: "#B54631", border: "#F9A8A0" },
  high:     { bg: "#FEF3C7", text: "#C97B45", border: "#FDE68A" },
  medium:   { bg: "#F0FDF4", text: "#5E8A4E", border: "#BBF7D0" },
};

// ─── Hero animation variants (21st.dev stagger pattern) ───────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// ─── Interactive extension panel ──────────────────────────────────────────────

function ExtensionPanel({ onFirstInteract }: { onFirstInteract: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whatIsItId, setWhatIsItId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#F2EEE3" }}
    >
      {/* Header */}
      <div style={{ padding: "14px", borderBottom: "1px solid #C8C2B4", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1A1C1A" }}>
            <span style={{ color: "#96A283" }}>Sur</span>ven Auditor
          </span>
          <Settings size={14} style={{ color: "#6B6D6B", cursor: "pointer" }} />
        </div>
        <button
          style={{
            width: "100%", padding: "9px 12px", background: "#96A283", color: "white",
            border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer",
          }}
        >
          <Search size={13} />
          Run Audit
        </button>
      </div>

      {/* Summary */}
      <div style={{ padding: "8px 14px 10px", borderBottom: "1px solid #E5DFCF", flexShrink: 0 }}>
        <div style={{ fontSize: "12px", color: "#1A1C1A" }}>
          <strong>4</strong> issues found
          <span style={{ color: "#B54631", marginLeft: "10px" }}>• 1 critical</span>
          <span style={{ color: "#C97B45", marginLeft: "8px" }}>• 2 high</span>
        </div>
        <div style={{ fontSize: "11px", color: "#6B6D6B", marginTop: "2px" }}>12 pages crawled</div>
      </div>

      {/* Clear highlights button */}
      {highlightedId && (
        <div style={{ padding: "8px 14px 0", flexShrink: 0 }}>
          <button
            onClick={() => setHighlightedId(null)}
            style={{
              width: "100%", padding: "7px 10px", background: "#EDE8DC",
              border: "1px solid #C8C2B4", borderRadius: "4px", fontSize: "12px",
              cursor: "pointer", color: "#1A1C1A", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "6px",
            }}
          >
            <X size={12} /> Clear Highlights
          </button>
        </div>
      )}

      {/* Findings list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {MOCK_FINDINGS.map((finding) => {
            const s = SEVERITY[finding.severity];
            const isExpanded = expandedId === finding.id;
            const showWhatIsIt = whatIsItId === finding.id;
            const isHighlighted = highlightedId === finding.id;

            return (
              <div key={finding.id} style={{ border: `1px solid ${s.border}`, borderRadius: "6px", overflow: "hidden" }}>
                {/* Card header — clickable */}
                <button
                  onClick={() => { onFirstInteract(); setExpandedId(isExpanded ? null : finding.id); }}
                  style={{
                    width: "100%", padding: "10px 12px", background: s.bg, border: "none",
                    textAlign: "left", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: s.text, marginBottom: "3px", lineHeight: 1.3 }}>
                      {finding.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6B6D6B" }}>
                      Fix time: {finding.fixTime} min · Impact: {finding.impact}/10
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    style={{
                      color: s.text, marginLeft: "8px", flexShrink: 0,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div style={{ padding: "10px 12px", background: "#E5DFCF", borderTop: `1px solid ${s.border}` }}>

                    {/* What is this? */}
                    <div style={{ marginBottom: "10px" }}>
                      <button
                        onClick={() => setWhatIsItId(showWhatIsIt ? null : finding.id)}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: "4px",
                          fontSize: "11px", fontWeight: 600, color: "#6B6D6B",
                          marginBottom: showWhatIsIt ? "6px" : 0,
                        }}
                      >
                        <ChevronDown
                          size={11}
                          style={{ transform: showWhatIsIt ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                        />
                        What is this?
                      </button>
                      {showWhatIsIt && (
                        <p style={{ fontSize: "11px", color: "#3D3F3D", lineHeight: 1.6, background: "#EDE8DC", padding: "8px 10px", borderRadius: "4px" }}>
                          {finding.whatIsIt}
                        </p>
                      )}
                    </div>

                    {/* Why it matters */}
                    <div style={{ marginBottom: "10px" }}>
                      <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#1A1C1A", marginBottom: "4px" }}>Why it matters</h4>
                      <p style={{ fontSize: "11px", color: "#3D3F3D", lineHeight: 1.6 }}>{finding.whyItMatters}</p>
                    </div>

                    {/* How to fix */}
                    <div style={{ marginBottom: "10px" }}>
                      <h4 style={{ fontSize: "11px", fontWeight: 600, color: "#1A1C1A", marginBottom: "4px" }}>How to fix</h4>
                      <p style={{ fontSize: "11px", color: "#3D3F3D", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{finding.howToFix}</p>
                    </div>

                    {/* Highlight button */}
                    <button
                      onClick={() => setHighlightedId(isHighlighted ? null : finding.id)}
                      style={{
                        width: "100%", padding: "8px 10px",
                        background: isHighlighted ? "#E5E7EB" : s.text,
                        color: isHighlighted ? "#6B6D6B" : "white",
                        border: "none", borderRadius: "4px", fontSize: "12px",
                        fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      {isHighlighted ? "Highlighting on page" : "Highlight on page"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Browser mockup ───────────────────────────────────────────────────────────

function BrowserMockup() {
  const [hintDismissed, setHintDismissed] = useState(false);

  return (
    <div className="relative w-full">
      {/* Floating annotation — fades away on first card click */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: hintDismissed ? 0 : 1, x: hintDismissed ? 14 : 0 }}
        transition={{ opacity: { duration: 0.4, delay: hintDismissed ? 0 : 2 }, x: { duration: 0.4, delay: hintDismissed ? 0 : 2 } }}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+8px)] flex items-center gap-2 pointer-events-none z-10"
        style={{ width: 90 }}
      >
        {/* Curved arrow pointing left */}
        <svg width="36" height="48" viewBox="0 0 36 48" fill="none" style={{ flexShrink: 0 }}>
          <path
            d="M 30 4 C 32 20, 8 28, 6 44"
            stroke="#96A283"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 2 40 L 6 44 L 11 40"
            stroke="#96A283"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "13px",
            color: "#96A283",
            lineHeight: 1.3,
            marginTop: "-8px",
          }}
        >
          click to explore
        </span>
      </motion.div>

    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--color-border)", boxShadow: "0 24px 60px rgba(26,28,26,0.14)" }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: "#E8E2D5", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div
          className="flex-1 mx-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
          style={{ background: "#F2EEE3", color: "#6B6D6B", border: "1px solid var(--color-border)" }}
        >
          <Globe size={11} />
          surven.ai
        </div>
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }}
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: "#96A283", cursor: "pointer" }}
          title="Surven Auditor"
        >
          <Search size={11} color="white" />
        </motion.div>
      </div>

      {/* Page + panel */}
      <div className="flex" style={{ height: "540px" }}>

        {/* Fake webpage skeleton */}
        <div className="flex-1 p-6 overflow-hidden" style={{ background: "#FAFAF8" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="w-24 h-4 rounded" style={{ background: "#D1CBC0" }} />
            <div className="flex gap-3">
              {[48, 36, 44].map((w, i) => (
                <div key={i} className="h-3 rounded" style={{ width: w, background: "#E0DAD0" }} />
              ))}
            </div>
          </div>
          <div className="mb-6">
            <div className="w-3/4 h-7 rounded mb-2" style={{ background: "#C8C2B4" }} />
            <div className="w-1/2 h-7 rounded mb-4" style={{ background: "#C8C2B4" }} />
            <div className="w-full h-3 rounded mb-2" style={{ background: "#E0DAD0" }} />
            <div className="w-5/6 h-3 rounded mb-4" style={{ background: "#E0DAD0" }} />
            <div className="w-28 h-9 rounded-lg" style={{ background: "#96A283" }} />
          </div>
          <div className="w-full h-32 rounded-xl mb-4" style={{ background: "#DDD7CB" }} />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg" style={{ background: "#E5DFCF" }} />
            ))}
          </div>
        </div>

        {/* Extension side panel — slides in */}
        <motion.div
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.65, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: 300, borderLeft: "1px solid #C8C2B4", flexShrink: 0 }}
        >
          <ExtensionPanel onFirstInteract={() => setHintDismissed(true)} />
        </motion.div>
      </div>
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

      {/* Hero */}
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — staggered animation from 21st.dev pattern */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-fg-muted)" }}
            >
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-primary)" }} />
              Chrome Extension · Coming Soon
            </motion.div>

            <motion.h1
              variants={itemVariants}
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
              variants={itemVariants}
              className="mt-5 text-lg leading-relaxed"
              style={{ color: "var(--color-fg-muted)", maxWidth: "480px" }}
            >
              Surven Auditor crawls up to 100 pages of any website and surfaces the exact GEO issues
              preventing AI from recommending that business.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8 flex items-center gap-4 flex-wrap">
              <motion.a
                href="#"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white"
                style={{ background: "var(--color-primary)", boxShadow: "0 4px 20px rgba(150,162,131,0.4)" }}
                title="Coming soon to the Chrome Web Store"
              >
                <Globe size={17} />
                Add to Chrome
              </motion.a>
              <span className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
                Chrome Web Store · launching soon
              </span>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10 flex items-center gap-8">
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
          </motion.div>

          {/* Right — browser mockup */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
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
