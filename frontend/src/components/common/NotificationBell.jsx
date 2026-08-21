import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Package, Store, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ICON = {
  order_status: Package,
  vendor_live: Sparkles,
  vendor_closed: XCircle,
  new_order: Store,
};

const TONE = {
  order_status: 'text-accent bg-accent/10',
  vendor_live: 'text-success-dark bg-success/12',
  vendor_closed: 'text-warning-dark bg-warning/10',
  new_order: 'text-primary bg-primary/10',
};

const ago = (iso) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
};

/**
 * Alert bell, shared by vendors and customers.
 *
 * Notifications are keyed by user id rather than role, so one component serves both.
 * Polling is deliberately slow (45s) and pauses while the tab is hidden - this is a
 * street-food app on mobile data, not a trading desk.
 */
export default function NotificationBell({ onDark = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = useCallback(() => {
    if (!user) return;
    customerAPI.getNotifications()
      .then((res) => {
        setItems(res.data.notifications || []);
        setUnread(res.data.unread || 0);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 45000);
    return () => clearInterval(id);
  }, [user, load]);

  // Close on an outside click, the way every other dropdown behaves.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const openPanel = () => {
    setOpen((v) => !v);
    if (!open) { setLoading(true); load(); setTimeout(() => setLoading(false), 400); }
  };

  const readAll = async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try { await customerAPI.markAllNotificationsRead(); } catch { load(); }
  };

  const tap = async (note) => {
    setOpen(false);
    if (!note.is_read) {
      setUnread((n) => Math.max(0, n - 1));
      setItems((prev) => prev.map((x) => (x.id === note.id ? { ...x, is_read: true } : x)));
      try { await customerAPI.markNotificationRead(note.id); } catch { /* non-fatal */ }
    }
    if (note.link) navigate(note.link);
  };

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        onClick={openPanel}
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
          onDark
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
            : 'border-text/10 bg-white/70 text-text-light hover:border-primary/40 hover:text-primary'
        }`}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-warning px-1 text-[9px] font-extrabold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="panel absolute right-0 z-[900] mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden">
          <div className="flex items-center justify-between border-b border-text/8 px-4 py-2.5">
            <span className="font-display text-[13px] font-bold text-text">Alerts</span>
            {unread > 0 && (
              <button onClick={readAll}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,60dvh)] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-text-lighter" /></div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-text-lighter">
                Nothing yet. We'll tell you when an order moves or a favourite goes live.
              </p>
            ) : (
              <ul className="divide-y divide-text/5">
                {items.map((n) => {
                  const Icon = ICON[n.kind] || Bell;
                  return (
                    <li key={n.id}>
                      <button onClick={() => tap(n)}
                        className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-primary/5 ${
                          n.is_read ? '' : 'bg-primary/[0.04]'}`}>
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE[n.kind] || 'bg-neutral-light text-text-light'}`}>
                          <Icon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`truncate text-[12.5px] ${n.is_read ? 'font-semibold text-text-light' : 'font-bold text-text'}`}>
                              {n.title}
                            </span>
                            <span className="tabular ml-auto shrink-0 text-[10px] text-text-lighter">{ago(n.created_at)}</span>
                          </span>
                          {n.body && (
                            <span className="mt-0.5 block line-clamp-2 text-[11.5px] leading-snug text-text-lighter">
                              {n.body}
                            </span>
                          )}
                        </span>
                        {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
