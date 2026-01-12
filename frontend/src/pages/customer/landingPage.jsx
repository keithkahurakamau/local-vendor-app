import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import { FiSearch, FiMapPin, FiShoppingCart, FiClock, FiTruck, FiGrid, FiMap, FiArrowRight, FiNavigation, FiAlertCircle } from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { customerAPI } from '../../services/api';
import { useLocation } from '../../context/LocationContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';

// --- SAFE IMAGE COMPONENT ---
const VendorImage = ({ src, alt }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                <BiStore className="text-4xl mb-2 opacity-20" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">No Image</span>
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={() => setHasError(true)}
        />
    );
};

// --- LIVE TIMER COMPONENT ---
const VendorTimer = ({ updatedAt }) => {
  const [timeLeft, setTimeLeft] = useState("Open");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!updatedAt) return;

    const calculateTime = () => {
      const lastUpdate = new Date(updatedAt).getTime();
      const expiresAt = lastUpdate + (3 * 60 * 60 * 1000); // +3 Hours
      const now = new Date().getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Closed");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m left`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, [updatedAt]);

  return (
    <span className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isExpired ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-50 text-green-700 border-green-100'}`}>
       <FiClock className={isExpired ? "text-gray-400" : "text-green-600"} size={12} /> 
       {timeLeft}
    </span>
  );
};

// --- Draggable Marker ---
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
      icon={userIcon}
    >
        <Popup>You are here</Popup>
    </Marker>
  ) : null;
};

