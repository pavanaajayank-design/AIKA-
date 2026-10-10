import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { airports, calculate, schema, demoPlaces, type Trip, type Plan, type Place } from './engine';
export const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };
const buckets = new Map<string, {
    at: number;
    n: number;
}>();
export function rate(key: string) { const now = Date.now(); for (const [k, v] of buckets)
    if (now - v.at > 60000)
        buckets.delete(k); const b = buckets.get(key) || { at: now, n: 0 }; b.n++; buckets.set(key, b); return b.n <= 30; }
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers }); }
export async function body(req: Request) { const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin)
    throw Error('ORIGIN'); if (!rate(req.headers.get('cf-connecting-ip') || 'shared'))
    throw Error('RATE'); if (Number(req.headers.get('content-length')) > 16384)
    throw Error('SIZE'); const reader = req.body?.getReader(); if (!reader)
    throw Error('INPUT'); let size = 0; const chunks: Uint8Array[] = []; while (true) {
    const v = await reader.read();
    if (v.done)
        break;
    size += v.value.length;
    if (size > 16384) {
        await reader.cancel();
        throw Error('SIZE');
    }
    chunks.push(v.value);
} const full = new Uint8Array(size); let offset = 0; for (const c of chunks) {
    full.set(c, offset);
    offset += c.length;
} try {
    return JSON.parse(new TextDecoder().decode(full));
}
catch {
    throw Error('INPUT');
} }
export function failure(e: unknown) { const msg = e instanceof Error ? e.message : ''; if (msg === 'RATE')
    return json({ error: 'Too many requests. Please retry in a minute.' }, 429); if (msg === 'SIZE')
    return json({ error: 'Request is too large.' }, 413); if (msg === 'ORIGIN')
    return json({ error: 'Cross-origin request rejected.' }, 403); if (e instanceof z.ZodError)
    return json({ error: 'Please check your trip fields.', fields: e.issues.map(x => x.path.join('.')) }, 400); if (/Departure must|layovers up|timezone|local date|daylight|Boarding must|Check-in closure/.test(msg))
    return json({ error: msg }, 400); return json({ error: 'Unable to process this request. Check your entries and try again.' }, 400); }
export async function fetchJSON(url: string, init: RequestInit = {}) { const r = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) }); if (!r.ok)
    throw Error('PROVIDER'); return r.json(); }
export const explanationSchema = z.object({ status: z.enum(['NOT_ASSESSED', 'STAY_AIRPORT', 'NOT_FEASIBLE', 'TIGHT', 'FEASIBLE']), summary: z.string().max(450) }).strict();
export function validateExplanation(raw: unknown, plan: Plan) { const x = explanationSchema.parse(raw); if (x.status !== plan.status || /guarantee|definitely|100%|will catch/i.test(x.summary))
    throw Error('AI_CONTRADICTION'); return x; }
