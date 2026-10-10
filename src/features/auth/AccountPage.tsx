import { useState } from 'react';
import { UserRound, LogOut, ArrowRight } from 'lucide-react';
import { usePlanner } from '../../app/PlannerContext';
import Notice from '../../components/Notice';

export default function AccountPage() {
    const { session, setSession, go, logout } = usePlanner();
    const [name, setName] = useState(session?.name || '');
    const [message, setMessage] = useState('');

    if (!session) {
        return <section className="workspace empty"><UserRound /><h1>Your account preview.</h1><p>Start a demo session to explore settings. This does not create a real account.</p><button className="button" onClick={() => go('login')}>Open login <ArrowRight size={18}/></button></section>;
    }

    if (session.mode === 'authenticated') {
        return <section className="workspace account-page">
            <span className="eyebrow">YOUR SUPABASE ACCOUNT</span>
            <h1>Make yourself at home.</h1>
            <Notice>Your email and sign-in status come from Supabase Auth. My Trips is still an in-memory demo and is not saved to your account.</Notice>
            <div className="panel account-form">
                <h2>Account details</h2>
                <label className="field"><span>Display name</span><input value={session.name} disabled/></label>
                <label className="field"><span>Email address</span><input value={session.email} disabled/></label>
            </div>
            <div className="panel"><h3>Sign out</h3><p>This signs out of your AIKA Supabase account on this browser.</p><button className="button secondary" onClick={logout}>Log out <LogOut size={17}/></button></div>
        </section>;
    }

    return <section className="workspace account-page">
        <span className="eyebrow">YOUR DEMO ACCOUNT</span>
        <h1>Make yourself at home.</h1>
        <Notice>Settings apply only to this demo session. They reset when you refresh or log out.</Notice>
        <form className="panel account-form" onSubmit={event => { event.preventDefault(); setSession({ ...session, name: name.trim() }); setMessage('Updated in this demo session only.'); }}>
            <h2>Account details</h2>
            <label className="field"><span>Display name</span><input required maxLength={80} value={name} onChange={event => setName(event.target.value)}/></label>
            <label className="field"><span>Demo email</span><input value={session.email} disabled/><small>Email and password changes need a real account provider.</small></label>
            <button className="button">Update demo name</button>
            {message && <p className="form-note" role="status">{message}</p>}
        </form>
        <div className="panel"><h3>End this preview</h3><p>Your in-memory demo trips will be cleared. No real account will be deleted.</p><button className="button secondary" onClick={logout}>Log out of demo <LogOut size={17}/></button></div>
    </section>;
}
