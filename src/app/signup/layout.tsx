import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://surven.ai/signup",
  },
  openGraph: { url: "https://surven.ai/signup", type: "website" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
