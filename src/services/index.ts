import { createDemoServices } from './demo';
import { createApiPlanner } from './api';
import { supabase } from './supabase-client';
import { createSupabaseAuthService } from './supabase-auth';
import { createSupabaseTripsService } from './supabase-trips';

export function createServices(mode: 'demo' | 'api' = 'demo', baseUrl = '') {
  const services = createDemoServices();
  if (mode === 'api') {
    services.mode = 'api';
    services.planner = createApiPlanner(baseUrl);
  }
  if (supabase) {
    services.auth = createSupabaseAuthService(supabase);
    services.trips = createSupabaseTripsService(supabase);
  }
  return services;
}

