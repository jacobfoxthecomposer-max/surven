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
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const SUPABASE_UNCONFIGURED =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

const UNCONFIGURED_MESSAGE =
  "Auth isn't configured for local dev. Use /prompts-preview to view the dashboard without signing in.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (SUPABASE_UNCONFIGURED) {
      setLoading(false);
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

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (SUPABASE_UNCONFIGURED) throw new Error(UNCONFIGURED_MESSAGE);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const { data: sessionData } = await supabase.auth.getSession();
    setSession(sessionData.session);
    setUser(sessionData.session?.user ?? null);
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (SUPABASE_UNCONFIGURED) throw new Error(UNCONFIGURED_MESSAGE);
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
    <AuthContext value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
