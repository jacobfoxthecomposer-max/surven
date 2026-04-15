import type { Metadata } from "next";
import { Inter, Ovo } from "next/font/google";
import { Providers } from "@/components/layouts/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ovo = Ovo({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ovo",
});

export const metadata: Metadata = {
  title: "Surven — AI Visibility Tracker",
  description:
    "Track your business visibility across ChatGPT, Claude, Gemini, Google AI, and more. See if AI is recommending your business.",
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
    <html lang="en" className={`${inter.variable} ${ovo.variable} dark`}>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
