import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FiGrid, FiMap, FiSearch, FiNavigation, FiList, FiAlertCircle } from 'react-icons/fi';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { useLocation } from '../../context/LocationContext';
import mapService from '../../services/mapService';

// --- Draggable Marker Component ---
const DraggableMarker = ({ position, setPosition, onDragEnd }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onDragEnd) onDragEnd(e.latlng.lat, e.latlng.lng);
    }
  });

  return position ? (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const newPos = e.target.getLatLng();
          setPosition(newPos);
          if (onDragEnd) onDragEnd(newPos.lat, newPos.lng);
        }
      }}
    />
  ) : null;
};

// --- Leaflet Icons Config ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const vendorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapPage() {
  const navigate = useNavigate();
  const { location: userLocation } = useGeoLocation();
  const { updateLocation } = useLocation();

  // State
  const [viewMode, setViewMode] = useState('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([ -1.2864, 36.8172 ]); 
  const [radius] = useState(5000);
  const [manualLocation, setManualLocation] = useState(null);
  const [userMarker, setUserMarker] = useState(null);
  const [visibleVendorsCount, setVisibleVendorsCount] = useState(3);

  const searchInputRef = useRef(null);
  const mapRef = useRef(null);

  // --- Logic Helpers ---
  const calculateVisibleVendors = useCallback(() => {
    let cardWidth;
    if (window.innerWidth < 640) cardWidth = 280; 
    else if (window.innerWidth < 1024) cardWidth = 300;
    else cardWidth = 320; 
    
    const gap = 16; 
    const padding = 32; 
    const availableWidth = window.innerWidth - padding;
    const cardsThatFit = Math.floor(availableWidth / (cardWidth + gap));
    return Math.max(1, cardsThatFit); 
  }, []);

  useEffect(() => {
    const updateVisibleCount = () => setVisibleVendorsCount(calculateVisibleVendors());
    updateVisibleCount(); 
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, [calculateVisibleVendors]);

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lon]);
      updateLocation(userLocation.lat, userLocation.lon);

      const loadNearbyVendors = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await mapService.getNearbyVendors(userLocation.lat, userLocation.lon, radius);
          if (response.success) {
            setVendors(response.vendors);
            if (response.vendors.length === 0) setError(`No vendors found within ${radius / 1000}km`);
          }
        } catch (err) {
          setError(err?.response?.data?.error || 'Failed to load nearby vendors.');
        } finally {
          setLoading(false);
        }
      };
      loadNearbyVendors();
    }
  }, [userLocation, updateLocation, radius]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a food item or place to search');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const places = await mapService.searchPlaces(searchQuery);
      if (places.length > 0) {
        const place = places[0];
        setMapCenter([place.lat, place.lon]);
        const response = await mapService.getNearbyVendors(place.lat, place.lon, radius);
        if (response.success) {
          setVendors(response.vendors);
          if (response.vendors.length === 0) setError(`No vendors found near "${place.name}"`);
        }
      } else {
        const searchLat = userLocation?.lat || -1.2864;
        const searchLon = userLocation?.lon || 36.8172;
        const response = await mapService.searchVendors(searchQuery, searchLat, searchLon, radius);
        if (response.success) {
          setVendors(response.vendors);
          if (response.vendors.length === 0) setError(`No vendors found selling "${searchQuery}"`);
        }
      }
    } catch {
      setError('Failed to search.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindNearby = async () => {
    setLoading(true);
    setError(null);
    setSearchQuery('');
    setManualLocation(null);

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
          setUserMarker({ lat: latitude, lon: longitude });
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 15, { duration: 2.0 });
          }
          setMapCenter([latitude, longitude]);
          const response = await mapService.getNearbyVendors(latitude, longitude, radius);
          if (response.success) setVendors(response.vendors);
          setLoading(false);
        },
        async () => {
          const defaultLat = -1.2864;
          const defaultLon = 36.8172;
          setMapCenter([defaultLat, defaultLon]);
          const response = await mapService.getNearbyVendors(defaultLat, defaultLon, radius);
          if (response.success) setVendors(response.vendors);
          setLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } catch {
      setError('Failed to find nearby vendors.');
      setLoading(false);
    }
  };

  const handleDragEnd = async (lat, lng) => {
    setManualLocation({ lat, lon: lng });
    setMapCenter([lat, lng]);
    updateLocation(lat, lng);
    setError(null);
    setLoading(true);
    try {
      const response = await mapService.getNearbyVendors(lat, lng, radius);
      if (response.success) setVendors(response.vendors);
    } catch {
      setError('Failed to find vendors at location.');
      setLoading(false);
    }
  };

  const handleOrderClick = (vendor) => {
    navigate(`/order/${vendor.id}`, { state: { vendor } });
  };

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTimeAgo = (timestamp) => {
    const diffMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex flex-col font-sans">
      <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col relative h-[calc(100vh-3rem)]">
        
        {/* --- Toolbar --- */}
        <div className="bg-white border-b border-gray-100 p-4 z-20 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm relative">
          <form onSubmit={handleSearch} className="flex-1 w-full max-w-2xl flex gap-3">
            <div className="relative flex-1 group">
              <FiSearch className="absolute left-3 top-3.5 text-gray-400 text-lg group-focus-within:text-orange-500 transition-colors" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food, location..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all caret-orange-500 text-gray-900"
                disabled={loading}
              />
            </div>
            <button type="submit" className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 active:scale-95 transition-all shadow-sm disabled:opacity-50" disabled={loading}>
              {loading ? '...' : 'Search'}
            </button>
            <button type="button" onClick={handleFindNearby} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap active:bg-gray-50" disabled={loading}>
              <FiNavigation className="text-orange-500" />
              <span className="hidden sm:inline">Near Me</span>
            </button>
          </form>

          {/* View Toggle */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center relative border border-gray-200 w-full sm:w-auto">
             <button 
                onClick={() => setViewMode('grid')} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <FiGrid /> Grid
             </button>
             <button 
                onClick={() => setViewMode('map')} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'map' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <FiMap /> Map
             </button>
          </div>
        </div>

        {error && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 shadow-lg text-sm font-bold flex items-center gap-2 animate-bounce">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* --- Content --- */}
        <div className="flex-1 relative bg-gray-50">
          
          {viewMode === 'map' && (
            <>
              {mapCenter ? (
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  className="h-full w-full absolute inset-0 z-0 bg-gray-100"
                  zoomControl={false}
                  whenReady={(map) => { mapRef.current = map; }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <DraggableMarker position={manualLocation} setPosition={setManualLocation} onDragEnd={handleDragEnd} />
                  {(userMarker || userLocation || manualLocation) && (
                    <Marker position={[(manualLocation || userMarker || userLocation).lat, (manualLocation || userMarker || userLocation).lon]} icon={userIcon} />
                  )}
                  {vendors.map((vendor) => (
                    vendor.latitude && vendor.longitude ? (
                      <Marker key={vendor.id} position={[vendor.latitude, vendor.longitude]} icon={vendorIcon} eventHandlers={{ click: () => setSelectedVendor(vendor) }} />
                    ) : null
                  ))}
                </MapContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
                </div>
              )}

              {/* Vendor Cards Overlay */}
              {vendors.length > 0 && (
                <div className="absolute bottom-4 left-0 right-0 z-[400] overflow-x-auto px-4 pb-2 no-scrollbar">
                  <div className="flex gap-4">
                    {vendors.slice(0, visibleVendorsCount).map((vendor) => (
                      <div key={vendor.id} className={`flex-shrink-0 w-80 bg-white rounded-xl shadow-xl p-4 cursor-pointer border-2 transition-all ${selectedVendor?.id === vendor.id ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-white hover:border-gray-100'}`} onClick={() => setSelectedVendor(vendor)}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 truncate w-48">{vendor.name}</h3>
                            <p className="text-xs text-gray-500 font-medium">{formatDistance(vendor.distance)} away • {formatTimeAgo(vendor.last_updated)}</p>
                          </div>
                          <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full uppercase">Open</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {vendor.menu?.items?.slice(0, 2).map((item, idx) => (
                            <span key={idx} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100">{item}</span>
                          ))}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleOrderClick(vendor); }} className="w-full py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
                          View Menu
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {viewMode === 'grid' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {vendors.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <FiList className="text-5xl mb-3 opacity-20" />
                  <p className="font-medium">No vendors found in this area.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} onClick={() => handleOrderClick(vendor)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/50 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden group">
                      <div className="h-32 bg-gray-100 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          {vendor.image ? <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" /> : <span className="text-xs font-bold uppercase tracking-widest opacity-30">No Image</span>}
                        </div>
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-orange-700 shadow-sm border border-orange-100">
                            {formatDistance(vendor.distance)}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">{vendor.name}</h3>
                        <p className="text-xs text-gray-500 mb-4 font-medium">Updated {formatTimeAgo(vendor.last_updated)}</p>
                        
                        <div className="space-y-2 mb-4 h-14 overflow-hidden">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Items</p>
                          <div className="flex flex-wrap gap-1.5">
                            {vendor.menu?.items?.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-2 py-1 rounded-md">{item}</span>
                            ))}
                          </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOrderClick(vendor); }}
                            className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all shadow-sm"
                        >
                            Order Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapPage;