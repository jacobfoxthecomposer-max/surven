import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

export default function LoginPage() {
  if (SUPABASE_UNCONFIGURED) {
    redirect("/dashboard");
  }
  return <LoginForm />;
}
