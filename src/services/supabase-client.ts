import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined;
const procEnv = (typeof process !== 'undefined' && process.env ? process.env : undefined) as Record<string, string | undefined> | undefined;

const url = (
    metaEnv?.VITE_SUPABASE_URL ||
    procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    procEnv?.VITE_SUPABASE_URL ||
    ''
).trim();

const publishableKey = (
    metaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    procEnv?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    procEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
).trim();

/**
 * Browser-safe Supabase client used by the AuthService adapter.
 * A missing public configuration leaves the current demo mode untouched.
 */
export const supabase: SupabaseClient | null =
    typeof window !== 'undefined' && url && publishableKey
        ? createClient(url, publishableKey)
        : null;
