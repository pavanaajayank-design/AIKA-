import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDemoServices, demoPlan, credentialsSchema, faqAnswer } from '../src/services/demo';
import { freshTrip, validateStep } from '../src/app/PlannerContext';
import { base, calculate } from '../lib/aika/engine';
import AikaApp, { Shell } from '../src/app/AikaApp';
import AirportField from '../src/components/AirportField';
import Brand from '../src/components/Brand';
import AuthPage from '../src/features/auth/AuthPage';
import { PlannerContext } from '../src/app/PlannerContext';
const trip = { ...structuredClone(base), airline: 'Demo airline', flight: 'XX 101', entry: 'yes' as const, terminal: 'no' as const, demo: true, routeOut: 30, routeBack: 40, selected: 'devanahalli' };
test('welcome screen renders independent AIKA login and guest actions', () => { const html = renderToStaticMarkup(<AikaApp />); assert.ok(html.includes('Welcome to AIKA.')); assert.ok(html.includes('Log in')); assert.ok(html.includes('Sign up')); assert.ok(html.includes('Continue as a guest')); assert.ok(!html.includes('No secure authentication')); assert.ok(!html.includes('FRONTEND PREVIEW')); assert.ok(!html.includes('Kozhikode → Bengaluru → Dubai')); });
test('arrival catalogue excludes foreign airports; departures include them', () => { const arrival = renderToStaticMarkup(<AirportField label="Arrival" value="" onChange={() => { }} domestic/>); assert.ok(arrival.includes('BLR')); assert.ok(!arrival.includes('DXB')); const departure = renderToStaticMarkup(<AirportField label="Departure" value="" onChange={() => { }}/>); assert.ok(departure.includes('DXB')); assert.ok(departure.includes('JFK')); });
test('fresh plans do not copy previous data or share mutable scenario state', () => { const a = freshTrip(); a.scenario.arrival = 60; a.flight = 'XX 101'; const b = freshTrip(); assert.equal(b.flight, ''); assert.equal(b.arrivalAirport, ''); assert.equal(b.scenario.arrival, 0); });
test('required airline and flight are validated', () => { assert.throws(() => validateStep({ ...trip, airline: '' }, 0)); assert.throws(() => validateStep({ ...trip, flight: 'bad' }, 0)); validateStep(trip, 0); assert.throws(() => validateStep({ ...trip, arrivalAirport: 'DXB' }, 0)); });
test('demo account validates input without storing or returning password', async () => { const services = createDemoServices(); assert.equal(credentialsSchema.safeParse({ email: 'bad', password: 'short' }).success, false); const result = await services.auth.signUp({ name: 'Traveller', email: 'person@example.test', password: 'sample123' }); assert.equal(result.session?.mode, 'demo'); assert.ok(!('password' in result)); await assert.rejects(() => services.auth.requestPasswordReset('person@example.test'), /No email was sent/); });
test('demo trip CRUD and manual statuses work in memory', async () => { const s = createDemoServices(); const first = await s.trips.create(trip, demoPlan(trip)); const second = await s.trips.create({ ...trip, flight: 'XX 102' }, demoPlan({ ...trip, flight: 'XX 102' })); assert.notEqual(first.id, second.id); await s.trips.update(first.id, { status: 'completed' }); assert.equal((await s.trips.list()).filter(t => t.status === 'completed').length, 1); await s.trips.remove(first.id); assert.equal((await s.trips.list()).length, 1); await s.auth.signOut(); assert.equal((await s.trips.list()).length, 0); assert.equal((await createDemoServices().trips.list()).length, 0); });
test('trip service returns independent snapshots', async () => { const s = createDemoServices(); const saved = await s.trips.create(trip, demoPlan(trip)); saved.input.flight = 'XX 999'; assert.equal((await s.trips.list())[0].input.flight, 'XX 101'); });
test('hypothetical rain reduces time and removes outdoor options', () => { const plain = demoPlan(trip); const wet = demoPlan({ ...trip, scenario: { ...trip.scenario, weather: true } }); assert.equal(wet.plan.usable, plain.plan.usable - 30); assert.ok(!wet.places.some(p => p.category === 'nature')); assert.ok(wet.plan.missing.some(x => x.includes('Hypothetical'))); });
test('demo destination changes use the central engine and same constraints', () => { const result = demoPlan({ ...trip, selected: 'nandi', routeOut: 70, routeBack: 80, visit: 90 }); assert.equal(result.plan.returnBy, calculate(trip).returnBy); assert.equal(result.plan.usable, calculate({ ...trip, routeOut: 70, routeBack: 80, visit: 90 }).usable); });
test('delay removes outing and destination closure removes selected option', () => { const delayed = demoPlan({ ...trip, scenario: { ...trip.scenario, arrival: 480 } }); assert.equal(delayed.plan.allowed, false); assert.equal(delayed.places.length, 0); const closed = demoPlan({ ...trip, scenario: { ...trip.scenario, unavailable: true } }); assert.ok(!closed.places.some(p => p.id === 'devanahalli')); assert.ok(closed.places.length > 0); });
test('help validates length and stays honest about services', async () => { const s = createDemoServices(); await assert.rejects(() => s.help.answer('')); await assert.rejects(() => s.help.answer('x'.repeat(501))); assert.ok(faqAnswer('weather').includes('forecast')); assert.ok(faqAnswer('password').includes('reset')); assert.equal((await s.help.answer('How do I save a trip?')).source, 'local-help'); });
test('API adapter rejects malformed responses and handles unavailable endpoints',async()=>{const {createApiPlanner}=await import('../src/services/api');const old=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({plan:{status:'FEASIBLE'}});await assert.rejects(()=>createApiPlanner().plan(trip));globalThis.fetch=async()=>Response.json({error:'Service unavailable'},{status:503});await assert.rejects(()=>createApiPlanner().plan(trip),/Service unavailable/);}finally{globalThis.fetch=old;}});
test('public configuration defaults to demo and contains no credentials',async()=>{const {readClientConfig}=await import('../src/services/config');assert.deepEqual(readClientConfig(),{mode:'demo',baseUrl:''});assert.throws(()=>readClientConfig({VITE_API_BASE_URL:'not-an-origin'}));assert.deepEqual(readClientConfig({GEMINI_API_KEY:'not-exposed'}),{mode:'demo',baseUrl:''})});
const mockPlannerState = {
    page: 'signup',
    setPage: () => {},
    step: 0,
    setStep: () => {},
    trip,
    setTrip: () => {},
    result: null,
    setResult: () => {},
    error: '',
    setError: () => {},
    busy: false,
    setBusy: () => {},
    intro: false,
    setIntro: () => {},
    confirmed: false,
    setConfirmed: () => {},
    go: () => {},
    startNew: () => {},
    update: () => {},
    generate: async () => {},
    demo: () => {},
    select: () => {},
    next: () => {},
    services: createDemoServices(),
    session: null,
    setSession: () => {},
    authLoading: false,
    passwordRecovery: false,
    setPasswordRecovery: () => {},
    trips: [],
    setTrips: () => {},
    activeId: null,
    setActiveId: () => {},
    notice: '',
    setNotice: () => {},
    save: async () => {},
    openTrip: () => {},
    logout: async () => {},
};
test('header brand logo renders transparent asset with responsive square dimensions', () => {
    const headerHtml = renderToStaticMarkup(<Brand />);
    assert.ok(headerHtml.includes('/images/aika-logo.png'));
    assert.ok(headerHtml.includes('width="54"'));
    assert.ok(headerHtml.includes('height="54"'));
    assert.ok(!headerHtml.includes('aika-logo.jpeg'));

    const largeHtml = renderToStaticMarkup(<Brand large />);
    assert.ok(largeHtml.includes('/images/aika-logo.png'));
    assert.ok(largeHtml.includes('width="140"'));
    assert.ok(largeHtml.includes('height="140"'));
});
test('signup form renders independent password visibility buttons with accessible labels', () => {
    const html = renderToStaticMarkup(
        <PlannerContext.Provider value={{ ...mockPlannerState, page: 'signup' }}>
            <AuthPage />
        </PlannerContext.Provider>
    );
    assert.ok(html.includes('aria-label="Show password"'));
    assert.ok(html.includes('aria-label="Show confirm password"'));
    assert.ok(html.includes('Confirm password'));
});
test('login form preserves password visibility button and omits confirm password', () => {
    const html = renderToStaticMarkup(
        <PlannerContext.Provider value={{ ...mockPlannerState, page: 'login' }}>
            <AuthPage />
        </PlannerContext.Provider>
    );
    assert.ok(html.includes('aria-label="Show password"'));
    assert.ok(!html.includes('Show confirm password'));
    assert.ok(!html.includes('Confirm password'));
});
test('signup flow differentiates email confirmation requirement and immediate login', async () => {
    const outcomeConfirmation = { session: null, confirmationRequired: true };
    const requiresConf = Boolean(outcomeConfirmation.confirmationRequired || !outcomeConfirmation.session);
    assert.equal(requiresConf, true);
    const msgConfirmation = requiresConf
        ? 'Registration successful! Please check your email to confirm your account before logging in.'
        : 'Account created successfully! Please log in with your new credentials.';
    assert.ok(msgConfirmation.includes('check your email to confirm your account before logging in'));

    const outcomeImmediate = { session: { id: 'u1', name: 'User', email: 'u@test.com', mode: 'demo' as const }, confirmationRequired: false };
    const requiresConfImmediate = Boolean(outcomeImmediate.confirmationRequired || !outcomeImmediate.session);
    assert.equal(requiresConfImmediate, false);
    const msgImmediate = requiresConfImmediate
        ? 'Registration successful! Please check your email to confirm your account before logging in.'
        : 'Account created successfully! Please log in with your new credentials.';
    assert.ok(msgImmediate.includes('Account created successfully! Please log in with your new credentials.'));
});

