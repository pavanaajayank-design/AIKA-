import { ArrowRight, ShieldCheck, ChevronLeft, Check, RotateCcw, LockKeyhole } from 'lucide-react';
import { airports, base, demoPlaces, isDomesticIndianAirport, type Trip } from '../../../lib/aika/engine';
import AirportField from '../../components/AirportField';
import { usePlanner } from '../../app/PlannerContext';

const baggageHelpText: Record<string, string> = {
    through: 'You do not need to collect and check in your bags again during the connection.',
    none: 'You do not need to collect and check in your bags again during the connection.',
    recheck: 'You will collect your checked bags at the layover airport and check them in for the next flight.',
    unknown: 'AIKA will use a cautious planning assumption until you confirm your baggage arrangement.',
};

export default function Planner() {
    const { trip, step, setStep, update, go, next, error, confirmed, setConfirmed, busy, generate, setTrip } = usePlanner();

    const field = (label: string, key: keyof Trip, type = 'text', note?: string) => (
        <label className="field">
            <span>{label}</span>
            <input
                type={type}
                value={String(trip[key] ?? '')}
                onChange={e => update(key, (type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value) as never)}
                required={key === 'airline' || key === 'flight' || key === 'arrival' || key === 'departure'}
                aria-invalid={!!error}
                min={type === 'number' ? 0 : undefined}
                max={type === 'number' ? 1440 : undefined}
            />
            {note && <small>{note}</small>}
        </label>
    );

    const choice = (label: string, key: keyof Trip, options: [string, string][]) => (
        <label className="field">
            <span>{label}</span>
            <select value={String(trip[key])} onChange={e => update(key, e.target.value as never)}>
                {options.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
            </select>
        </label>
    );

    const airport = (label: string, key: 'arrivalAirport' | 'departureAirport' | 'origin' | 'destination') => (
        <AirportField key={key} label={label} value={trip[key]} onChange={v => update(key, v)} />
    );

    const isLayoverKnown = Boolean(trip.arrivalAirport && airports[trip.arrivalAirport]);
    const isDomesticIndianLayover = isLayoverKnown && isDomesticIndianAirport(trip.arrivalAirport);

    const baggageDisplay = trip.baggage === 'recheck'
        ? 'Collect and check in again'
        : trip.baggage === 'unknown'
            ? 'Not sure yet (cautious buffer)'
            : 'Go straight to final destination';

    const entryDisplay = isDomesticIndianLayover
        ? 'Not applicable (domestic itinerary)'
        : trip.entry === 'yes'
            ? 'Confirmed by you'
            : trip.entry === 'no'
                ? 'Not eligible'
                : 'Unconfirmed';

    return (
        <section className="workspace">
            <div className="workspace-title">
                <div>
                    <span className="eyebrow">YOUR TIME, THOUGHTFULLY PLANNED</span>
                    <h1>Let’s find your window.</h1>
                    <p>Tell us about your flights. We will check how much time you have.</p>
                </div>
                <span className="quiet-badge"><LockKeyhole size={14} /> Layover planner</span>
            </div>
            <div className="planner-layout">
                <aside className="steps">
                    <span className="label">BUILD YOUR LAYOVER</span>
                    {['Your flights', 'Airport and security', 'Your preferences', 'Review your plan'].map((s, i) => (
                        <button key={s} disabled={i > step} className={i === step ? 'active' : ''} onClick={() => setStep(i)}>
                            <span>{i < step ? <Check size={15} /> : i + 1}</span>
                            <div>
                                <span>{s}</span>
                            </div>
                        </button>
                    ))}
                    <div className="side-note">
                        <ShieldCheck size={22} />
                        <h3>A little breathing room.</h3>
                        <p>We protect airport time before making room for sightseeing. Unknown eligibility means staying inside.</p>
                    </div>
                </aside>
                <div className="form-card">
                    <span className="label">STEP {step + 1} OF 4</span>
                    <h2>{['Where are you connecting?', 'Airport and security details.', 'What feels like your kind of break?', 'One last look.'][step]}</h2>
                    <p className="muted">
                        {[
                            'Use local dates and times at each layover airport. These are your scheduled times, not live flight data.',
                            'Use airline-confirmed deadlines when you have them. Other durations below are editable planning assumptions.',
                            'This version plans one destination at a time, keeping the return journey simple.',
                            'Confirm the inputs and assumptions before calculating.',
                        ][step]}
                    </p>
                    <datalist id="airports">
                        {Object.entries(airports).map(([c, a]) => <option value={c} key={c}>{a.name}</option>)}
                    </datalist>
                    <div className="form-grid" key={step}>
                        {step === 0 && (
                            <>
                                {airport('Journey origin', 'origin')}
                                {airport('Final destination', 'destination')}
                                {airport('Layover arrival airport', 'arrivalAirport')}
                                {airport('Connecting departure airport', 'departureAirport')}
                                {field('Scheduled arrival · local date & time', 'arrival', 'datetime-local')}
                                {field('Scheduled departure · local date & time', 'departure', 'datetime-local')}
                                {field('Connecting airline · required', 'airline', 'text', 'Example: IndiGo or Emirates')}
                                {field('Connecting flight number · required', 'flight', 'text', 'Example: 6E 123 or EK 567. This does not confirm live status.')}
                                {choice('Ticket arrangement', 'tickets', [
                                    ['one', 'One ticket / protected connection'],
                                    ['separate', 'Separate tickets'],
                                    ['unknown', 'Not sure'],
                                ])}
                                <div className="field">
                                    <span>Connection type</span>
                                    <label className="check">
                                        <input
                                            type="checkbox"
                                            checked={trip.internationalArrival}
                                            onChange={e => update('internationalArrival', e.target.checked)}
                                        />
                                        Arriving internationally
                                    </label>
                                    <label className="check">
                                        <input
                                            type="checkbox"
                                            checked={trip.internationalDeparture}
                                            onChange={e => update('internationalDeparture', e.target.checked)}
                                        />
                                        Departing internationally
                                    </label>
                                </div>
                            </>
                        )}
                        {step === 1 && (
                            <>
                                {isDomesticIndianLayover ? (
                                    <div className="field">
                                        <label htmlFor="entry-eligibility-select"><span>Eligibility to leave / enter the country</span></label>
                                        <select
                                            id="entry-eligibility-select"
                                            value="yes"
                                            disabled
                                            aria-label="Eligibility to leave / enter the country (Not applicable for domestic connection)"
                                        >
                                            <option value="yes">Not applicable · Domestic Indian layover</option>
                                        </select>
                                        <small>Not applicable to this domestic itinerary. Domestic connections within India do not require international exit/entry permission.</small>
                                    </div>
                                ) : !isLayoverKnown ? (
                                    <div className="field">
                                        <label htmlFor="entry-eligibility-select"><span>Eligibility to leave / enter the country</span></label>
                                        <select
                                            id="entry-eligibility-select"
                                            value={trip.entry}
                                            onChange={e => update('entry', e.target.value as Trip['entry'])}
                                        >
                                            <option value="unknown">Not checked / unsure</option>
                                            <option value="yes">I have confirmed I am eligible</option>
                                            <option value="no">I am not eligible</option>
                                        </select>
                                        <small>Select your layover arrival airport in Step 1 to determine country entry requirements.</small>
                                    </div>
                                ) : (
                                    <div className="field">
                                        <label htmlFor="entry-eligibility-select"><span>Eligibility to leave / enter the country</span></label>
                                        <select
                                            id="entry-eligibility-select"
                                            value={trip.entry}
                                            onChange={e => update('entry', e.target.value as Trip['entry'])}
                                        >
                                            <option value="unknown">Not checked / unsure</option>
                                            <option value="yes">I have confirmed I am eligible to enter this country</option>
                                            <option value="no">I am not eligible to enter this country</option>
                                        </select>
                                        <small>For international layovers, you must confirm your visa or entry eligibility before planning an outside visit.</small>
                                    </div>
                                )}
                                <div className="field">
                                    <label htmlFor="checked-baggage-select"><span>Checked baggage</span></label>
                                    <select
                                        id="checked-baggage-select"
                                        value={trip.baggage}
                                        onChange={e => update('baggage', e.target.value as Trip['baggage'])}
                                    >
                                        <option value="through">My bags will go straight to my final destination.</option>
                                        <option value="recheck">I must collect my bags and check them in again.</option>
                                        <option value="unknown">I’m not sure yet.</option>
                                        {trip.baggage === 'none' && (
                                            <option value="none">My bags will go straight to my final destination.</option>
                                        )}
                                    </select>
                                    <small>{baggageHelpText[trip.baggage] || baggageHelpText.through}</small>
                                </div>
                                {choice('Changing terminals?', 'terminal', [
                                    ['unknown', 'Not confirmed · extra time included'],
                                    ['no', 'No'],
                                    ['yes', 'Yes'],
                                ])}
                                <div className="estimate-overview full">
                                    <span className="label">AUTOMATIC STARTING ESTIMATES · NOT LIVE QUEUES</span>
                                    <div>
                                        <span>Airport exit<b>{trip.exit} min</b></span>
                                        <span>Security<b>{trip.security} min</b></span>
                                        <span>Immigration, if needed<b>{trip.immigration} min</b></span>
                                        <span>Airport return buffer<b>{trip.airportBuffer} min</b></span>
                                    </div>
                                    <p>Unknown terminals include 45 minutes. Baggage collection and recheck add time when needed. These are AIKA planning assumptions, not airline rules.</p>
                                </div>
                                <details className="estimate-adjust full">
                                    <summary>Adjust time estimates <span>Optional</span></summary>
                                    <div className="form-grid">
                                        {field('Airport exit allowance · minutes', 'exit', 'number')}
                                        {field('Immigration / customs · minutes per applicable direction', 'immigration', 'number')}
                                        {field('Security screening · minutes', 'security', 'number')}
                                        {field('Airport return buffer · minutes', 'airportBuffer', 'number', 'Minimum 120; 180 is a planning default, not an airline rule.')}
                                        {field('Extra time to reach your gate · minutes', 'gate', 'number')}
                                        {field('Extra time for road delays · minutes', 'contingency', 'number', 'Minimum 30 minutes.')}
                                    </div>
                                    <button
                                        type="button"
                                        className="text-button"
                                        onClick={() => setTrip(t => ({
                                            ...t,
                                            exit: base.exit,
                                            immigration: base.immigration,
                                            security: base.security,
                                            airportBuffer: base.airportBuffer,
                                            gate: base.gate,
                                            contingency: base.contingency,
                                        }))}
                                    >
                                        <RotateCcw size={14} /> Restore starting estimates
                                    </button>
                                    <p className="muted">Changed values are your overrides. Original defaults: exit 30, security 40, immigration 45, airport buffer 180, gate 30, road extra 45 minutes.</p>
                                </details>
                                {field('Confirmed boarding time · optional', 'boarding', 'datetime-local')}
                                {field('Confirmed check-in / bag-drop closure · optional', 'checkin', 'datetime-local')}
                            </>
                        )}
                        {step === 2 && (
                            <>
                                {choice('I’d love a little…', 'interest', [
                                    ['all', 'Anything that fits'],
                                    ['food', 'Local food'],
                                    ['culture', 'Culture & landmarks'],
                                    ['nature', 'Nature & fresh air'],
                                    ['shopping', 'Shopping'],
                                ])}
                                {choice('Getting around', 'transport', [
                                    ['taxi', 'Taxi'],
                                    ['transit', 'Public transport'],
                                    ['walking', 'Walking'],
                                    ['any', 'Any'],
                                ])}
                                {choice('Travel pace', 'pace', [
                                    ['relaxed', 'Relaxed'],
                                    ['balanced', 'Balanced'],
                                    ['fast', 'Fast-paced'],
                                ])}
                                {choice('Planning style', 'style', [
                                    ['conservative', 'Conservative · extra 15-minute margin'],
                                    ['balanced', 'Balanced'],
                                    ['flexible', 'Flexible · mandatory buffers preserved'],
                                ])}
                                {choice('Budget preference', 'budget', [
                                    ['low', 'Budget-friendly'],
                                    ['medium', 'Mid-range'],
                                    ['high', 'Flexible budget'],
                                ])}
                                <div className="full destination-choice">
                                    <label className="field">
                                        <span>Destination planning mode</span>
                                        <select
                                            value={trip.demo ? trip.selected : 'custom'}
                                            onChange={e => {
                                                const p = demoPlaces.find(pl => pl.id === e.target.value);
                                                setTrip(t => ({
                                                    ...t,
                                                    demo: !!p,
                                                    selected: p?.id || 'custom',
                                                    routeOut: p?.out ?? null,
                                                    routeBack: p?.back ?? null,
                                                    visit: p?.visit || 60,
                                                }));
                                            }}
                                        >
                                            <option value="custom">Use my own journey estimates</option>
                                            {trip.arrivalAirport === 'BLR' && ['taxi', 'any'].includes(trip.transport) && demoPlaces.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} (Estimated {p.out}m drive)</option>
                                            ))}
                                        </select>
                                        <small>Select a curated destination or enter custom journey estimates.</small>
                                    </label>
                                </div>
                                {field('Your estimated outbound journey · minutes', 'routeOut', 'number', 'Leave blank if unknown. We cannot recommend an outing without route estimates.')}
                                {field('Your estimated return journey · minutes', 'routeBack', 'number')}
                                {field('Planned visit · minutes', 'visit', 'number')}
                                <label className="check full">
                                    <input
                                        type="checkbox"
                                        checked={trip.mobility}
                                        onChange={e => update('mobility', e.target.checked)}
                                    />
                                    Allow 20 extra minutes for mobility needs
                                </label>
                                <p className="form-note full">
                                    Prices, opening hours, accessibility and transit schedules must be checked separately. Budget is a preference, not a verified price filter. Provider discovery currently supports taxi routes.
                                </p>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <div className="review-route full">
                                    <b>{trip.origin}</b>
                                    <ArrowRight size={22} />
                                    <b>{trip.arrivalAirport}</b>
                                    <ArrowRight size={22} />
                                    <b>{trip.destination}</b>
                                </div>
                                {[
                                    ['Arrival', trip.arrival.replace('T', ' ')],
                                    ['Departure', trip.departure.replace('T', ' ')],
                                    ['Entry eligibility', entryDisplay],
                                    ['Baggage', baggageDisplay],
                                    ['Airport return buffer', trip.airportBuffer + ' minutes'],
                                    ['Journey estimates', trip.routeOut === null || trip.routeBack === null ? 'Not supplied' : `${trip.routeOut} min out / ${trip.routeBack} min back`],
                                ].map(([k, v]) => (
                                    <div className="review-item" key={k}>
                                        <span>{k}</span>
                                        <b>{v}</b>
                                    </div>
                                ))}
                                <label className="check full confirm">
                                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                                    I have reviewed these details. I understand that estimates are not a guarantee and must check airline requirements.
                                </label>
                            </>
                        )}
                    </div>
                    {error && <p className="error" role="alert">{error}</p>}
                    <div className="form-actions">
                        <button className="text-button" onClick={() => (step ? setStep(step - 1) : go('home'))}>
                            <ChevronLeft size={17} /> Back
                        </button>
                        {step < 3 ? (
                            <button className="button" onClick={next}>
                                Continue <ArrowRight size={17} />
                            </button>
                        ) : (
                            <button className="button" disabled={!confirmed || busy} onClick={() => generate(trip)}>
                                {busy ? 'Calculating your window…' : 'Check if I have time to go out'} <ArrowRight size={17} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
