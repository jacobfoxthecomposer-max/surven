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
    "GitHub hosts jacobfoxthecomposer-max's Surven project in San Francisco, CA, offering JSON-LD schema for businesses to track AI visibility.",
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
          data-surven-schema-type="FAQPage"
          dangerouslySetInnerHTML={{ __html: `{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What does Surven track?","acceptedAnswer":{"@type":"Answer","text":"Surven tracks your visibility across AI models like ChatGPT, Claude, Gemini, and Google AI, showing you how often your business is recommended."}},{"@type":"Question","name":"How does Surven help improve AI visibility?","acceptedAnswer":{"@type":"Answer","text":"Surven provides a visibility score and identifies where you're missing out compared to competitors, helping you understand and improve your AI presence."}},{"@type":"Question","name":"Can I monitor my AI mentions over time with Surven?","acceptedAnswer":{"@type":"Answer","text":"Yes, Surven allows you to monitor your AI mentions over time and catch visibility changes as they happen."}},{"@type":"Question","name":"What is the visibility score provided by Surven?","acceptedAnswer":{"@type":"Answer","text":"The visibility score is a 0–100 score indicating how often AI recommends your business based on real consumer prompts."}},{"@type":"Question","name":"How do I start using Surven?","acceptedAnswer":{"@type":"Answer","text":"You can start using Surven by adding your business name, industry, and location, and then running a scan to see your results."}},{"@type":"Question","name":"Is there a free trial available for Surven?","acceptedAnswer":{"@type":"Answer","text":"Yes, Surven offers a 7-day free trial for every paid plan, with no credit card required to start."}},{"@type":"Question","name":"What types of analysis does Surven provide?","acceptedAnswer":{"@type":"Answer","text":"Surven provides sentiment analysis and citation gap analysis to reveal how AI talks about your brand."}},{"@type":"Question","name":"How often does Surven perform scans?","acceptedAnswer":{"@type":"Answer","text":"Surven offers automated weekly scans to notify you of significant shifts in your visibility score."}},{"@type":"Question","name":"Can I export the scan results from Surven?","acceptedAnswer":{"@type":"Answer","text":"Yes, you can download full scan results as CSV files for reports or further analysis."}}]}` }}
        />
        <script
          type="application/ld+json"
          data-surven-schema-type="LocalBusiness"
          dangerouslySetInnerHTML={{ __html: `{"@context":"https://schema.org","@type":"LocalBusiness","name":"The Curb Skate Shop","url":"https://thecurbct.com","image":"https://images.unsplash.com/photo-1610462257803-064c1273c681?ixid=M3wzOTE5Mjl8MHwxfHNlYXJjaHw4fHxza2F0ZWJvYXJkaW5nfGVufDB8fHx8MTY5NzY0MTA4NXww\u0026ixlib=rb-4.0.3\u0026auto=jpeg\u0026fit=crop\u0026w=1200\u0026h=630","description":"Welcome to The Curb Skate Shop, your local Connecticut skateboarding retail store. We offer a wide range of skateboarding equipment, hardware, clothing, and streetwear.","telephone":"1-860-245-8218","address":{"@type":"PostalAddress","streetAddress":"845 Main St","addressLocality":"Manchester","addressRegion":"CT","postalCode":"06040","addressCountry":"US"},"openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Wednesday"],"opens":"13:00","closes":"18:00"},{"@type":"OpeningHoursSpecification","dayOfWeek":["Thursday"],"opens":"13:00","closes":"18:00"},{"@type":"OpeningHoursSpecification","dayOfWeek":["Friday"],"opens":"13:00","closes":"18:00"},{"@type":"OpeningHoursSpecification","dayOfWeek":["Saturday"],"opens":"12:00","closes":"18:00"},{"@type":"OpeningHoursSpecification","dayOfWeek":["Sunday"],"opens":"12:00","closes":"16:00"}],"sameAs":["https://www.facebook.com/profile.php?id=100095093239398","https://www.instagram.com/thecurbct/"]}` }}
        />
        <script
          type="application/ld+json"
          data-surven-schema-type="Organization"
          dangerouslySetInnerHTML={{ __html: `{"@context":"https://schema.org","@type":"Organization","name":"Surven","url":"https://surven-8sxen36tj-jacobfoxthecomposer-6176s-projects.vercel.app","description":"Track your business visibility across ChatGPT, Claude, Gemini, Google AI, and more. See if AI is recommending your business."}` }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
