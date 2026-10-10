import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, base, instant, schema } from '../lib/aika/engine';
import { body, rate, failure, makePlan, validateExplanation, fetchJSON } from '../lib/aika/server';
const good = { ...base, airline: 'Demo airline', flight: 'XX 101', entry: 'yes' as const, terminal: 'no' as const, routeOut: 30, routeBack: 40 };
test('11-hour connection conserves minutes and fits a visit', () => { const p = calculate(good); assert.equal(p.total, 660); assert.equal(p.usable, 320); assert.equal(p.status, 'FEASIBLE'); assert.equal(p.breakdown.reduce((s, x) => s + x[1], 0) + p.slack, p.total); });
test('short layover is not feasible', () => assert.equal(calculate({ ...good, departure: '2026-10-20T08:00' }).status, 'NOT_FEASIBLE'));
test('overnight dates calculate actual elapsed time', () => assert.equal(calculate({ ...good, arrival: '2026-10-20T23:00', departure: '2026-10-21T10:00' }).total, 660));
test('different zones are normalized but airport changes are not assessed', () => { const p = calculate({ ...good, departureAirport: 'DXB' }); assert.equal(p.total, 750); assert.equal(p.status, 'NOT_ASSESSED'); });
test('DST transition measures actual elapsed time', () => assert.equal((instant('2026-03-08T04:00', 'America/New_York') - instant('2026-03-08T00:00', 'America/New_York')) / 60000, 180));
test('nonexistent DST local time rejected', () => assert.throws(() => instant('2026-03-08T02:30', 'America/New_York')));
test('ambiguous DST local time rejected', () => assert.throws(() => instant('2026-11-01T01:30', 'America/New_York')));
test('departure before arrival rejected', () => assert.throws(() => calculate({ ...good, departure: '2026-10-20T04:00' })));
test('invalid calendar day rejected', () => assert.throws(() => calculate({ ...good, arrival: '2026-02-30T05:00' })));
test('unresolved timezone rejected', () => assert.throws(() => calculate({ ...good, arrivalAirport: 'XYZ' })));
test('boarding fallback is disclosed', () => assert.ok(calculate(good).missing.some(x => x.includes('Boarding'))));
test('missing bag deadline disclosed', () => assert.ok(calculate({ ...good, baggage: 'recheck' }).missing.some(x => x.includes('bag-drop'))));
test('unknown entry blocks leaving', () => assert.equal(calculate({ ...good, entry: 'unknown' }).status, 'STAY_AIRPORT'));
test('ineligible entry blocks leaving', () => assert.equal(calculate({ ...good, entry: 'no' }).status, 'STAY_AIRPORT'));
test('baggage collection and recheck reduce available time', () => assert.ok(calculate({ ...good, baggage: 'recheck' }).usable < calculate(good).usable));
test('separate tickets increase uncertainty', () => assert.equal(calculate({ ...good, tickets: 'separate' }).status, 'TIGHT'));
test('unknown terminal increases uncertainty', () => assert.equal(calculate({ ...good, terminal: 'unknown' }).status, 'TIGHT'));
test('arrival delay eliminates excursion', () => assert.equal(calculate({ ...good, scenario: { ...base.scenario, arrival: 400 } }).status, 'NOT_FEASIBLE'));
test('delay can remove a long visit but preserve a short one', () => { const s = { ...good, scenario: { ...base.scenario, arrival: 210 } }; assert.equal(calculate({ ...s, visit: 150 }).status, 'NOT_FEASIBLE'); assert.equal(calculate({ ...s, visit: 30 }).status, 'FEASIBLE'); });
test('minimum return buffer is enforced', () => assert.throws(() => calculate({ ...good, airportBuffer: 30 })));
test('missing routing is not assessed', () => assert.equal(calculate({ ...good, routeBack: null }).status, 'NOT_ASSESSED'));
test('earlier confirmed checkin overrides return target', () => assert.ok(calculate({ ...good, checkin: '2026-10-20T11:00' }).returnBy < calculate(good).returnBy));
test('destination closure removes itinerary', () => assert.equal(calculate({ ...good, scenario: { ...base.scenario, unavailable: true } }).allowed, false));
test('negative times and oversized fields rejected', () => { assert.equal(schema.safeParse({ ...good, security: -1 }).success, false); assert.equal(schema.safeParse({ ...good, airline: 'x'.repeat(1000) }).success, false); });
test('missing API credentials and weather remain usable', async () => { const p = await makePlan({ ...good, demo: true }); assert.equal(p.forecast, null); assert.equal(p.aiAvailable, false); assert.ok(p.places.length > 0); });
test('AI malformed or contradictory output is rejected', () => { assert.throws(() => validateExplanation({ status: 'STAY_AIRPORT', summary: 'Stay' }, calculate(good))); assert.throws(() => validateExplanation({ status: 'FEASIBLE', summary: 'You will catch the flight' }, calculate(good))); assert.throws(() => validateExplanation({}, calculate(good))); });
test('invalid JSON receives safe error', async () => { await assert.rejects(() => body(new Request('https://aika.test/api/plan', { method: 'POST', body: '{' }))); assert.equal(failure(Error('secret')).status, 400); assert.ok(!(await failure(Error('secret')).text()).includes('secret')); });
test('oversized body rejected', async () => await assert.rejects(() => body(new Request('https://aika.test/api/plan', { method: 'POST', body: 'x'.repeat(17000) })), /SIZE/));
test('cross-origin mutation rejected', async () => await assert.rejects(() => body(new Request('https://aika.test/api/plan', { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{}' })), /ORIGIN/));
test('rate limiting rejects repeated requests', () => { for (let i = 0; i < 30; i++)
    assert.equal(rate('test'), true); assert.equal(rate('test'), false); });
test('provider error and timeout fail closed', async () => { const original = globalThis.fetch; try {
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    await assert.rejects(() => fetchJSON('https://api.open-meteo.com/'));
    globalThis.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError'); };
    await assert.rejects(() => fetchJSON('https://api.open-meteo.com/'));
}
finally {
    globalThis.fetch = original;
} });
test('plan API produces demo result and accepts destination recalculation', async () => { const { POST } = await import('../app/api/plan/route'); const first = await POST(new Request('https://aika.test/api/plan', { method: 'POST', body: JSON.stringify({ ...good, demo: true }) })); assert.equal(first.status, 200); const payload = await first.json() as {
    places: {
        out: number;
        back: number;
        visit: number;
    }[];
    plan: {
        status: string;
    };
}; assert.equal(payload.plan.status, 'FEASIBLE'); assert.ok(payload.places.length > 0); const selected = payload.places[0]; const second = await POST(new Request('https://aika.test/api/plan', { method: 'POST', body: JSON.stringify({ ...good, demo: true, routeOut: selected.out, routeBack: selected.back, visit: selected.visit, scenario: { ...base.scenario, arrival: 480 } }) })); assert.equal(second.status, 200); assert.equal((await second.json() as {
    plan: {
        status: string;
    };
}).plan.status, 'NOT_FEASIBLE'); });
test('plan API rejects invalid fields without leaking stack traces', async () => { const { POST } = await import('../app/api/plan/route'); const res = await POST(new Request('https://aika.test/api/plan', { method: 'POST', body: '{"security":-1}' })); assert.equal(res.status, 400); const text = await res.text(); assert.ok(!text.includes('stack')); assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff'); });
test('Google provider requests are validated and bidirectional', async () => { const original = globalThis.fetch, old = process.env.GOOGLE_MAPS_SERVER_API_KEY; process.env.GOOGLE_MAPS_SERVER_API_KEY = 'test-placeholder'; let routes = 0; try {
    globalThis.fetch = async (url) => { if (String(url).includes('places:searchText'))
        return Response.json({ places: [{ id: 'fixture', displayName: { text: 'Fixture attraction' }, location: { latitude: 13.21, longitude: 77.7 } }] }); routes++; return Response.json({ routes: [{ duration: '1800s' }] }); };
    const { destinations } = await import('../lib/aika/server');
    const places = await destinations(good);
    assert.equal(places.length, 1);
    assert.equal(places[0].out, 30);
    assert.equal(routes, 2);
}
finally {
    globalThis.fetch = original;
    if (old === undefined)
        delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    else
        process.env.GOOGLE_MAPS_SERVER_API_KEY = old;
} });
test('malformed provider response yields no fabricated destinations', async () => { const original = globalThis.fetch, old = process.env.GOOGLE_MAPS_SERVER_API_KEY; process.env.GOOGLE_MAPS_SERVER_API_KEY = 'test-placeholder'; try {
    globalThis.fetch = async () => Response.json({ places: 'invalid' });
    const { destinations } = await import('../lib/aika/server');
    assert.deepEqual(await destinations(good), []);
}
finally {
    globalThis.fetch = original;
    if (old === undefined)
        delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
    else
        process.env.GOOGLE_MAPS_SERVER_API_KEY = old;
} });
test('weather matches the requested forecast hour', async () => { const original = globalThis.fetch, old = process.env.ENABLE_WEATHER; process.env.ENABLE_WEATHER = 'true'; try {
    globalThis.fetch = async () => Response.json({ hourly: { time: ['2026-10-20T05:00'], temperature_2m: [24], precipitation_probability: [80] } });
    const { weather } = await import('../lib/aika/server');
    const forecast = await weather(good);
    assert.equal(forecast?.temperature, 24);
    assert.equal(forecast?.rain, 80);
}
finally {
    globalThis.fetch = original;
    if (old === undefined)
        delete process.env.ENABLE_WEATHER;
    else
        process.env.ENABLE_WEATHER = old;
} });
