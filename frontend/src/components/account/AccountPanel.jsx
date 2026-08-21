import React, { useEffect, useState } from 'react';
import {
  User, Mail, Phone, Store, Lock, Check, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Identity + password, shared by the customer and vendor profile screens.
 *
 * Both roles hit the same /auth/me endpoint; the only difference is that vendors
 * additionally get their business fields. Keeping it in one component means a fix
 * to the password flow cannot land for one role and be missed for the other.
 */
/**
 * Defined at module scope on purpose.
 *
 * These were originally declared inside AccountPanel, which makes them a NEW
 * component type on every render - React then unmounts and remounts the <input>,
 * so the field lost focus after every single keystroke.
 */
function Notice({ notice }) {
  if (!notice) return null;
  const ok = notice.kind === 'ok';
  return (
    <p className={`mt-2.5 flex items-center gap-1.5 text-[12px] font-bold ${
      ok ? 'text-success-dark' : 'text-warning-dark'}`}>
      {ok ? <Check size={13} /> : <AlertCircle size={13} />}
      {notice.text}
    </p>
  );
}

function Field({ icon, label, ...props }) {
  const IconTag = icon;
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">
        {label}
      </span>
      <span className="relative mt-1.5 block">
        <IconTag size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-lighter" />
        <input {...props} className="field w-full py-2.5 pl-10 pr-3 text-[13.5px] font-medium" />
      </span>
    </label>
  );
}

export default function AccountPanel({ onSaved }) {
  const { user, login, token } = useAuth();

  const [form, setForm] = useState({ username: '', email: '', phone_number: '', business_name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);   // { kind: 'ok' | 'err', text }
  const [hasPassword, setHasPassword] = useState(true);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwNotice, setPwNotice] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const isVendor = user?.role === 'vendor';

  useEffect(() => {
    let cancelled = false;
    authAPI.me()
      .then((res) => {
        if (cancelled) return;
        const u = res.data.user;
        setForm({
          username: u.username || '',
          email: u.email || '',
          phone_number: u.phone_number || '',
          business_name: u.business_name || '',
        });
        setHasPassword(u.has_password);
      })
      .catch(() => { if (!cancelled) setNotice({ kind: 'err', text: 'Could not load your details.' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        phone_number: form.phone_number,
        ...(isVendor ? { business_name: form.business_name } : {}),
      };
      const res = await authAPI.updateMe(payload);
      const u = res.data.user;

      // Keep the header/nav in step with what was just saved.
      login(token, {
        ...user,
        username: u.username,
        name: u.business_name || u.username,
        business_name: u.business_name,
        role: u.role,
        id: u.id,
      });

      setNotice({ kind: 'ok', text: 'Saved.' });
      onSaved?.(u);
    } catch (err) {
      setNotice({ kind: 'err', text: err.response?.data?.error || 'Could not save your details.' });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwNotice(null);

    if (pw.next.length < 8) return setPwNotice({ kind: 'err', text: 'Use at least 8 characters.' });
    if (pw.next !== pw.confirm) return setPwNotice({ kind: 'err', text: 'The two passwords do not match.' });

    setPwSaving(true);
    try {
      await authAPI.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setHasPassword(true);
      setPwNotice({ kind: 'ok', text: 'Password updated.' });
    } catch (err) {
      setPwNotice({ kind: 'err', text: err.response?.data?.error || 'Could not change your password.' });
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="panel skeleton h-64" />
        <div className="panel skeleton h-52" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- identity ---- */}
      <form onSubmit={saveProfile} className="panel p-5">
        <h2 className="font-display text-[15px] font-bold text-text">Your details</h2>
        <p className="mt-0.5 text-[12px] text-text-lighter">
          {isVendor ? 'Customers see your business name on the map.' : 'Used for order updates.'}
        </p>

        <div className="mt-4 space-y-3.5">
          {isVendor && (
            <Field icon={Store} label="Business name" name="business_name"
              value={form.business_name} onChange={set('business_name')}
              placeholder="e.g. Mama Njeri Kibandaski" />
          )}
          <Field icon={User} label={isVendor ? 'Owner username' : 'Username'} name="username"
            value={form.username} onChange={set('username')} required />
          <Field icon={Mail} label="Email" name="email" type="email"
            value={form.email} onChange={set('email')} required />
          <Field icon={Phone} label="Phone number" name="phone_number"
            value={form.phone_number} onChange={set('phone_number')}
            placeholder="+2547XXXXXXXX" />
        </div>

        <Notice notice={notice} />

        <button type="submit" disabled={saving}
          className="btn-ember mt-4 w-full py-2.5 text-[13px] disabled:opacity-60">
          {saving ? <Loader2 size={15} className="mx-auto animate-spin" /> : 'Save changes'}
        </button>
      </form>

      {/* ---- password ---- */}
      <form onSubmit={savePassword} className="panel p-5">
        <h2 className="flex items-center gap-1.5 font-display text-[15px] font-bold text-text">
          <ShieldCheck size={15} className="text-accent" />
          {hasPassword ? 'Change password' : 'Set a password'}
        </h2>
        <p className="mt-0.5 text-[12px] text-text-lighter">
          {hasPassword
            ? 'Your current password is required.'
            : 'You signed in with Google — set a password to log in directly too.'}
        </p>

        <div className="mt-4 space-y-3.5">
          {hasPassword && (
            <Field icon={Lock} label="Current password" type={showPw ? 'text' : 'password'}
              value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              autoComplete="current-password" />
          )}
          <Field icon={Lock} label="New password" type={showPw ? 'text' : 'password'}
            value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            autoComplete="new-password" />
          <Field icon={Lock} label="Confirm new password" type={showPw ? 'text' : 'password'}
            value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            autoComplete="new-password" />
        </div>

        <button type="button" onClick={() => setShowPw((v) => !v)}
          className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-bold text-text-lighter hover:text-primary">
          {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          {showPw ? 'Hide' : 'Show'} passwords
        </button>

        <Notice notice={pwNotice} />

        <button type="submit" disabled={pwSaving}
          className="btn-ghost mt-4 w-full py-2.5 text-[13px] disabled:opacity-60">
          {pwSaving ? <Loader2 size={15} className="mx-auto animate-spin" /> : 'Update password'}
        </button>
      </form>
    </div>
  );
}
