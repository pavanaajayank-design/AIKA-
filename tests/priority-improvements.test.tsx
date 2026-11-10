import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    airports,
    isDomesticIndianAirport,
    getAirportTimezone,
    searchAirports,
    calculate,
    base,
    type Trip,
} from '../lib/aika/engine';
import Brand from '../src/components/Brand';
import AirportField from '../src/components/AirportField';

// =========================================================================
// EDIT 1 — Automatically determine airport time zones
// =========================================================================
test('EDIT 1: airport timezone is automatically determined from selected airport', () => {
    assert.equal(getAirportTimezone('BLR'), 'Asia/Kolkata');
    assert.equal(getAirportTimezone('DEL'), 'Asia/Kolkata');
    assert.equal(getAirportTimezone('JAI'), 'Asia/Kolkata');
    assert.equal(getAirportTimezone('COK'), 'Asia/Kolkata');
    assert.equal(getAirportTimezone('DXB'), 'Asia/Dubai');
    assert.equal(getAirportTimezone('JFK'), 'America/New_York');
    assert.equal(getAirportTimezone('LHR'), 'Europe/London');
    assert.equal(getAirportTimezone('SIN'), 'Asia/Singapore');
});

test('EDIT 1: airports in the same time zone automatically receive the same zone', () => {
    const indianAirports = ['BLR', 'DEL', 'BOM', 'MAA', 'HYD', 'CCJ', 'COK', 'JAI', 'CCU', 'PNQ', 'AMD'];
    for (const code of indianAirports) {
        assert.equal(airports[code]?.zone, 'Asia/Kolkata');
    }
});

test('EDIT 1: correct time zones are used when calculating layover duration across overnight and multi-zone connections', () => {
    const crossZoneTrip: Trip = {
        ...base,
        arrivalAirport: 'BLR', // Asia/Kolkata (UTC+5:30)
        departureAirport: 'DXB', // Asia/Dubai (UTC+4:00)
        arrival: '2026-10-20T05:00', // 2026-10-19T23:30Z
        departure: '2026-10-20T16:00', // 2026-10-20T12:00Z
        arrivalZone: 'Asia/Kolkata',
        departureZone: 'Asia/Dubai',
        airline: 'Emirates',
        flight: 'EK 567',
        entry: 'yes',
        terminal: 'no',
        routeOut: 30,
        routeBack: 30,
    };
    // 23:30Z to 12:00Z = 12.5 hours = 750 minutes
    const result = calculate(crossZoneTrip);
    assert.equal(result.total, 750);
    assert.equal(result.zone, 'Asia/Kolkata');
    assert.equal(result.departureZone, 'Asia/Dubai');
});

test('EDIT 1: invalid or unavailable airport time zone produces clear validation message', () => {
    const invalidTrip: Trip = {
        ...base,
        arrivalAirport: 'BLR',
        departureAirport: 'BLR',
        arrival: '2026-10-20T05:00',
        departure: '2026-10-20T16:00',
        arrivalZone: 'Invalid/Zone_Name',
        airline: 'IndiGo',
        flight: '6E 123',
    };
    // calculate should throw when timezone is unresolved
    assert.throws(
        () => calculate({ ...invalidTrip, arrivalAirport: 'XYZ' }),
        /timezone/i
    );
});

// =========================================================================
// EDIT 2 — Header logo improvements
// =========================================================================
test('EDIT 2: header brand logo does not render separate AIKA. text', () => {
    const html = renderToStaticMarkup(<Brand />);
    assert.ok(html.includes('/images/aika-logo.png'));
    assert.ok(html.includes('width="64"'));
    assert.ok(html.includes('height="64"'));
    assert.ok(!html.includes('AIKA<span class="brand-dot">.</span>'));
    assert.ok(html.includes('href="#home"'));
    assert.ok(html.includes('aria-label="AIKA home"'));
});

test('EDIT 2: large brand on auth page preserves large dimensions without text', () => {
    const html = renderToStaticMarkup(<Brand large />);
    assert.ok(html.includes('/images/aika-logo.png'));
    assert.ok(html.includes('width="140"'));
    assert.ok(html.includes('height="140"'));
    assert.ok(!html.includes('AIKA<span class="brand-dot">.</span>'));
});

// =========================================================================
// EDIT 3 — Country eligibility conditional on layover airport
// =========================================================================
test('EDIT 3: domestic Indian layovers are identified by country metadata', () => {
    assert.equal(isDomesticIndianAirport('BLR'), true);
    assert.equal(isDomesticIndianAirport('DEL'), true);
    assert.equal(isDomesticIndianAirport('BOM'), true);
    assert.equal(isDomesticIndianAirport('JAI'), true);
    assert.equal(isDomesticIndianAirport('COK'), true);
    assert.equal(isDomesticIndianAirport('DXB'), false);
    assert.equal(isDomesticIndianAirport('LHR'), false);
    assert.equal(isDomesticIndianAirport('JFK'), false);
    assert.equal(isDomesticIndianAirport(''), false);
    assert.equal(isDomesticIndianAirport('UNKNOWN'), false);
});

