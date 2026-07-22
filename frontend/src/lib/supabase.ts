import { createClient } from "@supabase/supabase-js";

/**
 * Reusable Supabase client for the frontend.
 *
 * Reads credentials from Vite environment variables:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * Usage anywhere in the app:
 *   import { supabase } from "@/lib/supabase";
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * Configured Supabase client instance.
 *
 * Using the anon (public) key is safe for client-side code –
 * Row Level Security (RLS) policies on Supabase protect your data.
 *
 * If env vars are missing, the client is created with empty strings.
 * The app will still render but auth features will not work until
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.
 */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
);
