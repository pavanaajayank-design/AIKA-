import type { Trip } from '../../lib/aika/engine';
import { base } from '../../lib/aika/engine';
import type { PlanResult } from '../models/contracts';

export const GUEST_DRAFT_KEY = 'aika_draft_guest';
export const USER_DRAFT_PREFIX = 'aika_draft_';
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PlannerDraft {
  version: 1;
  updatedAt: number;
  page: string;
  step: number;
  trip: Trip;
  result: PlanResult | null;
  activeId: string | null;
  confirmed: boolean;
}

const VALID_PAGES = new Set([
  'home',
  'welcome',
  'login',
  'signup',
  'forgot',
  'planner',
  'results',
  'how',
  'privacy',
  'trips',
  'account',
]);

const inMemoryDrafts = new Map<string, string>();

export function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, val: string) => void;
  removeItem: (key: string) => void;
} {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => inMemoryDrafts.get(key) ?? null,
    setItem: (key: string, val: string) => {
      inMemoryDrafts.set(key, val);
    },
    removeItem: (key: string) => {
      inMemoryDrafts.delete(key);
    },
  };
}

export function getDraftKey(userId?: string | null): string {
  return userId ? `${USER_DRAFT_PREFIX}${userId}` : GUEST_DRAFT_KEY;
}

export function saveDraft(
  userId: string | null | undefined,
  data: Omit<PlannerDraft, 'version' | 'updatedAt'>
): void {
  try {
    const storage = getStorage();
    const key = getDraftKey(userId);
    const draft: PlannerDraft = {
      version: 1,
      updatedAt: Date.now(),
      ...data,
    };
    storage.setItem(key, JSON.stringify(draft));
  } catch {
    // Gracefully handle storage quota or private-browsing restrictions
  }
}

export function loadDraft(userId?: string | null): PlannerDraft | null {
  try {
    const storage = getStorage();
    const key = getDraftKey(userId);
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return null;

    if (typeof parsed.updatedAt === 'number' && Date.now() - parsed.updatedAt > DRAFT_TTL_MS) {
      storage.removeItem(key);
      return null;
    }

    const step =
      typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step <= 3 ? parsed.step : 0;

    const baseTrip: Trip = {
      ...structuredClone(base),
      origin: '',
      destination: '',
      arrivalAirport: '',
      departureAirport: '',
      arrival: '',
      departure: '',
      airline: '',
      flight: '',
      entry: 'unknown',
      terminal: 'unknown',
      demo: false,
    };

    const trip: Trip = {
      ...baseTrip,
      ...(parsed.trip && typeof parsed.trip === 'object' ? parsed.trip : {}),
      scenario: {
        ...baseTrip.scenario,
        ...(parsed.trip?.scenario && typeof parsed.trip.scenario === 'object'
          ? parsed.trip.scenario
          : {}),
      },
    };

    let page =
      typeof parsed.page === 'string' && VALID_PAGES.has(parsed.page) ? parsed.page : 'welcome';
    if (page === 'results' && !parsed.result) {
      page = 'planner';
    }

    return {
      version: 1,
      updatedAt: parsed.updatedAt,
      page,
      step,
      trip,
      result:
        parsed.result && typeof parsed.result === 'object' && parsed.result.plan
          ? parsed.result
          : null,
      activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
      confirmed: Boolean(parsed.confirmed),
    };
  } catch {
    return null;
  }
}

export function clearDraft(userId?: string | null): void {
  try {
    const storage = getStorage();
    const key = getDraftKey(userId);
    storage.removeItem(key);
  } catch {
    // Ignore
  }
}
