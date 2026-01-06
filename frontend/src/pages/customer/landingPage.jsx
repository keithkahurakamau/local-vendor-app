import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { FiSearch, FiMapPin, FiShoppingCart, FiStar, FiClock, FiTruck, FiGrid, FiMap, FiArrowRight, FiInstagram, FiTwitter, FiFacebook, FiNavigation, FiList, FiAlertCircle } from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { customerAPI } from '../../services/api'; // Keep your existing API import if needed
import { useLocation } from '../../context/LocationContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import mapService from '../../services/mapService';

// --- Draggable Marker Component (From MapPage) ---
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
      icon={userIcon} // Explicitly using userIcon here
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

const LandingPage = () => {
    const navigate = useNavigate();
    const { location: userLocation } = useGeoLocation();
    const { updateLocation } = useLocation();
    
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null); // Added for Map selection
    const [loading, setLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    
    // Map State
    const [mapCenter, setMapCenter] = useState([ -1.2864, 36.8172 ]);
    const [manualLocation, setManualLocation] = useState(null);
    const [radius] = useState(5000); // Default 5km
    const [visibleVendorsCount, setVisibleVendorsCount] = useState(3); // For responsive map cards
    
    const [error, setError] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const mapRef = useRef(null);

    // --- DATA ---
    const popularCategories = [
        { id: 'all', name: 'All' },
        { id: 'nyama-choma', name: 'Nyama Choma' },
        { id: 'pilau', name: 'Pilau' },
        { id: 'chapati', name: 'Chapati' },
        { id: 'ugali-fish', name: 'Ugali Fish' },
        { id: 'pizza', name: 'Pizza' }
    ];

    // --- HELPERS (From MapPage) ---
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

    const formatDistance = (meters) => {
        if (!meters) return '';
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(1)}km`;
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const diffMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    // --- EFFECTS ---
    useEffect(() => {
        const updateVisibleCount = () => setVisibleVendorsCount(calculateVisibleVendors());
        updateVisibleCount(); 
        window.addEventListener('resize', updateVisibleCount);
        return () => window.removeEventListener('resize', updateVisibleCount);
    }, [calculateVisibleVendors]);

    // Initial load logic
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                if (userLocation) {
                    setMapCenter([userLocation.lat, userLocation.lon]);
                    const response = await customerAPI.getVendors({
                        lat: userLocation.lat,
                        lon: userLocation.lon,
                        radius: radius
                    });
                    setVendors(response.data.vendors);
                } else {
                    const response = await customerAPI.getVendors();
                    setVendors(response.data.vendors);
                }
            } catch (error) {
                console.error('Error fetching vendors:', error);
                // Fallback
                try {
                    const response = await customerAPI.getVendors();
                    setVendors(response.data.vendors);
                } catch(e) {}
            } finally {
                setLoading(false);
            }
        };

        fetchVendors();
    }, [userLocation, radius]);


    // --- ACTION HANDLERS ---

    const handleCategoryClick = (id) => setActiveCategory(id);
    const handleClearSearch = () => { setSearchQuery(''); setActiveCategory('all'); };

    const handleViewToggle = (mode) => {
        if (mode === viewMode) return;
        setViewMode(mode);
    };

    // Robust Near Me Logic (From MapPage)
    const handleFindNearby = async () => {
        setLocationLoading(true);
        setError(null);
        setManualLocation(null);

        try {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    updateLocation(latitude, longitude);
                    
                    if (mapRef.current) {
                        mapRef.current.flyTo([latitude, longitude], 13, { duration: 2.0 });
                    }
                    setMapCenter([latitude, longitude]);
                    
                    // Fetch vendors
                    const response = await mapService.getNearbyVendors(latitude, longitude, radius);
                    if (response.success) setVendors(response.vendors);
                    setLocationLoading(false);
                },
                (err) => {
                    console.warn(err);
                    setError('Could not get your location. Please enable permissions.');
                    setLocationLoading(false);
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        } catch {
            setError('Failed to find nearby vendors.');
            setLocationLoading(false);
        }
    };

    // Drag Logic (From MapPage)
    const handleDragEnd = async (lat, lng) => {
        setManualLocation({ lat, lng });
        setMapCenter([lat, lng]);
        updateLocation(lat, lng);
        setLoading(true);
        try {
            const response = await mapService.getNearbyVendors(lat, lng, radius);
            if (response.success) setVendors(response.vendors);
        } catch {
            setError('Failed to find vendors at this location.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdvancedSearch = async (e) => {
        e?.preventDefault();
        if (!searchQuery.trim()) {
            setError('Please enter a food item or place to search');
            return;
        }
        setSearchLoading(true);
        setError(null);

        try {
            const places = await mapService.searchPlaces(searchQuery);
            if (places.length > 0) {
                const place = places[0];
                setMapCenter([place.lat, place.lon]);
                if (mapRef.current) mapRef.current.flyTo([place.lat, place.lon], 13);
                
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
            setError('Failed to search. Please try again.');
        } finally {
            setSearchLoading(false);
        }
    };

    // Logic to filter the vendors based on categories/search (Grid View Only)
    // Note: Map view usually shows all results from API, filtering grid separately is fine
    const filteredVendors = useMemo(() => {
        return vendors.filter(vendor => {
            if (activeCategory !== 'all' && !vendor.categories?.includes(activeCategory)) return false;
            // Additional client-side text filtering if needed
            if (searchQuery.trim() && vendors.length > 0 && !loading) {
                 // Simple check if API didn't already filter it
                 const query = searchQuery.toLowerCase();
                 const text = `${vendor.name} ${vendor.cuisine} ${vendor.location}`.toLowerCase();
                 return text.includes(query);
            }
            return true;
        });
    }, [searchQuery, activeCategory, vendors, loading]);

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-gray-800 flex flex-col">
            
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center gap-2 cursor-pointer">
                            <div className="bg-orange-600 p-2 rounded-lg">
                                <BiStore className="text-white text-xl" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-gray-900">
                                Hyper<span className="text-orange-600">Local</span>
                            </span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link to="/vendor/login" className="hidden md:flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors">
                                <BiStore /> Vendor Login
                            </Link>
                            <Link to="/admin/login" className="bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition-transform active:scale-95">
                                Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative h-[550px] flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                    <img src="/images/hero2.jpg" alt="Kenyan Food" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-neutral-50"></div>
                </div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-[-40px]">
                    <span className="inline-block py-1 px-3 rounded-full bg-orange-500/20 border border-orange-500 text-orange-300 text-sm font-semibold mb-6 backdrop-blur-sm">
                        Your neighborhood marketplace
                    </span>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-sm">
                        Hyper Local Flavors, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Delivered Fast.</span>
                    </h1>
                </div>
            </div>

            {/* Search Container */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-24">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-4 top-3.5 text-gray-400 text-xl" />
                            <input
                                type="text"
                                placeholder="Search vendors, food, or places (e.g. Pilau, Westlands)..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch()}
                            />
                        </div>
                        <button
                            onClick={handleAdvancedSearch}
                            disabled={searchLoading}
                            className={`px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 ${
                                searchLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {searchLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <FiSearch className="text-lg" />
                                    <span>Search</span>
                                </>
                            )}
                        </button>
                        
                        {/* Enhanced Near Me Button */}
                        <button
                            onClick={handleFindNearby}
                            disabled={locationLoading}
                            className={`flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl transition-colors text-gray-700 font-medium ${
                                locationLoading
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-gray-50 hover:border-orange-200'
                            }`}
                        >
                            {locationLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                                    <span>Locating...</span>
                                </>
                            ) : (
                                <>
                                    <FiNavigation className="text-orange-500" />
                                    <span>Near Me</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="mt-6">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular Categories</p>
                        <div className="flex flex-wrap gap-2">
                            {popularCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${activeCategory === cat.id ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-600'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-xl">×</button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex-grow w-full">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Nearby Local Vendors</h2>
                        <p className="text-gray-500 mt-2">{vendors.length} spots found near you</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center">
                        <div className="bg-gray-200 rounded-full p-1.5 flex items-center relative shadow-inner w-64 h-14 select-none cursor-pointer border border-gray-200">
                            <div className={`absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-lg transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewMode === 'map' ? 'translate-x-[100%] ml-1.5' : 'translate-x-0'}`}></div>
                            <div onClick={() => handleViewToggle('grid')} className={`flex-1 relative z-10 flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-300 ${viewMode === 'grid' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                <FiGrid className="text-lg" /> Grid View
                            </div>
                            <div onClick={() => handleViewToggle('map')} className={`flex-1 relative z-10 flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-300 ${viewMode === 'map' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                <FiMap className="text-lg" /> Map View
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="text-gray-500 mt-4">Loading vendors...</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* --- GRID VIEW --- */
                    filteredVendors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredVendors.map((vendor) => (
                                <div key={vendor.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                                    <div className="relative h-56 overflow-hidden">
                                        <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm ${vendor.status === 'Open' ? 'bg-green-500/90 text-white' : vendor.status === 'Busy' ? 'bg-orange-500/90 text-white' : 'bg-gray-500/90 text-white'}`}>
                                            {vendor.status || 'Closed'}
                                        </div>
                                        <div className="absolute bottom-4 left-4 bg-white px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm">
                                            <FiStar className="text-orange-500 fill-current" />
                                            {vendor.rating}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{vendor.name}</h3>
                                            <span className="text-xs font-medium text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                                <FiClock /> {formatTimeAgo(vendor.updated)}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">{vendor.cuisine}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                                            <span className="flex items-center gap-1"><FiMapPin className="text-orange-500" /> {formatDistance(vendor.distance)}</span>
                                            <span className="flex items-center gap-1"><FiTruck className="text-orange-500" /> Delivery</span>
                                        </div>
                                        <button onClick={() => navigate(`/order/${vendor.id}`, { state: { vendor } })} className="w-full mt-auto bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg">
                                            <FiShoppingCart /> Order Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <FiSearch className="mx-auto text-4xl text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No vendors found</h3>
                            <p className="text-gray-500">Try adjusting your search or filters.</p>
                            <button onClick={handleClearSearch} className="mt-4 text-orange-600 font-medium hover:underline">Reset All</button>
                        </div>
                    )
                ) : (
                    /* --- MAP VIEW (ENHANCED with MapPage Functionality) --- */
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
                        <div className="h-[700px] relative w-full">
                            <MapContainer
                                center={mapCenter}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                                ref={mapRef}
                                zoomControl={false}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />

                                {/* Draggable Marker for precise location */}
                                <DraggableMarker 
                                    position={manualLocation || (userLocation ? { lat: userLocation.lat, lng: userLocation.lon } : null)} 
                                    setPosition={(pos) => {
                                        setManualLocation({ lat: pos.lat, lng: pos.lng });
                                    }}
                                    onDragEnd={handleDragEnd}
                                />

                                {/* Vendor Markers */}
                                {vendors.map((vendor) => (
                                    vendor.lat && vendor.lon ? (
                                        <Marker
                                            key={vendor.id}
                                            position={[vendor.lat, vendor.lon]}
                                            icon={vendorIcon}
                                            eventHandlers={{ click: () => setSelectedVendor(vendor) }}
                                        />
                                    ) : null
                                ))}
                            </MapContainer>

                            {/* Floating Vendor Cards (The "MapPage" Feature) */}
                            {vendors.length > 0 && (
                                <div className="absolute bottom-4 left-0 right-0 z-[400] overflow-x-auto px-4 pb-2 no-scrollbar">
                                    <div className="flex gap-4 w-max mx-auto md:mx-0">
                                        {vendors.slice(0, visibleVendorsCount + 5).map((vendor) => (
                                            <div 
                                                key={vendor.id} 
                                                className={`flex-shrink-0 w-72 bg-white rounded-xl shadow-xl p-4 cursor-pointer border transition-all ${selectedVendor?.id === vendor.id ? 'border-orange-500 ring-4 ring-orange-100' : 'border-gray-100'}`} 
                                                onClick={() => {
                                                    setSelectedVendor(vendor);
                                                    if(mapRef.current) mapRef.current.flyTo([vendor.lat, vendor.lon], 15);
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 truncate w-40">{vendor.name}</h3>
                                                        <p className="text-xs text-gray-500">{formatDistance(vendor.distance)} • {formatTimeAgo(vendor.updated)}</p>
                                                    </div>
                                                    <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{vendor.status || 'Open'}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {vendor.cuisine && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">{vendor.cuisine}</span>}
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); navigate(`/order/${vendor.id}`, { state: { vendor } }); }} className="w-full py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors">
                                                    View Menu
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Legend */}
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 z-[400]">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span>You (Drag to move)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                        <span>Vendors</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </Popup>
                    </Marker>
                    ))}
                </MapContainer>
                </div>

                {/* Floating Vendor Cards */}
                {filteredVendors.length > 0 && (
                <div className="absolute bottom-4 left-0 right-0 z-[1000] overflow-x-auto px-4">
                    <div className="flex gap-4 pb-2">
                    {filteredVendors.slice(0, 3).map((vendor) => (
                        <div
                        key={vendor.id}
                        className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-lg p-4 cursor-pointer transition-all ${
                            selectedVendor?.id === vendor.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedVendor(vendor)}>
                        <div className="w-full h-32 bg-gray-200 rounded-lg mb-3 overflow-hidden">
                            <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
                        </div>

                        <h3 className="font-bold text-lg mb-1">{vendor.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                            {vendor.distance ? `${vendor.distance}km away` : 'Nearby'} • {vendor.updated}
                        </p>

                        <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Available items:</p>
                            <div className="flex flex-wrap gap-1">
                            {vendor.categories.slice(0, 3).map((item, idx) => (
                                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {item}
                                </span>
                            ))}
                            {vendor.categories.length > 3 && (
                                <span className="text-xs text-gray-500">
                                +{vendor.categories.length - 3} more
                                </span>
                            )}
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                            e.stopPropagation();
                            navigate('/customer/order', { 
                                state: { vendor, userLocation: contextLocation } 
                            });
                            }}
                            className="w-full py-2 bg-primary text-white rounded-button hover:bg-primary-dark transition">
                            Order Now
                        </button>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            {/* --- MEGA FOOTER --- */}
            <footer className="bg-gray-900 text-white pt-20 pb-10 border-t border-gray-800 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        
                        {/* Brand Column */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-600 p-2.5 rounded-xl">
                                    <BiStore className="text-white text-2xl" />
                                </div>
                                <span className="text-3xl font-bold tracking-tight text-white">
                                    Hyper<span className="text-orange-500">Local</span>
                                </span>
                            </div>
                            <p className="text-gray-400 leading-relaxed max-w-sm">
                                Empowering local businesses by connecting neighborhoods with their favorite flavors. Fast, fresh, and friendly delivery.
                            </p>
                            <div className="flex gap-4">
                                <button className="p-2 bg-gray-800 rounded-full hover:bg-orange-600 transition-colors"><FiInstagram /></button>
                                <button className="p-2 bg-gray-800 rounded-full hover:bg-orange-600 transition-colors"><FiTwitter /></button>
                                <button className="p-2 bg-gray-800 rounded-full hover:bg-orange-600 transition-colors"><FiFacebook /></button>
                            </div>
                        </div>

                        {/* Quick Links Column */}
                        <div className="md:pl-10">
                            <h3 className="text-lg font-bold text-white mb-6">Quick Navigation</h3>
                            <ul className="space-y-4 text-gray-400">
                                <li><button onClick={() => navigate('/')} className="hover:text-orange-500 transition-colors flex items-center gap-2"><FiArrowRight className="text-sm"/> Home</button></li>
                                <li><button onClick={() => navigate('/customer/map')} className="hover:text-orange-500 transition-colors flex items-center gap-2"><FiArrowRight className="text-sm"/> Find on Map</button></li>
                                <li><button onClick={() => navigate('/vendor/login')} className="hover:text-orange-500 transition-colors flex items-center gap-2"><FiArrowRight className="text-sm"/> Vendor Login</button></li>
                                <li><button onClick={() => navigate('/admin/login')} className="hover:text-orange-500 transition-colors flex items-center gap-2"><FiArrowRight className="text-sm"/> Admin Portal</button></li>
                            </ul>
                        </div>

                        {/* Vendor Invitation Card */}
                        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-orange-600 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            
                            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Are you a Vendor?</h3>
                            <p className="text-gray-400 text-sm mb-6 relative z-10 leading-relaxed">
                                Join our growing marketplace. Expand your reach and serve more customers in your neighborhood today.
                            </p>
                            
                            <button 
                                onClick={() => navigate('/vendor/register')}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-900/20 flex items-center justify-center gap-2 relative z-10"
                            >
                                Register Your Business <BiStore className="text-lg" />
                            </button>
                        </div>
                    </div>

                    {/* Copyright Bar */}
                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                        <p>© 2025 Hyper Local Vendor. Nairobi, Kenya 🇰🇪</p>
                        <div className="flex space-x-8 mt-4 md:mt-0">
                            <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
                            <span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span>
                            <span className="cursor-pointer hover:text-white transition-colors">Cookie Policy</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;