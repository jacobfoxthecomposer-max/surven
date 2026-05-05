import { redirect } from "next/navigation";
import { SignupForm } from "./SignupForm";


import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sign Up for Surven AI Tracking | The Hidden Still",

  description: "Create a Surven account to start tracking your business's AI visibility quickly and easily.",
};
const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");


export default function SignUpPage() {
  if (SUPABASE_UNCONFIGURED) {
    redirect("/dashboard");
  }
  return <SignupForm />;
}
