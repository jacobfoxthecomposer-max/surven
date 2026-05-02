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
          data-surven-schema-type="Organization"
          dangerouslySetInnerHTML={{ __html: `{"@context":"https://schema.org","@type":"Organization","name":"The Hidden Still","url":"https://surven-8sxen36tj-jacobfoxthecomposer-6176s-projects.vercel.app","description":"Track your business visibility across ChatGPT, Claude, Gemini, Google AI, and more. See if AI is recommending your business."}` }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
