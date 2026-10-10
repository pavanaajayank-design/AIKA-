import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

/**
 * Browser-safe Supabase client used by the AuthService adapter.
 * A missing public configuration leaves the current demo mode untouched.
 */
export const supabase: SupabaseClient | null =
  typeof window !== 'undefined' && url && publishableKey
    ? createClient(url, publishableKey)
    : null;
