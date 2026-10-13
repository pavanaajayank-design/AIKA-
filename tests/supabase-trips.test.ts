import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseTripsService } from '../src/services/supabase-trips';
import { base } from '../lib/aika/engine';
import { demoPlan } from '../src/services/demo';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockTrip = {
  ...structuredClone(base),
  airline: 'IndiGo',
  flight: '6E 2134',
  arrivalAirport: 'BLR',
  departureAirport: 'BLR',
  origin: 'DEL',
  destination: 'BOM',
  entry: 'yes' as const,
  terminal: 'no' as const,
  demo: false,
  routeOut: 30,
  routeBack: 40,
  selected: 'custom',
};

test('supabase trips service handles guest CRUD when unauthenticated', async () => {
  const mockClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient;

  const service = createSupabaseTripsService(mockClient);
  service.clear();

  const plan = demoPlan(mockTrip);
  const created = await service.create(mockTrip, plan);

  assert.ok(created.id.startsWith('guest-'));
  assert.equal(created.title, 'BLR layover');
  assert.equal(created.status, 'upcoming');

  const list = await service.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);

  const updated = await service.update(created.id, { status: 'completed' });
  assert.equal(updated.status, 'completed');

  await service.remove(created.id);
  const afterRemove = await service.list();
  assert.equal(afterRemove.length, 0);
});

test('supabase trips service interacts with Supabase client when authenticated', async () => {
  const store = new Map<string, Record<string, unknown>>();
  const testUser = { id: 'user-uuid-123', email: 'traveller@aika.test' };

  const mockClient = {
    auth: {
      getUser: async () => ({ data: { user: testUser }, error: null }),
    },
    from: (table: string) => {
      assert.equal(table, 'trips');
      return {
        select: () => ({
          order: () => ({
            data: Array.from(store.values()),
            error: null,
          }),
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: () => {
              const id = 'db-' + Math.random().toString(36).slice(2);
              const record = { ...row, id };
              store.set(id, record);
              return { data: record, error: null };
            },
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => ({
            select: () => ({
              single: () => {
                const existing = store.get(id);
                if (!existing) return { data: null, error: { message: 'Not found' } };
                const updated = { ...existing, ...payload };
                store.set(id, updated);
                return { data: updated, error: null };
              },
            }),
          }),
        }),
        delete: () => ({
          eq: (_col: string, id: string) => {
            store.delete(id);
            return { error: null };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;

  const service = createSupabaseTripsService(mockClient);
  const plan = demoPlan(mockTrip);

  const created = await service.create(mockTrip, plan);
  assert.ok(created.id.startsWith('db-'));
  assert.equal(created.title, 'BLR layover');
  assert.equal(created.source, 'database');

  const list = await service.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);

  const updated = await service.update(created.id, { status: 'in-progress' });
  assert.equal(updated.status, 'in-progress');

  await service.remove(created.id);
  const finalList = await service.list();
  assert.equal(finalList.length, 0);
});
