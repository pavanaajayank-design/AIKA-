import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readClientConfig, getClientDiagnostics } from '../src/services/config';
import { createServices } from '../src/services';
import { createApiPlanner } from '../src/services/api';
import { base, calculate, type Trip } from '../lib/aika/engine';

const sampleTrip: Trip = {
  ...base,
  origin: 'DEL',
  destination: 'BOM',
  arrivalAirport: 'BLR',
  departureAirport: 'BLR',
  arrival: '2026-10-20T05:00',
  departure: '2026-10-20T16:00',
  arrivalZone: 'Asia/Kolkata',
  departureZone: 'Asia/Kolkata',
  airline: '6E',
  flight: '6E 123',
  entry: 'yes',
  routeOut: 45,
  routeBack: 45,
  visit: 60,
};

test('readClientConfig selects API mode when NEXT_PUBLIC_SERVICE_MODE is api', () => {
  const orig = process.env.NEXT_PUBLIC_SERVICE_MODE;
  try {
    process.env.NEXT_PUBLIC_SERVICE_MODE = 'api';
    const config = readClientConfig();
    assert.equal(config.mode, 'api');
  } finally {
    if (orig !== undefined) {
      process.env.NEXT_PUBLIC_SERVICE_MODE = orig;
    } else {
      delete process.env.NEXT_PUBLIC_SERVICE_MODE;
    }
  }
});

test('readClientConfig honors explicit override for NEXT_PUBLIC_SERVICE_MODE', () => {
  const config = readClientConfig({ NEXT_PUBLIC_SERVICE_MODE: 'api' });
  assert.equal(config.mode, 'api');

  const demoConfig = readClientConfig({ NEXT_PUBLIC_SERVICE_MODE: 'demo' });
  assert.equal(demoConfig.mode, 'demo');
});

test('readClientConfig honors VITE_SERVICE_MODE for Vite compatibility', () => {
  const config = readClientConfig({ VITE_SERVICE_MODE: 'api' });
  assert.equal(config.mode, 'api');
});

test('getClientDiagnostics returns safe diagnostic payload without exposing secrets', () => {
  const diag = getClientDiagnostics();
  assert.ok(diag.mode === 'demo' || diag.mode === 'api');
  assert.equal(typeof diag.baseUrl, 'string');
  assert.equal(typeof diag.isProduction, 'boolean');
  assert.equal(typeof diag.hasSupabaseConfig, 'boolean');
  const serialized = JSON.stringify(diag);
  assert.ok(!serialized.includes('key'));
  assert.ok(!serialized.includes('secret'));
});

test('createServices initializes API planner when mode is api', () => {
  const services = createServices('api');
  assert.equal(services.mode, 'api');
  assert.ok(services.planner);
});

test('createApiPlanner sends POST to /api/plan for initial trip calculation', async () => {
  const origFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedMethod = '';

  try {
    const expected = calculate(sampleTrip);
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedMethod = init?.method || '';
      return Response.json({
        plan: {
          ...expected,
          source: 'provider',
          weather: 'clear',
          explanation: 'Verified window.',
        },
        places: [],
        forecast: null,
        aiAvailable: false,
        providerMessage: 'Provider results available.',
      });
    }) as typeof fetch;

    const planner = createApiPlanner('https://example.com');
    await planner.plan(sampleTrip);

    assert.equal(requestedUrl, 'https://example.com/api/plan');
    assert.equal(requestedMethod, 'POST');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('createApiPlanner sends POST to /api/plan/recalculate when scenario has simulation offsets', async () => {
  const origFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedMethod = '';

  const tripWithScenario: Trip = {
    ...sampleTrip,
    scenario: {
      ...sampleTrip.scenario,
      arrival: 30, // 30-minute simulated delay
    },
  };
  const expected = calculate(tripWithScenario);

  try {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedMethod = init?.method || '';
      return Response.json({
        plan: {
          ...expected,
          source: 'provider',
          weather: 'clear',
          explanation: 'Recalculated with delay.',
        },
        places: [],
        forecast: null,
        aiAvailable: false,
        providerMessage: 'Recalculated.',
      });
    }) as typeof fetch;

    const planner = createApiPlanner();
    await planner.plan(tripWithScenario);

    assert.equal(requestedUrl, '/api/plan/recalculate');
    assert.equal(requestedMethod, 'POST');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('createApiPlanner weather method calls /api/weather endpoint', async () => {
  const origFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedMethod = '';

  try {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedMethod = init?.method || '';
      return Response.json({
        forecast: {
          temperature: 28,
          rain: 10,
          period: '2026-05-15T10:00',
        },
      });
    }) as typeof fetch;

    const planner = createApiPlanner('https://example.com');
    const result = await planner.weather?.(sampleTrip);

    assert.equal(requestedUrl, 'https://example.com/api/weather');
    assert.equal(requestedMethod, 'POST');
    assert.equal(result?.temperature, 28);
    assert.equal(result?.rain, 10);
  } finally {
    globalThis.fetch = origFetch;
  }
});
