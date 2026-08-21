/**
 * Geospatial helpers for the map surfaces.
 *
 * Distances are kilometres everywhere, matching what the API returns, so no unit
 * conversion is needed at call sites (an earlier bug came from treating the API's
 * km value as metres).
 */

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/** Great-circle distance in km. Mirrors the backend's haversine exactly. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Initial bearing in degrees (0 = north), for direction-of-travel indicators. */
export function bearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function compassLabel(deg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}

/** Human distance from a km value. */
export function formatDistance(km) {
  if (km === undefined || km === null || Number.isNaN(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

/** Rough walking time. 5 km/h is the standard planning figure. */
export function walkMinutes(km) {
  if (!km && km !== 0) return null;
  return Math.max(1, Math.round((km / 5) * 60));
}

/**
 * Cluster points with a spatial hash grid.
 *
 * Naive pairwise clustering is O(n^2), which stutters on a phone once a city's
 * worth of vendors is on screen. Bucketing by a grid cell sized to the desired
 * pixel radius makes it O(n): each point is hashed into one cell, and cells
 * become clusters. Cell size is derived from the zoom level so clusters stay a
 * roughly constant size on screen as the user zooms.
 *
 * @param {Array} points  objects carrying `latitude` and `longitude`
 * @param {number} zoom   Leaflet zoom level
 * @param {number} radiusPx  approximate cluster radius in screen pixels
 * @returns {Array} entries of { key, lat, lng, items, count }
 */
export function clusterPoints(points, zoom, radiusPx = 68) {
  if (!Array.isArray(points) || points.length === 0) return [];

  // Web-Mercator: at zoom z the world is 256 * 2^z px wide, so one degree of
  // longitude is (256 * 2^z) / 360 px. Invert that to get degrees per cell.
  const worldPx = 256 * Math.pow(2, zoom);
  const degPerPx = 360 / worldPx;
  const cell = Math.max(degPerPx * radiusPx, 1e-6);

  const buckets = new Map();
  for (const p of points) {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    // Scale latitude by cos(lat) so cells stay square on screen near the poles.
    const latScale = Math.max(Math.cos(toRad(lat)), 0.01);
    const key = `${Math.floor(lng / cell)}:${Math.floor(lat / (cell * latScale))}`;

    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { key, items: [], sumLat: 0, sumLng: 0 }));
    bucket.items.push(p);
    bucket.sumLat += lat;
    bucket.sumLng += lng;
  }

  return Array.from(buckets.values()).map((b) => ({
    key: b.key,
    lat: b.sumLat / b.items.length,   // centroid, so the marker sits among its points
    lng: b.sumLng / b.items.length,
    items: b.items,
    count: b.items.length,
  }));
}

/** Bounds that fit every point plus the user, with padding. Null if nothing to fit. */
export function boundsFor(points, origin) {
  const coords = [];
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lon)) {
    coords.push([origin.lat, origin.lon]);
  }
  for (const p of points || []) {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push([lat, lng]);
  }
  return coords.length ? coords : null;
}

/**
 * Seconds remaining on a vendor's freshness window.
 * Backend sends `updated` (RFC 1123, UTC) and the window is 3h from check-in.
 */
export const FRESHNESS_SECONDS = 3 * 60 * 60;

export function secondsLeft(updatedAt, windowSeconds = FRESHNESS_SECONDS) {
  if (!updatedAt) return 0;
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round(windowSeconds - (Date.now() - then) / 1000));
}

/** hh:mm:ss for the countdown readouts. */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, '0')}m`
    : `${m}m ${String(sec).padStart(2, '0')}s`;
}

/**
 * Urgency band driven by time left. Everything visual - marker hue, chip colour,
 * pulse speed - reads from this so the whole UI agrees on what "closing" means.
 */
export function urgency(secondsRemaining) {
  if (secondsRemaining <= 0) return 'closed';
  if (secondsRemaining < 20 * 60) return 'critical';  // under 20 min
  if (secondsRemaining < 60 * 60) return 'closing';   // under an hour
  return 'live';
}

export const URGENCY_COLOR = {
  live:     { hex: '#06D6A0', label: 'Live' },      // success
  closing:  { hex: '#FFD166', label: 'Closing' },   // secondary
  critical: { hex: '#EF476F', label: 'Last call' }, // warning
  closed:   { hex: '#8D8D8D', label: 'Closed' },    // text-lighter
};
