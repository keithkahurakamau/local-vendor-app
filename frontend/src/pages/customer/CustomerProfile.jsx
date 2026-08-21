import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt, Store, Clock, LogOut, ArrowLeft, Loader2, AlertCircle,
  MapPin, RefreshCw, ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { customerAPI } from '../../services/api';
import OrderTimeline from '../../components/orders/OrderTimeline';
import NotificationBell from '../../components/common/NotificationBell';
import { Star, Repeat, XCircle, Heart, Settings as SettingsIcon, MapPinned, ShoppingBag as BagIcon } from 'lucide-react';
import AccountPanel from '../../components/account/AccountPanel';
import AddressBook from '../../components/account/AddressBook';
import { useCart } from '../../context/CartContext';

const KES = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

const TONE = {
  Paid: 'chip-live',
  Preparing: 'chip-live',
  Ready: 'chip-live',
  Collected: 'chip-dim',
  'Pending Payment': 'chip-closing',
  'Payment Failed': 'chip-closing',
  Cancelled: 'chip-closing',
};

function ReviewPrompt({ order, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!rating) return setError('Pick a rating first.');
    setSaving(true);
    setError('');
    try {
      await customerAPI.leaveReview(order.order_number, rating, comment);
      setDone(true);
      onDone?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save your review.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <p className="mt-3 text-[12px] font-bold text-success-dark">
        Thanks — your rating helps other people find good food.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-secondary/30 bg-secondary/8 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">
        Rate {order.vendor?.name}
      </p>

      <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`} className="p-0.5">
            <Star size={20}
              className={(hover || rating) >= n
                ? 'fill-secondary text-secondary'
                : 'text-neutral-dark'} />
          </button>
        ))}
      </div>

      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        placeholder="Anything worth saying? (optional)"
        className="field mt-2.5 w-full px-3 py-2 text-[12.5px]"
      />

      {error && <p className="mt-1.5 text-[11.5px] font-semibold text-warning-dark">{error}</p>}

      <button onClick={submit} disabled={saving}
        className="btn-ember mt-2.5 w-full py-2 text-[12px] disabled:opacity-60">
        {saving ? 'Saving…' : 'Submit rating'}
      </button>
    </div>
  );
}

function OrderActions({ order }) {
  const navigate = useNavigate();
  const { addToCart, clearCart } = useCart();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const canCancel = ['Paid', 'Pending Payment'].includes(order.status) || order.stranded;
  const canReorder = order.timeline_index >= 0 || order.status === 'Cancelled';

  const reorder = async () => {
    setBusy(true);
    setNote('');
    try {
      const { data } = await customerAPI.reorder(order.order_number);
      if (!data.vendor.is_live) {
        setNote(`${data.vendor.name} isn't broadcasting right now.`);
        return;
      }
      if (!data.items.length) {
        setNote('None of those items are on the menu today.');
        return;
      }
      clearCart();
      data.items.forEach((item) => {
        for (let i = 0; i < (item.qty || 1); i += 1) {
          addToCart({ id: data.vendor.vendor_id, name: data.vendor.name }, item);
        }
      });
      if (data.unavailable.length) {
        // Say what was dropped rather than quietly shrinking the order.
        window.alert(`Added what's available. No longer on the menu: ${data.unavailable.join(', ')}`);
      }
      navigate(`/order/${data.vendor.vendor_id}`);
    } catch (e) {
      setNote(e.response?.data?.error || 'Could not rebuild that order.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    setNote('');
    try {
      await customerAPI.cancelOrder(order.order_number);
      window.location.reload();
    } catch (e) {
      setNote(e.response?.data?.error || 'Could not cancel that order.');
    } finally {
      setBusy(false);
    }
  };

  if (!canCancel && !canReorder) return null;

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        {canReorder && (
          <button onClick={reorder} disabled={busy}
            className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] disabled:opacity-60">
            <Repeat size={13} /> Order again
          </button>
        )}
        {canCancel && (
          <button onClick={cancel} disabled={busy}
            className="btn-ghost flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] text-warning-dark disabled:opacity-60">
            <XCircle size={13} /> Cancel
          </button>
        )}
      </div>
      {note && <p className="mt-1.5 text-[11.5px] font-semibold text-warning-dark">{note}</p>}
    </div>
  );
}

