import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://surven.vercel.app/dashboard",
  },
  openGraph: { url: "https://surven.vercel.app/dashboard", type: "website" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
