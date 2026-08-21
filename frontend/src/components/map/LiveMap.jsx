import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Crosshair, Layers } from 'lucide-react';

import { clusterPoints, secondsLeft, urgency, formatCountdown, formatDistance, walkMinutes, URGENCY_COLOR } from '../../lib/geo';
import { vendorIcon, clusterIcon, userIcon } from './markers';

/** Keeps the Leaflet view in sync with props without fighting user panning. */
function ViewController({ center, zoom, flyKey }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.9 });
    // flyKey lets callers force a recentre even when center is unchanged
  }, [flyKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Reports zoom + click so clustering can rebuild and pins can be dropped. */
function MapEvents({ onZoom, onClick }) {
  const map = useMapEvents({
    zoomend: () => onZoom?.(map.getZoom()),
    click: (e) => onClick?.(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

const TILES = {
  clean: {
    label: 'Clean',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
  streets: {
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

function VendorCard({ vendor, onOrder }) {
  const left = secondsLeft(vendor.updated);
  const band = urgency(left);
  const { hex, label } = URGENCY_COLOR[band];
  const items = Array.isArray(vendor.menu) ? vendor.menu : [];
  const mins = walkMinutes(vendor.distance);

  return (
    <div className="panel panel-hot w-[254px] overflow-hidden">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[15px] font-bold leading-tight text-text">
            {vendor.name}
          </h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
            style={{ background: `${hex}1F`, color: hex, border: `1px solid ${hex}55` }}
          >
            {label}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-2.5 text-[11px] font-semibold text-text-light">
          <span className="tabular">{formatDistance(vendor.distance)}</span>
          {mins != null && <><span className="text-neutral-dark">·</span><span>{mins} min walk</span></>}
        </div>

        {items.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {items.slice(0, 3).map((item, i) => (
              <li key={item.id ?? i} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                <span className="truncate text-text-light">{item.name}</span>
                <span className="tabular shrink-0 font-bold text-text">KES {item.price}</span>
              </li>
            ))}
            {items.length > 3 && (
              <li className="pt-0.5 text-[10.5px] font-semibold text-text-lighter">
                +{items.length - 3} more
              </li>
            )}
          </ul>
        )}

        <div className="rule my-2.5" />

        <div className="flex items-center justify-between gap-2">
          <div className="leading-none">
            <div className="text-[9px] font-bold uppercase tracking-widest text-text-lighter">
              Closes in
            </div>
            <div className="tabular mt-0.5 text-[13px] font-bold" style={{ color: hex }}>
              {formatCountdown(left)}
            </div>
          </div>
          <button
            onClick={() => onOrder?.(vendor)}
            className="btn-ember px-3.5 py-2 text-[11px]"
          >
            View menu
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The shared map surface.
 *
 * Vendors are clustered through a spatial hash (see lib/geo) that rebuilds on
 * zoom, so a dense CBD stays readable instead of turning into a pile of pins.
 */
export default function LiveMap({
  vendors = [],
  center,
  userLocation,
  onVendorSelect,
  onMapClick,
  selectedId,
  radiusKm = 5,
  height = '100%',
  flyKey = 0,
  showRadius = true,
  className = '',
}) {
  const [zoom, setZoom] = useState(14);
  const [tileKey, setTileKey] = useState('clean');
  const tiles = TILES[tileKey];

  // Rebuild clusters whenever the vendor set or zoom changes. Beyond z15 the pins
  // no longer overlap, so clustering is skipped and every vendor draws its own.
  const clusters = useMemo(() => {
    if (zoom >= 15) return vendors.map((v, i) => ({ key: `s${v.id ?? i}`, lat: v.latitude, lng: v.longitude, items: [v], count: 1 }));
    return clusterPoints(vendors, zoom);
  }, [vendors, zoom]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={center || [-1.2864, 36.8172]}
        zoom={14}
        zoomControl={false}
        className="absolute inset-0 z-0 h-full w-full"
      >
        <TileLayer url={tiles.url} attribution={tiles.attribution} />
        <ViewController center={center} zoom={15} flyKey={flyKey} />
        <MapEvents onZoom={setZoom} onClick={onMapClick} />

        {/* Search radius, so "within 5km" is visible rather than implied */}
        {showRadius && userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lon]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#FF6B35', weight: 1.5, opacity: 0.5, fillColor: '#FF6B35', fillOpacity: 0.05 }}
          />
        )}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={userIcon({ heading: userLocation.heading })}
            zIndexOffset={1000}
          />
        )}

        {clusters.map((c) =>
          c.count > 1 ? (
            <Marker
              key={c.key}
              position={[c.lat, c.lng]}
              icon={clusterIcon(c.count)}
              eventHandlers={{ click: (e) => e.target._map.flyTo([c.lat, c.lng], Math.min(zoom + 2, 17)) }}
            />
          ) : (
            <Marker
              key={c.key}
              position={[c.lat, c.lng]}
              icon={vendorIcon({
                name: c.items[0].name,
                urgency: urgency(secondsLeft(c.items[0].updated)),
                selected: selectedId === c.items[0].id,
              })}
            >
              <Popup>
                <VendorCard vendor={c.items[0]} onOrder={onVendorSelect} />
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>

      {/* Floating controls, thumb-reachable on mobile */}
      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-col gap-2">
        <button
          onClick={() => setTileKey((k) => (k === 'clean' ? 'streets' : 'clean'))}
          className="panel pointer-events-auto flex h-10 w-10 items-center justify-center text-text-light transition-colors hover:text-primary"
          title={`Switch to ${tileKey === 'clean' ? 'Streets' : 'Clean'} tiles`}
          aria-label="Toggle map style"
        >
          <Layers size={17} />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-3 z-[500]">
        <button
          onClick={() => onMapClick && userLocation && onMapClick(userLocation.lat, userLocation.lon)}
          className="panel panel-hot pointer-events-auto flex h-11 w-11 items-center justify-center text-primary"
          aria-label="Recentre on me"
        >
          <Crosshair size={18} />
        </button>
      </div>

      {vendors.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-[500] flex justify-center px-4">
          <div className="panel flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-light">
            <Navigation size={14} className="text-primary" />
            No vendors broadcasting here yet
          </div>
        </div>
      )}
    </div>
  );
}