function OrderCard({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const count = items.reduce((n, i) => n + (Number(i.qty) || 1), 0);

  return (
    <article className="panel p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-primary/8">
          {order.vendor?.image
            ? <img src={order.vendor.image} alt="" className="h-full w-full object-cover" />
            : <Store size={18} className="text-primary/60" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display truncate text-[14.5px] font-bold text-text">
              {order.vendor?.name}
            </h3>
            <span className={`${TONE[order.status] || 'chip-dim'} shrink-0 px-2 py-0.5 text-[9px]`}>
              {order.status}
            </span>
          </div>

          <p className="tabular mt-0.5 text-[11px] font-semibold text-text-lighter">
            {order.order_number} · {when(order.created_at)}
          </p>

          <p className="mt-2 truncate text-[12px] text-text-light">
            {count} item{count === 1 ? '' : 's'}
            {items.length > 0 && <> · {items.map((i) => i.name).join(', ')}</>}
          </p>

          {order.delivery_location && (
            <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] text-text-lighter">
              <MapPin size={11} className="shrink-0 text-primary/60" />
              {order.delivery_location}
            </p>
          )}
        </div>
      </div>

      <div className="rule my-3.5" />

      <OrderTimeline
        timeline={order.timeline}
        index={order.timeline_index}
        status={order.status}
      />

      {order.stranded && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/8 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning-dark" />
          <div className="min-w-0 text-[12px] leading-snug text-text-light">
            <strong className="text-warning-dark">{order.vendor?.name} has closed</strong> with this
            order unfinished.
            {order.vendor?.phone && <> Call <span className="tabular font-bold">{order.vendor.phone}</span> to
            arrange collection,</>} or cancel it below.
          </div>
        </div>
      )}

      {order.status === 'Collected' && <ReviewPrompt order={order} />}

      <OrderActions order={order} />

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <span className="tabular font-display text-[15px] font-bold text-text">
          {KES(order.total_amount)}
        </span>
        {order.receipt && (
          <span className="tabular rounded-md border border-success/25 bg-success/8 px-2 py-0.5 text-[10px] font-bold text-success-dark">
            {order.receipt}
          </span>
        )}
      </div>
    </article>
  );
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Deep-linkable so "manage your addresses" can point straight at the right tab.
  const [params, setParams] = useSearchParams();
  const tab = ['orders', 'addresses', 'account'].includes(params.get('tab'))
    ? params.get('tab') : 'orders';
  const setTab = (next) => setParams(next === 'orders' ? {} : { tab: next }, { replace: true });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = () => customerAPI.getMyOrders()
    .then((res) => { setOrders(res.data.orders || []); setError(null); })
    .catch((e) => setError(e.response?.status === 401
      ? 'Please log in again to see your orders.'
      : 'Could not load your orders.'))
    .finally(() => setLoading(false));

  // No synchronous setState here - `loading` already starts true, so calling
  // setLoading(true) in the effect body would only cause a cascading render.
  useEffect(() => {
    let cancelled = false;
    customerAPI.getMyOrders()
      .then((res) => { if (!cancelled) { setOrders(res.data.orders || []); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e.response?.status === 401
        ? 'Please log in again to see your orders.'
        : 'Could not load your orders.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Triggered from the refresh button - an event handler, so setState is fine here.
  const load = () => { setLoading(true); fetchOrders(); };

  const active = orders.filter((o) => o.timeline_index >= 0 && o.status !== 'Collected');
  const past = orders.filter((o) => o.timeline_index < 0 || o.status === 'Collected');
  const spent = orders
    .filter((o) => o.timeline_index >= 0)
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="min-h-[100dvh]">
      <nav className="pt-safe sticky top-0 z-50 border-b border-text/5 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => navigate('/')} className="btn-ghost p-2.5" aria-label="Back">
            <ArrowLeft size={16} />
          </button>
          <span className="font-display text-[15px] font-extrabold tracking-tight text-text">
            My orders
          </span>
          <div className="ml-auto"><NotificationBell /></div>
          <button onClick={load} className="btn-ghost p-2.5" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { logout(); navigate('/'); }}
            className="btn-ghost p-2.5" aria-label="Log out">
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-9">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight text-text sm:text-3xl">
            {user?.name || user?.username || 'Your orders'}
          </h1>
          {!loading && !error && orders.length > 0 && (
            <p className="tabular mt-1 text-[13px] font-semibold text-text-light">
              {orders.length} order{orders.length === 1 ? '' : 's'} · {KES(spent)} spent
            </p>
          )}
        </header>

        <div className="mb-5 flex gap-1 rounded-full border border-text/8 bg-white/60 p-1">
          {[
            { id: 'orders', label: 'Orders', Icon: BagIcon },
            { id: 'addresses', label: 'Addresses', Icon: MapPinned },
            { id: 'account', label: 'Account', Icon: SettingsIcon },
          ].map((entry) => {
            const TabIcon = entry.Icon;
            return (
              <button key={entry.id} onClick={() => setTab(entry.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all ${
                  tab === entry.id ? 'bg-primary text-white shadow-sm' : 'text-text-light hover:text-text'}`}>
                <TabIcon size={13} /> {entry.label}
              </button>
            );
          })}
        </div>

        {tab === 'addresses' ? <AddressBook />
         : tab === 'account' ? <AccountPanel />
         : loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="panel skeleton h-44" />)}
          </div>
        ) : error ? (
          <div className="panel flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle size={26} className="text-warning" />
            <p className="text-[13px] font-semibold text-text-light">{error}</p>
            <Link to="/login" className="btn-ember px-5 py-2.5 text-[13px]">Log in</Link>
          </div>
        ) : orders.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 p-10 text-center">
            <ShoppingBag size={32} className="text-neutral-dark" />
            <p className="font-display text-base font-bold text-text">No orders yet</p>
            <p className="max-w-xs text-[13px] text-text-lighter">
              Once you order from a vendor, you'll be able to follow it here from paid
              to collected.
            </p>
            <button onClick={() => navigate('/map')} className="btn-ember mt-2 px-5 py-2.5 text-[13px]">
              Find food near me
            </button>
          </div>
        ) : (
          <div className="space-y-7">
            {active.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-lighter">
                  <Clock size={12} className="text-success" /> In progress
                </h2>
                <div className="stagger space-y-3.5">
                  {active.map((o) => <OrderCard key={o.order_number} order={o} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-lighter">
                  <Receipt size={12} /> History
                </h2>
                <div className="space-y-3.5">
                  {past.map((o) => <OrderCard key={o.order_number} order={o} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