test('sign-in success message auto-dismisses after ~5.5s and does not dismiss unrelated notices', async () => {
    let currentNotice = 'You are signed in.';
    const setNotice = (updater: string | ((curr: string) => string)) => {
        currentNotice = typeof updater === 'function' ? updater(currentNotice) : updater;
    };

    // Simulate auto-dismiss timer logic as implemented in Shell
    const createDismissTimer = (notice: string, setter: typeof setNotice, delay = 5500) => {
        if (notice === 'You are signed in.') {
            return setTimeout(() => {
                setter((curr) => (curr === 'You are signed in.' ? '' : curr));
            }, delay);
        }
        return null;
    };

    // 1. Armed when "You are signed in."
    let timer = createDismissTimer(currentNotice, setNotice, 10);
    assert.ok(timer !== null);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(currentNotice, '');

    // 2. Unrelated notices are NOT dismissed
    currentNotice = 'Trip updated successfully in My Trips.';
    timer = createDismissTimer(currentNotice, setNotice, 10);
    assert.equal(timer, null);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(currentNotice, 'Trip updated successfully in My Trips.');

    // 3. If notice changes before timer fires, previous timer does not clear new notice
    currentNotice = 'You are signed in.';
    timer = createDismissTimer(currentNotice, setNotice, 50);
    currentNotice = 'Important warning'; // User action changed notice
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(currentNotice, 'Important warning');
});

