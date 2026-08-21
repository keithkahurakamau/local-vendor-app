import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Package, LogOut, TrendingUp, Settings, Clock, Users,
  Receipt, Flame, Loader2, ArrowRight, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI } from '../../services/api';
import NotificationBell from '../../components/common/NotificationBell';

const KES = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

/** 14:00 -> "2 PM", for the peak-hours readout. */
const hourLabel = (h) => {
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
};

function Stat({ icon, label, value, sub, tone = 'primary' }) {
  const IconTag = icon;
  const tones = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    success: 'text-success-dark bg-success/10 border-success/25',
    accent: 'text-accent bg-accent/10 border-accent/20',
    secondary: 'text-secondary-dark bg-secondary/15 border-secondary/30',
  };
  return (
    <div className="panel p-4 sm:p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}>
        <IconTag size={18} />
      </div>
      <p className="tabular font-display text-xl font-bold leading-none text-text sm:text-2xl">{value}</p>
      <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">{label}</p>
      {sub && <p className="mt-1 text-[11px] font-semibold text-text-light">{sub}</p>}
    </div>
  );
}

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    vendorAPI.getAnalytics()
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError('Could not load your stats.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const actions = [
    { title: 'Go live', desc: 'Set your spot and menu for the next 3 hours',
      icon: MapPin, to: '/vendor/checkin', tone: 'primary' },
    { title: 'Orders', desc: 'Track payments and route to customers',
      icon: Package, to: '/vendor/orders', tone: 'accent' },
    { title: 'Settings', desc: 'Business name, photo, contact details',
      icon: Settings, to: '/vendor/profile', tone: 'secondary' },
  ];

  const topItem = data?.top_items?.[0];
  const peak = data?.peak_hours?.[0];

  return (
    <div className="min-h-[100dvh]">
      <nav className="pt-safe sticky top-0 z-50 border-b border-text/5 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="font-display text-lg font-extrabold tracking-tight text-text">
            Hyper<span className="text-primary">Local</span>
          </span>
          <span className="chip-dim hidden px-2.5 py-1 text-[9px] sm:inline-block">Vendor</span>
          <div className="ml-auto"><NotificationBell /></div>
          <button onClick={handleLogout} className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-[12px]">
            <LogOut size={14} /> <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight text-text sm:text-3xl">
            {user?.name || user?.business_name || 'Your stall'}
          </h1>
          <p className="mt-1 text-[13px] font-semibold text-text-light">
            Everything below is live from your paid orders.
          </p>
        </header>

        {/* quick actions */}
        <div className="stagger mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            const { title, desc, to, tone } = action;
            return (
            <button key={title} onClick={() => navigate(to)}
              className="panel group flex items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-1 sm:flex-col sm:items-start sm:gap-0 sm:p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border sm:mb-3 ${
                tone === 'primary' ? 'border-primary/20 bg-primary/10 text-primary'
                : tone === 'accent' ? 'border-accent/20 bg-accent/10 text-accent'
                : 'border-secondary/30 bg-secondary/15 text-secondary-dark'}`}>
                <ActionIcon size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[15px] font-bold text-text transition-colors group-hover:text-primary">
                  {title}
                </h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-text-lighter">{desc}</p>
              </div>
              <ArrowRight size={15} className="shrink-0 text-text-lighter transition-transform group-hover:translate-x-0.5 sm:hidden" />
            </button>
            );
          })}
        </div>

        {/* stats */}
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="font-display text-lg font-bold text-text">Your numbers</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="panel skeleton h-32" />)}
          </div>
        ) : error ? (
          <div className="panel flex items-center gap-2.5 p-5 text-[13px] font-semibold text-warning-dark">
            <AlertCircle size={16} /> {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Stat icon={Receipt} tone="success" label="Revenue today"
                value={KES(data.revenue.today)} sub={`${KES(data.revenue.week)} this week`} />
              <Stat icon={Package} tone="primary" label="Paid orders"
                value={data.orders.paid}
                sub={`${data.orders.pending} pending · ${data.orders.failed} failed`} />
              <Stat icon={TrendingUp} tone="accent" label="Avg order"
                value={KES(data.average_order_value)} sub={`${KES(data.revenue.total)} all time`} />
              <Stat icon={Users} tone="secondary" label="Customers"
                value={data.customers.unique}
                sub={`${data.customers.repeat} came back`} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="panel p-5">
                <div className="mb-3.5 flex items-center gap-2">
                  <Flame size={15} className="text-primary" />
                  <h3 className="font-display text-[14px] font-bold text-text">Best sellers</h3>
                </div>
                {data.top_items.length === 0 ? (
                  <p className="text-[12.5px] text-text-lighter">
                    No paid orders yet — your best sellers will appear here.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.top_items.slice(0, 5).map((item, i) => {
                      const pct = Math.round((item.revenue / data.top_items[0].revenue) * 100);
                      return (
                        <li key={item.name}>
                          <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                            <span className="truncate font-semibold text-text">
                              <span className="tabular mr-1.5 text-text-lighter">{i + 1}</span>
                              {item.name}
                            </span>
                            <span className="tabular shrink-0 font-bold text-text">{KES(item.revenue)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-light">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary-dark"
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="tabular w-12 shrink-0 text-right text-[10.5px] font-semibold text-text-lighter">
                              {item.qty} sold
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="panel p-5">
                <div className="mb-3.5 flex items-center gap-2">
                  <Clock size={15} className="text-accent" />
                  <h3 className="font-display text-[14px] font-bold text-text">Busiest hours</h3>
                </div>
                {data.peak_hours.length === 0 ? (
                  <p className="text-[12.5px] text-text-lighter">
                    Not enough orders yet to spot a pattern.
                  </p>
                ) : (
                  <>
                    <div className="flex items-end gap-2.5">
                      {data.peak_hours.map((h) => {
                        const pct = Math.round((h.orders / data.peak_hours[0].orders) * 100);
                        return (
                          <div key={h.hour} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className="tabular text-[10px] font-bold text-text-light">{h.orders}</span>
                            {/* the bar's % height needs a parent with a resolved height,
                                otherwise it collapses to zero against an auto-height column */}
                            <div className="flex h-20 w-full items-end">
                              <div className="w-full rounded-t-lg bg-gradient-to-t from-accent to-accent-light"
                                style={{ height: `${Math.max(pct, 10)}%` }} />
                            </div>
                            <span className="tabular whitespace-nowrap text-[9.5px] font-semibold text-text-lighter">
                              {hourLabel(h.hour)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {peak && (
                      <p className="mt-3.5 text-[12px] font-semibold text-text-light">
                        Busiest around <span className="text-accent">{hourLabel(peak.hour)}</span>
                        {topItem && <> · best seller <span className="text-primary">{topItem.name}</span></>}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
