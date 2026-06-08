import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Lipsesc variabilele NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

// Adaptor simplu pentru stocarea sesiunii în Cookie-uri în loc de localStorage
const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${key}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof document === "undefined") return;
    // Setăm cookie-ul cu SameSite=Lax și Secure pentru securitate sporită
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax; Secure`;
  },
  removeItem: (key: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  },
};

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-key",
  {
    auth: {
      storage: cookieStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
