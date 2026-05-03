import { redirect } from "next/navigation";
import { SignupForm } from "./SignupForm";

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

export default function SignUpPage() {
  if (SUPABASE_UNCONFIGURED) {
    redirect("/dashboard");
  }
  return <SignupForm />;
}
