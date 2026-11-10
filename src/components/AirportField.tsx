import { useId, useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { airports, domesticCodes, searchAirports } from '../../lib/aika/engine';

export { domesticCodes };

export default function AirportField({
    label,
    value,
    onChange,
    domestic = false,
}: {
    label: string;
    value: string;
    onChange: (code: string) => void;
    domestic?: boolean;
}) {
    const id = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [prevValue, setPrevValue] = useState(value);
    const [query, setQuery] = useState(
        value && airports[value] ? `${value} — ${airports[value].name}` : ''
    );
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    // Adjust query text when incoming value prop changes
    if (value !== prevValue) {
        setPrevValue(value);
        setQuery(value && airports[value] ? `${value} — ${airports[value].name}` : '');
    }

    // All allowed airports for this field (respecting domestic prop)
    const allowed = Object.entries(airports).filter(([, a]) => !domestic || a.country === 'IN');

    // Matching suggestions:
    // If user is typing in query, score and sort via searchAirports;
    // otherwise fallback to full allowed list.
    const searchResults = searchAirports(query, domestic);
    // Suggestion dropdown displays up to 15 best matches to maintain high performance
    const suggestions = query.trim() ? searchResults.slice(0, 15) : [];

    // Close autocomplete when clicking outside
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
                setHighlightIndex(-1);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    const handleSelect = (code: string) => {
        onChange(code);
        const selected = airports[code];
        setQuery(selected ? `${code} — ${selected.name}` : code);
        setIsOpen(false);
        setHighlightIndex(-1);
        inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextQuery = e.target.value;
        setQuery(nextQuery);
        setIsOpen(nextQuery.trim().length > 0);
        setHighlightIndex(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setIsOpen(true);
                setHighlightIndex(0);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0) {
                const targetIndex = highlightIndex >= 0 && highlightIndex < suggestions.length ? highlightIndex : 0;
                handleSelect(suggestions[targetIndex][0]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            setHighlightIndex(-1);
        }
    };

    return (
        <div className="field airport-field" ref={containerRef}>
            <label htmlFor={id}>{label}</label>
            <div className="airport-search">
                <Search size={14} aria-hidden="true" />
                <input
                    ref={inputRef}
                    aria-label={'Search ' + label}
                    type="search"
                    autoComplete="off"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (query.trim().length > 0) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search city, airport name, or code (e.g. JAI, Dubai)"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={`${id}-suggestions`}
                />
                {isOpen && (
                    <ul
                        id={`${id}-suggestions`}
                        role="listbox"
                        className="airport-suggestions"
                        aria-label={`${label} suggestions`}
                    >
                        {suggestions.length > 0 ? (
                            suggestions.map(([code, a], idx) => {
                                const isHighlighted = idx === highlightIndex;
                                const isSelected = code === value;
                                return (
                                    <li
                                        key={code}
                                        role="option"
                                        id={`${id}-opt-${idx}`}
                                        aria-selected={isSelected || isHighlighted}
                                        className={`airport-suggestion-item ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                                        onPointerDown={e => {
                                            e.preventDefault();
                                            handleSelect(code);
                                        }}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                    >
                                        <div className="suggestion-top">
                                            <span className="suggestion-code">{code}</span>
                                            <span className="suggestion-city">{a.city}</span>
                                            {a.country && <span className="suggestion-country">{a.country}</span>}
                                        </div>
                                        <div className="suggestion-name">{a.name}</div>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="airport-suggestion-empty">
                                No matching airport found. Try searching by city name or code.
                            </li>
                        )}
                    </ul>
                )}
            </div>
            <select
                id={id}
                value={value}
                onChange={e => handleSelect(e.target.value)}
                required
                aria-label={`Select ${label}`}
            >
                <option value="">Choose an airport</option>
                {allowed.map(([code, a]) => (
                    <option key={code} value={code}>
                        {code} — {a.name} ({a.city})
                    </option>
                ))}
            </select>
            <small>
                {allowed.length
                    ? `${domestic ? 'Indian arrival airports' : 'Supported airports'} · comprehensive verified database`
                    : 'No matching supported airport.'}
            </small>
        </div>
    );
}
