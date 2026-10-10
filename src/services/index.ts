import { createDemoServices } from './demo';
import { createApiPlanner } from './api';
import { supabase } from './supabase-client';
import { createSupabaseAuthService } from './supabase-auth';
export function createServices(mode: 'demo' | 'api' = 'demo', baseUrl = '') { const services = createDemoServices(); if (mode === 'api') {
    services.mode = 'api';
    services.planner = createApiPlanner(baseUrl);
} if (supabase) services.auth = createSupabaseAuthService(supabase); return services; }
