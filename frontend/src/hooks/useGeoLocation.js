import { useState, useEffect } from 'react';

/**
 * Custom hook to get user's current geolocation
 * Returns location object with lat, lon and any errors
 */
export const useGeoLocation = (updateLocation) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Success callback
    const onSuccess = (position) => {
      setLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      setError(null);
      setLoading(false);
    };

    // Error callback
    const onError = (error) => {
      let errorMessage = 'Unable to retrieve your location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out.';
          break;
        default:
          errorMessage = 'An unknown error occurred while getting your location.';
      }
      
      setError(errorMessage);
      setLoading(false);
    };

    // Get current position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    // Optional: Watch position for continuous updates
    // Uncomment if you want real-time location updates
    /*
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    // Cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
    */
  }, []);

  return { location, error, loading };
};