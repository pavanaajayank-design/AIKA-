# AIKA Production-Readiness Audit Report

**Date:** 2026-10-12  
**Target URL:** https://aika-iota.vercel.app/  
**Framework:** React 19, TypeScript 5.9, Vite 8 / Vinext, Supabase Auth & Database, Leaflet / OpenStreetMap  

---

## 1. Executive Summary

AIKA ("Explore on Time") is an AI-powered layover planning web application that calculates realistic exploration windows between connecting flights. The application features a robust deterministic timing and risk engine (`lib/aika/engine.ts`), responsive layouts, curated and Google Maps-based destination routing, and Supabase authentication.

However, the codebase previously contained substantial demo-mode artifacts, prototype messaging ("FRONTEND PREVIEW", in-memory warnings, tech-stack disclosures), simulated in-memory storage for trips, and gated map views that degraded the professional appearance of the product.

This audit details the full state of the codebase, feature classifications, security review, and the complete remediation plan to transition AIKA into a polished, production-ready product.

---

## 2. Feature Classification Matrix

| Feature | Category | Previous Status | Production-Ready Target |
| :--- | :--- | :--- | :--- |
| **Deterministic Time & Risk Engine** | Core Planning | Fully implemented & verified | Preserved with zero regression; strict timezones, DST & safety buffers. |
| **Supabase Authentication** | Identity & Access | Partially implemented (had demo bypasses & prototype copy) | Production Supabase Auth (Sign up, Log in, Password Reset, Session Restoration, Display Name update); demo bypasses removed. |
| **My Trips Storage** | Persistence | Demo-only / In-memory | Supabase PostgreSQL persistent storage with Row Level Security (RLS); local fallback for guest planning. |
| **AI Itinerary Assistance** | Intelligence | Server-side ready (Gemini); UI showed prototype disclaimer | Server-side Gemini API when configured; clear, transparent calculation summary fallback without prototype labels. |
| **Places & Detour Discovery** | Logistics | Functional for curated Bengaluru & Google Places API | Render interactive map whenever coordinates exist; remove "demo markers" disclaimers; transparent source attribution. |
| **Weather Forecasts** | Environmental | Open-Meteo integration | Real forecast when active; clean, graceful "Weather unavailable for this airport" when inactive; removed prototype mentions. |
| **Interactive Leaflet Map** | UI / Visualization | Gated to `trip.demo === true` | Display for all plans with geo-coordinates; responsive viewports, custom markers, accessible labels. |
| **Help Guide / FAQ** | Support | Functional local engine with prototype answers | Polished customer-facing travel concierge FAQ answering real layover planning questions. |
| **Navigation & Header** | Shell | Displayed "FRONTEND PREVIEW" strip & demo badges | Clean, modern header; user avatar with account menu; removed prototype banners. |
| **Privacy & Policy Pages** | Legal & Trust | Contained developer notes and handoff instructions | Production-grade privacy, safety, and data practices policy. |

---

## 3. Specific Prototype Messaging Identified for Removal

1. **Global Shell (`src/app/AikaApp.tsx`)**:
   - Strip: `<div className="preview-strip"><span>FRONTEND PREVIEW</span>...</div>`
   - Menu badge: `session.mode === 'demo' ? 'DEMO SESSION' : 'SUPABASE ACCOUNT'`
   - Logout label: `Log out of demo`
   - Footer button: `Try demo`

2. **Authentication Pages (`src/features/auth/AuthPage.tsx` & `AccountPage.tsx`)**:
   - Notice: `<b>Supabase Auth</b> · Account access is real; My Trips remains an in-memory demo.`
   - Notice: `No secure authentication or persistent trip storage is connected.`
   - Button: `Explore a demo account`
   - Input hints: `Use a sample password. It is validated in memory and discarded.`
   - Button labels: `Preview login`, `Preview signup`
   - Account header: `YOUR SUPABASE ACCOUNT`, `YOUR DEMO ACCOUNT`
   - Empty state: `Your account preview. Start a demo session to explore settings.`
   - Notice: `Settings apply only to this demo session. They reset when you refresh or log out.`

3. **My Trips (`src/features/trips/MyTrips.tsx`)**:
   - Header eyebrow: `YOUR DEMO TRAVEL SPACE`
   - Notice: `<b>In-memory demo trips</b> · These are not database records. Refreshing, closing this page or ending the demo session clears them.`
   - Loading label: `Loading in-memory trips…`
   - Card tag: `DEMO PLAN`
   - Timestamp note: `this visit only`
   - Deletion dialog: `Remove this demo trip? This removes only the in-memory record.`
   - Empty state copy: `Preview My Trips with a demo account... It will stay here for this visit only.`

4. **Results View (`src/features/results/Results.tsx`)**:
   - Eyebrow: `INTERACTIVE DEMO · SAMPLE JOURNEYS`
   - Save bar: `Keep this plan in your demo collection for this visit.`
   - Save button: `Add to demo trips` / `Update demo trip`
   - Risk banner note: `Under demo assumptions.`
   - Map gating: `{trip.demo ? <MapView .../> : <div className="map-unavailable">...}`
   - Weather panel: `No forecast provider is connected in this frontend preview.`

5. **Planner Form (`src/features/planner/Planner.tsx`)**:
   - Mode dropdown: `Demo · {p.name}`
   - Helper copy: `Live destination discovery is not connected. Bengaluru demo options use sample taxi times.`

6. **Help Guide (`src/features/help/HelpPanel.tsx` & `src/services/demo.ts`)**:
   - Header badge: `Local website guide · not live AI`
   - FAQ answers: Explaining that "Account screens are previews", "My Trips keeps demo plans in memory", etc.

7. **Privacy Page (`src/features/home/Privacy.tsx`)**:
   - Contains raw internal development status notes instead of customer privacy information.

---

## 4. Supabase Database & Persistence Architecture

### Database Table: `public.trips`
- `id` (UUID, Primary Key, default `gen_random_uuid()`)
- `user_id` (UUID, Foreign Key referencing `auth.users(id)` ON DELETE CASCADE)
- `title` (TEXT)
- `status` (TEXT: `upcoming`, `in-progress`, `completed`, `cancelled`)
- `input` (JSONB: Full authoritative trip input parameters)
- `result` (JSONB: Authoritative calculated plan and places)
- `created_at` (TIMESTAMPTZ, default `timezone('utc', now())`)
- `updated_at` (TIMESTAMPTZ, default `timezone('utc', now())`)

### Row Level Security (RLS) Policies
- Enforces strict tenant isolation using `auth.uid() = user_id` for SELECT, INSERT, UPDATE, and DELETE.
- Users cannot access, modify, or delete any other user's trips.
