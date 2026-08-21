import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Navigation, Store, Clock, MapPin, ArrowRight, Loader2, X,
  LayoutGrid, Map as MapIcon, Menu, LogOut, User, ShieldCheck, ChevronDown,
} from 'lucide-react';

import LiveMap from '../../components/map/LiveMap';
import AreaBar from '../../components/map/AreaBar';
import CartReminder from '../../components/common/CartReminder';
import NotificationBell from '../../components/common/NotificationBell';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import mapService from '../../services/mapService';
import Stars from '../../components/common/Stars';
import FavouriteButton from '../../components/common/FavouriteButton';
import {
  secondsLeft, urgency, formatCountdown, formatDistance, walkMinutes, URGENCY_COLOR,
} from '../../lib/geo';

const NAIROBI = { lat: -1.2864, lon: 36.8172 };
const RADIUS_M = 5000;

const CATEGORIES = ['All', 'Nyama Choma', 'Pilau', 'Chapati', 'Samosa', 'Chips', 'Fish'];

/* ------------------------------------------------------------------ pieces */

function Countdown({ updated, compact = false }) {
  const [, tick] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const left = secondsLeft(updated);

  const { hex, label } = URGENCY_COLOR[urgency(left)];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-extrabold uppercase tracking-widest ${
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}`}
      style={{ background: `${hex}1A`, color: hex, border: `1px solid ${hex}4D` }}
    >
      <span className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: hex }} />
      <span className="tabular">{left > 0 ? formatCountdown(left) : label}</span>
    </span>
  );
}

function VendorCard({ vendor, onOpen }) {
  const items = Array.isArray(vendor.menu) ? vendor.menu : [];
  const mins = walkMinutes(vendor.distance);

  return (
    <button
      onClick={() => onOpen(vendor)}
      className="panel group flex w-full flex-col overflow-hidden text-left transition-all duration-300 hover:-translate-y-1.5"
    >
      <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/12 to-success/10 sm:h-36">
        {vendor.image ? (
          <img src={vendor.image} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Store className="text-primary/25" size={34} />
          </div>
        )}
        <div className="absolute left-3 top-3"><Countdown updated={vendor.updated} compact /></div>
        <div className="absolute right-3 top-3">
          <FavouriteButton vendorId={vendor.vendor_id} size={14} />
        </div>
        <div className="tabular absolute bottom-3 right-3 rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-bold text-text shadow-sm backdrop-blur">
          {formatDistance(vendor.distance)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display line-clamp-2 text-[15px] font-bold leading-snug text-text transition-colors group-hover:text-primary">
          {vendor.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-text-lighter">
          <MapPin size={11} className="text-primary/60" />
          {mins != null ? `${mins} min walk` : 'Nearby'}
        </p>
        <div className="mt-1.5">
          <Stars rating={vendor.rating} count={vendor.rating_count} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {items.slice(0, 3).map((item, i) => (
            <span key={item.id ?? i}
              className="rounded-md border border-primary/15 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary-dark">
              {item.name}
            </span>
          ))}
          {items.length > 3 && (
            <span className="px-1 py-0.5 text-[10px] font-semibold text-text-lighter">+{items.length - 3}</span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-3 text-[12px] font-bold text-text-lighter transition-colors group-hover:text-primary">
          View menu <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------- page */

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { searchOrigin, isDefaultOrigin, updateLocation } = useLocation();
  const { location: live, status, refresh } = useLiveLocation({ enabled: false });

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [view, setView] = useState('grid');
  const [origin, setOrigin] = useState(() => ({ lat: searchOrigin.lat, lon: searchOrigin.lon }));
  const [flyKey, setFlyKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultsRef = useRef(null);

  // RBAC for navigation. A signed-in customer has no use for vendor sign-up or the
  // admin door, and showing them invites dead-end clicks into screens they'll be
  // bounced out of. Anonymous visitors still see everything - that is how a vendor
  // finds their way in.
  const isAnonymous = !user;
  const isCustomer = user?.role === 'customer';
  const showVendorEntry = isAnonymous;      // vendors are redirected off this page anyway
  const showAdminEntry = isAnonymous;

  const load = useCallback(async (lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      const list = await mapService.getNearbyVendors(lat, lon, RADIUS_M);
      setVendors(Array.isArray(list) ? list : []);
    } catch {
      setError('Could not reach the server.');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(searchOrigin.lat, searchOrigin.lon); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!live) return;
    setOrigin({ lat: live.lat, lon: live.lon });
    updateLocation(live.lat, live.lon, { source: 'gps' });
    setFlyKey((k) => k + 1);
    load(live.lat, live.lon);
  }, [live?.lat, live?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return load(origin.lat, origin.lon);
    setLoading(true);
    setError(null);
    try {
      const list = await mapService.searchVendors(q, origin.lat, origin.lon);
      setVendors(list);
      if (!list.length) setError(`No one nearby is selling "${q}" right now.`);
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const useMyLocation = () => { refresh(); setFlyKey((k) => k + 1); };

  const openVendor = (v) => navigate(`/order/${v.vendor_id}`, { state: { vendor: v } });

  const filtered = useMemo(() => {
    const list = category === 'All'
      ? vendors
      : vendors.filter((v) =>
          (Array.isArray(v.menu) ? v.menu : []).some((i) =>
            i.name?.toLowerCase().includes(category.toLowerCase().split(' ')[0])));
    return [...list].sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
  }, [vendors, category]);

  return (
    <div className="min-h-[100dvh]">

      {/* ------------------------------- nav ------------------------------- */}
      <nav className="pt-safe sticky top-0 z-[800] border-b border-text/5 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="font-display shrink-0 text-lg font-extrabold tracking-tight text-text sm:text-xl">
            Hyper<span className="text-primary">Local</span>
          </Link>

          <div className="ml-auto hidden items-center gap-1.5 md:flex">
            <Link to="/map" className="btn-ghost px-4 py-2 text-[13px]">Explore map</Link>
            {showVendorEntry && (
              <Link to="/vendor/login" className="btn-ghost px-4 py-2 text-[13px]">For vendors</Link>
            )}
            {isCustomer && (
              <>
                <Link to="/customer/profile" className="btn-ghost px-4 py-2 text-[13px]">My orders</Link>
                <NotificationBell />
              </>
            )}
            {user ? (
              <>
                <Link to="/customer/profile" className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-[13px]">
                  <User size={14} />
                  {(user.name || user.username || user.email || '?').split(' ')[0]}
                </Link>
                <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost px-3.5 py-2 text-[13px]" aria-label="Log out">
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost px-4 py-2 text-[13px]">Log in</Link>
                <Link to="/register" className="btn-ember px-5 py-2 text-[13px]">Sign up</Link>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            {isCustomer && <NotificationBell />}
          </div>
          <button onClick={() => setMenuOpen((v) => !v)}
            className="btn-ghost p-2.5 md:hidden" aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>

        {menuOpen && (
          <div className="animate-slide-up border-t border-text/5 px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-1.5">
              <Link to="/map" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2.5 text-center text-[13px]">Explore map</Link>
              {showVendorEntry && (
                <Link to="/vendor/login" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2.5 text-center text-[13px]">For vendors</Link>
              )}
              {showAdminEntry && (
                <Link to="/admin/login" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2.5 text-center text-[13px]">Admin</Link>
              )}
              {isCustomer && (
                <>
                  <Link to="/customer/profile" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2.5 text-center text-[13px]">My orders</Link>
                  <Link to="/customer/profile?tab=addresses" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2.5 text-center text-[13px]">Saved addresses</Link>
                </>
              )}
              {user ? (
                <button onClick={() => { logout(); setMenuOpen(false); navigate('/'); }} className="btn-ghost px-4 py-2.5 text-[13px]">Log out</button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost px-4 py-2.5 text-center text-[13px]">Log in</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-ember px-4 py-2.5 text-center text-[13px]">Sign up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ------------------------------ hero ------------------------------- */}
      <header className="relative overflow-hidden">
        {/* Full-bleed food photography, scrimmed so white type stays readable and the
            bottom edge dissolves into the page background rather than cutting hard.
            Served responsively: phones pull the 96KB webp, not the 5.6MB original. */}
        <div className="absolute inset-0 z-0">
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/images/hero-sm.webp"
              type="image/webp"
            />
            <source srcSet="/images/hero-lg.webp" type="image/webp" />
            <img
              src="/images/hero-lg.jpg"
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          </picture>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(45,45,45,0.86) 0%, rgba(45,45,45,0.60) 42%, rgba(45,45,45,0.34) 68%, rgba(253,253,253,0.72) 90%, #FDFDFD 100%)',
            }}
          />
          {/* warm ember wash so the photo sits inside the brand palette */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-secondary/15" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-20">
          <div className="stagger mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-black/30 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-success" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-success-light">
                {loading ? 'Scanning your area' : `${vendors.length} vendors broadcasting now`}
              </span>
            </div>

            <h1 className="mt-5 text-[2.5rem] font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl">
              Street food that's
              <span className="block bg-gradient-to-r from-primary-light via-primary to-secondary bg-clip-text text-transparent">
                actually there.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-white/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:mt-5 sm:text-base">
              Vendors broadcast for three hours, then drop off the map. If you can see it
              here, someone is standing behind that grill right now.
            </p>

            {/* search */}
            <form onSubmit={runSearch} className="mx-auto mt-7 max-w-xl">
              <div className="panel flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-lighter" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pilau, samosa, nyama choma…"
                    aria-label="Search for a dish"
                    className="field w-full border-transparent bg-transparent py-3 pl-10 pr-3 text-[14px] font-medium shadow-none focus:bg-white/60"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn-ember flex-1 px-6 py-3 text-[13px] sm:flex-none">
                    {loading ? <Loader2 size={15} className="mx-auto animate-spin" /> : 'Find food'}
                  </button>
                  <button type="button" onClick={useMyLocation}
                    className="btn-ghost flex items-center justify-center gap-1.5 px-4 py-3 text-[13px]"
                    title="Use my location">
                    <Navigation size={14} className="text-primary" />
                    <span className="sm:hidden">Near me</span>
                  </button>
                </div>
              </div>
            </form>

            {/* categories */}
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1 sm:justify-center">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                    category === c
                      ? 'bg-primary text-white shadow-lg'
                      : 'border border-white/25 bg-black/25 text-white/90 backdrop-blur-sm hover:border-primary/60 hover:bg-black/40'
                  }`}>
                  {c}
                </button>
              ))}
            </div>

            <div className="mx-auto mt-4 max-w-md rounded-xl border border-white/20 bg-black/30 p-2.5 text-left backdrop-blur-sm">
              <AreaBar
                origin={{ ...origin, source: isDefaultOrigin ? 'default' : searchOrigin.source, label: searchOrigin.label }}
                isDefault={isDefaultOrigin}
                geoStatus={status}
                onUseMyLocation={useMyLocation}
                onPick={(lat, lon, label) => {
                  setOrigin({ lat, lon });
                  updateLocation(lat, lon, { source: 'manual', label });
                  load(lat, lon);
                  setFlyKey((k) => k + 1);
                }}
                compact
                onDark
              />
            </div>
          </div>
        </div>
      </header>

      {/* ----------------------------- results ----------------------------- */}
      <section ref={resultsRef} className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 pb-20 sm:-mt-10 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-text sm:text-2xl">Live near you</h2>
            <p className="tabular mt-0.5 text-[12px] font-semibold text-text-lighter">
              {loading ? 'Scanning…' : `${filtered.length} within ${RADIUS_M / 1000}km`}
              {error && <span className="ml-2 text-warning-dark">{error}</span>}
            </p>
          </div>

          <div className="flex shrink-0 rounded-full border border-text/8 bg-white/70 p-0.5">
            <button onClick={() => setView('grid')} aria-label="Grid view"
              className={`rounded-full p-2 transition-all ${
                view === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-text-lighter hover:text-text'}`}>
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setView('map')} aria-label="Map view"
              className={`rounded-full p-2 transition-all ${
                view === 'map' ? 'bg-primary text-white shadow-sm' : 'text-text-lighter hover:text-text'}`}>
              <MapIcon size={15} />
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="panel overflow-hidden p-0">
            <LiveMap
              vendors={filtered}
              center={[origin.lat, origin.lon]}
              userLocation={live}
              onVendorSelect={openVendor}
              onMapClick={(lat, lon) => { setOrigin({ lat, lon }); updateLocation(lat, lon); load(lat, lon); }}
              flyKey={flyKey}
              height="clamp(24rem, 62dvh, 40rem)"
            />
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="panel skeleton h-64" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center px-6 py-16 text-center">
            <Store size={38} className="mb-3 text-neutral-dark" />
            <p className="font-display text-base font-bold text-text">Nothing broadcasting here</p>
            <p className="mt-1 max-w-sm text-[13px] text-text-lighter">
              Every vendor's three-hour window has closed. Try a different area or check back at mealtime.
            </p>
            <button onClick={() => { setQuery(''); setCategory('All'); setOrigin(NAIROBI); load(NAIROBI.lat, NAIROBI.lon); }}
              className="btn-ghost mt-5 px-5 py-2.5 text-[13px]">
              Reset search
            </button>
          </div>
        ) : (
          <div className="stagger grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4">
            {filtered.map((v) => <VendorCard key={v.id} vendor={v} onOpen={openVendor} />)}
          </div>
        )}
      </section>

      {/* ------------------------------ footer ----------------------------- */}
      <footer className="border-t border-text/6 bg-white/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <div className="font-display text-lg font-extrabold tracking-tight text-text">
              Hyper<span className="text-primary">Local</span>
            </div>
            <p className="mt-2.5 max-w-xs text-[13px] leading-relaxed text-text-light">
              Connecting neighbourhoods with the vendors who are open right now — never a
              wasted walk.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-lighter">Explore</h3>
            <ul className="mt-3 space-y-2 text-[13px] font-semibold text-text-light">
              <li><Link to="/map" className="transition-colors hover:text-primary">Find on map</Link></li>
              {isAnonymous && (
                <li><Link to="/login" className="transition-colors hover:text-primary">Customer login</Link></li>
              )}
              {isCustomer && (
                <>
                  <li><Link to="/customer/profile" className="transition-colors hover:text-primary">My orders</Link></li>
                  <li><Link to="/customer/profile?tab=addresses" className="transition-colors hover:text-primary">Saved addresses</Link></li>
                </>
              )}
              {showVendorEntry && (
                <li><Link to="/vendor/login" className="transition-colors hover:text-primary">Vendor login</Link></li>
              )}
              {showAdminEntry && (
                <li>
                  <Link to="/admin/login" className="inline-flex items-center gap-1.5 transition-colors hover:text-primary">
                    <ShieldCheck size={13} /> Admin
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {showVendorEntry ? (
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              <h3 className="font-display text-[14px] font-bold text-text">Sell with us</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-text-light">
              Broadcast your stall, take M-Pesa, and get walking directions to every paid order.
            </p>
            <button onClick={() => navigate('/vendor/register')} className="btn-ember mt-4 w-full py-2.5 text-[13px]">
              Register your stall
            </button>
          </div>
          ) : (
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              <h3 className="font-display text-[14px] font-bold text-text">Never miss a stall</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-text-light">
              Follow your favourites and we'll email you the moment they go live.
            </p>
            <button onClick={() => navigate('/customer/profile')} className="btn-ember mt-4 w-full py-2.5 text-[13px]">
              View my orders
            </button>
          </div>
          )}
        </div>

        <div className="border-t border-text/6 py-5 text-center text-[11px] font-semibold text-text-lighter">
          © {new Date().getFullYear()} HyperLocal · Nairobi, Kenya
        </div>
      </footer>

      <CartReminder />
    </div>
  );
}
