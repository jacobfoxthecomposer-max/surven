import { LandingNav } from "@/features/landing/sections/LandingNav";
import { HeroBackground } from "@/features/landing/sections/HeroBackground";
import { HeroSection } from "@/features/landing/sections/HeroSection";
import { ShaderSection } from "@/features/landing/sections/ShaderSection";
import { FeaturesSection } from "@/features/landing/sections/FeaturesSection";
import { ValuePropsSection } from "@/features/landing/sections/ValuePropsSection";
import { HowItWorksSection } from "@/features/landing/sections/HowItWorksSection";
import { StatsSection } from "@/features/landing/sections/StatsSection";
import { CtaSection } from "@/features/landing/sections/CtaSection";
import { Footer } from "@/features/landing/sections/Footer";

export default function LandingPage() {
  return (
    <>
      {/* Fixed parallax background — stays in place while hero is visible, covered by sections below */}
      <HeroBackground />

      <LandingNav />

      {/* Hero sits over the fixed background (transparent section) */}
      <HeroSection />

      {/* All content below hero has opaque bg to cover the fixed layer as it scrolls up */}
      <div className="relative z-10 bg-[#0f172a]">
        <ShaderSection />
        <FeaturesSection />
        <ValuePropsSection />
        <HowItWorksSection />
        <StatsSection />
        <CtaSection />
        <Footer />
      </div>
    </>
  );
}
