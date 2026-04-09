import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Only use in server-side routes.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
