import { useState } from 'react';
import { UserRound, LogOut, ArrowRight, Check } from 'lucide-react';
import { usePlanner } from '../../app/PlannerContext';
import { supabase } from '../../services/supabase-client';

export default function AccountPage() {
    const { session, setSession, go, logout } = usePlanner();
    const [name, setName] = useState(session?.name || '');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    if (!session) {
        return <section className="workspace empty">
            <UserRound />
            <h1>Your account.</h1>
            <p>Sign in to your AIKA account to manage your profile, access your saved itineraries, and personalize your experience.</p>
            <button className="button" onClick={() => go('login')}>Sign in <ArrowRight size={18}/></button>
        </section>;
    }

    async function handleUpdateName(e: React.FormEvent) {
        e.preventDefault();
        if (!session) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        setSaving(true);
        setMessage('');
        try {
            if (supabase && session.mode === 'authenticated') {
                await supabase.auth.updateUser({
                    data: { display_name: trimmed },
                });
            }
            setSession({ ...session, name: trimmed });
            setMessage('Profile updated successfully.');
        } catch {
            setMessage('Unable to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    return <section className="workspace account-page">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1>Make yourself at home.</h1>
        <form className="panel account-form" onSubmit={handleUpdateName}>
            <h2>Account details</h2>
            <label className="field">
                <span>Display name</span>
                <input required maxLength={80} value={name} onChange={event => setName(event.target.value)}/>
            </label>
            <label className="field">
                <span>Email address</span>
                <input value={session.email} disabled/>
            </label>
            <button className="button" disabled={saving}>
                {saving ? 'Updating…' : 'Save profile'}
            </button>
            {message && <p className="form-note" role="status"><Check size={14}/> {message}</p>}
        </form>
        <div className="panel">
            <h3>Sign out</h3>
            <p>Sign out of your AIKA account on this browser.</p>
            <button className="button secondary" onClick={logout}>Log out <LogOut size={17}/></button>
        </div>
    </section>;
}

