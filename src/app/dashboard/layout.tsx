import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://surven.ai/dashboard",
  },
  openGraph: { url: "https://surven.ai/dashboard", type: "website" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
