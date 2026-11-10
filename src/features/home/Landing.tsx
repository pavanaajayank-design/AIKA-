import { ArrowRight, ArrowUpRight, Clock, ShieldCheck, MapPin, Compass, Landmark, Utensils } from 'lucide-react';
import { usePlanner } from '../../app/PlannerContext';

export default function Landing() {
    const { startNew, demo, busy } = usePlanner();

    return (
        <>
            <section className="hero">
                <div className="hero-copy">
                    <div className="eyebrow">
                        <span /> A LITTLE LESS WAITING. A LITTLE MORE LIVING.
                    </div>
                    <h1>
                        Your next adventure <br />is between <br /><em>flights.</em>
                    </h1>
                    <p className="lead">
                        Make every minute count. Turn a long layover into a little discovery—with a plan that puts your next flight first.
                    </p>
                    <div className="hero-buttons">
                        <button className="button" onClick={startNew}>
                            Plan my layover <ArrowRight size={18} />
                        </button>
                        <button className="button secondary" onClick={demo} disabled={busy}>
                            {busy ? 'Calculating…' : 'Explore sample plan'} <ArrowUpRight size={18} />
                        </button>
                    </div>
                    <div className="trust">
                        <ShieldCheck size={18} />
                        <span>Safety-first planning</span>
                        <i />
                        <span>No account needed to plan</span>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="landscape">
                        <svg viewBox="0 0 600 660" aria-label="Illustrated hills and sunrise">
                            <defs>
                                <linearGradient id="sky" x2="0" y2="1">
                                    <stop stopColor="#dce7dc" />
                                    <stop offset="1" stopColor="#f4ebcf" />
                                </linearGradient>
                                <linearGradient id="hill" x2="0" y2="1">
                                    <stop stopColor="#769884" />
                                    <stop offset="1" stopColor="#254d44" />
                                </linearGradient>
                            </defs>
                            <rect width="600" height="660" fill="url(#sky)" />
                            <circle cx="425" cy="175" r="75" fill="#f6f0d6" />
                            <circle cx="425" cy="175" r="105" fill="#f6f0d6" opacity="0.35" />
                            {/* Curved flight trajectory */}
                            <path
                                d="M 20 290 Q 220 110 560 170"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.75)"
                                strokeWidth="2.5"
                                strokeDasharray="6 6"
                            />
                            {/* Stylized waypoint icon along flight trajectory */}
                            <circle cx="340" cy="142" r="5" fill="#ffffff" />
                            <circle cx="340" cy="142" r="10" fill="none" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" />
                            
                            <path d="M0 375 Q110 220 235 326T600 252V660H0" fill="#b7c7ad" />
                            <path d="M0 445 Q155 245 315 385T600 344V660H0" fill="#89a58e" />
                            <path d="M0 465 Q190 385 305 415T600 455V660H0" fill="url(#hill)" />
                            <path d="M0 625 Q200 433 365 480T600 505V660H0" fill="#214a40" />
                            <path d="M240 660 Q385 562 324 535T375 478" fill="none" stroke="#b9b69b" strokeWidth="13" />
                            <g fill="#183d35">
                                <path d="M62 530l23-83 23 83zM76 550l30-100 30 100zM480 573l23-92 23 92zM510 596l30-115 30 115z" />
                            </g>
                            <path d="M358 479h40v-15h-40zM353 464l25-13 25 13z" fill="#ded7bd" />
                        </svg>

                        <div className="visual-top">
                            <span><MapPin size={14} /> A LITTLE TIME OUTSIDE</span>
                        </div>

                        <div className="visual-caption">
                            <span>BEYOND THE DEPARTURE LOUNGE</span>
                            <h2>A breath of fresh air.<br />Before your next takeoff.</h2>
                        </div>
                    </div>

                    <div className="floating-plan">
                        <div className="float-head">
                            <span className="icon-circle"><ShieldCheck size={20} /></span>
                            <div>
                                <b>Your next flight comes first.</b>
                                <small>Airport time + travel + extra time for delays</small>
                            </div>
                        </div>
                        <div className="mini-timeline">
                            <div>
                                <strong>Arrive</strong>
                                <small>Check your details</small>
                            </div>
                            <span />
                            <div>
                                <strong>Explore</strong>
                                <small>Only if there is time</small>
                            </div>
                            <span />
                            <div>
                                <strong>Return</strong>
                                <small>Before your deadline</small>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="journey-strip">
                <div>
                    <span className="label">SMART LAYOVER INTELLIGENCE</span>
                    <h3>DEL <span>→</span> BLR <span>→</span> DXB</h3>
                </div>
                <div className="strip-stat">
                    <b>6h 45m</b>
                    <span>Total connection<br /><b>at layover airport</b></span>
                </div>
                <div className="strip-stat">
                    <b>2h 30m</b>
                    <span>Comfortable window<br /><b>for a local excursion</b></span>
                </div>
                <div className="strip-stat">
                    <b>180m</b>
                    <span>Protected return<br /><b>buffer before departure</b></span>
                </div>
            </div>

            <section className="section">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">A BETTER WAY TO WAIT</span>
                        <h2>A layover. Reimagined.</h2>
                    </div>
                    <p>
                        You bring the flight details.<br />We help you see the possibilities.
                    </p>
                </div>
                <div className="features">
                    {[
                        [Clock, 'Know your real free time', 'We leave room for airport procedures, travel, and the unexpected.'],
                        [Compass, 'Find your kind of detour', 'A local meal, a little culture, or a moment outside. Only what fits.'],
                        [ShieldCheck, 'Keep your flight in focus', 'See your return deadline, understand the risk, and make your own choice.'],
                    ].map(([Icon, title, text], i) => {
                        const I = Icon as typeof Clock;
                        return (
                            <article key={i}>
                                <span className="feature-number">0{i + 1}</span>
                                <I size={27} />
                                <h3>{String(title)}</h3>
                                <p>{String(text)}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="section inspiration-section">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">WHAT’S POSSIBLE</span>
                        <h2>Micro-detours that fit your connection.</h2>
                    </div>
                    <p>
                        Curated stops engineered around return journey times.<br />Tested with real airport buffer protection.
                    </p>
                </div>
                <div className="inspiration-grid">
                    <article className="inspiration-card">
                        <div className="insp-badge nature">NATURE · 90 MIN VISIT</div>
                        <div className="insp-visual nandi-bg">
                            <Compass size={38} />
                        </div>
                        <div className="insp-content">
                            <span className="label">BENGALURU (BLR) · 70M TRANSIT</span>
                            <h3>Nandi Hills Foothills</h3>
                            <p>A breath of fresh morning air and horizon views, just north of the airfield.</p>
                            <div className="insp-meta">
                                <span><b>3h 40m</b> total window needed</span>
                                <span><b>180m</b> buffer protected</span>
                            </div>
                        </div>
                    </article>

                    <article className="inspiration-card">
                        <div className="insp-badge culture">CULTURE · 60 MIN VISIT</div>
                        <div className="insp-visual fort-bg">
                            <Landmark size={38} />
                        </div>
                        <div className="insp-content">
                            <span className="label">DEVANAHALLI (BLR) · 30M TRANSIT</span>
                            <h3>Historic Devanahalli Fort</h3>
                            <p>Centuries of stone architecture, quiet courtyards, and zero city traffic delays.</p>
                            <div className="insp-meta">
                                <span><b>2h 30m</b> total window needed</span>
                                <span><b>180m</b> buffer protected</span>
                            </div>
                        </div>
                    </article>

                    <article className="inspiration-card">
                        <div className="insp-badge food">FOOD · 60 MIN VISIT</div>
                        <div className="insp-visual food-bg">
                            <Utensils size={38} />
                        </div>
                        <div className="insp-content">
                            <span className="label">AIRPORT CORRIDOR · 20M TRANSIT</span>
                            <h3>Filter Coffee & Dosa Break</h3>
                            <p>Authentic regional dining within a rapid 20-minute taxi hop of the terminal.</p>
                            <div className="insp-meta">
                                <span><b>1h 50m</b> total window needed</span>
                                <span><b>180m</b> buffer protected</span>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section className="safety-banner">
                <ShieldCheck size={36} />
                <div>
                    <h2>A suggestion, never a guarantee.</h2>
                    <p>Transparent estimates. Conservative buffers. You decide whether to explore or stay.</p>
                </div>
                <a href="#how">
                    Our approach <ArrowUpRight size={18} />
                </a>
            </section>
        </>
    );
}
