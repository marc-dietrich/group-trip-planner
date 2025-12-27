import { createClient, type Session, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY;

export const supabaseEnabled = Boolean(supabaseUrl && supabasePublicKey);

if (!supabaseUrl || !supabasePublicKey) {
  console.warn("Supabase URL or public key missing; auth will be disabled.");
}

export const supabase = createClient(
  supabaseUrl || "http://localhost:54321", // fallback to avoid runtime crash when unset
  supabasePublicKey || "public-anon-key",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
},
);

const TOKEN_STORAGE_KEY = "gtp.auth.jwt";

export function persistJwt(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session?.access_token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getStoredJwt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getUserDisplayName(user: User | null): string | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return metadata.full_name || metadata.name || user.email || null;
}

export async function getExistingSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  persistJwt(data.session ?? null);
  return data.session ?? null;
}

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = window.location.origin;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}
