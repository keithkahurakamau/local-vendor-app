import { createContext, useContext, useState } from 'react';

// Create context
const LocationContext = createContext();

// Provider component
export const LocationProvider = ({ children }) => {
  const [userLocation, setUserLocation] = useState(null);

  const updateLocation = (lat, lon) => {
    setUserLocation({ lat, lon });
  };

  const clearLocation = () => {
    setUserLocation(null);
  };

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        updateLocation,
        clearLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

// Custom hook to use location context
export const useLocation = () => {
  const context = useContext(LocationContext);
  
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  
  return context;
};