// --- Leaflet Icons Fix ---
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
    
    // Using the updated Hook (No auto fetch)
    const { location: userLocation, loading: geoLoading, getGeoLocation, error: geoError } = useGeoLocation();
    const { updateLocation } = useLocation();
    
    // --- REFS ---
    const mapRef = useRef(null);
    const contentRef = useRef(null); 
    
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [vendors, setVendors] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Default Map Center (Nairobi CBD)
    const [mapCenter, setMapCenter] = useState([ -1.286389, 36.817223 ]);
    const [manualLocation, setManualLocation] = useState(null);
    const [visibleVendorsCount, setVisibleVendorsCount] = useState(3);
    
    const [error, setError] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const popularCategories = [
        { id: 'all', name: 'All' },
        { id: 'nyama-choma', name: 'Nyama Choma' },
        { id: 'swahili', name: 'Swahili' },
        { id: 'fast-food', name: 'Fast Food' },
        { id: 'local', name: 'Local' },
        { id: 'drinks', name: 'Drinks' }
    ];

    // --- HELPERS ---
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

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if(!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; 
        const dLat = (lat2 - lat1) * (Math.PI/180);
        const dLon = (lon2 - lon1) * (Math.PI/180); 
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c; 
    };

    const formatDistance = (distanceKm) => {
        if (distanceKm === undefined || distanceKm === null) return '--';
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`;
        }
        return `${distanceKm.toFixed(1)}km`;
    };

    // --- EFFECTS ---
    useEffect(() => {
        const updateVisibleCount = () => setVisibleVendorsCount(calculateVisibleVendors());
        updateVisibleCount(); 
        window.addEventListener('resize', updateVisibleCount);
        return () => window.removeEventListener('resize', updateVisibleCount);
    }, [calculateVisibleVendors]);

    // Handle Geo Error from Hook
    useEffect(() => {
        if (geoError) setError(geoError);
    }, [geoError]);

    // Fetch Vendors (Runs on mount OR when userLocation updates)
    useEffect(() => {
        const fetchVendors = async () => {
            try {
                // If user has located themselves, use their coords. Else default to Nairobi.
                const currentLat = userLocation?.lat || -1.286389;
                const currentLon = userLocation?.lon || 36.817223;

                // Sync context and map if userLocation is available
                if (userLocation) {
                    updateLocation(userLocation.lat, userLocation.lon);
                    setMapCenter([userLocation.lat, userLocation.lon]);
                    if (mapRef.current) {
                        mapRef.current.flyTo([userLocation.lat, userLocation.lon], 13, { duration: 1.5 });
                    }
                }

                // Call API
                const response = await customerAPI.getVendors();
                const rawVendors = response.data.vendors || [];

                // Normalize Data
                const normalizedVendors = rawVendors.map(v => ({
                    id: v.vendor_id || v.id,
                    name: v.business_name || v.name || "Unknown Vendor",
                    image: v.image_url || null,
                    cuisine: v.cuisine || "General",
                    address: v.address || "Nairobi",
                    lat: parseFloat(v.latitude),
                    lon: parseFloat(v.longitude),
                    updated: v.updated_at, 
                    distance: calculateDistance(currentLat, currentLon, parseFloat(v.latitude), parseFloat(v.longitude))
                }));

                // Sort by distance
                normalizedVendors.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));

                setVendors(normalizedVendors);

            } catch (error) {
                console.error('Error fetching vendors:', error);
                setError('Failed to load vendors. Please ensure backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchVendors();
    }, [userLocation]); // Re-run when userLocation changes


    // --- ACTION HANDLERS ---
    const handleCategoryClick = (id) => setActiveCategory(id);
    const handleClearSearch = () => { setSearchQuery(''); setActiveCategory('all'); };

    const handleViewToggle = (mode) => {
        if (mode === viewMode) return;
        setViewMode(mode);
    };

    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleScrollToMap = () => {
        setViewMode('map');
        setTimeout(() => {
            contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // MANUAL TRIGGER: The user clicks "Near Me" -> This calls the hook
    const handleFindNearby = () => {
        setError(null);
        setManualLocation(null);
        // This is the "User Gesture" the browser wants
        getGeoLocation(); 
    };

    const handleDragEnd = (lat, lng) => {
        setManualLocation({ lat, lng });
        setMapCenter([lat, lng]);
        
        // Recalculate distances for the new drag position
        const updatedVendors = vendors.map(v => ({
            ...v,
            distance: calculateDistance(lat, lng, v.lat, v.lon)
        })).sort((a, b) => (a.distance || 9999) - (b.distance || 9999));

        setVendors(updatedVendors);
    };

    const handleAdvancedSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        setTimeout(() => {
            setSearchLoading(false);
        }, 500);
    };

    const filteredVendors = useMemo(() => {
        return vendors.filter(vendor => {
            // Filter by Category
            if (activeCategory !== 'all') {
                const cat = activeCategory.toLowerCase();
                const cuisine = (vendor.cuisine || '').toLowerCase();
                if (!cuisine.includes(cat)) return false;
            }

            // Filter by Search Query
            if (searchQuery.trim()) {
                 const query = searchQuery.toLowerCase();
                 const text = `${vendor.name} ${vendor.cuisine} ${vendor.address}`.toLowerCase();
                 return text.includes(query);
            }
            return true;
        });
    }, [searchQuery, activeCategory, vendors]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            
            {/* Navbar */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center gap-2.5 cursor-pointer group">
                            <div className="bg-orange-600 p-2 rounded-lg group-hover:bg-orange-700 transition-colors shadow-sm">
                                <BiStore className="text-white text-xl" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-900">
                                Hyper<span className="text-orange-600">Local</span>
                            </span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link to="/vendor/login" className="hidden md:flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors px-3 py-2 rounded-lg hover:bg-orange-50">
                                <BiStore className="text-lg" /> Vendor Login
                            </Link>
                            <Link to="/admin/login" className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all hover:shadow-lg active:scale-95">
                                Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative h-[500px] flex items-center justify-center bg-gray-900">
                <div className="absolute inset-0 z-0">
                    <img src="/images/hero2.jpg" alt="Kenyan Food" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
                </div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-[-20px]">
                    <span className="inline-block py-1 px-3 rounded-full bg-orange-500/10 border border-orange-500/50 text-orange-400 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-md">
                        Your neighborhood marketplace
                    </span>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 drop-shadow-lg tracking-tight">
                        Hyper Local Flavors, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Delivered Fast.</span>
                    </h1>
                </div>
            </div>

            {/* Search Container */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-20">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <FiSearch className="absolute left-4 top-3.5 text-gray-400 text-xl group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search vendors, food, or places..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent transition-all placeholder-gray-400 text-gray-900"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch()}
                            />
                        </div>
                        <button
                            onClick={handleAdvancedSearch}
                            disabled={searchLoading}
                            className={`px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 active:bg-orange-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                                searchLoading ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                        >
                            {searchLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Searching</span>
                                </>
                            ) : (
                                <>
                                    <FiSearch className="text-lg" />
                                    <span>Find Food</span>
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={handleFindNearby}
                            disabled={geoLoading}
                            className={`flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl transition-all font-semibold text-gray-700 hover:bg-gray-50 hover:border-orange-200 hover:text-orange-600 ${
                                geoLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {geoLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                                    <span>Locating</span>
                                </>
                            ) : (
                                <>
                                    <FiNavigation className="text-orange-500" />
                                    <span>Near Me</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="mt-8">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Popular Categories</p>
                        <div className="flex flex-wrap gap-2">
                            {popularCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                                        activeCategory === cat.id 
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-105' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-slide-up shadow-sm">
                        <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xl font-bold px-2">×</button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-grow w-full">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Nearby Local Vendors</h2>
                        <p className="text-gray-500 mt-1 text-sm font-medium">{filteredVendors.length} spots found near you</p>
                    </div>

                    <div className="flex items-center">
                        <div className="bg-gray-100 rounded-lg p-1 flex items-center relative w-56 h-12 border border-gray-200">
                             <button 
                                onClick={() => handleViewToggle('grid')}
                                className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold rounded-md transition-all h-full z-10 ${viewMode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                             >
                                <FiGrid /> Grid
                             </button>
                             <button 
                                onClick={() => handleViewToggle('map')}
                                className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold rounded-md transition-all h-full z-10 ${viewMode === 'map' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                             >
                                <FiMap /> Map
                             </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-32">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-600 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-gray-400 font-medium">Loading vendors...</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* --- GRID VIEW --- */
                    filteredVendors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredVendors.map((vendor) => (
                                <div key={vendor.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                                    <div className="relative h-52 overflow-hidden bg-gray-100">
                                        <VendorImage src={vendor.image} alt={vendor.name} />
                                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm border bg-green-500/90 border-green-400 text-white`}>
                                            Open
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{vendor.name}</h3>
                                            <VendorTimer updatedAt={vendor.updated} />
                                        </div>
                                        <p className="text-gray-500 text-sm mb-6 line-clamp-2">{vendor.cuisine}</p>
                                        
                                        <div className="mt-auto space-y-4">
                                            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                                                <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                                                    <FiMapPin className="text-orange-500" /> {formatDistance(vendor.distance)} away
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <FiTruck className="text-orange-500" /> Delivery
                                                </span>
                                            </div>

                                            <button 
                                                onClick={() => navigate(`/order/${vendor.id}`, { state: { vendor } })} 
                                                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <FiShoppingCart /> Order Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FiSearch className="text-3xl text-orange-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No vendors found</h3>
                            <p className="text-gray-500 mb-6">Try adjusting your search or filters.</p>
                            <button onClick={handleClearSearch} className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-bold hover:border-orange-300 hover:text-orange-600 transition-colors">Reset Filters</button>
                        </div>
                    )
                ) : (
                    /* --- MAP VIEW --- */
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
                        <div className="h-[700px] relative w-full bg-gray-100">
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

                                <DraggableMarker 
                                    position={manualLocation || (userLocation ? { lat: userLocation.lat, lng: userLocation.lon } : null)} 
                                    setPosition={(pos) => {
                                        setManualLocation({ lat: pos.lat, lng: pos.lng });
                                    }}
                                    onDragEnd={handleDragEnd}
                                />

                                {filteredVendors.map((vendor) => (
                                    (vendor.lat && vendor.lon) ? (
                                        <Marker
                                            key={vendor.id}
                                            position={[vendor.lat, vendor.lon]}
                                            icon={vendorIcon}
                                            eventHandlers={{ click: () => setSelectedVendor(vendor) }}
                                        >
                                            <Popup>
                                                <div className="text-center p-2">
                                                    <h3 className="font-bold">{vendor.name}</h3>
                                                    <p className="text-xs text-gray-500">{vendor.cuisine}</p>
                                                    <button 
                                                        onClick={() => navigate(`/order/${vendor.id}`, { state: { vendor } })}
                                                        className="mt-2 bg-orange-500 text-white text-xs px-2 py-1 rounded"
                                                    >
                                                        Order Here
                                                    </button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ) : null
                                ))}
                            </MapContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 pt-16 pb-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-600 p-2 rounded-lg">
                                    <BiStore className="text-white text-lg" />
                                </div>
                                <span className="text-xl font-bold tracking-tight text-gray-900">
                                    Hyper<span className="text-orange-600">Local</span>
                                </span>
                            </div>
                            <p className="text-gray-500 leading-relaxed text-sm max-w-sm">
                                Empowering local businesses by connecting neighborhoods with their favorite flavors. Fast, fresh, and friendly delivery.
                            </p>
                        </div>
                        
                        <div className="md:pl-12">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">Navigation</h3>
                            <ul className="space-y-3 text-gray-500 text-sm">
                                <li><button onClick={handleScrollToTop} className="hover:text-orange-600 transition-colors">Home</button></li>
                                <li><button onClick={handleScrollToMap} className="hover:text-orange-600 transition-colors">Find on Map</button></li>
                                <li><button onClick={() => navigate('/vendor/login')} className="hover:text-orange-600 transition-colors">Vendor Login</button></li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Are you a Vendor?</h3>
                            <p className="text-gray-500 text-sm mb-4">Join our growing marketplace.</p>
                            <button 
                                onClick={() => navigate('/vendor/register')}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                            >
                                Register Business <FiArrowRight />
                            </button>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm font-medium">
                        <p>© 2025 Hyper Local Vendor. Nairobi, Kenya 🇰🇪</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;