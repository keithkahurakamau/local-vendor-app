import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Image as ImageIcon, Loader2, Tag, Plus, Trash2, Power, AlertCircle, Check, Store,
} from 'lucide-react';
import AccountPanel from '../../components/account/AccountPanel';
import { vendorAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/** Storefront photo — uploaded through the backend, then attached to the profile. */
function StorefrontImage() {
  const { user } = useAuth();
  const [preview, setPreview] = useState(user?.image || null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNote({ kind: 'err', text: 'Image must be under 5MB.' });
      return;
    }

    setBusy(true);
    setNote(null);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    try {
      const uploaded = await vendorAPI.uploadImage(file);
      if (!uploaded.url) throw new Error('no url');
      await vendorAPI.updateProfile({ storefront_image_url: uploaded.url });
      setPreview(uploaded.url);
      setNote({ kind: 'ok', text: 'Storefront photo updated.' });
    } catch {
      setPreview(user?.image || null);
      setNote({ kind: 'err', text: 'Upload failed. Try a smaller image.' });
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  return (
    <div className="panel p-5">
      <h2 className="font-display text-[15px] font-bold text-text">Storefront photo</h2>
      <p className="mt-0.5 text-[12px] text-text-lighter">Shown on your card and map pin.</p>

      <div className="mt-4 flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-primary/15 bg-primary/8">
          {preview
            ? <img src={preview} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center"><Store size={22} className="text-primary/40" /></div>}
        </div>
        <label className="btn-ghost cursor-pointer px-4 py-2.5 text-[12.5px]">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Choose photo'}
          <input type="file" accept="image/*" onChange={pick} className="hidden" disabled={busy} />
        </label>
      </div>

      {note && (
        <p className={`mt-3 flex items-center gap-1.5 text-[12px] font-bold ${
          note.kind === 'ok' ? 'text-success-dark' : 'text-warning-dark'}`}>
          {note.kind === 'ok' ? <Check size={13} /> : <AlertCircle size={13} />} {note.text}
        </p>
      )}
    </div>
  );
}

/** Discount codes. */
function Promotions() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ code: '', percent_off: 10, min_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => vendorAPI.getPromotions()
    .then((r) => { setPromos(r.data.promotions || []); setError(null); })
    .catch(() => setError('Could not load your codes.'))
    .finally(() => setLoading(false));

  useEffect(() => {
    let cancelled = false;
    vendorAPI.getPromotions()
      .then((r) => { if (!cancelled) { setPromos(r.data.promotions || []); setError(null); } })
      .catch(() => { if (!cancelled) setError('Could not load your codes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await vendorAPI.createPromotion({
        code: draft.code,
        percent_off: Number(draft.percent_off),
        min_order: Number(draft.min_order) || 0,
      });
      setDraft({ code: '', percent_off: 10, min_order: 0 });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create that code.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="panel skeleton h-52" />;

  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-1.5 font-display text-[15px] font-bold text-text">
        <Tag size={15} className="text-secondary-dark" /> Discount codes
      </h2>
      <p className="mt-0.5 text-[12px] text-text-lighter">
        Customers type these at checkout. Max 70% off.
      </p>

      <form onSubmit={create} className="mt-4 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_5rem_6rem_auto]">
        <label className="col-span-2 min-w-0 sm:col-span-1">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">Code</span>
          <input value={draft.code} required maxLength={24}
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
            placeholder="LUNCH10"
            className="field mt-1.5 w-full px-3 py-2 text-[13px] font-bold uppercase tracking-wider" />
        </label>
        <label className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">% off</span>
          <input type="number" min={1} max={70} value={draft.percent_off}
            onChange={(e) => setDraft((d) => ({ ...d, percent_off: e.target.value }))}
            className="field tabular mt-1.5 w-full px-3 py-2 text-[13px]" />
        </label>
        <label className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">Min spend</span>
          <input type="number" min={0} value={draft.min_order}
            onChange={(e) => setDraft((d) => ({ ...d, min_order: e.target.value }))}
            className="field tabular mt-1.5 w-full px-3 py-2 text-[13px]" />
        </label>
        <button type="submit" disabled={saving}
          className="btn-ember col-span-2 flex items-center justify-center gap-1.5 px-4 py-2 text-[12.5px] disabled:opacity-60 sm:col-span-1">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <><Plus size={13} /> Add</>}
        </button>
      </form>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-warning-dark">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      {promos.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-text-lighter">No codes yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {promos.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-text/8 bg-white/60 p-3">
              <span className={`tabular rounded-md px-2 py-1 text-[12px] font-extrabold tracking-wider ${
                p.is_active ? 'bg-secondary/20 text-secondary-dark' : 'bg-neutral text-text-lighter line-through'}`}>
                {p.code}
              </span>
              <div className="min-w-0 flex-1 text-[11.5px] font-semibold text-text-light">
                {p.percent_off}% off
                {p.min_order > 0 && <> · min KES {p.min_order}</>}
                <span className="tabular ml-1.5 text-text-lighter">· used {p.times_redeemed}×</span>
              </div>
              <button onClick={() => vendorAPI.togglePromotion(p.id, !p.is_active).then(load)}
                title={p.is_active ? 'Deactivate' : 'Activate'}
                className={`shrink-0 p-1 ${p.is_active ? 'text-success-dark' : 'text-text-lighter'} hover:text-primary`}>
                <Power size={14} />
              </button>
              <button onClick={() => vendorAPI.deletePromotion(p.id).then(load)} title="Delete"
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

export default function VendorProfile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh]">
      <nav className="pt-safe sticky top-0 z-50 border-b border-text/5 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => navigate('/vendor/dashboard')} className="btn-ghost p-2.5" aria-label="Back">
            <ArrowLeft size={16} />
          </button>
          <span className="font-display text-[15px] font-extrabold tracking-tight text-text">
            Settings
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-9">
        <AccountPanel />
        <StorefrontImage />
        <Promotions />
      </main>
    </div>
  );
}
