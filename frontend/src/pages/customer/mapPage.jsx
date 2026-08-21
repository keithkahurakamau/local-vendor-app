import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutGrid, Map as MapIcon, X, ChevronUp, Loader2, Store, AlertCircle,
  SlidersHorizontal, Star,
} from 'lucide-react';

import LiveMap from '../../components/map/LiveMap';
import AreaBar from '../../components/map/AreaBar';
import NotificationBell from '../../components/common/NotificationBell';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import { useLocation } from '../../context/LocationContext';
import mapService from '../../services/mapService';
import Stars from '../../components/common/Stars';
import FavouriteButton from '../../components/common/FavouriteButton';
import {
  secondsLeft, urgency, formatCountdown, formatDistance, walkMinutes, URGENCY_COLOR,
} from '../../lib/geo';

const NAIROBI = { lat: -1.2864, lon: 36.8172 };
const RADIUS_M = 5000;

/** Live countdown chip. Ticks locally so it stays honest without refetching. */
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
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
      style={{ background: `${hex}1A`, color: hex, border: `1px solid ${hex}4D` }}
    >
      <span className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: hex }} />
      <span className="tabular">{left > 0 ? formatCountdown(left) : label}</span>
    </span>
  );
}

function VendorTile({ vendor, onOpen }) {
  const items = Array.isArray(vendor.menu) ? vendor.menu : [];
  const mins = walkMinutes(vendor.distance);

  return (
    <button
      onClick={() => onOpen(vendor)}
      className="panel group w-full overflow-hidden text-left transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-success/10">
        {vendor.image ? (
          <img src={vendor.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Store className="text-primary/25" size={30} />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <Countdown updated={vendor.updated} compact />
        </div>
        <div className="absolute right-2.5 top-2.5">
          <FavouriteButton vendorId={vendor.vendor_id} size={13} />
        </div>
        <div className="tabular absolute bottom-2.5 right-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-text shadow-sm backdrop-blur">
          {formatDistance(vendor.distance)}
        </div>
      </div>

      <div className="p-3.5">
        <h3 className="font-display line-clamp-2 text-[14px] font-bold leading-snug text-text transition-colors group-hover:text-primary">
          {vendor.name}
        </h3>
        {mins != null && <p className="mt-0.5 text-[11px] font-semibold text-text-lighter">{mins} min walk</p>}
        <div className="mt-1.5">
          <Stars rating={vendor.rating} count={vendor.rating_count} />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {items.slice(0, 3).map((item, i) => (
            <span key={item.id ?? i} className="rounded-md border border-primary/15 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary-dark">
              {item.name}
            </span>
          ))}
          {items.length > 3 && (
            <span className="rounded-md px-1 py-0.5 text-[10px] font-semibold text-text-lighter">+{items.length - 3}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function MapPage() {
  const navigate = useNavigate();
  const { searchOrigin, isDefaultOrigin, updateLocation } = useLocation();
  const { location: live, status, refresh } = useLiveLocation({ enabled: false });

  const [view, setView] = useState('map');
  const [query, setQuery] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [origin, setOrigin] = useState(() => ({ lat: searchOrigin.lat, lon: searchOrigin.lon }));
  const [flyKey, setFlyKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ max_price: '', min_rating: '', sort: 'distance' });

  const load = useCallback(async (lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      const list = await mapService.getNearbyVendors(lat, lon, RADIUS_M, filters);
      setVendors(Array.isArray(list) ? list : []);
      if (!list?.length) setError('No vendors broadcasting within 5km right now.');
    } catch {
      setError('Could not reach the server.');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(searchOrigin.lat, searchOrigin.lon); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the live fix, then let taps and search drive.
  useEffect(() => {
    if (!live) return;
    setOrigin({ lat: live.lat, lon: live.lon });
    updateLocation(live.lat, live.lon, { source: 'gps' });
    setFlyKey((k) => k + 1);
    load(live.lat, live.lon);
  }, [live?.lat, live?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return load(origin.lat, origin.lon);

    setLoading(true);
    setError(null);
    try {
      const places = await mapService.searchPlaces(q);
      if (places.length) {
        const p = places[0];
        setOrigin({ lat: p.lat, lon: p.lon });
        updateLocation(p.lat, p.lon, { source: 'manual', label: p.name.split(',')[0] });
        setFlyKey((k) => k + 1);
        const list = await mapService.getNearbyVendors(p.lat, p.lon, RADIUS_M);
        setVendors(list);
        if (!list.length) setError(`Nothing broadcasting near ${p.name.split(',')[0]}.`);
      } else {
        const list = await mapService.searchVendors(q, origin.lat, origin.lon);
        setVendors(list);
        if (!list.length) setError(`No one nearby is selling "${q}" right now.`);
      }
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMapTap = useCallback((lat, lon, label) => {
    setOrigin({ lat, lon });
    updateLocation(lat, lon, { source: 'manual', label });
    load(lat, lon);
  }, [load, updateLocation]);

  const openVendor = (vendor) => navigate(`/order/${vendor.vendor_id}`, { state: { vendor } });

  const sorted = useMemo(
    () => [...vendors].sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99)),
    [vendors]
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="pt-safe z-20 shrink-0 border-b border-text/5 bg-white/75 px-3 pb-2.5 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center gap-2 pt-2.5">
          <button onClick={() => navigate('/')} className="font-display shrink-0 text-[17px] font-extrabold tracking-tight text-text">
            Hyper<span className="text-primary">Local</span>
          </button>

          <form onSubmit={handleSearch} className="ml-auto flex flex-1 items-center gap-2 sm:max-w-xl">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-lighter" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Dish or place..."
                aria-label="Search dish or place"
                className="field w-full py-2.5 pl-9 pr-8 text-[13px] font-medium"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); load(origin.lat, origin.lon); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-lighter hover:text-warning" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-ember shrink-0 px-4 py-2.5 text-[12px]">
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Find'}
            </button>

          </form>

          <NotificationBell />

          <div className="ml-1 hidden shrink-0 rounded-full border border-text/8 bg-white/70 p-0.5 sm:flex">
            <button onClick={() => setView('map')} aria-label="Map view"
              className={`rounded-full p-2 transition-all ${view === 'map' ? 'bg-primary text-white shadow-sm' : 'text-text-lighter hover:text-text'}`}>
              <MapIcon size={15} />
            </button>
            <button onClick={() => setView('grid')} aria-label="Grid view"
              className={`rounded-full p-2 transition-all ${view === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-text-lighter hover:text-text'}`}>
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-2 max-w-7xl">
          <AreaBar
            origin={{ ...origin, source: isDefaultOrigin ? 'default' : searchOrigin.source, label: searchOrigin.label }}
            isDefault={isDefaultOrigin}
            geoStatus={status}
            onUseMyLocation={() => { refresh(); setFlyKey((k) => k + 1); }}
            onPick={(lat, lon, label) => { handleMapTap(lat, lon, label); setFlyKey((k) => k + 1); }}
            compact
          />
        </div>

        <div className="mx-auto mt-1.5 flex max-w-7xl flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold">
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 transition-all ${
              showFilters || filters.max_price || filters.min_rating || filters.sort !== 'distance'
                ? 'border-primary/40 bg-primary/10 text-primary-dark'
                : 'border-text/10 bg-white/70 text-text-light'}`}>
            <SlidersHorizontal size={11} /> Filters
          </button>
          <span className="tabular whitespace-nowrap text-text-light">{loading ? 'Scanning...' : `${sorted.length} live`}</span>
          {status === 'tracking' && (
            <span className="inline-flex items-center gap-1 text-success-dark">
              <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-success" />
              Live tracking
            </span>
          )}
          {error && (
            <span className="inline-flex min-w-0 items-center gap-1 text-text-lighter sm:ml-auto">
              <AlertCircle size={12} className="shrink-0" />
              <span className="truncate">{error}</span>
            </span>
          )}
        </div>
        {showFilters && (
          <div className="animate-slide-up mx-auto mt-2 flex max-w-7xl flex-wrap items-center gap-2 border-t border-text/5 pt-2.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-text-light">
              Under KES
              <input type="number" min="0" value={filters.max_price}
                onChange={(e) => setFilters((f) => ({ ...f, max_price: e.target.value }))}
                placeholder="any"
                className="field tabular w-20 px-2 py-1 text-[11.5px]" />
            </label>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-text-light">Rated</span>
              {[3, 4, 4.5].map((r) => (
                <button key={r}
                  onClick={() => setFilters((f) => ({ ...f, min_rating: f.min_rating === String(r) ? '' : String(r) }))}
                  className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold transition-all ${
                    filters.min_rating === String(r)
                      ? 'bg-secondary text-text' : 'bg-white/70 text-text-lighter hover:text-text'}`}>
                  <Star size={9} className={filters.min_rating === String(r) ? 'fill-text' : ''} /> {r}+
                </button>
              ))}
            </div>

            <select value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="field px-2.5 py-1 text-[11.5px] font-bold">
              <option value="distance">Nearest</option>
              <option value="rating">Best rated</option>
              <option value="price">Cheapest</option>
              <option value="newest">Just arrived</option>
            </select>

            {(filters.max_price || filters.min_rating || filters.sort !== 'distance') && (
              <button onClick={() => setFilters({ max_price: '', min_rating: '', sort: 'distance' })}
                className="text-[11px] font-bold text-warning-dark hover:underline">
                Clear
              </button>
            )}
          </div>
        )}
      </header>

      <main className="relative min-h-0 flex-1">
        {view === 'map' ? (
          <>
            <LiveMap
              vendors={sorted}
              center={[origin.lat, origin.lon]}
              userLocation={live}
              onVendorSelect={openVendor}
              onMapClick={handleMapTap}
              flyKey={flyKey}
              radiusKm={RADIUS_M / 1000}
            />

            <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[600] transition-transform duration-300 sm:hidden ${
                sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-15rem)]'}`}>
              <div className="panel pointer-events-auto max-h-[72dvh] overflow-hidden rounded-b-none">
                <button onClick={() => setSheetOpen((v) => !v)} className="flex w-full items-center justify-center gap-2 py-2.5" aria-expanded={sheetOpen}>
                  <span className="h-1 w-9 rounded-full bg-neutral-dark" />
                </button>
                <div className="flex items-center gap-2 px-4 pb-2">
                  <span className="font-display text-[13px] font-bold text-text">{sorted.length} nearby</span>
                  <div className="ml-auto flex rounded-full border border-text/8 bg-white/70 p-0.5">
                    <button onClick={() => setView('map')}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        view === 'map' ? 'bg-primary text-white' : 'text-text-light'}`}>
                      <MapIcon size={11} /> Map
                    </button>
                    <button onClick={() => setView('grid')}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        view === 'grid' ? 'bg-primary text-white' : 'text-text-light'}`}>
                      <LayoutGrid size={11} /> List
                    </button>
                  </div>
                  <ChevronUp size={16} className={`shrink-0 text-text-lighter transition-transform ${sheetOpen ? 'rotate-180' : ''}`} />
                </div>

                {sheetOpen ? (
                  <div className="pb-safe max-h-[54dvh] overflow-y-auto px-4 pb-20">
                    <div className="stagger grid grid-cols-1 gap-3">
                      {sorted.map((v) => <VendorTile key={v.id} vendor={v} onOpen={openVendor} />)}
                    </div>
                  </div>
                ) : (
                  <div className="snap-rail no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4">
                    {sorted.map((v) => (
                      <div key={v.id} className="w-[70vw] max-w-[16rem] shrink-0">
                        <VendorTile vendor={v} onOpen={openVendor} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {sorted.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] hidden px-4 sm:block">
                <div className="snap-rail no-scrollbar pointer-events-auto mx-auto flex max-w-7xl gap-3 overflow-x-auto pb-1">
                  {sorted.map((v) => (
                    <div key={v.id} className="w-64 shrink-0">
                      <VendorTile vendor={v} onOpen={openVendor} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-5 sm:px-6">
            {loading ? (
              <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="panel skeleton h-56" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Store size={40} className="mb-3 text-neutral-dark" />
                <p className="font-display text-base font-bold text-text">Nothing live here</p>
                <p className="mt-1 max-w-xs text-sm text-text-lighter">Tap anywhere on the map to scan a different area.</p>
              </div>
            ) : (
              <div className="stagger mx-auto grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
                {sorted.map((v) => <VendorTile key={v.id} vendor={v} onOpen={openVendor} />)}
              </div>
            )}
          </div>
        )}
      </main>

      <div className={`pointer-events-none fixed inset-x-0 bottom-3 z-[700] justify-center sm:hidden ${
        view === 'grid' ? 'flex' : 'hidden'}`}>
        <div className="panel pointer-events-auto flex gap-0.5 p-1">
          <button onClick={() => setView('map')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
              view === 'map' ? 'bg-primary text-white shadow-sm' : 'text-text-light'}`}>
            <MapIcon size={14} /> Map
          </button>
          <button onClick={() => setView('grid')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
              view === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-text-light'}`}>
            <LayoutGrid size={14} /> List
          </button>
        </div>
      </div>
    </div>
  );
}
