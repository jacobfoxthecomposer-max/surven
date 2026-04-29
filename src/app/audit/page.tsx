"use client";

import { motion } from "framer-motion";
import {
  Download,
  ScanSearch,
  Wrench,
  FileCode2,
  MapPin,
  HelpCircle,
  Clock,
  Tag,
  Star,
  Link2,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { GooeyText } from "@/components/ui/gooey-text-morphing";

// ─── Data ────────────────────────────────────────────────────────────────────

const MORPHING_TEXTS = [
  "Missing Schema",
  "Stale Content",
  "Weak Credentials",
  "No FAQ Markup",
  "Bad Meta Tags",
  "Citation Gaps",
  "Generic Title Tags",
  "Low E-E-A-T",
];

const AUDIT_FEATURES = [
  {
    icon: FileCode2,
    title: "Organization Schema",
    description: "Checks for structured business data that tells AI your name, phone, and service area.",
    severity: "critical",
    time: "30 min fix",
    impact: 8,
  },
  {
    icon: MapPin,
    title: "LocalBusiness Schema",
    description: "Validates location-specific markup so AI can confidently connect you to a place.",
    severity: "critical",
    time: "20 min fix",
    impact: 9,
  },
  {
    icon: HelpCircle,
    title: "FAQ Schema",
    description: "Detects missing or thin Q&A markup that AI uses as a structured answer source.",
    severity: "high",
    time: "45 min fix",
    impact: 7,
  },
  {
    icon: Clock,
    title: "Content Freshness",
    description: "Flags pages that haven't been updated in 90+ days — AI deprioritizes stale content.",
    severity: "high",
    time: "15 min fix",
    impact: 7,
  },
  {
    icon: Tag,
    title: "Meta Description",
    description: "Catches missing, too-short, or too-long descriptions that guide AI summarization.",
    severity: "medium",
    time: "10 min fix",
    impact: 6,
  },
  {
    icon: Star,
    title: "Credentials & E-E-A-T",
    description: "Scans for proof signals — years in business, licenses, awards, reviews.",
    severity: "high",
    time: "60 min fix",
    impact: 8,
  },
  {
    icon: Link2,
    title: "Citation Consistency",
    description: "Checks that your NAP data (name, address, phone) matches across sources.",
    severity: "medium",
    time: "30 min fix",
    impact: 6,
  },
  {
    icon: ScanSearch,
    title: "Title Tag Quality",
    description: "Flags generic, missing, or oversized titles — the first thing AI reads about you.",
    severity: "medium",
    time: "10 min fix",
    impact: 5,
  },
];

const SEVERITY_STYLES: Record<string, { dot: string; badge: string }> = {
  critical: { dot: "bg-[#B54631]", badge: "bg-[#FEE2E2] text-[#B54631]" },
  high:     { dot: "bg-[#C97B45]", badge: "bg-[#FEF3C7] text-[#C97B45]" },
  medium:   { dot: "bg-[#96A283]", badge: "bg-[#F0FDF4] text-[#6B8F5C]" },
};

const STEPS = [
  {
    number: "01",
    icon: Download,
    title: "Add to Chrome",
    description: "Install the Surven Auditor extension from the Chrome Web Store in one click.",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Open any website",
    description: "Navigate to any client site. Click the Surven icon and the audit runs automatically.",
  },
  {
    number: "03",
    icon: Wrench,
    title: "Fix what matters",
    description: "Every finding includes a plain-English explanation and an exact time estimate to fix.",
  },
];

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-bg)", color: "var(--color-fg)", fontFamily: "var(--font-sans)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md"
        style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(242,238,227,0.85)" }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600 }}>
          Surven
        </span>
        <motion.a
          href="#"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-not-allowed"
          style={{ background: "var(--color-primary)" }}
          title="Coming soon — not yet on the Chrome Web Store"
        >
          <Globe size={15} />
          Add to Chrome
        </motion.a>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
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
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 600, lineHeight: 1.1 }}
        >
          See exactly what's stopping
          <br />
          AI from recommending you
        </motion.h1>

        {/* Gooey morphing text */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
          className="relative h-20 mt-4 flex items-center justify-center overflow-hidden"
        >
          <GooeyText
            texts={MORPHING_TEXTS}
            morphTime={1.2}
            cooldownTime={2}
            className="relative"
            textClassName="absolute select-none text-center font-semibold text-[clamp(1.5rem,4vw,2.5rem)]"
            textStyle={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}
          />
        </motion.div>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed"
          style={{ color: "var(--color-fg-muted)" }}
        >
          Surven Auditor is a Chrome extension that crawls up to 100 pages of any website
          and surfaces the exact GEO issues preventing AI systems from recommending that business.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={4}
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white cursor-not-allowed"
            style={{ background: "var(--color-primary)", boxShadow: "0 4px 14px rgba(150,162,131,0.35)" }}
            title="Coming soon"
          >
            <Globe size={18} />
            Add to Chrome — Free
          </motion.a>
          <span className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
            Chrome Web Store launch coming soon
          </span>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={5}
          variants={fadeUp}
          className="mt-14 flex items-center justify-center gap-10 flex-wrap"
        >
          {[
            { value: "8", label: "GEO checks" },
            { value: "100", label: "pages crawled" },
            { value: "~30s", label: "per audit" },
            { value: "Free", label: "to use" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 600, color: "var(--color-fg)" }}
              >
                {stat.value}
              </div>
              <div className="text-sm" style={{ color: "var(--color-fg-muted)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section
        className="py-20"
        style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 600 }}
            >
              How it works
            </h2>
            <p className="mt-2 text-base" style={{ color: "var(--color-fg-muted)" }}>
              From install to insight in under a minute.
            </p>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector line (desktop only) */}
            <div
              className="hidden md:block absolute top-10 left-[calc(16.5%+1.5rem)] right-[calc(16.5%+1.5rem)] h-px"
              style={{ background: "var(--color-border)" }}
            />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="flex flex-col items-center text-center gap-4"
              >
                <div
                  className="relative z-10 flex items-center justify-center w-20 h-20 rounded-2xl"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  <step.icon size={28} style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--color-primary)" }}>
                    STEP {step.number}
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "var(--color-fg)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 600 }}
            >
              8 checks. Every audit.
            </h2>
            <p className="mt-2 text-base" style={{ color: "var(--color-fg-muted)" }}>
              Every finding includes a plain-English explanation, why it matters, and exactly how to fix it.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIT_FEATURES.map((feature, i) => {
              const styles = SEVERITY_STYLES[feature.severity];
              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i * 0.5}
                  variants={fadeUp}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="rounded-xl p-5 flex flex-col gap-3"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-lg"
                      style={{ background: "var(--color-surface-alt)" }}
                    >
                      <feature.icon size={18} style={{ color: "var(--color-primary)" }} />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}
                    >
                      {feature.severity}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-fg)" }}>
                      {feature.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-fg-muted)" }}>
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-xs" style={{ color: "var(--color-fg-muted)" }}>
                    <span>{feature.time}</span>
                    <span>Impact {feature.impact}/10</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What you get strip */}
      <section
        className="py-16"
        style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 600 }}
            >
              Built for GEO agencies
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Runs a full 100-page crawl — not just the homepage",
              "Highlights issues directly on the webpage",
              "Plain-English explanations for every finding",
              "24-hour result caching so scans stay fast",
              "Simple API key setup — no accounts for clients",
              "Works on any website, any industry",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.3}
                variants={fadeUp}
                className="flex items-start gap-3 text-sm"
                style={{ color: "var(--color-fg-secondary)" }}
              >
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-xl px-6 text-center"
        >
          <h2
            className="mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 600 }}
          >
            Coming to the Chrome Web Store
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--color-fg-muted)" }}>
            Surven Auditor is launching soon. Built by the team behind Surven — the AI visibility tracker for local businesses.
          </p>
          <motion.a
            href="/"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white"
            style={{ background: "var(--color-primary)", boxShadow: "0 4px 14px rgba(150,162,131,0.35)" }}
          >
            Track your AI visibility →
          </motion.a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center text-sm"
        style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-fg-muted)" }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--color-fg)" }}>
          Surven
        </span>{" "}
        · Generative Engine Optimization
      </footer>
    </div>
  );
}
