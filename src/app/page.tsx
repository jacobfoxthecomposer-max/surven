import { LandingNav } from "@/features/landing/sections/LandingNav";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { ValuePropsSection } from "@/features/landing/sections/ValuePropsSection";
import { HowItWorksSection } from "@/features/landing/sections/HowItWorksSection";
import { StatsSection } from "@/features/landing/sections/StatsSection";
import { CtaSection } from "@/features/landing/sections/CtaSection";
import { Footer } from "@/features/landing/sections/Footer";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <ValuePropsSection />
      <HowItWorksSection />
      <StatsSection />
      <CtaSection />
      <Footer />
    </>
  );
}
