import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { useLocation } from '../../context/LocationContext';
import mapService from '../../services/mapService';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const vendorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to update map center
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

function MapPage() {
  const navigate = useNavigate();
  const { location: userLocation, error: locationError } = useGeoLocation();
  const { updateLocation } = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [radius, setRadius] = useState(5000); // 5km default
  
  const searchInputRef = useRef(null);

  // Initialize map with user location
  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lon]);
      updateLocation(userLocation.lat, userLocation.lon);
    }
  }, [userLocation, updateLocation]);

  // Handle search
  const handleSearch = async (e) => {
    e?.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a food item to search');
      return;
    }

    if (!userLocation) {
      setError('Unable to get your location. Please enable location services.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await mapService.searchVendors(
        searchQuery,
        userLocation.lat,
        userLocation.lon,
        radius
      );

      if (response.success) {
        setVendors(response.vendors);
        
        if (response.vendors.length === 0) {
          setError(`No vendors found selling "${searchQuery}" within ${radius / 1000}km`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search vendors. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Find within 5km" button
  const handleFindNearby = async () => {
    if (!userLocation) {
      setError('Unable to get your location. Please enable location services.');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchQuery('');

    try {
      const response = await mapService.getNearbyVendors(
        userLocation.lat,
        userLocation.lon,
        radius
      );

      if (response.success) {
        setVendors(response.vendors);
        
        if (response.vendors.length === 0) {
          setError(`No vendors found within ${radius / 1000}km`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to find nearby vendors. Please try again.');
      console.error('Nearby search error:', err);
    } finally {
      setLoading(false);
    }
  };


  // Navigate to order page
  const handleOrderClick = (vendor) => {
    navigate(`/order?vendor=${vendor.id}`, { 
      state: { 
        vendor,
        userLocation 
      } 
    });
  };

  // Format distance for display
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Floating Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-3xl px-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for food, location & vendor"
            className="flex-1 px-4 py-3 rounded-lg shadow-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !userLocation}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleFindNearby}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            disabled={loading || !userLocation}
          >
            Find within 5km
          </button>
        </form>
        
        {/* Error message */}
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Location error */}
        {locationError && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            {locationError}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {mapCenter ? (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <ChangeMapView center={mapCenter} />
            
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location marker */}
            {userLocation && (
              <>
                <Marker 
                  position={[userLocation.lat, userLocation.lon]}
                  icon={userIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <strong>Your Location</strong>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Radius circle */}
                <Circle
                  center={[userLocation.lat, userLocation.lon]}
                  radius={radius}
                  pathOptions={{
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.1
                  }}
                />
              </>
            )}

            {/* Vendor markers */}
            {vendors.map((vendor) => (
              <Marker
                key={vendor.id}
                position={[vendor.location.latitude, vendor.location.longitude]}
                icon={vendorIcon}
                eventHandlers={{
                  click: () => setSelectedVendor(vendor)
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-lg mb-1">{vendor.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatDistance(vendor.distance)} away
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Updated: {formatTimeAgo(vendor.last_updated)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Vendor Cards at Bottom */}
      {vendors.length > 0 && (
        <div className="absolute bottom-4 left-0 right-0 z-[1000] overflow-x-auto px-4">
          <div className="flex gap-4 pb-2">
            {vendors.slice(0, 3).map((vendor) => (
              <div
                key={vendor.id}
                className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-lg p-4 cursor-pointer transition-all ${
                  selectedVendor?.id === vendor.id ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setSelectedVendor(vendor)}
              >
                {/* Vendor Image Placeholder */}
                <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-gray-400">Vendor Image</span>
                </div>

                {/* Vendor Info */}
                <h3 className="font-bold text-lg mb-1">{vendor.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {formatDistance(vendor.distance)} away • {formatTimeAgo(vendor.last_updated)}
                </p>

                {/* Menu Items */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Available items:</p>
                  <div className="flex flex-wrap gap-1">
                    {vendor.menu?.items?.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 px-2 py-1 rounded"
                      >
                        {item}
                      </span>
                    ))}
                    {vendor.menu?.items?.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{vendor.menu.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrderClick(vendor);
                  }}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;
