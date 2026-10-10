# Codex backend handoff

## What exists

The UI is React/TypeScript in `src/`, with a standalone Vite entry at `src/main.tsx` and a retained Vinext wrapper at `app/page.tsx`. All authoritative timing logic remains in `lib/aika/engine.ts`. Existing Google/Gemini/weather code and validation remain in `lib/aika/server.ts`; `app/api/` hosts those handlers. The default frontend uses local demo adapters, not network stubs that claim to be live.

`src/models/contracts.ts` defines AuthService, TripsService, PlannerService and HelpService contracts. Supabase email/password Auth is implemented in `src/services/supabase-auth.ts` and selected when the browser client is configured; demo Auth remains the fallback. Auth sessions are verified on restore and auth events before being exposed as authenticated. `src/services/demo.ts` contains the explicit in-memory trip/help implementations. `src/services/api.ts` contains an opt-in planning HTTP adapter. `src/services/config.ts` accepts only public configuration. `PlannerContext` coordinates session state and planner screens.

## Integration sequence

1. Configure Supabase Auth dashboard URLs, email confirmation and production SMTP as documented in `docs/SUPABASE_AUTH_SETUP.md`. Browser Auth is implemented; the browser uses only the public project URL and publishable key.
2. Add a PostgreSQL migration for profiles and trips. Use a verified auth identity, not a browser-provided owner ID. Store the authoritative Trip input plus status, provenance, timestamps and destination selection; recalculate output rather than trusting browser-submitted timing. Enable RLS and explicit owner policies for SELECT/INSERT/UPDATE/DELETE. Keep the service-role key server-side. Test two independent users before claiming private storage works.
3. Implement TripsService against authenticated backend endpoints. The UI already exposes list, create, view, edit, update status, check again and confirmed deletion. Replace in-memory calls rather than creating a second dashboard. Preserve guest work during authentication and require an explicit save. New planning creates a fresh record; edits use the selected record ID.
4. Replace the small airport catalog with a sourced, maintained dataset plus IANA zones. Arrival selections must be confirmed Indian domestic-passenger airports; do not infer current passenger operations from country alone. Preserve the accessible search/select component and the central zone-validation rules.
5. Connect planning to the existing `/api/plan` and `/api/plan/recalculate` services. Configuring VITE_SERVICE_MODE=api opts into the existing server; do not silently switch auth/trip services to fake secure behavior. Default demo mode still makes zero planning API calls. Deploy the full-stack build and remove the static hosting declaration when serving APIs. Respect same-origin mutation rules.
6. Reuse the existing server-side Gemini client and configured GEMINI_MODEL. Add a minimal, validated help endpoint with rate limits, request limits and timeouts. Send only the needed active-plan summary after authenticating ownership; never forward full trip history or credentials. HelpService should report source gemini only on an actual provider response. Local FAQ remains an honest fallback.
7. Connect destination/routing/weather providers with validated responses and data provenance. Google Places map results require a compatible Google map; do not plot them on the OSM demo map. Do not claim live queues, opening hours, baggage rules or terminals from an AI response. Weather currently shows unavailable; the rain checkbox is explicitly hypothetical. Map markers never imply verified road geometry.
8. Verify the complete application in a browser at 320px, 375px, tablet and desktop, with keyboard and reduced-motion tests. Check console/network errors, map loading, email reset links and routing. Automated service tests do not replace that browser check.

## Current constraints to carry forward

- Demo auth remains available without Supabase configuration and is not an access control boundary. Real Auth sessions are used only when Supabase Auth is configured and verified.
- Demo trips and chat are memory-only, cleared on refresh or logout. No database has been connected or tested.
- Trips are not automatically completed based on flight dates; the user chooses status.
- One layover and one outside destination are supported per plan. Multiple legs are a later extension to the typed model, not a fake implemented control.
- Airline and a broadly formatted connecting flight number are required. They do not confirm live flight status.
- Unknown eligibility blocks outside recommendations. Missing route or timezone information prevents a confident assessment.
- Airport process defaults are estimates, never live queues. Confirmed earlier boarding/check-in deadlines override the return target.
- The fixed +30-minute hypothetical-rain allowance is a user-selected simulation rule, not a forecast or a claim of flight delay.

## Suggested future endpoints (not implemented here)

Use the provider's official authentication flow. Add authenticated `/api/trips` and `/api/trips/:id`, plus `/api/help/chat` and `/api/airport-logistics/estimate` only when real behavior exists. Validate input and ownership in the backend and database. Return safe error codes, no credentials or stack traces, and explicit source/freshness metadata.

## Environment and deployment

Frontend: `pnpm dev`, `pnpm build`, `pnpm preview`; output `out/`. No database or API credentials required. Hash routes are intentionally compatible with static hosts.

Retained full stack: `pnpm dev:full`, `pnpm build:full`, `pnpm start:full`. Existing Worker/Vinext integration must be retained for Sites; other deployment platforms need a compatible runtime or an intentional port. Never serve static `out/` and assume it contains server APIs.

Private Sites access is imposed before app code. AIKA's demo login does not bypass it. The downloadable frontend can be independently hosted; public exposure of the existing private Site is a separate audience change.
