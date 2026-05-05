import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

// Local-dev stub: returns chainable no-ops so any `.from(...).select(...).eq(...).single()`
// pipeline resolves to `{ data: [], error: null }` instead of hitting the network.
// Returning `[]` (not `null`) means downstream `.map`/`.length` calls don't throw.
// Real fixtures live in the hooks (useAuth, useActiveBusiness, useUserProfile).
function makeStubClient(): SupabaseClient {
  // Single shared chain — every call returns the same object, no per-call allocation.
  const result = { data: [] as unknown[], error: null };
  const noop = () => chain;
  const chain: Record<string | symbol, unknown> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") {
          return (resolve: (v: typeof result) => unknown) => resolve(result);
        }
        return noop;
      },
    }
  );

  const auth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  };

  const fromOrRpc = () => chain;
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "auth") return auth;
        return fromOrRpc;
      },
    }
  ) as SupabaseClient;
}

export const supabase: SupabaseClient = SUPABASE_UNCONFIGURED
  ? makeStubClient()
  : createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
