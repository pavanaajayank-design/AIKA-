'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DateTime } from 'luxon';
import { base, calculate, schema, airports, type Trip, type Place } from '../../lib/aika/engine';
import { createServices } from '../services';
import { readClientConfig } from '../services/config';
import type { PlanResult, AppSession, SavedTrip } from '../models/contracts';
import { loadDraft, saveDraft, clearDraft } from '../services/draft-storage';
export const freshTrip = (): Trip => ({ ...structuredClone(base), origin: '', destination: '', arrivalAirport: '', departureAirport: '', arrival: '', departure: '', airline: '', flight: '', entry: 'unknown', terminal: 'unknown', demo: false });
export function validateStep(t: Trip, step: number) { if (step === 0) {
    if (!t.airline.trim())
        throw Error('Enter the connecting airline.');
    if (!/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i.test(t.flight.trim()))
        throw Error('Enter a flight number such as 6E 123 or EK 567.');
    if (!airports[t.arrivalAirport] || !['BLR', 'CCJ', 'DEL', 'BOM', 'MAA', 'HYD', 'COK'].includes(t.arrivalAirport))
        throw Error('Select a supported Indian arrival airport.');
    if (!airports[t.departureAirport])
        throw Error('Select a supported departure airport.');
    if (!/^[A-Z]{3}$/.test(t.origin) || !/^[A-Z]{3}$/.test(t.destination))
        throw Error('Enter a three-letter origin and final destination code.');
    calculate({ ...t, routeOut: 30, routeBack: 30 });
}
else
    schema.parse(t); }
