import { createClient } from '@supabase/supabase-js';

// Log environment variables for debugging (Vite only exposes VITE_ prefixed variables)
// This will help identify if variables are missing in the browser console
console.log('Environment variables check:', {
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  env: import.meta.env
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL ERROR: Missing Supabase Environment Variables!");
  console.error("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel Settings.");
}

console.log("INITIALIZING SUPABASE CLIENT");
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
