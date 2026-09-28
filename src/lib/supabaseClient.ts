import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = "https://xeheuscrttrbfnojwwqt.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Single instance for the entire browser context
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Backwards compatibility for existing code that uses the getter
export function getSupabaseBrowserClient() {
  return supabase;
}

export default supabase;
