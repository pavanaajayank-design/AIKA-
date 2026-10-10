import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Clock, MapPin, Mail, Compass } from 'lucide-react';
import { z } from 'zod';
import { usePlanner } from '../../app/PlannerContext';
import Brand from '../../components/Brand';
import Notice from '../../components/Notice';

export default function AuthPage() {
    const {
        page, go, session, setSession, services, result, notice, setNotice,
        authLoading, passwordRecovery, setPasswordRecovery,
    } = usePlanner();
    const signup = page === 'signup';
    const forgot = page === 'forgot';
    const recovering = forgot && passwordRecovery;
    const welcome = page === 'welcome';
    const supabaseAuth = services.auth.mode === 'supabase';
    const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (signup && !name.trim()) {
            setError('Enter your name.');
            return;
        }
        if ((signup || recovering) && password !== confirm) {
            setError('Your passwords do not match.');
            return;
        }

        setBusy(true);
        try {
            if (recovering) {
                const user = await services.auth.updatePassword(password);
                setSession(user);
                setPasswordRecovery(false);
                setPassword('');
                setConfirm('');
                setNotice('Your account password has been updated.');
                setSuccess('Password updated successfully.');
                go('home');
                return;
            }

            if (forgot) {
                await services.auth.requestPasswordReset(email);
                setSuccess('If an account matches that email, a password reset link is on its way.');
                return;
            }

            if (signup) {
                const outcome = await services.auth.signUp({ name, email, password });
                setPassword('');
                setConfirm('');
                if (!outcome.session) {
                    setSuccess('Check your email for a confirmation link. After confirming, return here and log in.');
                    return;
                }
                setSession(outcome.session);
                setNotice(outcome.session.mode === 'demo'
                    ? 'Demo session started. No real account was created and no password was saved.'
                    : 'Your account is ready.');
                go(result ? 'results' : 'home');
                return;
            }

            const user = await services.auth.signIn({ email, password });
            setSession(user);
            setPassword('');
            setNotice(user.mode === 'demo' ? 'Demo session started. No password was saved.' : 'You are signed in.');
            go(result ? 'results' : 'home');
        } catch (cause) {
            setError(cause instanceof z.ZodError
                ? cause.issues[0].message
                : cause instanceof Error ? cause.message : 'Unable to continue. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    async function preview() {
        setError('');
        setSuccess('');
        setBusy(true);
        try {
            await services.auth.signOut();
            setPasswordRecovery(false);
            setSession({ id: 'demo-session', name: 'Demo traveller', email: 'traveller@example.test', mode: 'demo' });
            setNotice('You are exploring a demo account. Trips are kept in memory only.');
            go(result ? 'results' : 'home');
        } catch {
            setError('We could not switch to demo mode. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const heading = welcome ? 'Welcome to AIKA.'
        : recovering ? 'Choose a new password.'
            : forgot ? 'Forgot your password?'
                : signup ? 'Your next journey starts here.'
                    : 'Good to see you again.';
    const description = welcome ? 'Plan a layover as a guest, or explore your account.'
        : recovering ? 'Your reset link is verified. Choose a new password for your account.'
            : forgot ? (supabaseAuth
                ? 'Enter your email and we’ll send a secure password reset link if an account matches.'
                : 'Password reset is unavailable in demo mode. No email will be sent.')
                : signup ? (supabaseAuth
                    ? 'Create your AIKA account. You may need to confirm your email before signing in.'
                    : 'Preview the signup experience. No real account will be created.')
                    : (supabaseAuth ? 'Sign in to your AIKA account.' : 'Preview the login experience, or continue without an account.');

    return <section className="auth-layout">
        <div className="auth-story">
            <span className="eyebrow">EXPLORE ON TIME</span>
            <h1>There’s a little<br />more to your<br /><span>journey.</span></h1>
            <p>Make every minute count. Find out what fits between your flights, with time to get back.</p>
            <div className="auth-orbit"><span className="orbit-center"><Compass size={47}/></span><span className="orbit-chip orbit-one"><Clock size={16}/> Time to explore</span><span className="orbit-chip orbit-two"><MapPin size={16}/> A nearby discovery</span><span className="orbit-chip orbit-three"><ShieldCheck size={16}/> Your flight comes first</span></div>
            <p className="auth-footnote">A thoughtful plan. A little breathing room.</p>
        </div>
        <div className="auth-surface">
            <Brand large/>
            <span className="eyebrow">MAKE EVERY MINUTE COUNT.</span>
            <h2>{heading}</h2>
            <p className="muted">{description}</p>
            <Notice><b>{supabaseAuth ? 'Supabase Auth' : 'Demo authentication'}</b> · {supabaseAuth ? 'Account access is real; My Trips remains an in-memory demo.' : 'No secure authentication or persistent trip storage is connected.'}</Notice>
            {authLoading && <p className="form-note" role="status">Checking your session…</p>}
            {notice && <p className="form-note" role="status">{notice}</p>}
            {success && <p className="form-note" role="status">{success}</p>}

            {welcome ? <div className="welcome-actions">
                <button className="button" disabled={authLoading} onClick={() => go('login')}>Log in <ArrowRight size={17}/></button>
                <button className="button secondary" disabled={authLoading} onClick={() => go('signup')}>Sign up <ArrowRight size={17}/></button>
                <button className="text-button" onClick={() => go('home')}>Continue as a guest <ArrowRight size={16}/></button>
                {session && <small>Current session: {session.name} · {session.mode === 'demo' ? 'demo only' : 'Supabase session'}</small>}
            </div> : <>
                <div className="auth-tabs"><button className={!signup && !forgot ? 'active' : ''} onClick={() => go('login')}>Log in</button><button className={signup ? 'active' : ''} onClick={() => go('signup')}>Sign up</button></div>
                <form onSubmit={submit} className="auth-form">
                    {signup && <label className="field"><span>Your name</span><input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" maxLength={80}/></label>}
                    {!recovering && <label className="field"><span>Email address</span><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={254}/></label>}
                    {(!forgot || recovering) && <>
                        <label className="field"><span>{recovering ? 'New password' : 'Password'}</span><div className="password-input"><input type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete={signup || recovering ? 'new-password' : 'current-password'}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><small>{supabaseAuth ? 'Use at least 8 characters.' : 'Use a sample password. It is validated in memory and discarded.'}</small></label>
                        {(signup || recovering) && <label className="field"><span>Confirm password</span><input type={visible ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password"/></label>}
                        {!signup && !recovering && <button type="button" className="text-button forgot-link" onClick={() => { setPasswordRecovery(false); setSuccess(''); go('forgot'); }}>Forgot password?</button>}
                    </>}
                    {error && <p className="error" role="alert">{error}</p>}
                    <button className="button full-width" disabled={busy || authLoading || (!supabaseAuth && forgot && !recovering)}>{busy ? 'Working…' : recovering ? 'Update password' : forgot ? 'Send reset link' : signup ? (supabaseAuth ? 'Create account' : 'Preview signup') : (supabaseAuth ? 'Log in' : 'Preview login')} {forgot ? <Mail size={17}/> : <ArrowRight size={17}/>}</button>
                </form>
                {!forgot && <><div className="auth-divider"><span />or<span /></div><button className="button secondary full-width" disabled={busy || authLoading} onClick={preview}>Explore a demo account <Compass size={17}/></button><button className="text-button full-width" onClick={() => go('home')}>Continue as a guest <ArrowRight size={16}/></button></>}
            </>}
            <a href="#privacy" className="auth-privacy">Your information, handled thoughtfully.</a>
        </div>
    </section>;
}
