import L from 'leaflet';
import { URGENCY_COLOR } from '../../lib/geo';

/**
 * Map iconography.
 *
 * Every marker is an SVG divIcon rather than a raster pin, so it can carry live
 * state: the vendor's initial, an urgency colour driven by time left, and an
 * expanding beacon ring for anyone still broadcasting. Rasters could not do that
 * without shipping a sprite per state.
 */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

/** Vendor pin: teardrop body, initial, and a beacon ring while live. */
export function vendorIcon({ name = '', urgency = 'live', selected = false } = {}) {
  const { hex } = URGENCY_COLOR[urgency] || URGENCY_COLOR.live;
  const initial = esc((name.trim()[0] || '?').toUpperCase());
  const size = selected ? 60 : 50;
  const ring = urgency === 'closed' ? '' : `
    <span style="
      position:absolute; left:50%; top:34%; width:${size * 0.62}px; height:${size * 0.62}px;
      margin-left:${-size * 0.31}px; margin-top:${-size * 0.31}px;
      border-radius:999px; background:${hex}; opacity:.35;
      animation: ping-ring ${urgency === 'critical' ? '1.3s' : '2.4s'} cubic-bezier(0,0,.2,1) infinite;
    "></span>`;

  return L.divIcon({
    className: 'hl-marker',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        ${ring}
        <svg width="${size}" height="${size}" viewBox="0 0 50 50" style="position:relative; display:block;
             filter: drop-shadow(0 6px 10px rgba(45,45,45,.32));">
          <path d="M25 3c-8.8 0-16 7-16 15.7C9 30 25 47 25 47s16-17 16-28.3C41 10 33.8 3 25 3z"
                fill="${hex}" stroke="#fff" stroke-width="2.5"/>
          <circle cx="25" cy="18.7" r="8.6" fill="#fff" opacity=".95"/>
          <text x="25" y="19.2" text-anchor="middle" dominant-baseline="middle"
                font-family="Unbounded, Poppins, sans-serif" font-size="10.5" font-weight="700"
                fill="${hex}">${initial}</text>
        </svg>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],       // tip of the teardrop sits on the coordinate
    popupAnchor: [0, -size + 6],
  });
}

/** Cluster bubble. Radius grows with count, capped so it never swallows the map. */
export function clusterIcon(count) {
  const size = Math.min(38 + Math.log2(count) * 9, 66);
  return L.divIcon({
    className: 'hl-marker',
    html: `
      <div style="
        width:${size}px; height:${size}px; border-radius:999px;
        display:flex; align-items:center; justify-content:center;
        background: radial-gradient(circle at 34% 28%, #FF8A5C, #E55A2A);
        border: 2.5px solid #fff;
        box-shadow: 0 6px 16px -4px rgba(255,107,53,.62), 0 0 0 6px rgba(255,107,53,.14);
        color:#fff; font-family:'Unbounded',sans-serif; font-weight:700;
        font-size:${count > 99 ? 12 : 14}px; letter-spacing:-.02em;
      ">${count > 99 ? '99+' : count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** The user's own position: accuracy halo, solid core, optional heading cone. */
export function userIcon({ heading = null } = {}) {
  const cone =
    heading === null
      ? ''
      : `<path d="M14 2 L19.4 12 H8.6 Z" fill="#118AB2" opacity=".82"
            transform="rotate(${heading} 14 14)"/>`;
  return L.divIcon({
    className: 'hl-marker',
    html: `
      <div style="position:relative; width:28px; height:28px;">
        <span style="position:absolute; inset:0; border-radius:999px; background:#118AB2;
                     opacity:.22; animation: ping-ring 2.8s cubic-bezier(0,0,.2,1) infinite;"></span>
        <svg width="28" height="28" viewBox="0 0 28 28" style="position:relative; display:block;">
          ${cone}
          <circle cx="14" cy="14" r="6.5" fill="#118AB2" stroke="#fff" stroke-width="3"/>
        </svg>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Destination pin for the vendor's delivery route. */
export function destinationIcon() {
  return L.divIcon({
    className: 'hl-marker',
    html: `
      <div style="position:relative; width:44px; height:44px;">
        <svg width="44" height="44" viewBox="0 0 44 44"
             style="filter: drop-shadow(0 6px 10px rgba(45,45,45,.34));">
          <path d="M22 3c-7.7 0-14 6.1-14 13.7C8 27 22 41 22 41s14-14 14-24.3C36 9.1 29.7 3 22 3z"
                fill="#EF476F" stroke="#fff" stroke-width="2.5"/>
          <circle cx="22" cy="16.4" r="5.2" fill="#fff"/>
        </svg>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  });
}


/** The vendor's own starting point on a delivery route - a stall, not a pin drop. */
export function originIcon() {
  return L.divIcon({
    className: 'hl-marker',
    html: `
      <div style="position:relative; width:46px; height:46px;">
        <span style="position:absolute; left:50%; top:50%; width:36px; height:36px;
                     margin:-18px 0 0 -18px; border-radius:999px; background:#FF6B35; opacity:.28;
                     animation: ping-ring 2.6s cubic-bezier(0,0,.2,1) infinite;"></span>
        <svg width="46" height="46" viewBox="0 0 46 46" style="position:relative; display:block;
             filter: drop-shadow(0 6px 10px rgba(45,45,45,.34));">
          <circle cx="23" cy="23" r="15" fill="#FF6B35" stroke="#fff" stroke-width="3"/>
          <!-- awning + counter: reads as "the stall" at a glance -->
          <path d="M15.5 19.5h15v1.6a2.6 2.6 0 0 1-2.6 2.6h-9.8a2.6 2.6 0 0 1-2.6-2.6v-1.6z" fill="#fff"/>
          <path d="M15 17.4l1.5-2.8h13l1.5 2.8z" fill="#fff" opacity=".9"/>
          <rect x="18.4" y="24.4" width="9.2" height="6.2" rx="1.1" fill="#fff" opacity=".92"/>
        </svg>
      </div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}
