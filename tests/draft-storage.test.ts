import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  getDraftKey,
  getStorage,
  GUEST_DRAFT_KEY,
  USER_DRAFT_PREFIX,
  DRAFT_TTL_MS,
  type PlannerDraft,
} from '../src/services/draft-storage';
import { base, type Trip } from '../lib/aika/engine';
import { demoPlan } from '../src/services/demo';

const mockTrip: Trip = {
  ...structuredClone(base),
  airline: 'Air India',
  flight: 'AI 505',
  arrivalAirport: 'DEL',
  departureAirport: 'DEL',
  origin: 'BOM',
  destination: 'LHR',
  arrival: '2026-11-10T08:00',
  departure: '2026-11-10T18:00',
  entry: 'yes',
  baggage: 'none',
  terminal: 'no',
  tickets: 'one',
  internationalArrival: false,
  internationalDeparture: true,
  immigration: 40,
  security: 35,
  exit: 25,
  gate: 25,
  airportBuffer: 180,
  contingency: 45,
  boarding: '',
  checkin: '',
  interest: 'food',
  transport: 'taxi',
  pace: 'relaxed',
  style: 'conservative',
  budget: 'medium',
  mobility: true,
  maxDestinations: 1,
  routeOut: 45,
  routeBack: 45,
  visit: 90,
  demo: false,
  selected: 'custom',
  scenario: { arrival: 15, outbound: 0, return: 0, processing: 0, visit: 0, unavailable: false, weather: false },
};

test('draft storage keys correctly separate guest from authenticated users', () => {
  assert.equal(getDraftKey(null), GUEST_DRAFT_KEY);
  assert.equal(getDraftKey(undefined), GUEST_DRAFT_KEY);
  assert.equal(getDraftKey(''), GUEST_DRAFT_KEY);
  assert.equal(getDraftKey('user_abc'), `${USER_DRAFT_PREFIX}user_abc`);
  assert.equal(getDraftKey('user_xyz'), `${USER_DRAFT_PREFIX}user_xyz`);
});

test('guest draft saves and restores accurately across sessions', () => {
  clearDraft(null);

  const draftData = {
    page: 'planner',
    step: 2,
    trip: mockTrip,
    result: null,
    activeId: null,
    confirmed: false,
  };

  saveDraft(null, draftData);
  const loaded = loadDraft(null);

  assert.ok(loaded);
  assert.equal(loaded.page, 'planner');
  assert.equal(loaded.step, 2);
  assert.equal(loaded.trip.flight, 'AI 505');
  assert.equal(loaded.trip.airline, 'Air India');
  assert.equal(loaded.trip.arrivalAirport, 'DEL');
  assert.equal(loaded.trip.mobility, true);
  assert.equal(loaded.trip.visit, 90);
  assert.equal(loaded.trip.scenario.arrival, 15);
  assert.equal(loaded.result, null);
  assert.equal(loaded.activeId, null);

  clearDraft(null);
  assert.equal(loadDraft(null), null);
});

test('account separation: guest and authenticated user drafts remain completely isolated', () => {
  const userId = 'usr_separate_999';
  clearDraft(null);
  clearDraft(userId);

  // Save guest draft
  saveDraft(null, {
    page: 'planner',
    step: 1,
    trip: { ...mockTrip, flight: 'GUEST_FLIGHT' },
    result: null,
    activeId: null,
    confirmed: false,
  });

  // Save authenticated user draft
  const userPlan = demoPlan(mockTrip);
  saveDraft(userId, {
    page: 'results',
    step: 3,
    trip: { ...mockTrip, flight: 'USER_FLIGHT' },
    result: userPlan,
    activeId: 'trip-db-123',
    confirmed: true,
  });

  // Verify guest draft was not overwritten
  const guestLoaded = loadDraft(null);
  assert.ok(guestLoaded);
  assert.equal(guestLoaded.step, 1);
  assert.equal(guestLoaded.trip.flight, 'GUEST_FLIGHT');
  assert.equal(guestLoaded.activeId, null);

  // Verify user draft is distinct
  const userLoaded = loadDraft(userId);
  assert.ok(userLoaded);
  assert.equal(userLoaded.page, 'results');
  assert.equal(userLoaded.step, 3);
  assert.equal(userLoaded.trip.flight, 'USER_FLIGHT');
  assert.equal(userLoaded.activeId, 'trip-db-123');
  assert.ok(userLoaded.result);

  clearDraft(null);
  clearDraft(userId);
});

test('stale drafts older than 7 days are automatically discarded', () => {
  const staleUserId = 'usr_stale_1';
  clearDraft(staleUserId);
  const storage = getStorage();

  // Manually insert an expired draft into storage
  const expiredTimestamp = Date.now() - (DRAFT_TTL_MS + 60000); // 7 days + 1 min ago
  const expiredDraft: PlannerDraft = {
    version: 1,
    updatedAt: expiredTimestamp,
    page: 'planner',
    step: 3,
    trip: mockTrip,
    result: null,
    activeId: null,
    confirmed: true,
  };

  storage.setItem(getDraftKey(staleUserId), JSON.stringify(expiredDraft));

  // Loading expired draft should return null and clear the key
  const loaded = loadDraft(staleUserId);
  assert.equal(loaded, null);
  assert.equal(storage.getItem(getDraftKey(staleUserId)), null);
});

test('corrupted or invalid storage content falls back gracefully without crashing', () => {
  const badUserId = 'usr_corrupted_1';
  clearDraft(badUserId);
  const storage = getStorage();

  // Malformed JSON
  storage.setItem(getDraftKey(badUserId), '{invalid-json');
  assert.equal(loadDraft(badUserId), null);

  // Wrong version
  storage.setItem(getDraftKey(badUserId), JSON.stringify({ version: 999, updatedAt: Date.now() }));
  assert.equal(loadDraft(badUserId), null);

  // Invalid step number clamped to 0..3
  storage.setItem(
    getDraftKey(badUserId),
    JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      step: 10,
      page: 'planner',
      trip: { airline: 'Partial' },
    })
  );
  const recovered = loadDraft(badUserId);
  assert.ok(recovered);
  assert.equal(recovered.step, 0); // clamped
  assert.equal(recovered.trip.airline, 'Partial');
  assert.equal(recovered.trip.origin, ''); // defaulted from freshTrip

  clearDraft(badUserId);
});
