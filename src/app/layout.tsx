import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Providers } from "@/components/layouts/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Surven — AI Visibility Tracker",
  description:
    "Surven tracks your visibility across ChatGPT, Claude, Gemini, and Google AI. See how often AI engines recommend your business — and where you're losing visibility to competitors.",
  keywords: [
    "AI visibility",
    "GEO",
    "generative engine optimization",
    "ChatGPT",
    "Claude",
    "Gemini",
    "Google AI",
    "Google AI Overview",
  ],
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Surven",
  alternateName: "Surven GEO",
  url: "https://surven.ai",
  logo: "https://surven.ai/surven-logo.png",
  description:
    "Surven is a generative engine optimization (GEO) agency and platform that tracks how often ChatGPT, Claude, Gemini, and Google AI recommend your business — and helps you improve your AI visibility.",
  slogan: "Track your visibility across every major AI engine.",
  areaServed: "Worldwide",
  knowsAbout: [
    "Generative Engine Optimization",
    "AI Visibility",
    "ChatGPT optimization",
    "Claude optimization",
    "Gemini optimization",
    "Google AI Overview optimization",
    "Citation analysis",
    "Brand sentiment in AI",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: "https://surven.ai/contact",
    availableLanguage: ["English"],
  },
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Surven",
  url: "https://surven.ai",
  description:
    "Track your AI visibility across ChatGPT, Claude, Gemini, and Google AI.",
  publisher: {
    "@type": "Organization",
    name: "Surven",
    url: "https://surven.ai",
  },
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does Surven track?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Surven tracks your visibility across ChatGPT, Claude, Gemini, and Google AI, showing you how often your business is recommended.",
      },
    },
    {
      "@type": "Question",
      name: "How does Surven help improve AI visibility?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Surven provides a visibility score and identifies where you're missing out compared to competitors, helping you understand and improve your AI presence.",
      },
    },
    {
      "@type": "Question",
      name: "Can I monitor my AI mentions over time with Surven?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Surven allows you to monitor your AI mentions over time and catch visibility changes as they happen.",
      },
    },
    {
      "@type": "Question",
      name: "What is the visibility score provided by Surven?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The visibility score is a 0–100 score indicating how often AI recommends your business based on real consumer prompts.",
      },
    },
    {
      "@type": "Question",
      name: "How do I start using Surven?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can start using Surven by adding your business name, industry, and location, and then running a scan to see your results.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial available for Surven?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Surven offers a 7-day free trial for every paid plan, with no credit card required to start.",
      },
    },
    {
      "@type": "Question",
      name: "What types of analysis does Surven provide?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Surven provides sentiment analysis and citation gap analysis to reveal how AI talks about your brand.",
      },
    },
    {
      "@type": "Question",
      name: "How often does Surven perform scans?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Surven offers automated weekly scans to notify you of significant shifts in your visibility score.",
      },
    },
    {
      "@type": "Question",
      name: "Can I export the scan results from Surven?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you can download full scan results as CSV files for reports or further analysis.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] font-sans antialiased">
        <script
          type="application/ld+json"
          data-surven-schema-type="Organization"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        <script
          type="application/ld+json"
          data-surven-schema-type="WebSite"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
        />
        <script
          type="application/ld+json"
          data-surven-schema-type="FAQPage"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
