import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only initialise Supabase when both credentials are present and look valid.
// An invalid URL passed to createClient throws at module-load time and crashes
// the entire React tree before any component renders (blank screen).

const isValidConfig = (url, key) => {
  return url && key && !url.includes("<") && !key.includes("<");
};

function createSupabaseClient() {
  if (!isValidConfig(supabaseUrl, supabaseAnonKey)) {
    console.warn(
      "Supabase config is missing or invalid. Authentication features will be compromised/disabled."
    );
    return null; // Supabase not configured — image uploads will be unavailable.
  }

  try {
    // Validate the URL before passing it to createClient.
    new URL(supabaseUrl);
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    console.warn(
      "[Supabase] Invalid Supabase URL:",
      supabaseUrl,
      "— file uploads disabled."
    );
    return null;
  }
}

export const supabase = createSupabaseClient();

export function getSupabaseBucket() {
  return import.meta.env.VITE_SUPABASE_BUCKET || "server-icons";
}
