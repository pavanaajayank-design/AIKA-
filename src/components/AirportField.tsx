import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import { airports } from '../../lib/aika/engine';
export const domesticCodes = ['BLR', 'CCJ', 'DEL', 'BOM', 'MAA', 'HYD', 'COK'];
export default function AirportField({ label, value, onChange, domestic = false }: {
    label: string;
    value: string;
    onChange: (code: string) => void;
    domestic?: boolean;
}) { const [query, setQuery] = useState(''); const id = useId(); const allowed = Object.entries(airports).filter(([code]) => !domestic || domesticCodes.includes(code)); const matches = allowed.filter(([code, a]) => code === value || (code + ' ' + a.name).toLowerCase().includes(query.toLowerCase())); return <div className="field airport-field"><label htmlFor={id}>{label}</label><div className="airport-search"><Search size={14}/><input aria-label={'Search ' + label} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search city or airport code"/></div><select id={id} value={value} onChange={e => onChange(e.target.value)} required><option value="">Choose an airport</option>{matches.map(([code, a]) => <option key={code} value={code}>{code} — {a.name}</option>)}</select><small>{matches.length ? `${domestic ? 'Indian arrival airports' : 'Supported airports'} · limited curated list` : 'No matching supported airport. Clear the search to try again.'}</small></div>; }
