/** Public configuration only. Secret keys never belong in this module. */

export interface ClientConfig {
    readonly mode: 'demo' | 'api';
    readonly baseUrl: string;
}

export interface ClientDiagnostics {
    readonly mode: 'demo' | 'api';
    readonly baseUrl: string;
    readonly isProduction: boolean;
    readonly hasSupabaseConfig: boolean;
}

export function readClientConfig(envOverride?: Record<string, string | boolean | undefined>): ClientConfig {
    // 1. Direct literal read for Next.js / Webpack (DefinePlugin inlines these statically):
    let nextMode: string | undefined;
    let nextBaseUrl: string | undefined;
    try {
        nextMode = process.env.NEXT_PUBLIC_SERVICE_MODE;
        nextBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    } catch {
        // Ignored when process is undefined
    }

    // 2. Direct read for Vite (Vite inlines import.meta.env statically):
    let viteMode: string | undefined;
    let viteBaseUrl: string | undefined;
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            viteMode = import.meta.env.VITE_SERVICE_MODE;
            viteBaseUrl = import.meta.env.VITE_API_BASE_URL;
        }
    } catch {
        // Ignored when import.meta is undefined
    }

    // 3. Optional testing override (e.g. unit tests):
    const overrideMode = envOverride?.NEXT_PUBLIC_SERVICE_MODE ?? envOverride?.VITE_SERVICE_MODE;
    const overrideBaseUrl = envOverride?.NEXT_PUBLIC_API_BASE_URL ?? envOverride?.VITE_API_BASE_URL;

    const rawMode = String(overrideMode ?? nextMode ?? viteMode ?? '').trim().toLowerCase();
    const mode: 'demo' | 'api' = rawMode === 'api' ? 'api' : 'demo';

    const rawBaseUrl = String(overrideBaseUrl ?? nextBaseUrl ?? viteBaseUrl ?? '').trim();
    if (rawBaseUrl && !/^https?:\/\//.test(rawBaseUrl)) {
        throw Error('VITE_API_BASE_URL must be empty or an HTTP(S) origin.');
    }

    // 4. Production diagnostics and warnings (never silent fallback in production)
    const isProduction = process.env.NODE_ENV === 'production';
    if (typeof window !== 'undefined' && isProduction) {
        if (mode === 'demo') {
            if (rawMode && rawMode !== 'demo') {
                console.warn(`[AIKA Configuration Warning] Invalid SERVICE_MODE "${rawMode}". Expected "api" or "demo". Falling back to demo mode.`);
            } else if (!rawMode) {
                console.warn('[AIKA Configuration Notice] NEXT_PUBLIC_SERVICE_MODE is not set to "api". AIKA is operating in client-side demo mode. Configure NEXT_PUBLIC_SERVICE_MODE=api in Vercel to connect real backend API routes.');
            }
        }
    }

    return { mode, baseUrl: rawBaseUrl };
}

/**
 * Returns safe diagnostic information about the runtime client configuration.
 * Does NOT contain or expose any secret tokens or API keys.
 */
export function getClientDiagnostics(): ClientDiagnostics {
    const config = readClientConfig();
    const isProduction = process.env.NODE_ENV === 'production';

    let hasSupabase = false;
    try {
        hasSupabase = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL ||
            (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
        );
    } catch {
        // Ignored
    }

    const diagnostics: ClientDiagnostics = {
        mode: config.mode,
        baseUrl: config.baseUrl,
        isProduction,
        hasSupabaseConfig: hasSupabase,
    };

    if (typeof window !== 'undefined') {
        (window as unknown as { __AIKA_DIAGNOSTICS__?: ClientDiagnostics }).__AIKA_DIAGNOSTICS__ = diagnostics;
    }

    return diagnostics;
}
