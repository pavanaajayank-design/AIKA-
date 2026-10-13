'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight, Menu, X, LogOut, FolderOpen, Settings } from 'lucide-react';
import { PlannerProvider, usePlanner } from './PlannerContext';
import Brand from '../components/Brand';
import AuthPage from '../features/auth/AuthPage';
import AccountPage from '../features/auth/AccountPage';
import MyTrips from '../features/trips/MyTrips';
import HelpPanel from '../features/help/HelpPanel';
import Landing from '../features/home/Landing';
import HowItWorks from '../features/home/HowItWorks';
import Privacy from '../features/home/Privacy';
import Planner from '../features/planner/Planner';
import Results from '../features/results/Results';

export function Shell() {
    const {
        page,
        go,
        startNew,
        demo,
        busy,
        intro,
        setIntro,
        session,
        authLoading,
        logout,
        notice,
        setNotice,
        error,
    } = usePlanner();

    const [menu, setMenu] = useState(false);
    const accountMenuRef = useRef<HTMLDetailsElement>(null);
    const authPage = ['welcome', 'login', 'signup', 'forgot'].includes(page);

    const closeAccountMenu = () => {
        accountMenuRef.current?.removeAttribute('open');
    };

    const navigate = (p: string) => {
        closeAccountMenu();
        go(p);
        setMenu(false);
    };

    const help = () => {
        closeAccountMenu();
        window.dispatchEvent(new Event('aika-help'));
        setMenu(false);
    };

    // REQUIREMENT 1: Automatically dismiss the successful sign-in message after ~5–6 seconds
    useEffect(() => {
        if (notice === 'You are signed in.') {
            const timer = window.setTimeout(() => {
                setNotice((curr) => (curr === 'You are signed in.' ? '' : curr));
            }, 5500);
            return () => window.clearTimeout(timer);
        }
    }, [notice, setNotice]);

    // REQUIREMENT 4: Close profile dropdown on outside clicks or Escape key
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const details = accountMenuRef.current;
            if (!details || !details.open) return;
            if (!details.contains(event.target as Node)) {
                details.removeAttribute('open');
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            const details = accountMenuRef.current;
            if (!details || !details.open) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                details.removeAttribute('open');
                const summary = details.querySelector('summary');
                summary?.focus();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <>
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header>
                <Brand />
                <nav className={menu ? 'open' : ''} aria-label="Main navigation">
                    <button
                        className={'nav-button ' + (page === 'planner' ? 'current' : '')}
                        onClick={() => { closeAccountMenu(); startNew(); setMenu(false); }}
                    >
                        Planner
                    </button>
                    <button
                        className={'nav-button ' + (page === 'trips' ? 'current' : '')}
                        onClick={() => navigate('trips')}
                    >
                        My Trips
                    </button>
                    <button className="nav-button" onClick={() => navigate('how')}>How it works</button>
                    <button className="nav-button" onClick={help}>Help</button>
                    {authLoading ? (
                        <span className="nav-button" role="status">Checking session…</span>
                    ) : !session ? (
                        <button className="nav-button" onClick={() => navigate('login')}>
                            Log in <ArrowUpRight size={14}/>
                        </button>
                    ) : (
                        <details ref={accountMenuRef} className="account-menu">
                            <summary>
                                <span className="user-initial">{session.name.slice(0, 1).toUpperCase()}</span>
                                <span>{session.name}</span>
                            </summary>
                            <div>
                                <small>{session.email}</small>
                                <button onClick={() => navigate('trips')}>
                                    <FolderOpen size={15}/> My Trips
                                </button>
                                <button onClick={() => navigate('account')}>
                                    <Settings size={15}/> Account settings
                                </button>
                                <button onClick={() => { closeAccountMenu(); logout(); setMenu(false); }}>
                                    <LogOut size={15}/> Log out
                                </button>
                            </div>
                        </details>
                    )}
                </nav>
                <button className="button small nav-cta" onClick={() => { closeAccountMenu(); startNew(); }}>
                    Plan my layover <ArrowRight size={16}/>
                </button>
                <button
                    className="menu"
                    aria-label="Toggle navigation"
                    aria-expanded={menu}
                    onClick={() => { closeAccountMenu(); setMenu(!menu); }}
                >
                    {menu ? <X /> : <Menu />}
                </button>
            </header>
            {intro && (
                <div className="intro">
                    <div className="intro-ripple"/>
                    <img
                        src="/images/aika-logo.png"
                        width={290}
                        height={290}
                        alt="AIKA — Explore on time"
                        onError={() => setIntro(false)}
                    />
                </div>
            )}
            <main id="main-content" key={page} className="page" tabIndex={-1}>
                {authPage ? (
                    <AuthPage key={page}/>
                ) : (
                    <>
                        {notice && page !== 'results' && (
                            <p className="app-notice" role="status">{notice}</p>
                        )}
                        {page === 'home' && <Landing />}
                        {page === 'planner' && <Planner />}
                        {page === 'results' && <Results />}
                        {page === 'trips' && <MyTrips />}
                        {page === 'account' && <AccountPage />}
                        {page === 'how' && <HowItWorks />}
                        {page === 'privacy' && <Privacy />}
                    </>
                )}
            </main>
            <footer>
                <a href="#home" className="footer-brand">AIKA<span>.</span></a>
                <p>Make every minute count.</p>
                <div>
                    <a href="#how">Safety & assumptions</a>
                    <a href="#privacy">Privacy</a>
                    <button className="nav-button" onClick={() => { closeAccountMenu(); demo(); setMenu(false); }} disabled={busy}>
                        Sample itinerary
                    </button>
                </div>
            </footer>
            <HelpPanel />
            {busy && page !== 'planner' && (
                <div className="loading-toast" role="status">Calculating your plan…</div>
            )}
            {error && page === 'home' && (
                <div className="error-toast" role="alert">{error}</div>
            )}
        </>
    );
}

export default function AikaApp() {
    return (
        <PlannerProvider>
            <Shell />
        </PlannerProvider>
    );
}

