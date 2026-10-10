# AIKA — Explore on Time

Make every minute count. This development phase improves the existing AIKA frontend and prepares it for later backend integration in Codex.

## Quick start — no API keys needed

Install Node 22.13+ and pnpm, then extract this project and open its folder.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite (usually http://localhost:5173). The frontend runs its own local calculation engine. No authentication provider, database, Gemini key or paid maps service is required.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

`pnpm build` generates the standalone frontend in `out/`. Deploy `out/` on a static host. Routes use URL hashes so login, planner and trip screens do not need server rewrites. Google Fonts and OSM map tiles need internet, but the app has font fallbacks and a map unavailable state.

## What you can use

- AIKA welcome screen, Supabase email/password signup and login when public Supabase configuration is present, email confirmation handling, session restoration, password reset, and explicit demo-account mode when configuration is absent.
- Guest landing page with the original logo, refined intro, official palette, Space Grotesk headings and Plus Jakarta Sans body typography.
- Four-step planner: flights, airport/security details, preferences and review. Required airline and flight number; searchable supported-airport selectors. New plans start blank. Adjust and restore airport estimates.
- Central timezone-aware calculation engine, explicit risk/status reasoning, return deadline, transparent breakdown and itinerary.
- Bengaluru demo destinations, card/map selection, tile-failure fallback and stable map viewport during selection.
- Unavailable weather card and optional hypothetical heavy-rain scenario. No forecast is fabricated.
- Simulator for arrival/travel/processing/visit delays and a destination closure; applies the real engine again.
- My Trips in-memory dashboard: add/update, filters, view/edit/check again, manual status and confirmed deletion.
- Floating Help guide with local FAQ responses, message validation, clear/minimize/close controls, keyboard send and failure handling.

**Authentication is real only when the two `VITE_SUPABASE_*` settings are configured.** Supabase Auth verifies email/password credentials and restored sessions; signup may require email confirmation. Without those settings, the account screens retain the demo behavior and do not save passwords. My Trips remains an in-memory demo, and no database tables or trip persistence have been implemented. Help remains a local guide, not a live Gemini chatbot. See [Supabase Auth setup](docs/SUPABASE_AUTH_SETUP.md) for dashboard redirect and email settings.

## Structure

- `src/app/`: app shell, hash navigation and shared planning state.
- `src/components/`: branding, notices, airport selector and interactive map.
- `src/features/`: independently organized auth/account, home, planner, results, trips and help screens.
- `src/models/`: typed service/data contracts and display formatters.
- `src/services/`: local demo adapters, public config and opt-in API planner adapter.
- `src/styles/`: retained base layout plus official palette, typography and motion tokens.
- `lib/aika/engine.ts`: single deterministic time/risk engine and shared Zod schema.
- `lib/aika/demo.ts`: separated destination fixtures.
- `lib/aika/server.ts` and `app/api/`: retained backend integrations and secure request handlers.
- `public/images/aika-logo.jpeg`: exact supplied logo, unchanged.
- `tests/`: existing backend/time tests plus frontend rendering and demo-service workflow checks.
- `docs/BACKEND_HANDOFF.md`: next-phase implementation guide and security requirements.

## Data and integrations

The airport catalog intentionally supports a limited subset: seven Indian arrival airports and three foreign departure airports (DXB, JFK and LHR), with known IANA zones. It is not comprehensive or automatically maintained. Source references: Airports Authority of India (https://www.aai.aero/en/airports), airport operators such as https://www.bengaluruairport.com/, and the existing curated airport metadata. Do not claim current operational coverage beyond this subset. Backend-phase airport ingestion needs a maintained source and an operations update process.

Demo places are curated examples. Taxi durations, opening hours, costs and accessibility are not verified. The food stop is an illustrative area, not an actual recommended restaurant. Manual travel estimates are user inputs; unknown routes return Cannot assess yet. Entry eligibility is confirmed by the user, not verified by AIKA.

Fonts: Google Fonts stylesheet, display=swap, no API key, standard sans-serif fallbacks. OSM tiles: visible attribution, no offline prefetch, no live vehicle tracking or invented route geometry. Follow https://operations.osmfoundation.org/policies/tiles/ for production usage.

## Optional retained backend

```sh
pnpm dev:full
pnpm build:full
pnpm start:full
```

This path uses the existing Vinext/Vite + Cloudflare Workers setup and same-origin API routes. It has not been converted into a persistent Express server. Supabase Auth works directly from the browser when its public configuration is present; trips and help remain demo services. Set VITE_SERVICE_MODE=api only when the planning backend is actually running; VITE_API_BASE_URL is optional and normally empty for same-origin work.

Browser-safe variables: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Server-only variables: GEMINI_API_KEY, GEMINI_MODEL, GOOGLE_MAPS_SERVER_API_KEY, ENABLE_WEATHER, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never expose Gemini, Maps server keys or Supabase service-role credentials through VITE_ or NEXT_PUBLIC_ variables. No real credentials are included in `.env.example`.

Gemini setup: https://ai.google.dev/gemini-api/docs/api-key and https://ai.google.dev/gemini-api/docs/models. Set a currently supported structured-output model explicitly. Google Places/Routes require enabled APIs, billing, quotas and compatible restricted keys. Weather is off by default; check Open-Meteo commercial terms before enabling https://open-meteo.com/en/terms. These live integrations have not been verified with real credentials.

The private hosted preview may show a platform sign-in before reaching AIKA. That is hosting access, not the application's login. Local/static deployment uses the independent AIKA entry screen. This package does not bypass or modify platform permissions.

## Verification and limits

Executed checks and actual outcomes are recorded in `docs/VERIFICATION.md`. Service/engine/render tests do not replace browser interaction testing. Browser control was unavailable here, so responsive overflow, animation appearance, tile delivery, keyboard flows and console output require a browser check before a production claim.

Known scope: one connecting layover and one selected outing; limited airport catalog; no real accounts/database, saved sessions, password-reset emails, live flight status, terminal data, security queues, verified opening hours or forecast in frontend mode. Budget is a preference, not a verified price filter. The +30-minute rain allowance is a documented hypothetical simulation. No result guarantees that the traveller will catch a flight.

## Continue in Codex and GitHub

Extract the ZIP, open this directory in Codex, and ask it to read README.md and docs/BACKEND_HANDOFF.md. Supply your GitHub repository URL and authorize the push. The export excludes Git history and credentials; initialize your own repository. Commit source and lockfile, excluding .env.local, node_modules, out and dist. Keep new backend work within the typed service interfaces so the UI can be reused.
