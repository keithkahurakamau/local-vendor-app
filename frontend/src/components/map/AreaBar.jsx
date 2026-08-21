import React, { useState } from 'react';
import { MapPin, Navigation, Pencil, X, Check, Loader2 } from 'lucide-react';
import LocationPicker from './LocationPicker';

/**
 * Says where results are being drawn from, and lets the user change it.
 *
 * Denying location is a normal choice, so this never scolds. It states plainly that
 * a default is in use and puts the fix one tap away, rather than showing a red error
 * and leaving the user to work out that tapping the map is what they were meant to do.
 */
export default function AreaBar({
  onDark = false,
  origin,            // { lat, lon, source, label }
  isDefault,
  geoStatus,         // idle | locating | tracking | denied | unavailable
  onUseMyLocation,
  onPick,            // (lat, lon, label) => void
  compact = false,
}) {
  const [picking, setPicking] = useState(false);

  const describe = () => {
    if (origin?.label) return origin.label;
    if (origin?.source === 'gps') return 'Your current location';
    if (isDefault) return 'Nairobi CBD';
    return `${origin.lat.toFixed(3)}, ${origin.lon.toFixed(3)}`;
  };

  const locating = geoStatus === 'locating';
  const blocked = geoStatus === 'denied' || geoStatus === 'unavailable';

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold ${onDark ? "text-white/85" : "text-text-light"}`}>
          <MapPin size={12} className="shrink-0 text-primary" />
          <span className="truncate">
            {isDefault ? 'Showing' : 'Searching near'} <strong className={onDark ? "text-white" : "text-text"}>{describe()}</strong>
            {isDefault && <span className={onDark ? "text-white/60" : "text-text-lighter"}> (default)</span>}
          </span>
        </span>

        <button
          onClick={() => setPicking((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-text/10 bg-white/70 px-2.5 py-1 text-[11px] font-bold text-text-light transition-colors hover:border-primary/40 hover:text-primary"
        >
          {picking ? <X size={11} /> : <Pencil size={11} />}
          {picking ? 'Close' : 'Change'}
        </button>

        {!blocked && (
          <button
            onClick={onUseMyLocation}
            disabled={locating}
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary-dark transition-colors hover:bg-primary/15 disabled:opacity-60"
          >
            {locating ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        )}
      </div>

      {blocked && !picking && (
        <p className={`mt-1 text-[11px] font-medium ${onDark ? "text-white/70" : "text-text-lighter"}`}>
          Location is off in your browser — pick your area instead and we'll remember it.
        </p>
      )}

      {picking && (
        <div className={compact ? 'mt-2' : 'mt-2.5'}>
          <LocationPicker
            height={compact ? 200 : 240}
            label="Tap or drag to set your area"
            value={{ lat: origin.lat, lon: origin.lon }}
            onChange={({ lat, lon, address }) => onPick?.(lat, lon, address)}
          />
          <button
            onClick={() => setPicking(false)}
            className="btn-ember mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[12px]"
          >
            <Check size={13} /> Search here
          </button>
        </div>
      )}
    </div>
  );
}
