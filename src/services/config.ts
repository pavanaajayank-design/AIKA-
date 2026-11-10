/** Public configuration only. Secret keys never belong in this module. */
export function readClientConfig(env: Record<string, string | boolean | undefined> = {}) {
    const procEnv = (typeof process !== 'undefined' && process.env ? process.env : {}) as Record<string, string | undefined>;
    const mode = (
        env.VITE_SERVICE_MODE ||
        procEnv.NEXT_PUBLIC_SERVICE_MODE ||
        procEnv.VITE_SERVICE_MODE
    ) === 'api' ? 'api' : 'demo';

    const rawBaseUrl =
        env.VITE_API_BASE_URL ||
        procEnv.NEXT_PUBLIC_API_BASE_URL ||
        procEnv.VITE_API_BASE_URL ||
        '';

    const baseUrl = typeof rawBaseUrl === 'string' ? rawBaseUrl : '';
    if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
        throw Error('VITE_API_BASE_URL must be empty or an HTTP(S) origin.');
    }

    return { mode, baseUrl } as const;
}