export async function explain(plan: Plan) { if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL)
    return null; try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 8000 } });
    const result = await ai.models.generateContent({ model: process.env.GEMINI_MODEL, contents: JSON.stringify({ instruction: 'Explain only these facts in at most two sentences. Do not invent places, times, rules or guarantees. Return the exact status unchanged.', status: plan.status, reason: plan.reason, usableMinutes: plan.usable, missing: plan.missing }), config: { responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { status: { type: 'string', enum: [plan.status] }, summary: { type: 'string' } }, required: ['status', 'summary'], additionalProperties: false } } });
    return validateExplanation(JSON.parse(result.text || ''), plan).summary;
}
catch {
    return null;
} }
export async function weather(p: Trip) { if (process.env.ENABLE_WEATHER !== 'true' || p.demo)
    return null; const a = airports[p.arrivalAirport]; if (!a)
    return null; try {
    const q = new URLSearchParams({ latitude: String(a.lat), longitude: String(a.lng), hourly: 'temperature_2m,precipitation_probability', timezone: a.zone, forecast_days: '16' });
    const w = z.object({ hourly: z.object({ time: z.array(z.string()), temperature_2m: z.array(z.number().nullable()), precipitation_probability: z.array(z.number().min(0).max(100).nullable()) }) }).parse(await fetchJSON('https://api.open-meteo.com/v1/forecast?' + q));
    const hour = p.arrival.slice(0, 13) + ':00';
    const i = w.hourly?.time?.indexOf(hour);
    if (i < 0 || !Number.isFinite(w.hourly?.temperature_2m?.[i]))
        return null;
    return { temperature: w.hourly.temperature_2m[i], rain: w.hourly.precipitation_probability[i], period: hour, source: 'Open-Meteo', fetchedAt: new Date().toISOString() };
}
catch {
    return null;
} }
const point = (lat: number, lng: number) => ({ location: { latLng: { latitude: lat, longitude: lng } } });
async function route(a: {
    lat: number;
    lng: number;
}, b: {
    lat: number;
    lng: number;
}, date: string) { const x = z.object({ routes: z.array(z.object({ duration: z.string() })).optional() }).parse(await fetchJSON('https://routes.googleapis.com/directions/v2:computeRoutes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_API_KEY!, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' }, body: JSON.stringify({ origin: point(a.lat, a.lng), destination: point(b.lat, b.lng), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE', departureTime: date }) })); const v = x.routes?.[0]?.duration; if (typeof v !== 'string' || !/^\d+(\.\d+)?s$/.test(v))
    throw Error('ROUTE'); const n = Math.ceil(parseFloat(v) / 60); if (n < 0 || n > 1440)
    throw Error('ROUTE'); return n; }
export async function destinations(p: Trip): Promise<Place[]> { if (p.demo)
    return p.arrivalAirport === 'BLR' && ['taxi', 'any'].includes(p.transport) ? demoPlaces : []; if (!process.env.GOOGLE_MAPS_SERVER_API_KEY || !['taxi', 'any'].includes(p.transport))
    return []; const a = airports[p.arrivalAirport]; if (!a)
    return []; try {
    const r = z.object({ places: z.array(z.unknown()).optional() }).parse(await fetchJSON('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_API_KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.location' }, body: JSON.stringify({ textQuery: (p.interest === 'food' ? 'restaurants' : p.interest === 'shopping' ? 'shopping centres' : 'tourist attractions') + ' near ' + a.name + ' airport', pageSize: 4, locationBias: { circle: { center: { latitude: a.lat, longitude: a.lng }, radius: 15000 } } }) }));
    const candidates = z.array(z.object({ id: z.string(), displayName: z.object({ text: z.string().max(150) }), location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }) })).parse(r.places || []);
    const budget = calculate(p);
    const results = await Promise.all(candidates.map(async (v) => { try {
        const b = { lat: v.location.latitude, lng: v.location.longitude };
        const distance = Math.hypot((b.lat - a.lat) * 111, (b.lng - a.lng) * 111 * Math.cos(a.lat * Math.PI / 180));
        if (distance > 30)
            return null;
        const [out, back] = await Promise.all([route(a, b, new Date(budget.exitAt).toISOString()), route(b, a, new Date(budget.returnBy - 90 * 60000).toISOString())]);
        return { id: v.id, name: v.displayName.text, category: p.interest === 'all' ? 'culture' : p.interest, ...b, out, back, visit: 60, description: 'Provider-discovered option. Confirm opening hours, access and suitability before travelling.', source: 'Google Maps · fetched ' + new Date().toISOString() };
    }
    catch {
        return null;
    } }));
    return results.filter((x): x is NonNullable<typeof x> => x !== null);
}
catch {
    return [];
} }
export async function makePlan(raw: unknown, includeProviders = true) { const trip = schema.parse(raw); let plan = calculate(trip); const [places, forecast] = includeProviders ? await Promise.all([destinations(trip), weather(trip)]) : [trip.demo ? demoPlaces : [], null]; const candidates = places.filter(p => trip.interest === 'all' || p.category === trip.interest).map(p => ({ ...p, assessment: calculate({ ...trip, routeOut: p.out, routeBack: p.back, visit: p.visit, scenario: { ...trip.scenario, unavailable: p.id === trip.selected && trip.scenario.unavailable } }) })); const options = candidates.filter(p => p.assessment.allowed && !(forecast && forecast.rain !== null && forecast.rain >= 70 && p.category === 'nature')).sort((a, b) => b.assessment.slack - a.assessment.slack); const text = includeProviders ? await explain(plan) : null; if (text)
    plan = { ...plan, explanation: text }; return { plan, places: options, forecast, aiAvailable: !!text, providerMessage: trip.demo ? 'Demo destinations and journey estimates. Opening hours and prices are not verified.' : options.length ? 'Google Maps estimates; opening hours and future traffic are not guaranteed.' : 'No verified destination results available. Enter conservative journey estimates for your own destination.' }; }
