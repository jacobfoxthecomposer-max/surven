import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";


import type { Metadata } from "next";
export const metadata: Metadata = {
  openGraph: { url: "https://surven.vercel.app/login", type: "website" },

  alternates: {
    canonical: "https://surven.vercel.app/login",
  },

  title: "Login to Your Surven Account | The Hidden Still",
};
const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

export default function LoginPage() {
  if (SUPABASE_UNCONFIGURED) {
    redirect("/dashboard");
  }
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
