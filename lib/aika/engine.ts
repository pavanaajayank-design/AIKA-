import { DateTime, IANAZone } from 'luxon';
import { z } from 'zod';
export const airports: Record<string, {
    name: string;
    zone: string;
    lat: number;
    lng: number;
}> = {
    BLR: { name: 'Bengaluru · Kempegowda', zone: 'Asia/Kolkata', lat: 13.1986, lng: 77.7066 }, CCJ: { name: 'Kozhikode · Calicut', zone: 'Asia/Kolkata', lat: 11.1368, lng: 75.9553 }, DEL: { name: 'Delhi · Indira Gandhi', zone: 'Asia/Kolkata', lat: 28.5562, lng: 77.1000 }, BOM: { name: 'Mumbai · Chhatrapati Shivaji', zone: 'Asia/Kolkata', lat: 19.0896, lng: 72.8656 }, MAA: { name: 'Chennai', zone: 'Asia/Kolkata', lat: 12.9941, lng: 80.1709 }, HYD: { name: 'Hyderabad · Rajiv Gandhi', zone: 'Asia/Kolkata', lat: 17.2403, lng: 78.4294 }, COK: { name: 'Kochi', zone: 'Asia/Kolkata', lat: 10.1518, lng: 76.393 }, DXB: { name: 'Dubai', zone: 'Asia/Dubai', lat: 25.2532, lng: 55.3657 }, JFK: { name: 'New York · JFK', zone: 'America/New_York', lat: 40.6413, lng: -73.7781 }, LHR: { name: 'London · Heathrow', zone: 'Europe/London', lat: 51.47, lng: -0.4543 }
};
const minutes = z.number().finite().min(0).max(1440);
const code = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);
const local = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
export const schema = z.object({ arrivalAirport: code, departureAirport: code, origin: code, destination: code, arrival: local, departure: local, arrivalZone: z.string().max(80).optional(), departureZone: z.string().max(80).optional(), airline: z.string().trim().min(1, 'Enter an airline.').max(80), flight: z.string().trim().regex(/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i, 'Enter a valid flight number.').max(20), entry: z.enum(['yes', 'no', 'unknown']), baggage: z.enum(['none', 'through', 'recheck', 'unknown']), terminal: z.enum(['yes', 'no', 'unknown']), tickets: z.enum(['one', 'separate', 'unknown']), internationalArrival: z.boolean(), internationalDeparture: z.boolean(), immigration: minutes, security: minutes, exit: minutes, gate: minutes, airportBuffer: minutes.min(120), contingency: minutes.min(30), boarding: z.string().max(16).default(''), checkin: z.string().max(16).default(''), interest: z.enum(['all', 'food', 'culture', 'nature', 'shopping']), transport: z.enum(['taxi', 'transit', 'walking', 'any']), pace: z.enum(['relaxed', 'balanced', 'fast']), style: z.enum(['conservative', 'balanced', 'flexible']), budget: z.enum(['low', 'medium', 'high']), mobility: z.boolean(), maxDestinations: z.number().int().min(1).max(1), routeOut: minutes.nullable(), routeBack: minutes.nullable(), visit: minutes.min(15), demo: z.boolean(), selected: z.string().max(150).default('custom'), scenario: z.object({ arrival: minutes, outbound: minutes, return: minutes, processing: minutes, visit: minutes, unavailable: z.boolean(), weather: z.boolean().default(false) }) });
export type Trip = z.infer<typeof schema>;
export const base: Trip = { origin: 'CCJ', destination: 'DXB', arrivalAirport: 'BLR', departureAirport: 'BLR', arrival: '2026-10-20T05:00', departure: '2026-10-20T16:00', airline: '', flight: '', entry: 'unknown', baggage: 'through', terminal: 'unknown', tickets: 'one', internationalArrival: false, internationalDeparture: true, immigration: 45, security: 40, exit: 30, gate: 30, airportBuffer: 180, contingency: 45, boarding: '', checkin: '', interest: 'all', transport: 'taxi', pace: 'balanced', style: 'conservative', budget: 'medium', mobility: false, maxDestinations: 1, routeOut: null, routeBack: null, visit: 60, demo: false, selected: 'custom', scenario: { arrival: 0, outbound: 0, return: 0, processing: 0, visit: 0, unavailable: false, weather: false } };
export type Place = {
    id: string;
    name: string;
    category: string;
    lat: number;
    lng: number;
    out: number;
    back: number;
    visit: number;
    description: string;
    source: string;
    geometry?: string;
    hours?: string;
};
export { demoPlaces } from './demo';
export function instant(value: string, zone: string) { if (!IANAZone.isValidZone(zone))
    throw Error('Airport timezone is unresolved. Enter a valid IANA timezone.'); const d = DateTime.fromISO(value, { zone }); if (!d.isValid || d.toFormat("yyyy-MM-dd'T'HH:mm") !== value)
    throw Error('Invalid or nonexistent local date/time.'); if (d.getPossibleOffsets().length > 1)
    throw Error('Ambiguous daylight-saving time. Choose an unambiguous time.'); return d.toMillis(); }
