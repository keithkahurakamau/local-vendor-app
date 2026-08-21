import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Star, Loader2, AlertCircle, Home, Briefcase, X } from 'lucide-react';
import { customerAPI } from '../../services/api';
import LocationPicker from '../map/LocationPicker';

const PRESETS = [
  { label: 'Home', icon: Home },
  { label: 'Work', icon: Briefcase },
];

/**
 * Saved delivery addresses.
 *
 * Coordinates are attached when the browser will give them, because the vendor
 * routes to the pin - the text label is only what they read on arrival. An address
 * without coordinates still works; it just won't drop a marker.
 */
export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ label: 'Home', details: '' });
  const [point, setPoint] = useState(null);   // { lat, lon, address }

  const load = () =>
    customerAPI.getAddresses()
      .then((res) => { setAddresses(res.data.addresses || []); setError(null); })
      .catch(() => setError('Could not load your addresses.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    let cancelled = false;
    customerAPI.getAddresses()
      .then((res) => { if (!cancelled) { setAddresses(res.data.addresses || []); setError(null); } })
      .catch(() => { if (!cancelled) setError('Could not load your addresses.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!draft.details.trim()) return;
    setSaving(true);
    try {
      await customerAPI.createAddress({
        label: draft.label,
        details: draft.details,
        latitude: point?.lat ?? null,
        longitude: point?.lon ?? null,
      });
      setDraft({ label: 'Home', details: '' });
      setPoint(null);
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save that address.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));   // optimistic
    try {
      await customerAPI.deleteAddress(id);
      await load();
    } catch {
      await load();                                            // roll back from server
    }
  };

  const makeDefault = async (id) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
    try {
      await customerAPI.updateAddress(id, { is_default: true });
    } finally {
      await load();
    }
  };

  if (loading) return <div className="panel skeleton h-48" />;

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold text-text">Saved addresses</h2>
          <p className="mt-0.5 text-[12px] text-text-lighter">
            Pick one at checkout instead of retyping it.
          </p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="btn-ghost flex shrink-0 items-center gap-1.5 px-3 py-2 text-[12px]">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-warning-dark">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      {adding && (
        <form onSubmit={save} className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center gap-1.5">
            {PRESETS.map((preset) => {
              const PresetIcon = preset.icon;
              return (
                <button key={preset.label} type="button"
                  onClick={() => setDraft((d) => ({ ...d, label: preset.label }))}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all ${
                    draft.label === preset.label ? 'bg-primary text-white' : 'bg-white/70 text-text-light'}`}>
                  <PresetIcon size={12} /> {preset.label}
                </button>
              );
            })}
            <input
              value={PRESETS.some((p) => p.label === draft.label) ? '' : draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Other…"
              maxLength={40}
              className="field w-24 px-2.5 py-1.5 text-[11.5px]"
            />
            <button type="button" onClick={() => setAdding(false)}
              className="ml-auto text-text-lighter hover:text-warning" aria-label="Cancel">
              <X size={15} />
            </button>
          </div>

          <input
            value={draft.details}
            onChange={(e) => setDraft((d) => ({ ...d, details: e.target.value }))}
            placeholder="Building, floor, gate — what the vendor needs to find you"
            maxLength={200}
            className="field mt-2.5 w-full px-3 py-2.5 text-[13px]"
          />

          <div className="mt-3">
            <LocationPicker
              height={200}
              label="Tap or drag the pin to the exact spot"
              onChange={(p) => {
                setPoint(p);
                // Offer the resolved street as a starting point, but never overwrite
                // something the customer has already typed.
                setDraft((d) => (d.details.trim() ? d : { ...d, details: p.address || '' }));
              }}
            />
          </div>

          <button type="submit" disabled={saving || !draft.details.trim()}
            className="btn-ember mt-3 w-full py-2 text-[12.5px] disabled:opacity-60">
            {saving ? <Loader2 size={14} className="mx-auto animate-spin" /> : 'Save address'}
          </button>
        </form>
      )}

      {addresses.length === 0 && !adding ? (
        <p className="mt-4 text-[12.5px] text-text-lighter">
          Nothing saved yet. Add one and it'll be waiting at checkout.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 rounded-xl border border-text/8 bg-white/60 p-3">
              <MapPin size={15} className="mt-0.5 shrink-0 text-primary/70" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-text">{a.label}</span>
                  {a.is_default && (
                    <span className="chip-live px-1.5 py-0.5 text-[8.5px]">Default</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-text-light">{a.details}</p>
              </div>
              {!a.is_default && (
                <button onClick={() => makeDefault(a.id)} title="Make default"
                  className="shrink-0 p-1 text-text-lighter hover:text-secondary-dark">
                  <Star size={14} />
                </button>
              )}
              <button onClick={() => remove(a.id)} title="Delete"
                className="shrink-0 p-1 text-text-lighter hover:text-warning">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
