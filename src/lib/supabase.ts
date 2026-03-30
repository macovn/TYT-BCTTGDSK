import { createClient } from '@supabase/supabase-js';

// Log environment variables for debugging (Vite only exposes VITE_ prefixed variables)
console.log('Environment variables:', import.meta.env);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase ENV: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined.");
}

console.log("USING SUPABASE");
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
