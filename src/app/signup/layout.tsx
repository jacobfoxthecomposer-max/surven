import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://surven.vercel.app/signup",
  },
  openGraph: { url: "https://surven.vercel.app/signup", type: "website" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
