import { LandingNav } from "@/features/landing/sections/LandingNav";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { FeaturesSection } from "@/features/landing/sections/FeaturesSection";
import { ValuePropsSection } from "@/features/landing/sections/ValuePropsSection";
import { HowItWorksSection } from "@/features/landing/sections/HowItWorksSection";
import { PricingSection } from "@/features/landing/sections/PricingSection";
import { StatsSection } from "@/features/landing/sections/StatsSection";
import { CtaSection } from "@/features/landing/sections/CtaSection";
import { Footer } from "@/features/landing/sections/Footer";


import type { Metadata } from "next";
export const metadata: Metadata = {
  alternates: {
    canonical: "https://surven.vercel.app/",
  },

  openGraph: { url: "https://surven.vercel.app/", type: "website" },

  title: "AI Visibility Tracking Features | Surven",

  description: "Track your AI visibility across multiple platforms with Surven's generative engine optimization tools. Sign up for free today.",
};
export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <ValuePropsSection />
      <HowItWorksSection />
      <PricingSection />
      <StatsSection />
      <CtaSection />
      <Footer />
    </>
  );
}
