import { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * Where the app is searching from.
 *
 * Three things this has to get right, none of which the old version did:
 *
 *  1. Working without permission. Denying location is a normal choice, not an error
 *     state. There is always a usable centre, and `source` says where it came from so
 *     the UI can be honest about it instead of pretending a default is your position.
 *  2. Surviving a reload. A manually chosen area used to vanish on refresh, dumping
 *     the user back in the CBD. It is now persisted.
 *  3. Not nagging. Nothing here requests GPS. A page asks only when the user acts,
 *     so the browser prompt always follows a deliberate tap.
 */

const STORAGE_KEY = 'hl_location';

// Nairobi CBD - the app is Nairobi-specific, so this is a meaningful fallback
// rather than an arbitrary one.
export const DEFAULT_LOCATION = { lat: -1.2864, lon: 36.8172, label: 'Nairobi CBD' };

const LocationContext = createContext();

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lon !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export const LocationProvider = ({ children }) => {
  // null until the user gives us something real; the app falls back to DEFAULT.
  const [userLocation, setUserLocation] = useState(() => readStored());

  useEffect(() => {
    try {
      if (userLocation) localStorage.setItem(STORAGE_KEY, JSON.stringify(userLocation));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode - the app still works, it just will not remember */
    }
  }, [userLocation]);

  /**
   * @param {number} lat
   * @param {number} lon
   * @param {object} meta  { source: 'gps' | 'manual', label }
   */
  const updateLocation = useCallback((lat, lon, meta = {}) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setUserLocation({ lat, lon, source: meta.source || 'manual', label: meta.label || null });
  }, []);

  const clearLocation = useCallback(() => setUserLocation(null), []);

  // What every page should actually search from.
  const searchOrigin = userLocation || { ...DEFAULT_LOCATION, source: 'default' };
  const isDefaultOrigin = !userLocation;

  return (
    <LocationContext.Provider
      value={{ userLocation, searchOrigin, isDefaultOrigin, updateLocation, clearLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
