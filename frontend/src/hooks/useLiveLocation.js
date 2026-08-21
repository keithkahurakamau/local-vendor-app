import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Continuous location tracking.
 *
 * The original useGeoLocation fired getCurrentPosition once, so the blue dot froze
 * the moment you started walking and every screen had to re-prompt for permission.
 * This watches instead, and applies three filters that a raw watchPosition does not:
 *
 *   1. Accuracy gate - GPS often opens with a 2000m cell-tower fix before settling.
 *      Readings worse than `maxAccuracy` are ignored unless nothing better exists.
 *   2. Jitter gate - a stationary phone still reports small deltas. Movement under
 *      `minDeltaMeters` is dropped so markers do not vibrate.
 *   3. Staleness - `timestamp` is surfaced so the UI can show a fix going cold.
 *
 * Returns the same `{ lat, lon }` shape LocationContext uses, so it drops in
 * wherever useGeoLocation was used.
 */

const EARTH_RADIUS_M = 6371000;

function metresBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function useLiveLocation({
  enabled = true,
  maxAccuracy = 120,      // metres; reject fixes vaguer than this
  minDeltaMeters = 8,     // ignore sub-8m jitter
  highAccuracy = true,
} = {}) {
  const [location, setLocation] = useState(null); // { lat, lon, accuracy, heading, timestamp }
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');   // idle | locating | tracking | denied | unavailable

  const watchId = useRef(null);
  const lastAccepted = useRef(null);
  const hasAnyFix = useRef(false);

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const handlePosition = useCallback(
    (pos) => {
      const next = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
        speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        timestamp: pos.timestamp,
      };

      // 1. Accuracy gate - but always accept the very first fix so the map can
      //    show *something* rather than sitting empty waiting for a perfect one.
      if (hasAnyFix.current && next.accuracy > maxAccuracy) return;

      // 2. Jitter gate
      if (lastAccepted.current) {
        const moved = metresBetween(lastAccepted.current, next);
        const improved = next.accuracy < lastAccepted.current.accuracy - 20;
        if (moved < minDeltaMeters && !improved) return;
      }

      hasAnyFix.current = true;
      lastAccepted.current = next;
      setLocation(next);
      setError(null);
      setStatus('tracking');
    },
    [maxAccuracy, minDeltaMeters]
  );

  const handleError = useCallback((err) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Search by area instead.');
        setStatus('denied');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location unavailable right now.');
        setStatus('unavailable');
        break;
      case err.TIMEOUT:
        setError('Timed out finding you. Still trying…');
        break;
      default:
        setError('Could not determine your location.');
        setStatus('unavailable');
    }
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('This browser does not support location.');
      setStatus('unavailable');
      return;
    }
    if (watchId.current !== null) return; // already tracking

    setStatus('locating');
    watchId.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: highAccuracy,
      timeout: 20000,
      maximumAge: 5000,
    });
  }, [handlePosition, handleError, highAccuracy]);

  useEffect(() => {
    if (enabled) start();
    return stop;
  }, [enabled, start, stop]);

  /** Force a fresh high-accuracy reading, e.g. from a "recentre" button. */
  const refresh = useCallback(() => {
    if (!navigator.geolocation) return;
    setStatus((s) => (s === 'tracking' ? s : 'locating'));
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  }, [handlePosition, handleError]);

  const isStale = location ? Date.now() - location.timestamp > 60000 : false;

  return { location, error, status, isStale, start, stop, refresh };
}

export default useLiveLocation;