test('EDIT 3: unknown layover airport does not assume domestic (safe state)', () => {
    assert.equal(isDomesticIndianAirport(''), false);
    assert.equal(isDomesticIndianAirport('XYZ'), false);
});

test('EDIT 3: domestic Indian layover calculation allows excursion when entry is yes', () => {
    const domesticTrip: Trip = {
        ...base,
        arrivalAirport: 'JAI',
        departureAirport: 'JAI',
        origin: 'DEL',
        destination: 'BOM',
        arrival: '2026-10-20T05:00',
        departure: '2026-10-20T16:00',
        airline: 'IndiGo',
        flight: '6E 202',
        entry: 'yes',
        terminal: 'no',
        routeOut: 30,
        routeBack: 30,
    };
    const result = calculate(domesticTrip);
    assert.equal(result.status, 'FEASIBLE');
    assert.equal(result.allowed, true);
});

test('EDIT 3: international layover calculation blocks excursion if user unconfirmed or ineligible', () => {
    const intlTripUnconfirmed: Trip = {
        ...base,
        arrivalAirport: 'DXB',
        departureAirport: 'DXB',
        origin: 'DEL',
        destination: 'LHR',
        arrival: '2026-10-20T05:00',
        departure: '2026-10-20T16:00',
        airline: 'Emirates',
        flight: 'EK 501',
        entry: 'unknown',
        terminal: 'no',
        routeOut: 30,
        routeBack: 30,
    };
    const resultUnconfirmed = calculate(intlTripUnconfirmed);
    assert.equal(resultUnconfirmed.status, 'STAY_AIRPORT');
    assert.equal(resultUnconfirmed.allowed, false);

    const resultIneligible = calculate({ ...intlTripUnconfirmed, entry: 'no' });
    assert.equal(resultIneligible.status, 'STAY_AIRPORT');
    assert.equal(resultIneligible.allowed, false);
});

// =========================================================================
// EDIT 4 — Airport search autocomplete
// =========================================================================
test('EDIT 4: search by IATA code matches accurately and prioritizes exact match', () => {
    const jaiMatches = searchAirports('JAI');
    assert.ok(jaiMatches.length > 0);
    assert.equal(jaiMatches[0][0], 'JAI');
    assert.equal(jaiMatches[0][1].city, 'Jaipur');

    const cokMatches = searchAirports('COK');
    assert.ok(cokMatches.length > 0);
    assert.equal(cokMatches[0][0], 'COK');
    assert.equal(cokMatches[0][1].city, 'Kochi');

    const dxbMatches = searchAirports('DXB');
    assert.ok(dxbMatches.length > 0);
    assert.equal(dxbMatches[0][0], 'DXB');
    assert.equal(dxbMatches[0][1].city, 'Dubai');
});

test('EDIT 4: search by city name returns appropriate airport', () => {
    const jaipurMatches = searchAirports('Jaipur');
    assert.ok(jaipurMatches.length > 0);
    assert.equal(jaipurMatches[0][0], 'JAI');

    const kochiMatches = searchAirports('Kochi');
    assert.ok(kochiMatches.length > 0);
    assert.equal(kochiMatches[0][0], 'COK');

    const dubaiMatches = searchAirports('Dubai');
    assert.ok(dubaiMatches.length > 0);
    assert.equal(dubaiMatches[0][0], 'DXB');
});

test('EDIT 4: search by single letter "d" returns airports beginning with D with top priority', () => {
    const dMatches = searchAirports('d');
    assert.ok(dMatches.length > 0);
    const topCodes = dMatches.slice(0, 5).map(m => m[0]);
    // DEL, DXB, DED, DHM, DIB etc. should be prioritized because their code begins with 'D'
    assert.ok(topCodes.includes('DEL') || topCodes.includes('DXB'));
    assert.ok(topCodes.every(code => code.startsWith('D')));
});

test('EDIT 4: search trims whitespace and is case-insensitive', () => {
    const padded = searchAirports('   jAiPuR   ');
    assert.ok(padded.length > 0);
    assert.equal(padded[0][0], 'JAI');

    const lowerCode = searchAirports('jai');
    assert.ok(lowerCode.length > 0);
    assert.equal(lowerCode[0][0], 'JAI');
});

test('EDIT 4: search by ICAO code works', () => {
    const icaoMatches = searchAirports('VIJP'); // Jaipur ICAO
    assert.ok(icaoMatches.length > 0);
    assert.equal(icaoMatches[0][0], 'JAI');

    const vidpMatches = searchAirports('VIDP'); // Delhi ICAO
    assert.ok(vidpMatches.length > 0);
    assert.equal(vidpMatches[0][0], 'DEL');
});

test('EDIT 4: domestic filter excludes foreign airports', () => {
    const domesticResults = searchAirports('Dubai', true);
    assert.equal(domesticResults.length, 0);

    const intlResults = searchAirports('Dubai', false);
    assert.ok(intlResults.length > 0);
    assert.equal(intlResults[0][0], 'DXB');
});

