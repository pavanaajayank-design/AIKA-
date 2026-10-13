import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanResult, SavedTrip, TripsService, TripStatus } from '../models/contracts';
import type { Trip } from '../../lib/aika/engine';

const GUEST_STORAGE_KEY = 'aika_saved_trips';
const inMemoryGuestStore = new Map<string, SavedTrip>();

function getGuestTrips(): SavedTrip[] {
  if (typeof window === 'undefined') {
    return Array.from(inMemoryGuestStore.values()).map(x => structuredClone(x));
  }
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return Array.from(inMemoryGuestStore.values()).map(x => structuredClone(x));
  }
}

function setGuestTrips(trips: SavedTrip[]): void {
  if (typeof window === 'undefined') {
    inMemoryGuestStore.clear();
    trips.forEach(t => inMemoryGuestStore.set(t.id, structuredClone(t)));
    return;
  }
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(trips));
  } catch {
    inMemoryGuestStore.clear();
    trips.forEach(t => inMemoryGuestStore.set(t.id, structuredClone(t)));
  }
}

function isGuestTrip(id: string): boolean {
  return getGuestTrips().some((t) => t.id === id);
}

function saveGuestTrip(input: Trip, result: PlanResult): SavedTrip {
  const now = new Date().toISOString();
  const trip: SavedTrip = {
    id: 'guest-' + crypto.randomUUID(),
    title: `${input.arrivalAirport} layover`,
    input: structuredClone(input),
    result: structuredClone(result),
    status: 'upcoming',
    createdAt: now,
    updatedAt: now,
    source: 'database',
  };
  const current = getGuestTrips();
  setGuestTrips([trip, ...current]);
  return trip;
}

function updateGuestTrip(
  id: string,
  change: Partial<Pick<SavedTrip, 'status' | 'title' | 'input' | 'result'>>
): SavedTrip {
  const current = getGuestTrips();
  const index = current.findIndex((t) => t.id === id);
  if (index === -1) {
    throw new Error('Trip not found.');
  }
  const updated: SavedTrip = {
    ...current[index],
    ...structuredClone(change),
    updatedAt: new Date().toISOString(),
  };
  current[index] = updated;
  setGuestTrips(current);
  return updated;
}

function removeGuestTrip(id: string): void {
  const current = getGuestTrips();
  setGuestTrips(current.filter((t) => t.id !== id));
}

function clearGuestTrips(): void {
  inMemoryGuestStore.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

interface SupabaseTripRow {
  id: string;
  user_id: string;
  title: string;
  status: TripStatus;
  input: Trip;
  result: PlanResult;
  created_at: string;
  updated_at: string;
}

function toSavedTrip(row: SupabaseTripRow): SavedTrip {
  return {
    id: row.id,
    title: row.title,
    input: row.input,
    result: row.result,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: 'database',
  };
}

export function createSupabaseTripsService(client: SupabaseClient): TripsService {
  return {
    async list(): Promise<SavedTrip[]> {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        return getGuestTrips();
      }

      const { data, error } = await client
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table does not exist in schema cache yet, fall back gracefully
        if (error.code === 'PGRST205') {
          return getGuestTrips();
        }
        throw new Error(error.message || 'Unable to load trips.');
      }

      return (data as SupabaseTripRow[]).map(toSavedTrip);
    },

    async create(input: Trip, result: PlanResult): Promise<SavedTrip> {
      const { data: { user } } = await client.auth.getUser();
      const title = `${input.arrivalAirport} layover`;
      const now = new Date().toISOString();

      if (!user) {
        return saveGuestTrip(input, result);
      }

      const { data, error } = await client
        .from('trips')
        .insert({
          user_id: user.id,
          title,
          status: 'upcoming',
          input,
          result,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205') {
          return saveGuestTrip(input, result);
        }
        throw new Error(error.message || 'Failed to save trip to database.');
      }

      return toSavedTrip(data as SupabaseTripRow);
    },

    async update(
      id: string,
      change: Partial<Pick<SavedTrip, 'status' | 'title' | 'input' | 'result'>>
    ): Promise<SavedTrip> {
      const { data: { user } } = await client.auth.getUser();
      const now = new Date().toISOString();

      if (!user || isGuestTrip(id)) {
        return updateGuestTrip(id, change);
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: now,
      };
      if (change.status) updatePayload.status = change.status;
      if (change.title) updatePayload.title = change.title;
      if (change.input) updatePayload.input = change.input;
      if (change.result) updatePayload.result = change.result;

      const { data, error } = await client
        .from('trips')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST205') {
          return updateGuestTrip(id, change);
        }
        throw new Error(error.message || 'Failed to update trip.');
      }

      return toSavedTrip(data as SupabaseTripRow);
    },

    async remove(id: string): Promise<void> {
      const { data: { user } } = await client.auth.getUser();
      if (!user || isGuestTrip(id)) {
        removeGuestTrip(id);
        return;
      }

      const { error } = await client
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST205') {
          removeGuestTrip(id);
          return;
        }
        throw new Error(error.message || 'Failed to delete trip.');
      }
    },

    clear(): void {
      clearGuestTrips();
    },
  };
}