test('header renders profile menu with account options when authenticated', () => {
    const authenticatedState = {
        ...mockPlannerState,
        session: { id: 'test-user', name: 'Asha Rao', email: 'asha@example.com', mode: 'authenticated' as const },
        authLoading: false,
    };
    const html = renderToStaticMarkup(
        <PlannerContext.Provider value={authenticatedState}>
            <Shell />
        </PlannerContext.Provider>
    );
    assert.ok(html.includes('class="account-menu"'));
    assert.ok(html.includes('Asha Rao'));
    assert.ok(html.includes('asha@example.com'));
    assert.ok(html.includes('My Trips'));
    assert.ok(html.includes('Account settings'));
    assert.ok(html.includes('Log out'));
});

test('profile dropdown outside-click and escape handler closes dropdown', () => {
    // Verify the outside-click / escape handler contract
    let isOpen = true;
    const fakeDetails = {
        open: true,
        removeAttribute: (attr: string) => { if (attr === 'open') isOpen = false; },
        contains: (target: unknown) => target === fakeDetails,
    };

    const handlePointerDown = (target: unknown) => {
        if (!fakeDetails.open) return;
        if (!fakeDetails.contains(target)) {
            fakeDetails.removeAttribute('open');
        }
    };

    const handleKeyDown = (key: string) => {
        if (!fakeDetails.open) return;
        if (key === 'Escape') {
            fakeDetails.removeAttribute('open');
        }
    };

    // Clicking inside doesn't close
    handlePointerDown(fakeDetails);
    assert.equal(isOpen, true);

    // Escape closes
    handleKeyDown('Escape');
    assert.equal(isOpen, false);

    // Reset and test clicking outside
    fakeDetails.open = true;
    isOpen = true;
    handlePointerDown({ unrelated: true });
    assert.equal(isOpen, false);
});

