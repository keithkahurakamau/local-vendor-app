import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Search, Loader2, MapPin, Check, X } from 'lucide-react';

import { destinationIcon } from './markers';
import mapService from '../../services/mapService';
import { useLiveLocation } from '../../hooks/useLiveLocation';

const NAIROBI = { lat: -1.2864, lon: 36.8172 };

/** Recentres without fighting the user's own panning. */
function Recentre({ position, nonce }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lon], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Tapping the map moves the pin - faster than dragging on a phone. */
function TapToPlace({ onPlace }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
}

/**
 * Pick an exact spot on the map.
 *
 * A typed landmark alone ("blue gate") is only useful to someone who already knows
 * the area. This pairs the words with a real coordinate, so the vendor can route to
 * the pin and the customer can see precisely where to meet.
 */
export default function LocationPicker({
  value,                 // { lat, lon, address }
  onChange,
  height = 260,
  label = 'Drop a pin where you want to meet',
}) {
  const { location: live, refresh, status } = useLiveLocation({ enabled: false });

  const [pin, setPin] = useState(() =>
    value?.lat && value?.lon ? { lat: value.lat, lon: value.lon } : NAIROBI);
  const [address, setAddress] = useState(value?.address || '');
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [nonce, setNonce] = useState(0);

  const markerRef = useRef(null);
  const emit = useRef(onChange);
  emit.current = onChange;

  // Whenever the pin moves, describe it in words. Failure is non-fatal: the
  // coordinate is what the vendor actually routes to.
  const place = useCallback(async (lat, lon, { recentre = false } = {}) => {
    setPin({ lat, lon });
    if (recentre) setNonce((n) => n + 1);

    setResolving(true);
    const found = await mapService.reverseGeocode(lat, lon);
    setResolving(false);

    const text = found?.short || '';
    setAddress(text);
    emit.current?.({ lat, lon, address: text, full: found?.full || '' });
  }, []);

  // Follow a fresh GPS fix once it arrives.
  useEffect(() => {
    if (live) place(live.lat, live.lon, { recentre: true });
  }, [live?.lat, live?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await mapService.searchPlaces(query));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-text/10 bg-white/60">
      {/* search */}
      <form onSubmit={search} className="flex gap-2 border-b border-text/8 p-2.5">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-lighter" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a street, estate or landmark"
            className="field w-full py-2 pl-9 pr-8 text-[12.5px]"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-lighter hover:text-warning"
              aria-label="Clear">
              <X size={13} />
            </button>
          )}
        </div>
        <button type="submit" disabled={searching}
          className="btn-ghost shrink-0 px-3 py-2 text-[12px]">
          {searching ? <Loader2 size={13} className="animate-spin" /> : 'Find'}
        </button>
        <button type="button" onClick={refresh} title="Use my current location"
          className="btn-ghost shrink-0 px-3 py-2 text-primary">
          <Crosshair size={14} />
        </button>
      </form>

      {results.length > 0 && (
        <ul className="max-h-32 divide-y divide-text/5 overflow-y-auto border-b border-text/8 bg-white/80">
          {results.map((r, i) => (
            <li key={i}>
              <button
                onClick={() => { place(r.lat, r.lon, { recentre: true }); setResults([]); setQuery(''); }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-[12px] hover:bg-primary/5">
                <MapPin size={12} className="mt-0.5 shrink-0 text-primary/60" />
                <span className="line-clamp-2 text-text-light">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* map */}
      <div className="relative" style={{ height }}>
        <MapContainer
          center={[pin.lat, pin.lon]}
          zoom={16}
          zoomControl={false}
          className="absolute inset-0 h-full w-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <Recentre position={pin} nonce={nonce} />
          <TapToPlace onPlace={(lat, lon) => place(lat, lon)} />
          <Marker
            position={[pin.lat, pin.lon]}
            icon={destinationIcon()}
            draggable
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const m = markerRef.current?.getLatLng?.();
                if (m) place(m.lat, m.lng);
              },
            }}
          />
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-3">
          <span className="panel px-3 py-1.5 text-[10.5px] font-bold text-text-light">
            {label}
          </span>
        </div>
      </div>

      {/* resolved address */}
      <div className="flex items-start gap-2 border-t border-text/8 px-3 py-2.5">
        {resolving
          ? <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-text-lighter" />
          : <Check size={13} className="mt-0.5 shrink-0 text-success" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-text">
            {resolving ? 'Finding that place…' : (address || 'Pin placed')}
          </p>
          <p className="tabular mt-0.5 text-[10px] text-text-lighter">
            {pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}
            {status === 'denied' && ' · location permission off'}
          </p>
        </div>
      </div>
    </div>
  );
}