function usePlannerState() {
    const [page, setPage] = useState('welcome'), [step, setStep] = useState(0), [trip, setTrip] = useState<Trip>(freshTrip), [result, setResult] = useState<PlanResult | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [intro, setIntro] = useState(false), [confirmed, setConfirmed] = useState(false), [session, setSession] = useState<AppSession | null>(null), [authLoading, setAuthLoading] = useState(true), [passwordRecovery, setPasswordRecovery] = useState(false), [trips, setTrips] = useState<SavedTrip[]>([]), [activeId, setActiveId] = useState<string | null>(null), [notice, setNotice] = useState('');
    const [services] = useState(() => { const config = readClientConfig(import.meta.env || {}); return createServices(config.mode, config.baseUrl); });
    const request = useRef(0);
    const restoredIdentityRef = useRef<string | null | undefined>(undefined);

    const restoreDraftFor = (activeSession: AppSession | null) => {
        const id = activeSession ? activeSession.id : null;
        restoredIdentityRef.current = id;
        const draft = loadDraft(id);
        if (draft) {
            setTrip(draft.trip);
            setStep(draft.step);
            setResult(draft.result);
            setActiveId(draft.activeId);
            setConfirmed(draft.confirmed);

            const currentHash = typeof window !== 'undefined' ? location.hash.slice(1) : '';
            if (!currentHash || currentHash === 'welcome' || currentHash === 'login' || currentHash === 'signup') {
                setPage(draft.page);
                if (typeof window !== 'undefined') location.hash = draft.page;
            }
        } else {
            // Fresh account state when no draft exists
            setTrip(freshTrip());
            setStep(0);
            setResult(null);
            setActiveId(null);
            setConfirmed(false);
        }
    };

    useEffect(() => { const update = () => { const p = location.hash.slice(1); setPage(['home', 'welcome', 'login', 'signup', 'forgot', 'planner', 'results', 'how', 'privacy', 'trips', 'account'].includes(p) ? p : 'welcome'); window.scrollTo(0, 0); }; window.addEventListener('hashchange', update); const initial = requestAnimationFrame(() => { update(); try {
        if (!sessionStorage.getItem('aika-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setIntro(true);
            sessionStorage.setItem('aika-intro', '1');
        }
    }
    catch { } }); const timer = setTimeout(() => setIntro(false), 2400); return () => { cancelAnimationFrame(initial); clearTimeout(timer); window.removeEventListener('hashchange', update); }; }, []);
    const go = (p: string) => { location.hash = p; setPage(p); setError(''); window.scrollTo(0, 0); };
    useEffect(() => {
        let active = true;
        let eventRevision = 0;
        const unsubscribe = services.auth.onAuthStateChange((nextSession, event) => {
            if (!active) return;
            eventRevision++;
            setAuthLoading(false);
            setSession(nextSession);

            if (event === 'PASSWORD_RECOVERY') {
                setPasswordRecovery(Boolean(nextSession));
                if (nextSession) {
                    setNotice('Choose a new password for your account.');
                } else {
                    setNotice('This reset link could not be verified. Request a new password reset link.');
                }
                go('forgot');
            } else if (event === 'SIGNED_OUT') {
                setPasswordRecovery(false);
                setTrips([]);
                setActiveId(null);
                restoreDraftFor(null);
            } else if (event === 'SIGNED_IN' && nextSession) {
                services.trips.list().then(setTrips).catch(() => {});
                restoreDraftFor(nextSession);
            } else if (!nextSession && event !== 'INITIAL_SESSION') {
                setNotice('Your session could not be verified. Please sign in again.');
            }
        });

        const startingRevision = eventRevision;
        void services.auth.restoreSession()
            .then((restored) => {
                if (active && eventRevision === startingRevision) {
                    setSession(restored);
                    if (restored) {
                        services.trips.list().then(setTrips).catch(() => {});
                    }
                    if (restoredIdentityRef.current === undefined) {
                        restoreDraftFor(restored);
                    }
                }
            })
            .catch(() => {
                if (active && eventRevision === startingRevision) {
                    setSession(null);
                    setNotice('We could not verify your saved session. Please sign in again.');
                    if (restoredIdentityRef.current === undefined) {
                        restoreDraftFor(null);
                    }
                }
            })
            .finally(() => {
                if (active && eventRevision === startingRevision) {
                    setAuthLoading(false);
                    if (restoredIdentityRef.current === undefined) {
                        restoreDraftFor(null);
                    }
                }
            });

        return () => {
            active = false;
            unsubscribe();
        };
    }, [services.auth, services.trips]);

    // Debounced automatic draft persistence
    useEffect(() => {
        if (authLoading || restoredIdentityRef.current === undefined) return;
        const currentId = session ? session.id : null;
        if (restoredIdentityRef.current !== currentId) return;

        const timer = setTimeout(() => {
            saveDraft(currentId, {
                page,
                step,
                trip,
                result,
                activeId,
                confirmed,
            });
        }, 200);

        return () => clearTimeout(timer);
    }, [page, step, trip, result, activeId, confirmed, session, authLoading]);

    // Save immediately before page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (!authLoading && restoredIdentityRef.current !== undefined) {
                const currentId = session ? session.id : null;
                saveDraft(currentId, {
                    page,
                    step,
                    trip,
                    result,
                    activeId,
                    confirmed,
                });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [page, step, trip, result, activeId, confirmed, session, authLoading]);

    const startNew = () => {
        request.current++;
        setBusy(false);
        const fresh = freshTrip();
        setTrip(fresh);
        setResult(null);
        setStep(0);
        setActiveId(null);
        setConfirmed(false);
        setNotice('');
        clearDraft(session ? session.id : null);
        go('planner');
    };
    const update = <K extends keyof Trip>(key: K, value: Trip[K]) => { setTrip(t => ({ ...t, [key]: value })); setConfirmed(false); };
    async function generate(next = trip) {
        const id = ++request.current;
        setBusy(true);
        setError('');
        let calculatedData: PlanResult | null = null;
        try {
            calculatedData = await services.planner.plan(next);
            if (id !== request.current) return;
            setResult(calculatedData);
            setTrip(next);
            go('results');
        } catch (e) {
            if (id === request.current) {
                setError(e instanceof Error ? e.message : 'Please check your details and try again.');
                setBusy(false);
            }
            return;
        }

        // Automatic itinerary saving for authenticated sessions
        if (session && calculatedData && id === request.current) {
            try {
                if (activeId) {
                    await services.trips.update(activeId, { input: next, result: calculatedData });
                    if (id === request.current) {
                        setNotice('Layover itinerary updated in My Trips.');
                    }
                } else {
                    const saved = await services.trips.create(next, calculatedData);
                    if (id === request.current) {
                        setActiveId(saved.id);
                        setNotice('Layover itinerary saved to My Trips.');
                    }
                }
                if (id === request.current) {
                    const list = await services.trips.list();
                    setTrips(list);
                }
            } catch {
                // Calculation is preserved even if auto-save fails
                if (id === request.current) {
                    setNotice('Your layover is calculated, but could not be saved to My Trips. You can retry saving using the button above.');
                }
            } finally {
                if (id === request.current) {
                    setBusy(false);
                }
            }
        } else {
            if (id === request.current) {
                setBusy(false);
            }
        }
    }
    function demo() { const arrival = DateTime.now().setZone('Asia/Kolkata').plus({ days: 2 }).startOf('day').set({ hour: 5 }); const t = { ...structuredClone(base), arrival: arrival.toFormat("yyyy-MM-dd'T'HH:mm"), departure: arrival.set({ hour: 16 }).toFormat("yyyy-MM-dd'T'HH:mm"), airline: 'IndiGo', flight: '6E 123', entry: 'yes' as const, terminal: 'no' as const, demo: false, selected: 'devanahalli', routeOut: 30, routeBack: 40 }; setActiveId(null); generate(t); }
    function select(p: Place) { generate({ ...trip, selected: p.id, routeOut: p.out, routeBack: p.back, visit: p.visit, scenario: { ...trip.scenario, unavailable: false } }); }
    function next() { try {
        validateStep(trip, step);
        setError('');
        setStep(Math.min(3, step + 1));
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Check your fields.');
    } }
    async function save() { if (!result)
        return; if (!session) {
        setNotice('Sign in to save this layover to your account. Your active plan will be kept while you log in.');
        go('login');
        return;
    } setBusy(true); try {
        const current = await services.planner.plan(trip);
        setResult(current);
        if (activeId) {
            await services.trips.update(activeId, { input: trip, result: current });
            setNotice('Trip updated successfully in My Trips.');
        }
        else {
            const saved = await services.trips.create(trip, current);
            setActiveId(saved.id);
            setNotice('Layover itinerary saved to My Trips.');
        }
        setTrips(await services.trips.list());
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to save this trip.');
    }
    finally {
        setBusy(false);
    } }
    function openTrip(saved: SavedTrip, edit = false) { setActiveId(saved.id); setTrip(structuredClone(saved.input)); setResult(structuredClone(saved.result)); setStep(0); setConfirmed(false); go(edit ? 'planner' : 'results'); }
    async function logout() { request.current++; try { await services.auth.signOut(); services.trips.clear(); setSession(null); setTrips([]); setActiveId(null); setPasswordRecovery(false); setNotice('You have been signed out.'); go('welcome'); } catch { setError('We could not sign you out. Please try again.'); } }
    return { page, setPage, step, setStep, trip, setTrip, result, setResult, error, setError, busy, setBusy, intro, setIntro, confirmed, setConfirmed, go, startNew, update, generate, demo, select, next, services, session, setSession, authLoading, passwordRecovery, setPasswordRecovery, trips, setTrips, activeId, setActiveId, notice, setNotice, save, openTrip, logout };
}
type PlannerState = ReturnType<typeof usePlannerState>;
export const PlannerContext = createContext<PlannerState | null>(null);
export function PlannerProvider({ children }: {
    children: ReactNode;
}) { const value = usePlannerState(); return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>; }
export function usePlanner() { const value = useContext(PlannerContext); if (!value)
    throw Error('AIKA screens must be inside PlannerProvider.'); return value; }