export function calculate(input: unknown) {
    const p = schema.parse(input);
    const az = airports[p.arrivalAirport]?.zone || p.arrivalZone || '';
    const dz = airports[p.departureAirport]?.zone || p.departureZone || '';
    const scheduled = instant(p.arrival, az);
    const departure = instant(p.departure, dz);
    if (departure <= scheduled)
        throw Error('Departure must be after arrival, including its date and timezone.');
    if (departure - scheduled > 72 * 3600000)
        throw Error('This planner supports layovers up to 72 hours.');
    const arrival = scheduled + p.scenario.arrival * 60000;
    const missing: string[] = [];
    if (!p.boarding)
        missing.push('Boarding deadline unknown; departure-based airport buffer used.');
    if (!p.checkin && (p.baggage === 'recheck' || p.tickets !== 'one'))
        missing.push('Check-in / bag-drop closure unknown. Confirm with your airline.');
    if (p.terminal === 'unknown')
        missing.push('Terminal transfer unresolved; 45-minute allowance included.');
    if (p.baggage === 'unknown')
        missing.push('Baggage handling unresolved; collection and recheck assumed.');
    if (p.entry === 'unknown')
        missing.push('Eligibility to exit / enter the country has not been confirmed.');
    if (p.routeOut === null || p.routeBack === null)
        missing.push('Outbound and return route durations are required.');
    const collect = ['recheck', 'unknown'].includes(p.baggage) ? 40 : 0, recheck = ['recheck', 'unknown'].includes(p.baggage) ? 45 : 0, transfer = p.terminal === 'no' ? 0 : p.terminal === 'yes' ? 30 : 45;
    const exitMinutes = p.exit + (p.internationalArrival ? p.immigration : 0) + collect + p.scenario.processing;
    const airportTasks = p.security + (p.internationalDeparture ? p.immigration : 0) + recheck + transfer + p.gate + (p.tickets !== 'one' ? 30 : 0);
    let returnBy = departure - Math.max(p.airportBuffer, airportTasks) * 60000;
    if (p.boarding) {
        const b = instant(p.boarding, dz);
        if (b >= departure || b <= scheduled)
            throw Error('Boarding must be between scheduled arrival and departure.');
        returnBy = Math.min(returnBy, b - airportTasks * 60000);
    }
    if (p.checkin) {
        const c = instant(p.checkin, dz);
        if (c >= departure || c <= scheduled)
            throw Error('Check-in closure must be between scheduled arrival and departure.');
        returnBy = Math.min(returnBy, c - (recheck + 15) * 60000);
    }
    const contingency = p.contingency + (p.style === 'conservative' ? 15 : 0), out = (p.routeOut || 0) + p.scenario.outbound, back = (p.routeBack || 0) + p.scenario.return + (p.scenario.weather ? 30 : 0), exitAt = arrival + exitMinutes * 60000, reach = exitAt + out * 60000, leave = returnBy - (back + contingency) * 60000, usable = Math.floor((leave - reach) / 60000), required = Math.ceil(p.visit * (p.pace === 'relaxed' ? 1.25 : 1)) + (p.mobility ? 20 : 0) + p.scenario.visit, slack = usable - required;
    if (p.scenario.weather)
        missing.push('Hypothetical heavy rain: 30 extra return-road minutes; outdoor options removed.');
    let status = 'FEASIBLE', label = 'Safe to explore', reason = 'The selected visit fits within the stated estimates and protected return buffer.';
    if (p.entry !== 'yes') {
        status = 'STAY_AIRPORT';
        label = 'Stay at the airport';
        reason = 'Confirm permission to leave and re-enter before considering an outside itinerary.';
    }
    else if (p.arrivalAirport !== p.departureAirport || p.routeOut === null || p.routeBack === null) {
        status = 'NOT_ASSESSED';
        label = 'Cannot assess yet';
        reason = p.arrivalAirport !== p.departureAirport ? 'Airport-change connections need a verified transfer plan; sightseeing is not assessed.' : 'Add conservative journey estimates or choose a sourced destination.';
    }
    else if (usable <= 0 || slack < 0 || p.scenario.unavailable) {
        status = 'NOT_FEASIBLE';
        label = 'High risk';
        reason = p.scenario.unavailable ? 'The selected destination is unavailable. Choose another option.' : 'The selected visit no longer fits. Stay at the airport or choose a shorter verified option.';
    }
    else if (slack < 60 || p.terminal === 'unknown' || p.baggage === 'unknown' || p.tickets !== 'one') {
        status = 'TIGHT';
        label = 'Moderate risk';
        reason = 'The visit fits, but limited spare time or unresolved airport logistics increase risk.';
    }
    const allowed = ['FEASIBLE', 'TIGHT'].includes(status);
    const breakdown = [['Arrival processing', exitMinutes], ['Outbound journey', out], ['Planned visit', required], ['Return journey', back], ['Road contingency', contingency], ['Airport procedures / deadlines', Math.round((departure - returnBy) / 60000)]] as [
        string,
        number
    ][];
    const timeline = allowed ? [{ name: 'Arrive at ' + p.arrivalAirport, at: arrival }, { name: 'Airport exit ready', at: exitAt }, { name: 'Reach your destination', at: reach }, { name: 'Finish planned visit', at: reach + required * 60000 }, { name: 'Leave destination no later than', at: leave }, { name: 'Return to airport by', at: returnBy }, { name: 'Connecting flight · ' + p.departureAirport, at: departure }] : [{ name: 'Arrive at ' + p.arrivalAirport, at: arrival }, { name: 'Remain at the airport / confirm your connection', at: arrival + exitMinutes * 60000 }, { name: 'Connecting flight · ' + p.departureAirport, at: departure }];
    return { status, label, reason, total: Math.floor((departure - arrival) / 60000), usable: Math.max(0, usable), slack, required, returnBy, leave, exitAt, arrival, departure, zone: az, departureZone: dz, missing, breakdown, timeline, allowed, source: p.demo ? 'Demo estimates' : 'User inputs / provider estimates', weather: 'Weather unavailable', explanation: 'AI explanation unavailable. This summary comes from the deterministic calculation.' };
}
export type Plan = ReturnType<typeof calculate>;
