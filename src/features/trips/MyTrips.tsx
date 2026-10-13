import { useState } from 'react';
import { Plane, Plus, ArrowRight, Trash2, RefreshCw, Check, FolderOpen } from 'lucide-react';
import { usePlanner } from '../../app/PlannerContext';
import type { SavedTrip, TripStatus } from '../../models/contracts';

const filters = ['all', 'upcoming', 'in-progress', 'completed', 'cancelled'] as const;

export default function MyTrips() {
    const { session, trips, setTrips, services, startNew, go, openTrip, generate, setActiveId } = usePlanner();
    const [filter, setFilter] = useState<typeof filters[number]>('all'), [pending, setPending] = useState<string | null>(null), [error, setError] = useState(''), [feedback, setFeedback] = useState(''), [confirm, setConfirm] = useState<string | null>(null);

    async function refresh() {
        setPending('refresh');
        setError('');
        try {
            setTrips(await services.trips.list());
        } catch {
            setError('Unable to load trips. Try again.');
        } finally {
            setPending(null);
        }
    }

    async function remove(id: string) {
        setPending(id);
        try {
            await services.trips.remove(id);
            setTrips(await services.trips.list());
            setConfirm(null);
            setFeedback('Trip deleted successfully.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to remove the trip.');
        } finally {
            setPending(null);
        }
    }

    async function status(t: SavedTrip, value: TripStatus) {
        setPending(t.id);
        try {
            await services.trips.update(t.id, { status: value });
            setTrips(await services.trips.list());
            setFeedback('Trip status updated.');
        } catch {
            setError('Unable to update this trip.');
        } finally {
            setPending(null);
        }
    }

    if (!session) {
        return <section className="workspace empty">
            <FolderOpen />
            <h1>Your plans, in one place.</h1>
            <p>Sign in to your AIKA account to save itineraries, track layover windows, and access your trips anytime.</p>
            <button className="button" onClick={() => go('login')}>Sign in to view trips <ArrowRight size={18}/></button>
        </section>;
    }

    const shown = trips.filter(t => filter === 'all' || t.status === filter);

    return <section className="workspace trips-page">
        <div className="workspace-title">
            <div>
                <span className="eyebrow">YOUR TRAVEL SPACE</span>
                <h1>My Trips.</h1>
                <p>A thoughtfully curated collection of plans for the time in between.</p>
            </div>
            <button className="button" onClick={startNew}><Plus size={17}/> Plan a new layover</button>
        </div>

        <div className="trips-toolbar">
            <div className="filter-tabs" role="tablist" aria-label="Trip status">
                {filters.map(f => (
                    <button
                        role="tab"
                        aria-selected={filter === f}
                        key={f}
                        className={filter === f ? 'active' : ''}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? 'All trips' : f.replace('-', ' ')}
                        {f === 'all' && <span>{trips.length}</span>}
                    </button>
                ))}
            </div>
            <button className="icon-button" aria-label="Refresh trips" disabled={!!pending} onClick={refresh}>
                <RefreshCw size={17}/>
            </button>
        </div>

        {error && <div className="error" role="alert">{error}<button className="text-button" onClick={refresh}>Try again</button></div>}
        {feedback && <p className="form-note" role="status"><Check size={15}/> {feedback}</p>}

        {pending === 'refresh' ? (
            <div className="trip-skeleton" role="status">Loading your saved trips…</div>
        ) : shown.length ? (
            <div className="trip-grid">
                {shown.map(t => (
                    <article className="panel trip-card" key={t.id}>
                        <div className="trip-card-top">
                            <span className="trip-icon"><Plane size={22}/></span>
                            <span className="quiet-badge">{t.status.replace('-', ' ')}</span>
                        </div>
                        <span className="label">SAVED ITINERARY · {t.input.arrival.slice(0, 10)}</span>
                        <h2>{t.input.origin} <span>→</span> {t.input.arrivalAirport} <span>→</span> {t.input.destination}</h2>
                        <p>{t.input.airline} · {t.input.flight}</p>
                        <div className={'trip-risk ' + t.result.plan.status}>{t.result.plan.label}</div>
                        <p className="muted">Updated {new Date(t.updatedAt).toLocaleString()}</p>
                        <label className="field">
                            <span>Trip status</span>
                            <select value={t.status} disabled={!!pending} onChange={e => status(t, e.target.value as TripStatus)}>
                                {filters.filter(f => f !== 'all').map(f => (
                                    <option key={f} value={f}>{f.replace('-', ' ')}</option>
                                ))}
                            </select>
                        </label>
                        <div className="trip-actions">
                            <button className="button small" onClick={() => openTrip(t)}>View trip <ArrowRight size={15}/></button>
                            <button className="button secondary small" onClick={() => openTrip(t, true)}>Edit plan</button>
                            <button className="text-button" onClick={() => { setActiveId(t.id); generate(t.input); }}>Check again <RefreshCw size={14}/></button>
                            <button className="icon-button delete-trip" aria-label={'Delete ' + t.title} onClick={() => setConfirm(t.id)}><Trash2 size={16}/></button>
                        </div>
                        {confirm === t.id && (
                            <div className="delete-confirm" role="group" aria-label="Confirm trip deletion">
                                <b>Delete this trip?</b>
                                <p>This permanently removes this saved itinerary from your account.</p>
                                <button className="button small" disabled={!!pending} onClick={() => remove(t.id)}>Delete trip</button>
                                <button className="text-button" onClick={() => setConfirm(null)}>Keep it</button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        ) : (
            <div className="empty trips-empty">
                <FolderOpen size={38}/>
                <h2>{trips.length ? 'No trips in this view.' : 'Your next plan belongs here.'}</h2>
                <p>{trips.length ? 'Choose another filter tab to view your saved itineraries.' : 'Create a layover plan, then choose Save to My Trips on the results page.'}</p>
                <button className="button" onClick={startNew}>Plan my layover <ArrowRight size={17}/></button>
            </div>
        )}
    </section>;
}

