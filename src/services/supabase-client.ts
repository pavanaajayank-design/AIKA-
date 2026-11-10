import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 1. Direct literal reads for Next.js / Webpack (inlined by DefinePlugin):
let nextUrl: string | undefined;
let nextKey: string | undefined;
try {
    nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    nextKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
} catch {
    // Ignored when process is undefined
}

// 2. Direct literal reads for Vite (inlined at build time):
let viteUrl: string | undefined;
let viteKey: string | undefined;
try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        viteUrl = import.meta.env.VITE_SUPABASE_URL;
        viteKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    }
} catch {
    // Ignored when import.meta is undefined
}

const url = (nextUrl || viteUrl || '').trim();
const publishableKey = (nextKey || viteKey || '').trim();

/**
 * Browser-safe Supabase client used by the AuthService and TripsService adapters.
 * A missing public configuration leaves the current demo mode untouched.
 * Never references or exposes SUPABASE_SERVICE_ROLE_KEY.
 */
export const supabase: SupabaseClient | null =
    typeof window !== 'undefined' && url && publishableKey
        ? createClient(url, publishableKey)
        : null;
