import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
// ADDED: FiMenu (3 lines) and FiX (Close icon)
import { FiSearch, FiMapPin, FiShoppingCart, FiClock, FiTruck, FiGrid, FiMap, FiArrowRight, FiNavigation, FiAlertCircle, FiMenu, FiX } from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { customerAPI } from '../../services/api'; 
import { useLocation } from '../../context/LocationContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import mapService from '../../services/mapService';

// --- SMOOTH MAP UPDATER ---
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15); 
    }
  }, [center, map]);
  return null;
};

// --- SAFE IMAGE COMPONENT ---
const VendorImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className={`bg-orange-50 flex flex-col items-center justify-center text-orange-200 ${className}`}>
                <BiStore className="text-2xl opacity-50" />
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className}
            onError={() => setHasError(true)}
        />
    );
};

// --- LIVE TIMER COMPONENT ---
const VendorTimer = ({ updatedAt }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      if (!updatedAt) return;
      
      const lastUpdate = new Date(updatedAt).getTime();
      const expiresAt = lastUpdate + (3 * 60 * 60 * 1000); // +3 Hours
      const now = new Date().getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Closing soon");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [updatedAt]);

  return (
    <span className={`text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
       <FiClock className={isExpired ? "" : "animate-pulse"} /> 
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
        <Popup>You (Customer) - Drag to find vendors</Popup>
    </Marker>
  ) : null;
};

// --- Leaflet Icons ---
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
    const { updateLocation } = useLocation();
    
    // --- REFS ---
    const mapRef = useRef(null);
    const contentRef = useRef(null);
    
    // --- STATE ---
    const DEFAULT_LAT = -1.2864;
    const DEFAULT_LNG = 36.8172;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    
    // ADDED: State for mobile menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Map State
    const initialCenter = useMemo(() => [DEFAULT_LAT, DEFAULT_LNG], []); 
    const [mapCenter, setMapCenter] = useState([DEFAULT_LAT, DEFAULT_LNG]);
    const [manualLocation, setManualLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    const [radius] = useState(5000); 
    
    const [error, setError] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const popularCategories = [
        { id: 'all', name: 'All' },
        { id: 'nyama-choma', name: 'Nyama Choma' },
        { id: 'pilau', name: 'Pilau' },
        { id: 'chapati', name: 'Chapati' },
        { id: 'ugali-fish', name: 'Ugali Fish' },
        { id: 'pizza', name: 'Pizza' }
    ];

    const formatDistance = (distanceKm) => {
        if (distanceKm === undefined || distanceKm === null) return '';
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`;
        }
        return `${distanceKm.toFixed(1)}km`;
    };

    // --- REUSABLE FETCH FUNCTION ---
    const fetchNearbyVendors = async (lat, lng) => {
        setLoading(true);
        try {
            const vendorList = await mapService.getNearbyVendors(lat, lng, radius);
            if (Array.isArray(vendorList)) {
                setVendors(vendorList);
            } else {
                setVendors([]);
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
            setError('Failed to load nearby vendors.');
        } finally {
            setLoading(false);
        }
    };

    // --- INITIAL FETCH ---
    useEffect(() => {
        if (manualLocation) {
            fetchNearbyVendors(manualLocation.lat, manualLocation.lng);
        }
    }, []); 

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

    // --- GEOLOCATION HANDLER ---
    const handleFindNearby = async () => {
        setLocationLoading(true);
        setError(null);

        const geoOptions = {
            enableHighAccuracy: false, 
            timeout: 20000,
            maximumAge: 300000
        };

        try {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    updateLocation(latitude, longitude);
                    
                    setManualLocation({ lat: latitude, lng: longitude });
                    setMapCenter([latitude, longitude]); 
                    
                    await fetchNearbyVendors(latitude, longitude);
                    setLocationLoading(false);
                },
                (err) => {
                    console.warn("Geolocation warning:", err);
                    setError('Could not get your location. Please check permissions.');
                    setLocationLoading(false);
                },
                geoOptions
            );
        } catch (e) {
            setError('Failed to initiate location search.');
            setLocationLoading(false);
        }
    };

    const handleDragEnd = async (lat, lng) => {
        setManualLocation({ lat, lng });
        updateLocation(lat, lng);
        await fetchNearbyVendors(lat, lng);
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
                setManualLocation({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
                await fetchNearbyVendors(place.lat, place.lon);
            } else {
                const searchLat = manualLocation?.lat || DEFAULT_LAT;
                const searchLon = manualLocation?.lng || DEFAULT_LNG;
                
                const foundVendors = await mapService.searchVendors(searchQuery, searchLat, searchLon, radius);
                
                if (Array.isArray(foundVendors)) {
                    setVendors(foundVendors);
                    if (foundVendors.length === 0) setError(`No vendors found selling "${searchQuery}" nearby.`);
                }
            }
        } catch {
            setError('Failed to search. Please try again.');
        } finally {
            setSearchLoading(false);
        }
    };

    const filteredVendors = useMemo(() => {
        return vendors.filter(vendor => {
            if (activeCategory !== 'all' && !vendor.categories?.includes(activeCategory)) return false;
            if (searchQuery.trim() && vendors.length > 0 && !loading) {
                 const query = searchQuery.toLowerCase();
                 const text = `${vendor.name} ${vendor.cuisine} ${vendor.location}`.toLowerCase();
                 return text.includes(query);
            }
            return true;
        });
    }, [searchQuery, activeCategory, vendors, loading]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 font-sans text-gray-800 flex flex-col">
            
            {/* Navbar */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-orange-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 relative">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 cursor-pointer">
                            <div className="bg-orange-600 p-2 rounded-lg shadow-sm">
                                <BiStore className="text-white text-xl" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-gray-900">
                                Hyper<span className="text-orange-600">Local</span>
                            </span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/vendor/login" className="flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors">
                                <BiStore /> Vendor Login
                            </Link>
                            <Link to="/admin/login" className="bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-orange-600 transition-all shadow-lg shadow-orange-100/20 active:scale-95">
                                Admin
                            </Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden">
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-gray-600 hover:text-orange-600 bg-orange-50 rounded-lg transition-colors border border-orange-100"
                            >
                                {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                            </button>
                        </div>

                        {/* Mobile Dropdown Menu (Glass Look) */}
                        {isMobileMenuOpen && (
                            <div className="absolute top-16 right-0 left-0 px-4 md:hidden z-50">
                                <div className="bg-white/95 backdrop-blur-md border border-orange-100 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-slide-up origin-top">
                                    <Link 
                                        to="/vendor/login" 
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 text-gray-700 hover:text-orange-700 transition-colors font-medium border border-transparent hover:border-orange-100"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                            <BiStore size={20} />
                                        </div>
                                        Vendor Login
                                    </Link>
                                    
                                    <Link 
                                        to="/admin/login" 
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors font-medium border border-transparent hover:border-gray-200"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                                            <FiGrid size={20} />
                                        </div>
                                        Admin Login
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative h-[550px] flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                    <img src="/images/hero2.jpg" alt="Kenyan Food" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-orange-50"></div>
                </div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-[-40px]">
                    <span className="inline-block py-1 px-3 rounded-full bg-orange-500/20 border border-orange-500 text-orange-300 text-sm font-semibold mb-6 backdrop-blur-sm shadow-sm">
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
                <div className="bg-white rounded-2xl shadow-2xl shadow-orange-900/10 border border-orange-100 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-4 top-3.5 text-orange-300 text-xl" />
                            <input
                                type="text"
                                placeholder="Search vendors, food, or places (e.g. Pilau, Westlands)..."
                                className="w-full pl-12 pr-4 py-3 bg-orange-50 border border-orange-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-gray-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch()}
                            />
                        </div>
                        <button
                            onClick={handleAdvancedSearch}
                            disabled={searchLoading}
                            className={`px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 ${
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
                        
                        <button
                            onClick={handleFindNearby}
                            disabled={locationLoading}
                            className={`flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl transition-all text-gray-700 font-medium ${
                                locationLoading
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 hover:shadow-md'
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
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${activeCategory === cat.id ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200 transform scale-105' : 'bg-white text-gray-600 border-gray-100 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 shadow-sm">
                        <FiAlertCircle className="text-red-500 text-xl flex-shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-xl">×</button>
                    </div>
                )}
            </div>

            {/* Content Area - Ref Attached Here */}
            <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex-grow w-full">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Nearby Local Vendors</h2>
                        <p className="text-gray-500 mt-2 font-medium">
                            {filteredVendors.length} spots found within 5km
                        </p>
                    </div>

                    <div className="flex items-center">
                        <div className="bg-orange-50 rounded-full p-1.5 flex items-center relative shadow-inner w-64 h-14 select-none cursor-pointer border border-orange-100">
                            <div className={`absolute h-[calc(100%-12px)] w-[calc(50%-6px)] bg-white rounded-full shadow-md transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${viewMode === 'map' ? 'translate-x-[100%] ml-1.5' : 'translate-x-0'}`}></div>
                            <div onClick={() => handleViewToggle('grid')} className={`flex-1 relative z-10 flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-300 ${viewMode === 'grid' ? 'text-orange-900' : 'text-gray-500 hover:text-orange-600'}`}>
                                <FiGrid className="text-lg" /> Grid View
                            </div>
                            <div onClick={() => handleViewToggle('map')} className={`flex-1 relative z-10 flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-300 ${viewMode === 'map' ? 'text-orange-900' : 'text-gray-500 hover:text-orange-600'}`}>
                                <FiMap className="text-lg" /> Map View
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="text-gray-500 mt-4">Finding vendors near you...</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* --- GRID VIEW --- */
                    filteredVendors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredVendors.map((vendor) => (
                                <div key={vendor.id} className="group bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/50 hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                                    <div className="relative h-56 overflow-hidden">
                                        <VendorImage src={vendor.image} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm border border-white/20 ${vendor.status === 'Open' ? 'bg-green-500/90 text-white' : 'bg-gray-500/90 text-white'}`}>
                                            {vendor.status || 'Closed'}
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{vendor.name}</h3>
                                            <VendorTimer updatedAt={vendor.updated} />
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">{vendor.cuisine}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 font-medium">
                                            <span className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded text-orange-700 border border-orange-100">
                                                <FiMapPin /> {formatDistance(vendor.distance)} away
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FiTruck className="text-orange-500" /> Delivery
                                            </span>
                                        </div>
                                        <button onClick={() => navigate(`/order/${vendor.vendor_id}`, { state: { vendor } })} className="w-full mt-auto bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200 group-hover:shadow-orange-200">
                                            <FiShoppingCart /> Order Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-orange-200 shadow-sm">
                            <FiSearch className="mx-auto text-4xl text-orange-200 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No vendors found nearby</h3>
                            <p className="text-gray-500">Try dragging the map marker to a different location.</p>
                            <button onClick={handleClearSearch} className="mt-4 text-orange-600 font-bold hover:underline">Reset All</button>
                        </div>
                    )
                ) : (
                    /* --- MAP VIEW --- */
                    <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden relative">
                        <div className="h-[700px] relative w-full">
                            <MapContainer
                                center={initialCenter} 
                                zoom={13}
                                scrollWheelZoom={true} 
                                style={{ height: '100%', width: '100%' }}
                                ref={mapRef}
                                zoomControl={false}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <ZoomControl position="bottomright" />
                                <MapUpdater center={mapCenter} />
                                <DraggableMarker 
                                    position={manualLocation} 
                                    setPosition={(pos) => {
                                        setManualLocation({ lat: pos.lat, lng: pos.lng });
                                    }}
                                    onDragEnd={handleDragEnd}
                                />
                                {vendors.map((vendor) => (
                                    (vendor.latitude && vendor.longitude) || (vendor.lat && vendor.lon) ? (
                                        <Marker
                                            key={vendor.id}
                                            position={[
                                                vendor.latitude || vendor.lat, 
                                                vendor.longitude || vendor.lon
                                            ]}
                                            icon={vendorIcon}
                                            eventHandlers={{
                                                mouseover: (e) => e.target.openPopup(),
                                            }}
                                        >
                                            <Popup className="custom-popup" closeButton={false} minWidth={200}>
                                                <div className="w-52 p-0 -m-1 font-sans">
                                                    <div className="relative h-28 w-full overflow-hidden rounded-t-lg">
                                                        <VendorImage 
                                                            src={vendor.image} 
                                                            alt={vendor.name} 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                        <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded text-[10px] font-bold text-gray-800 shadow-sm border border-orange-100">
                                                            {formatDistance(vendor.distance)}
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-white rounded-b-lg border-t border-orange-50">
                                                        <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{vendor.name}</h3>
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-xs text-gray-500">{vendor.cuisine || 'Local Food'}</span>
                                                            <VendorTimer updatedAt={vendor.updated} />
                                                        </div>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation(); 
                                                                navigate(`/order/${vendor.vendor_id}`, { state: { vendor } });
                                                            }}
                                                            className="w-full block text-center bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded transition-colors shadow-md"
                                                        >
                                                            View Menu
                                                        </button>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ) : null
                                ))}
                            </MapContainer>
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-orange-100 p-3 z-[400]">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full ring-2 ring-blue-100"></div>
                                        <span>You (Drag to move)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full ring-2 ring-orange-100"></div>
                                        <span>Vendors (Within 5km)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-white pt-20 pb-10 border-t border-gray-800 mt-auto relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-600 p-2.5 rounded-xl shadow-lg shadow-orange-900/50">
                                    <BiStore className="text-white text-2xl" />
                                </div>
                                <span className="text-3xl font-bold tracking-tight text-white">
                                    Hyper<span className="text-orange-500">Local</span>
                                </span>
                            </div>
                            <p className="text-gray-400 leading-relaxed max-w-sm">
                                Empowering local businesses by connecting neighborhoods with their favorite flavors. Fast, fresh, and friendly delivery.
                            </p>
                        </div>
                        <div className="md:pl-10">
                            <h3 className="text-lg font-bold text-white mb-6">Quick Navigation</h3>
                            <ul className="space-y-4 text-gray-400">
                                <li>
                                    <button onClick={handleScrollToTop} className="hover:text-orange-500 transition-colors flex items-center gap-2 cursor-pointer text-left group">
                                        <FiArrowRight className="text-sm group-hover:translate-x-1 transition-transform"/> Home
                                    </button>
                                </li>
                                <li>
                                    <button onClick={handleScrollToMap} className="hover:text-orange-500 transition-colors flex items-center gap-2 cursor-pointer text-left group">
                                        <FiArrowRight className="text-sm group-hover:translate-x-1 transition-transform"/> Find on Map
                                    </button>
                                </li>
                                <li><button onClick={() => navigate('/vendor/login')} className="hover:text-orange-500 transition-colors flex items-center gap-2 group"><FiArrowRight className="text-sm group-hover:translate-x-1 transition-transform"/> Vendor Login</button></li>
                            </ul>
                        </div>
                        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-orange-500/20"></div>
                            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Are you a Vendor?</h3>
                            <p className="text-gray-400 text-sm mb-6 relative z-10 leading-relaxed">
                                Join our growing marketplace. Expand your reach and serve more customers in your neighborhood today.
                            </p>
                            <button 
                                onClick={() => navigate('/vendor/register')}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-900/20 flex items-center justify-center gap-2 relative z-10 active:scale-95"
                            >
                                Register Your Business <BiStore className="text-lg" />
                            </button>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                        <p>© 2025 Hyper Local Vendor. Nairobi, Kenya 🇰🇪</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;