import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/config/public/route';

test('public config endpoint reports savedTrips accurately without exposing credentials', async () => {
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalViteUrl = process.env.VITE_SUPABASE_URL;
  const originalViteKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  try {
    // 1. Unconfigured case
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const unconfiguredRes = GET();
    assert.equal(unconfiguredRes.status, 200);
    const unconfiguredData = await unconfiguredRes.json() as Record<string, unknown>;
    assert.equal(unconfiguredData.savedTrips, false);
    assert.equal(typeof unconfiguredData.flightTracking, 'boolean');

    // 2. Configured case via server-side SUPABASE_URL
    process.env.SUPABASE_URL = 'https://fixture-server.supabase.co';
    const serverConfiguredRes = GET();
    assert.equal(serverConfiguredRes.status, 200);
    const serverConfiguredData = await serverConfiguredRes.json() as Record<string, unknown>;
    assert.equal(serverConfiguredData.savedTrips, true);
    assert.ok(!JSON.stringify(serverConfiguredData).includes('fixture-server'));

    // 3. Configured case via VITE_ public variables
    delete process.env.SUPABASE_URL;
    process.env.VITE_SUPABASE_URL = 'https://fixture-client.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sbp_test_fixture_secret_token';

    const clientConfiguredRes = GET();
    assert.equal(clientConfiguredRes.status, 200);
    const clientConfiguredData = await clientConfiguredRes.json() as Record<string, unknown>;
    assert.equal(clientConfiguredData.savedTrips, true);
    assert.ok(!JSON.stringify(clientConfiguredData).includes('fixture-client'));
    assert.ok(!JSON.stringify(clientConfiguredData).includes('sbp_test_fixture_secret_token'));
  } finally {
    if (originalSupabaseUrl !== undefined) {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    } else {
      delete process.env.SUPABASE_URL;
    }

    if (originalViteUrl !== undefined) {
      process.env.VITE_SUPABASE_URL = originalViteUrl;
    } else {
      delete process.env.VITE_SUPABASE_URL;
    }

    if (originalViteKey !== undefined) {
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalViteKey;
    } else {
      delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    }
  }
});
