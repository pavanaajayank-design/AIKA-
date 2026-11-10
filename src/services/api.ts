import { z } from 'zod';
import type { PlannerService, PlanResult, Forecast } from '../models/contracts';
import { calculate, schema, type Trip } from '../../lib/aika/engine';

const number = z.number().finite();

export const planResponseSchema = z.object({
  status: z.enum(['FEASIBLE', 'TIGHT', 'NOT_FEASIBLE', 'STAY_AIRPORT', 'NOT_ASSESSED']),
  label: z.string().max(100),
  reason: z.string().max(1000),
  total: number,
  usable: number,
  slack: number,
  required: number,
  returnBy: number,
  leave: number,
  exitAt: number,
  arrival: number,
  departure: number,
  zone: z.string(),
  departureZone: z.string(),
  missing: z.array(z.string()).max(50),
  breakdown: z.array(z.tuple([z.string(), number])).max(50),
  timeline: z.array(z.object({ name: z.string(), at: number })).max(50),
  allowed: z.boolean(),
  source: z.string(),
  weather: z.string(),
  explanation: z.string().max(2000),
});

const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  lat: number.min(-90).max(90),
  lng: number.min(-180).max(180),
  out: number.min(0),
  back: number.min(0),
  visit: number.min(0),
  description: z.string(),
  source: z.string(),
  assessment: planResponseSchema,
});

const resultSchema = z.object({
  plan: planResponseSchema,
  places: z.array(placeSchema).max(30),
  forecast: z
    .object({
      temperature: number,
      rain: number.min(0).max(100).nullable(),
      period: z.string(),
      fetchedAt: z.string().optional(),
    })
    .nullable(),
  aiAvailable: z.boolean(),
  providerMessage: z.string(),
});

/** Explicit opt-in planning adapter. Auth, trip storage and help stay in demo mode. */
export function createApiPlanner(baseUrl = ''): PlannerService & { weather?: (input: Trip) => Promise<Forecast | null> } {
  return {
    async plan(input: Trip): Promise<PlanResult> {
      schema.parse(input);

      // Distinguish between fresh plan generation and simulation recalculation
      const isRecalculation = Boolean(
        input.scenario && (
          input.scenario.arrival > 0 ||
          input.scenario.outbound > 0 ||
          input.scenario.return > 0 ||
          input.scenario.processing > 0 ||
          input.scenario.visit > 0 ||
          input.scenario.unavailable ||
          input.scenario.weather
        )
      );

      const endpoint = isRecalculation ? '/api/plan/recalculate' : '/api/plan';

      const response = await fetch(baseUrl + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        credentials: 'same-origin',
        signal: AbortSignal.timeout(25000),
      });

      const value: unknown = await response.json();
      if (!response.ok) {
        const error = z.object({ error: z.string().max(500) }).safeParse(value);
        throw Error(error.success ? error.data.error : 'The planning service is unavailable. Try again.');
      }

      const data = resultSchema.parse(value);
      const expected = calculate(input);
      if (
        data.plan.status !== expected.status ||
        data.plan.total !== expected.total ||
        data.plan.returnBy !== expected.returnBy
      ) {
        throw Error('The planning response did not match your inputs.');
      }

      return {
        ...data,
        forecast: data.forecast ? { ...data.forecast, source: 'provider' } : null,
        source: input.demo ? 'demo' : 'provider',
      } as PlanResult;
    },

    async weather(input: Trip): Promise<Forecast | null> {
      schema.parse(input);
      try {
        const response = await fetch(baseUrl + '/api/weather', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          credentials: 'same-origin',
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return null;
        const value: unknown = await response.json();
        const parsed = z.object({
          forecast: z.object({
            temperature: number,
            rain: number.min(0).max(100).nullable(),
            period: z.string(),
            fetchedAt: z.string().optional(),
          }).nullable(),
        }).safeParse(value);
        if (!parsed.success || !parsed.data.forecast) return null;
        return {
          ...parsed.data.forecast,
          source: 'provider',
        };
      } catch {
        return null;
      }
    },
  };
}
