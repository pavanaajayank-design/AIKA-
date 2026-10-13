import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Minus, ArrowUp, RotateCcw, Compass } from 'lucide-react';
import { usePlanner } from '../../app/PlannerContext';
type Message = {
    id: number;
    who: 'user' | 'help';
    text: string;
};
export default function HelpPanel() {
    const { services } = usePlanner();
    const [open, setOpen] = useState(false), [messages, setMessages] = useState<Message[]>([]), [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const input = useRef<HTMLTextAreaElement>(null), end = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), sequence = useRef(0);
    useEffect(() => { const show = () => setOpen(true); window.addEventListener('aika-help', show); return () => window.removeEventListener('aika-help', show); }, []);
    useEffect(() => { if (open) {
        input.current?.focus();
        end.current?.scrollIntoView({ block: 'nearest' });
    } }, [open, messages]);
    async function send(question = text) { if (busy)
        return; const value = question.trim(); if (!value || value.length > 500) {
        setError('Ask a question using 1–500 characters.');
        return;
    } setBusy(true); setError(''); setText(''); const id = ++sequence.current; setMessages(m => [...m, { id: id * 2, who: 'user', text: value }]); try {
        const reply = await services.help.answer(value);
        setMessages(m => [...m, { id: id * 2 + 1, who: 'help', text: reply.text }]);
    }
    catch {
        setError('Help is unavailable. Please try again.');
    }
    finally {
        setBusy(false);
    } }
    function close() { setOpen(false); trigger.current?.focus(); }
    return <><button ref={trigger} className="help-launcher" aria-label="Open AIKA help" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={21}/><span>Help</span></button>{open && <section className="help-panel" role="dialog" aria-label="AIKA website help" onKeyDown={e => { if (e.key === 'Escape')
        close(); }}><div className="help-header"><span className="help-avatar"><Compass size={22}/></span><div><b>A little help?</b><small>Travel concierge & FAQ guide</small></div><button className="icon-button" aria-label="Minimize help" onClick={close}><Minus size={16}/></button><button className="icon-button" aria-label="Close help" onClick={close}><X size={16}/></button></div><div className="help-messages" aria-live="polite">{!messages.length && <><p className="help-greeting">Hi! I can help you find your way around AIKA. What would you like to know?</p><div className="help-suggestions">{['How is my exploration time calculated?', 'How does My Trips save my itinerary?', 'What happens if my flight is delayed?'].map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}</div></>}{messages.map(m => <p key={m.id} className={'chat-message ' + m.who}><span>{m.who === 'user' ? 'You' : 'AIKA concierge'}</span>{m.text}</p>)}{busy && <p role="status">Finding your answer…</p>}{error && <p className="error" role="alert">{error}</p>}<div ref={end}/></div><form className="help-compose" onSubmit={e => { e.preventDefault(); send(); }}><label className="sr-only" htmlFor="help-message">Your question</label><textarea ref={input} id="help-message" value={text} onChange={e => setText(e.target.value)} maxLength={500} rows={2} placeholder="Ask about your plan…" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    } }}/><button className="button" disabled={busy || !text.trim()} aria-label="Send question"><ArrowUp size={19}/></button></form><div className="help-bottom"><span>{text.length}/500 · Shift+Enter for a new line</span><button className="text-button" disabled={busy} onClick={() => { setMessages([]); setError(''); }}><RotateCcw size={12}/> Clear chat</button></div></section>}</>;
}
