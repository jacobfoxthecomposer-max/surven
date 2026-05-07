import { LandingNav } from "@/features/landing/sections/LandingNav";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { ProductPreviewSection } from "@/features/landing/sections/ProductPreviewSection";
import { FeaturesSection } from "@/features/landing/sections/FeaturesSection";
import { ValuePropsSection } from "@/features/landing/sections/ValuePropsSection";
import { HowItWorksSection } from "@/features/landing/sections/HowItWorksSection";
import { PricingSection } from "@/features/landing/sections/PricingSection";
import { StatsSection } from "@/features/landing/sections/StatsSection";
import { FaqSection } from "@/features/landing/sections/FaqSection";
import { CtaSection } from "@/features/landing/sections/CtaSection";
import { Footer } from "@/features/landing/sections/Footer";


import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Surven — Track Your Visibility Across ChatGPT, Claude, Gemini & Google AI",
  description:
    "Surven shows you how often AI engines recommend your business — and where you're losing visibility to competitors. Run your first scan in 60 seconds.",
  alternates: {
    canonical: "https://surven.ai/",
  },
  openGraph: {
    url: "https://surven.ai/",
    type: "website",
    siteName: "Surven",
    title: "Surven — Track Your Visibility Across ChatGPT, Claude, Gemini & Google AI",
    description:
      "Surven shows you how often AI engines recommend your business — and where you're losing visibility to competitors. Run your first scan in 60 seconds.",
    images: [
      {
        url: "https://surven.ai/surven-logo.png",
        width: 1200,
        height: 630,
        alt: "Surven — AI Visibility Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Surven — Track Your Visibility Across ChatGPT, Claude, Gemini & Google AI",
    description:
      "See how often AI engines recommend your business — and where you're losing to competitors. First scan in 60 seconds.",
    images: ["https://surven.ai/surven-logo.png"],
  },
};
export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <ProductPreviewSection />
      <FeaturesSection />
      <ValuePropsSection />
      <HowItWorksSection />
      <StatsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </>
  );
}