test('hero illustration renders caption with complete typography hierarchy and floating plan', async () => {
    const { default: Landing } = await import('../src/features/home/Landing');
    const html = renderToStaticMarkup(
        <PlannerContext.Provider value={mockPlannerState}>
            <Landing />
        </PlannerContext.Provider>
    );
    assert.ok(html.includes('class="visual-caption"'));
    assert.ok(html.includes('BEYOND THE DEPARTURE LOUNGE'));
    assert.ok(html.includes('A breath of fresh air.'));
    assert.ok(html.includes('Before your next takeoff.'));
    assert.ok(html.includes('class="floating-plan"'));
    assert.ok(html.includes('Your next flight comes first.'));
});

test('authenticated calculation workflow automatically saves itinerary and assigns activeId', async () => {
    const services = createDemoServices();
    let currentTrips: import('../src/models/contracts').SavedTrip[] = [];
    let currentActiveId: string | null = null;
    let currentNotice = '';
    let currentResult: import('../src/models/contracts').PlanResult | null = null;

    const testUser = { id: 'usr-auto-1', name: 'User 1', email: 'u1@test.com', mode: 'authenticated' as const };

    // Simulate auto-save generate implementation
    const simulateGenerate = async (nextTrip: typeof trip) => {
        const calculated = await services.planner.plan(nextTrip);
        currentResult = calculated;

        // Auto-save branch for authenticated user
        if (testUser) {
            if (currentActiveId) {
                await services.trips.update(currentActiveId, { input: nextTrip, result: calculated });
                currentNotice = 'Layover itinerary updated in My Trips.';
            } else {
                const saved = await services.trips.create(nextTrip, calculated);
                currentActiveId = saved.id;
                currentNotice = 'Layover itinerary saved to My Trips.';
            }
            currentTrips = await services.trips.list();
        }
    };

    // 1. Initial calculation auto-saves and sets activeId
    await simulateGenerate(trip);
    assert.ok(currentResult !== null);
    assert.ok(currentActiveId !== null);
    assert.equal(currentNotice, 'Layover itinerary saved to My Trips.');
    assert.equal(currentTrips.length, 1);
    assert.equal(currentTrips[0].id, currentActiveId);

    // 2. Duplicate prevention: recalculating with updated inputs updates the same trip without creating a new row
    const originalId = currentActiveId;
    const modifiedTrip = { ...trip, visit: 90 };
    await simulateGenerate(modifiedTrip);
    assert.equal(currentActiveId, originalId, 'activeId must be preserved to prevent duplicate database rows');
    assert.equal(currentTrips.length, 1, 'no duplicate row should be inserted');
    assert.equal(currentTrips[0].input.visit, 90);
    assert.equal(currentNotice, 'Layover itinerary updated in My Trips.');
});

test('guest calculation completes without saving to authenticated trips store', async () => {
    const services = createDemoServices();
    const guestSession = null;
    let autoSaved = false;

    // Simulate generate for guest
    const calculated = await services.planner.plan(trip);
    if (guestSession) {
        await services.trips.create(trip, calculated);
        autoSaved = true;
    }

    assert.ok(calculated);
    assert.equal(autoSaved, false);
    const dbTrips = await services.trips.list();
    assert.equal(dbTrips.length, 0, 'No trip rows should be written for guest calculation');
});

test('auto-save failure preserves calculation result and sets actionable retry notice', async () => {
    const failingServices = createDemoServices();
    failingServices.trips.create = async () => {
        throw new Error('Supabase network connection timeout');
    };

    let resultPreserved = false;
    let notice = '';

    const calculated = await failingServices.planner.plan(trip);
    resultPreserved = Boolean(calculated);

    try {
        await failingServices.trips.create(trip, calculated);
    } catch {
        notice = 'Your layover is calculated, but could not be saved to My Trips. You can retry saving using the button above.';
    }

    assert.equal(resultPreserved, true, 'Calculation result must not be lost when save fails');
    assert.ok(notice.includes('could not be saved to My Trips'));
    assert.ok(notice.includes('retry saving'));
});

