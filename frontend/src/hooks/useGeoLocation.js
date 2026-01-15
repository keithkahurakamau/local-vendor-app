import { useState, useCallback } from 'react';

export const useGeoLocation = () => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const getGeoLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
                setLoading(false);
            },
            (err) => {
                // Handle specific error codes
                switch(err.code) {
                    case err.PERMISSION_DENIED:
                        setError("User denied the request for Geolocation.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError("Location information is unavailable.");
                        break;
                    case err.TIMEOUT:
                        setError("The request to get user location timed out.");
                        break;
                    default:
                        setError("An unknown error occurred.");
                        break;
                }
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000, // Increased to 15 seconds
                maximumAge: 0,
            }
        );
    }, []);

    return { location, error, loading, getGeoLocation };
};