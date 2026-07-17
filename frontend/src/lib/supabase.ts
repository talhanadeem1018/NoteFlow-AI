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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Configured Supabase client instance.
 *
 * Using the anon (public) key is safe for client-side code –
 * Row Level Security (RLS) policies on Supabase protect your data.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
