/** Public configuration only. Secret keys never belong in this module. */
export function readClientConfig(env: Record<string, string | boolean | undefined> = {}) { const mode = env.VITE_SERVICE_MODE === 'api' ? 'api' : 'demo'; const baseUrl = typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : ''; if (baseUrl && !/^https?:\/\//.test(baseUrl))
    throw Error('VITE_API_BASE_URL must be empty or an HTTP(S) origin.'); return { mode, baseUrl } as const; }
