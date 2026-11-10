import { createDemoServices } from './demo';
import { createApiPlanner } from './api';
import { supabase } from './supabase-client';
import { createSupabaseAuthService } from './supabase-auth';
import { createSupabaseTripsService } from './supabase-trips';
import type { Services } from '../models/contracts';

export function createServices(mode: 'demo' | 'api' = 'demo', baseUrl = ''): Services {
  const services = createDemoServices();

  if (mode === 'api') {
    services.mode = 'api';
    services.planner = createApiPlanner(baseUrl);
    if (typeof window !== 'undefined') {
      console.info('[AIKA Services] Initialized in API mode (connected to live backend routes).');
    }
  } else {
    services.mode = 'demo';
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      console.info('[AIKA Services] Initialized in DEMO mode (client-side calculations). Set NEXT_PUBLIC_SERVICE_MODE=api in Vercel to connect live backend routes.');
    }
  }

  if (supabase) {
    services.auth = createSupabaseAuthService(supabase);
    services.trips = createSupabaseTripsService(supabase);
  }

  return services;
}