test('EDIT 4: AirportField renders interactive input and synchronized select', () => {
    const html = renderToStaticMarkup(
        <AirportField label="Layover arrival airport" value="JAI" onChange={() => {}} />
    );
    assert.ok(html.includes('aria-label="Search Layover arrival airport"'));
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('value="JAI"'));
    assert.ok(html.includes('Jaipur International Airport'));
});

// =========================================================================
// EDIT 5 — Expanded airport database
// =========================================================================
test('EDIT 5: database contains comprehensive Indian commercial airports', () => {
    const expectedIndianAirports = [
        'BLR', 'BOM', 'DEL', 'CCU', 'MAA', 'HYD', 'AMD', 'COK',
        'PNQ', 'GOI', 'GOX', 'TRV', 'CCJ', 'CNN', 'JAI', 'LKO',
        'GAU', 'IXC', 'BBI', 'PAT', 'IDR', 'VNS', 'SXR', 'ATQ',
        'IXB', 'IXR', 'RPR', 'VTZ', 'VGA', 'TIR', 'CJB', 'TRZ',
        'IXM', 'IXE', 'HBX', 'IXG', 'MYQ', 'BDQ', 'STV', 'RAJ',
        'UDR', 'JDH', 'JSA', 'BKB', 'NAG', 'IXU', 'SAG', 'KLH',
        'BHO', 'JLR', 'GWL', 'DED', 'PGH', 'IXL', 'IXJ', 'DHM',
        'KUU', 'IMF', 'AJL', 'DMU', 'SHL', 'IXA', 'DIB', 'IXS',
        'JRH', 'TEZ', 'HGI', 'GAY', 'DBR', 'IXW', 'DGO', 'IXZ',
        'AGX', 'JRG', 'AYJ', 'KNU', 'BEK', 'HJR', 'BUP', 'AGR',
        'PYG', 'GOP', 'VDY', 'GBI', 'RQY', 'IXY', 'PBD', 'IXK',
        'KJB', 'RJA', 'CDP', 'TCR', 'BHU',
    ];

    for (const code of expectedIndianAirports) {
        const record = airports[code];
        assert.ok(record, `Airport ${code} should exist in dataset`);
        assert.equal(record.country, 'IN');
        assert.equal(record.zone, 'Asia/Kolkata');
        assert.ok(record.name && record.name.length > 0);
        assert.ok(record.city && record.city.length > 0);
        assert.ok(typeof record.lat === 'number');
        assert.ok(typeof record.lng === 'number');
    }
});

test('EDIT 5: international passenger hubs exist in database', () => {
    const intlHubs = ['DXB', 'JFK', 'LHR', 'SIN', 'BKK', 'KUL', 'DOH'];
    for (const code of intlHubs) {
        const record = airports[code];
        assert.ok(record, `International airport ${code} should exist in dataset`);
        assert.notEqual(record.country, 'IN');
        assert.ok(record.zone && record.zone.length > 0);
    }
});

test('EDIT 5: no duplicate airport codes in database', () => {
    const codes = Object.keys(airports);
    const uniqueCodes = new Set(codes);
    assert.equal(codes.length, uniqueCodes.size);
});

// =========================================================================
// EDIT 6 — Plain-language checked-baggage options
// =========================================================================
test('EDIT 6: "through" baggage option adds no recheck time allowance', () => {
    const throughTrip: Trip = {
        ...base,
        arrivalAirport: 'BLR',
        departureAirport: 'BLR',
        airline: 'IndiGo',
        flight: '6E 101',
        entry: 'yes',
        terminal: 'no',
        baggage: 'through',
        routeOut: 30,
        routeBack: 30,
    };
    const pThrough = calculate(throughTrip);

    const recheckTrip: Trip = {
        ...throughTrip,
        baggage: 'recheck',
    };
    const pRecheck = calculate(recheckTrip);

    // Recheck reduces usable excursion time compared to bags checked through
    assert.ok(pRecheck.usable < pThrough.usable);
    assert.equal(pThrough.usable - pRecheck.usable, 40);
});

test('EDIT 6: "unknown" baggage option uses conservative planning assumption', () => {
    const unknownBaggageTrip: Trip = {
        ...base,
        arrivalAirport: 'BLR',
        departureAirport: 'BLR',
        airline: 'IndiGo',
        flight: '6E 101',
        entry: 'yes',
        terminal: 'no',
        baggage: 'unknown',
        routeOut: 30,
        routeBack: 30,
    };
    const result = calculate(unknownBaggageTrip);
    // Assumes collection and recheck (+85 minutes) and adds caution to missing assumptions
    assert.ok(result.missing.some(m => m.includes('Baggage handling unresolved')));
    assert.equal(result.status, 'TIGHT');
});

test('EDIT 6: legacy "none" baggage option preserves compatibility without adding recheck time', () => {
    const noneTrip: Trip = {
        ...base,
        arrivalAirport: 'BLR',
        departureAirport: 'BLR',
        airline: 'IndiGo',
        flight: '6E 101',
        entry: 'yes',
        terminal: 'no',
        baggage: 'none',
        routeOut: 30,
        routeBack: 30,
    };
    const throughTrip: Trip = {
        ...noneTrip,
        baggage: 'through',
    };
    assert.equal(calculate(noneTrip).usable, calculate(throughTrip).usable);
});
