import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Clock, MapPin, Mail, Compass } from 'lucide-react';
import { z } from 'zod';
import { usePlanner } from '../../app/PlannerContext';
import Brand from '../../components/Brand';

export default function AuthPage() {
    const {
        page, go, session, setSession, services, result, notice, setNotice,
        authLoading, passwordRecovery, setPasswordRecovery,
    } = usePlanner();
    const signup = page === 'signup';
    const forgot = page === 'forgot';
    const recovering = forgot && passwordRecovery;
    const welcome = page === 'welcome';
    const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [passwordVisible, setPasswordVisible] = useState(false), [confirmVisible, setConfirmVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (busy || authLoading) return;
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
                setPasswordVisible(false);
                setConfirmVisible(false);
                setNotice('Your account password has been updated.');
                setSuccess('Password updated successfully.');
                go('home');
                return;
            }

            if (forgot) {
                await services.auth.requestPasswordReset(email.trim());
                setSuccess('If an account matches that email, a password reset link is on its way.');
                return;
            }

            if (signup) {
                const outcome = await services.auth.signUp({ name: name.trim(), email: email.trim(), password });
                setName('');
                setEmail('');
                setPassword('');
                setConfirm('');
                setPasswordVisible(false);
                setConfirmVisible(false);
                setError('');

                const requiresConfirmation = Boolean(outcome.confirmationRequired || !outcome.session);
                const message = requiresConfirmation
                    ? 'Registration successful! Please check your email to confirm your account before logging in.'
                    : 'Account created successfully! Please log in with your new credentials.';

                setNotice(message);
                setSuccess(message);
                go('login');
                return;
            }

            const user = await services.auth.signIn({ email: email.trim(), password });
            setSession(user);
            setPassword('');
            setPasswordVisible(false);
            setNotice('You are signed in.');
            go(result ? 'results' : 'home');
        } catch (cause) {
            setError(cause instanceof z.ZodError
                ? cause.issues[0].message
                : cause instanceof Error ? cause.message : 'Unable to continue. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const heading = welcome ? 'Welcome to AIKA.'
        : recovering ? 'Choose a new password.'
            : forgot ? 'Forgot your password?'
                : signup ? 'Your next journey starts here.'
                    : 'Good to see you again.';
    const description = welcome ? 'Plan a layover as a guest, or sign in to your account.'
        : recovering ? 'Your reset link is verified. Choose a new password for your account.'
            : forgot ? 'Enter your email and we will send a secure password reset link.'
                : signup ? 'Create your AIKA account to save and access your layover itineraries.'
                    : 'Sign in to your AIKA account.';

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
            {authLoading && <p className="form-note" role="status">Checking your session…</p>}
            {notice && <p className="form-note" role="status">{notice}</p>}
            {success && <p className="form-note" role="status">{success}</p>}

            {welcome ? <div className="welcome-actions">
                <button className="button" disabled={authLoading} onClick={() => { setNotice(''); go('login'); }}>Log in <ArrowRight size={17}/></button>
                <button className="button secondary" disabled={authLoading} onClick={() => { setNotice(''); go('signup'); }}>Sign up <ArrowRight size={17}/></button>
                <button className="text-button" onClick={() => go('home')}>Continue as a guest <ArrowRight size={16}/></button>
                {session && <small>Signed in as {session.name} ({session.email})</small>}
            </div> : <>
                <div className="auth-tabs"><button className={!signup && !forgot ? 'active' : ''} onClick={() => { setError(''); setSuccess(''); go('login'); }}>Log in</button><button className={signup ? 'active' : ''} onClick={() => { setError(''); setSuccess(''); setNotice(''); go('signup'); }}>Sign up</button></div>
                <form onSubmit={submit} className="auth-form">
                    {signup && <label className="field"><span>Your name</span><input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" maxLength={80}/></label>}
                    {!recovering && <label className="field"><span>Email address</span><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" maxLength={254}/></label>}
                    {(!forgot || recovering) && <>
                        <label className="field"><span>{recovering ? 'New password' : 'Password'}</span><div className="password-input"><input type={passwordVisible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete={signup || recovering ? 'new-password' : 'current-password'}/><button type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><small>Password must be at least 8 characters.</small></label>
                        {(signup || recovering) && <label className="field"><span>Confirm password</span><div className="password-input"><input type={confirmVisible ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password"/><button type="button" aria-label={confirmVisible ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={confirmVisible} onClick={() => setConfirmVisible(!confirmVisible)}>{confirmVisible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>}
                        {!signup && !recovering && <button type="button" className="text-button forgot-link" onClick={() => { setPasswordRecovery(false); setSuccess(''); go('forgot'); }}>Forgot password?</button>}
                    </>}
                    {error && <p className="error" role="alert">{error}</p>}
                    <button className="button full-width" disabled={busy || authLoading}>{busy ? 'Working…' : recovering ? 'Update password' : forgot ? 'Send reset link' : signup ? 'Create account' : 'Log in'} {forgot ? <Mail size={17}/> : <ArrowRight size={17}/>}</button>
                </form>
                {!forgot && <><div className="auth-divider"><span />or<span /></div><button className="button secondary full-width" onClick={() => go('home')}>Continue as a guest <ArrowRight size={16}/></button></>}
            </>}
            <a href="#privacy" className="auth-privacy">Your information, handled thoughtfully.</a>
        </div>
    </section>;
}
