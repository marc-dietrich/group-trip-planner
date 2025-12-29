/// <reference types="vite/client" />

const DEFAULT_SUPABASE_URL = "https://fdlmelfgshydwrcbvryg.supabase.co";
const DEFAULT_SUPABASE_PUBLIC_KEY = "sb_publishable_iTlkCvERUbGMbm6qND9cJw_jv2O03N-";

// Public-only values; safe to commit and use in CI
export const supabaseEnv = {
  url: import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
  publicKey: import.meta.env.VITE_SUPABASE_PUBLIC_KEY ?? DEFAULT_SUPABASE_PUBLIC_KEY,
};

export const supabaseEnvProvided = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLIC_KEY,
);
