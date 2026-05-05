"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/services/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when local-dev placeholder Supabase env is detected. */
  unconfigured: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

const MOCK_USER = {
  id: "local-dev-user",
  email: "dev@surven.local",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [realUser, setRealUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!SUPABASE_UNCONFIGURED);
  // Always derive the exposed user from SUPABASE_UNCONFIGURED on every render.
  // This avoids HMR-stale state — even if a previous AuthProvider instance was created
  // with a different mock value, the next render uses the current module value.
  const user = SUPABASE_UNCONFIGURED ? MOCK_USER : realUser;
  const setUser = setRealUser;

  useEffect(() => {
    if (SUPABASE_UNCONFIGURED) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // "Remember me" support — when the user opted out at sign-in, sign them
    // out as soon as the tab closes. sessionStorage is per-tab, so the flag
    // disappears with the tab even when localStorage still holds the session.
    function handleBeforeUnload() {
      try {
        if (sessionStorage.getItem("surven.tempSession") === "1") {
          // Fire-and-forget — browser may not wait for the promise.
          supabase.auth.signOut();
        }
      } catch {
        // ignore (storage blocked)
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (SUPABASE_UNCONFIGURED) {
      setUser(MOCK_USER);
      return { user: MOCK_USER, session: null };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session);
    setUser(sessionData.session?.user ?? null);
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (SUPABASE_UNCONFIGURED) {
      setUser(MOCK_USER);
      return { user: MOCK_USER, session: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session);
    setUser(sessionData.session?.user ?? null);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (SUPABASE_UNCONFIGURED) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext value={{ user, session, loading, unconfigured: SUPABASE_UNCONFIGURED, signUp, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
