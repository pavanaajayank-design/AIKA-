import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { airports, type Place } from '../../lib/aika/engine';
export default function MapView({ places, selected, onSelect, airport }: {
    places: Place[];
    selected: string;
    onSelect: (p: Place) => void;
    airport: string;
}) {
    const el = useRef<HTMLDivElement>(null), mapRef = useRef<Leaflet.Map | null>(null), library = useRef<typeof Leaflet | null>(null), layers = useRef<Leaflet.LayerGroup | null>(null), fitted = useRef(false), selectRef = useRef(onSelect);
    const [ready, setReady] = useState(0), [error, setError] = useState('');
    useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
    useEffect(() => { let cancelled = false; import('leaflet').then(L => { if (cancelled || !el.current)
        return; const a = airports[airport]; if (!a) {
        setError('Airport map coordinates are not available.');
        return;
    } setError(''); library.current = L; const map = L.map(el.current).setView([a.lat, a.lng], 11); mapRef.current = map; fitted.current = false; L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 18 }).on('tileerror', () => setError('Map tiles are unavailable. Destination cards still work.')).addTo(map); layers.current = L.layerGroup().addTo(map); setReady(r => r + 1); const resize = new ResizeObserver(() => map.invalidateSize()); resize.observe(el.current); map.once('unload', () => resize.disconnect()); }).catch(() => setError('Map unavailable. Use the destination cards below.')); return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; layers.current = null; }; }, [airport]);
    useEffect(() => { const L = library.current, map = mapRef.current, layer = layers.current, a = airports[airport]; if (!L || !map || !layer || !a)
        return; layer.clearLayers(); function marker(lat: number, lng: number, label: string, active: boolean, name: string) { const text = document.createElement('span'); text.textContent = label; if (active)
        text.className = 'active'; const tooltip = document.createElement('span'); tooltip.textContent = name; return L!.marker([lat, lng], { icon: L!.divIcon({ className: 'map-pin', html: text, iconSize: [32, 32] }) }).addTo(layer!).bindTooltip(tooltip); } marker(a.lat, a.lng, '✈', true, airport + ' airport'); places.forEach((p, i) => marker(p.lat, p.lng, String(i + 1), p.id === selected, p.name).on('click', () => selectRef.current(p))); if (!fitted.current && places.length) {
        map.fitBounds(L.latLngBounds([[a.lat, a.lng], ...places.map(p => [p.lat, p.lng] as [
                number,
                number
            ])]), { padding: [35, 35], maxZoom: 12 });
        fitted.current = true;
    } }, [ready, places, selected, airport]);
    return <div className="map-wrap"><div ref={el} className="map" aria-label="Interactive map of nearby places"/>{error && <p className="map-error" role="status">{error}</p>}<span className="map-caption">Estimated locations · verify live transport and gate times</span></div>;
}
