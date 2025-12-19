import React, {useState, useMemo, useEffect, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import {  FiSearch, FiMapPin, FiShoppingCart, FiStar, FiClock, FiTruck, FiGrid, FiMap} from 'react-icons/fi';
import {  Store } from 'lucide-react';
import { BiRestaurant } from 'react-icons/bi';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useLocation } from '../../context/LocationContext';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import mapService from '../../services/mapService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../App.css';

//delete default marker icon issue and specify where to find marker images
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

//map marker icons for user location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
//map marker icon for vendors
const vendorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

//update map center when user location changes
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

const LandingPage = () => {

    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    //currently selected food category
    const [activeCategory, setActiveCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'

    const [selectedVendor, setSelectedVendor] = useState(null);


    //location and vendor states
    const { userLocation: contextLocation, updateLocation } = useLocation();
    const { location: geoLocation, error: geoError, loading: geoLoading } = useGeoLocation();

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [radius] = useState(5000);


    //list of categories displayed as filter buttons
    const popularCategories = [
    { id: 'all', name: 'All' },
    { id: 'nyama-choma', name: 'Nyama Choma' },
    { id: 'pilau', name: 'Pilau' },
    { id: 'chapati', name: 'Chapati' },
    { id: 'ugali-fish', name: 'Ugali Fish' }
    ];


    //handle location updates from geolocation hook
    const handleUpdateLocation = async () => {
        setError(null);
        
        if (geoError) {
        setError(geoError);
        return;
        }

        if (geoLoading) {
        setError('Getting your location...This may take a few seconds.');
        return;
        }

        if (geoLocation) {
        updateLocation(geoLocation.lat, geoLocation.lon);
        setLocationEnabled(true);
        setError(null);
        } else {
        setError('Unable to get your location. Please enable location services.');
        }
    };

    //fetch nearby vendors from map service
    const loadNearbyVendors = useCallback(async () => {
    if (!contextLocation) return;

    setLoading(true);
    setError(null);

    //call
    try {
        const response = await mapService.getNearbyVendors(
            contextLocation.lat,
            contextLocation.lon,
            radius
        );
        
        if (response.success) {
        // Transform API response to match component structure
        const transformedVendors = response.vendors.map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600', // Default image
            rating: 4.5, // Default rating
            cuisine: vendor.menu?.items?.join(', ') || 'Various dishes',
            categories: vendor.menu?.items || [],
            updated: formatTimeAgo(vendor.last_updated),
            status: 'Open',
            location: 'Nairobi',
            coordinates: { 
                lat: vendor.location.latitude, 
                lng: vendor.location.longitude 
            },
            distance: vendor.distance_km,
            phone: vendor.phone,
            menu: vendor.menu
            }));

            setVendors(transformedVendors);
            
            if (transformedVendors.length === 0) {
            setError(`No vendors found within ${radius / 1000}km of your location`);
            }
        }
        } catch (err) {
        setError(err.response?.data?.error || 'Failed to load nearby vendors. Please try again.');
        console.error('Error loading vendors:', err);
        } finally {
        setLoading(false);
        }
    }, [contextLocation, radius]);

    // fetch nearby vendors when location is available
    useEffect(() => {
        if (contextLocation && locationEnabled) {
            loadNearbyVendors();
        }
    }, [contextLocation, locationEnabled, loadNearbyVendors]);

    //search vendors with specific food item
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
        loadNearbyVendors();
        return;
        }

        if (!contextLocation) {
        setError('Please enable location first by clicking "Update Location"');
        return;
        }

        setLoading(true);
        setError(null);

        try {
        const response = await mapService.searchVendors(
            searchQuery,
            contextLocation.lat,
            contextLocation.lon,
            radius
        );

        if (response.success) {
            const transformedVendors = response.vendors.map(vendor => ({
            id: vendor.id,
            name: vendor.name,
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
            rating: 4.5,
            cuisine: vendor.menu?.items?.join(', ') || 'Various dishes',
            categories: vendor.menu?.items || [],
            updated: formatTimeAgo(vendor.last_updated),
            status: 'Open',
            location: 'Nairobi',
            coordinates: { 
                lat: vendor.location.latitude, 
                lng: vendor.location.longitude 
            },
            distance: vendor.distance_km,
            phone: vendor.phone,
            menu: vendor.menu
            }));

            setVendors(transformedVendors);
            
            if (transformedVendors.length === 0) {
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

    //format time ago from timestamp
    const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
    };

    //filter vendors based on category
    const filteredVendors = useMemo(() => {
        if (activeCategory === 'all') return vendors;
        
        return vendors.filter(vendor => 
            vendor.categories.some(cat => 
                cat.toLowerCase().includes(activeCategory.toLowerCase())
            )
            );
        }, [vendors, activeCategory]);


    //clears all filters and resets page to default state
    const handleClearSearch = () => {
        setSearchQuery('');
        setActiveCategory('all');
        if (contextLocation) {
            loadNearbyVendors();
        }
    };

    //update active category when a category button is clicked
    const handleCategoryClick = (categoryId) => {
        setActiveCategory(categoryId);
    };

    return(
        <div className="min-h-screen bg-background w-full">
        {/*Navbar*/}
        <nav className="bg-white shadow-navbar sticky top-0 z-50 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and name */}
                    <div className="flex items-center space-x-2">
                        <BiRestaurant className="text-primary text-3xl" />
                        <span className="text-2xl font-bold text-text font-display">
                            Chakula<span className="text-primary">Express</span>
                        </span>
                    </div>
                    {/* Navigation buttons */}
                    <div className="flex items-center space-x-4">


                        {/* Vendor login button */}
                        <button 
                            onClick={() => navigate('/vendor/login')}
                            className="flex items-center bg-primary space-x-2 text-white hover:bg-primary-dark transition px-4 py-2 rounded-button">
                            <Store className="text-xl" />
                            <span className="hidden sm:inline">Vendor Login</span>
                        </button>
                        {/* Admin login button */}
                        <button 
                            onClick={() => navigate('/admin/login')}
                            className="bg-text text-white px-4 py-2 rounded-button hover:bg-primary-dark transition font-medium">
                            Admin Login
                        </button>

                    </div>
                </div>
            </div>
        </nav>

        {/* Hero Section */}
        <div 
            className="relative h-[500px] bg-cover bg-center bg-fixed"
            //apply dark overlay to background image for better text visibility
            style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), 
            url('/images/hero2.jpg')`
            }}
        >
            {/* Overlay content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                {/*credibility badge */}
                <div className="bg-secondary text-text px-4 py-2 rounded-full mb-6 font-medium animate-fade-in">
                    ⭐ #1 Food Delivery in Nairobi
                </div>
                {/*main headline */}
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 font-display animate-slide-up">
                    Authentic Kenyan Flavors,
                </h1>
                {/*continuation of headline but highlighted */}
                <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 font-display animate-slide-up delay">
                    Delivered Fast.
                </h1>
                {/*subheading */}
                <p className="text-white text-lg md:text-xl mb-7 max-w-2xl animate-fade-in-delay">
                    From sizzling Nyama Choma to spicy Pilau. Order from top-rated local vendors and enjoy a feast in minutes.
                </p>

            </div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none"></div>

        </div>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
            {/*search card container*/}
            <div className="bg-white rounded-card shadow-card-hover p-6 animate-slide-up-search">
                {/*search input wrapper */}
                <div className="flex flex-col md:flex-row gap-4">

                    <div className="flex-1 relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-lighter text-xl" />
                    {/*search input field */}
                    <input
                        type="text"
                        placeholder="Search for food (e.g. Pilau), location, or vendor..."
                        className="w-full pl-12 pr-4 py-3 bg-neutral-200 border border-neutral rounded-button focus:outline-none focus:ring-2 focus:ring-primary text-text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    </div>
                    {/*button cannot be clicked if location is disabled/data is loading*/}
                    <button 
                        onClick={handleSearch}
                        disabled={!locationEnabled || loading}
                        className="flex items-center justify-center space-x-2 px-6 py-3 bg-neutral-100 border border-neutral rounded-button hover:bg-background-gray transition text-text">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {/* Popular Categories */}
                <div className="flex items-center flex-wrap gap-3 mt-4">
                    {/*loop through popular foods */}
                    {popularCategories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.id)}
                            className={`px-4 py-2 rounded-full border transition ${
                            activeCategory === category.id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-text border-neutral hover:border-primary'
                            }`}>
                            {category.name}
                        </button>
                    ))}
                </div>

                {/*display active filters */}
                {(searchQuery || activeCategory !== 'all') && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-text-light">
                        <span className="font-medium">Active filters:</span>
                        {searchQuery && (
                            <span className="bg-background-gray px-3 py-1 rounded-full">
                            Search: "{searchQuery}"
                            </span>
                        )}
                        {activeCategory !== 'all' && (
                            <span className="bg-background-gray px-3 py-1 rounded-full">
                            Category: {popularCategories.find(c => c.id === activeCategory)?.name}
                            </span>
                        )}
                    
                        <button
                            onClick={handleClearSearch}
                            className="text-primary hover:text-primary-dark font-medium ml-2"
                        >
                            Clear all
                        </button>
                    </div>
                )}

                {/* Error Messages */}
                {error && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-button">
                    {error}
                    </div>
                )}

            </div>
        </div>
        
        {/*Nearby Vendors Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/*section header and view controls */}
            <div className="section-header flex justify-between items-center mb-8">
                {/*title and description*/}
                <div>
                    <h2 className="text-3xl font-bold text-text font-display">Nearby Vendors</h2>
                    <p className="text-text-light mt-1">
                        {!locationEnabled 
                            ? 'Click "Update Location" to see vendors near you'
                            : loading 
                            ? 'Loading vendors...'
                            : filteredVendors.length === 0 
                            ? 'No vendors found matching your criteria' 
                            : `Showing ${filteredVendors.length} vendor${filteredVendors.length !== 1 ? 's' : ''} within ${radius / 1000}km`
                        }
                    </p>
                </div>

                {/*location update and view toggle */}
                <div className="flex items-center space-x-4">

                    {/*update user location button */}
                    <button
                        onClick={handleUpdateLocation}
                        disabled={geoLoading}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-button transition ${
                            locationEnabled 
                            ? 'bg-success text-white' 
                            : 'border border-accent bg-background text-accent hover:bg-accent hover:text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <FiMapPin />
                        <span>{locationEnabled ? 'Location Enabled' : geoLoading ? 'Getting Location...' : 'Update Location'}</span>
                    </button>


                    {/* toggle between list and map*/}
                    <div className="relative flex bg-background-gray rounded-button p-1">
                        {/*grid view button */}
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-button transition-all duration-300 ${
                            viewMode === 'grid' 
                                ? 'bg-neutral border-neutral text-text shadow-md' 
                                : 'hover:border-neutral-light text-primary'
                            }`}>
                            <FiGrid />
                            <span>Grid</span>
                        </button>
                        {/*map view button */}
                        <button 
                            onClick={() => setViewMode('map')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-button transition-all duration-300 ${
                            viewMode === 'map' 
                                ? 'bg-neutral text-text shadow-md' 
                                : 'bg-neutral-light text-text hover:border-neutral text-accent'
                            }`}>
                            <FiMap />
                            <span>Map</span>
                        </button>

                    </div>
                </div>
            </div>

            {/*vendor cards grid */}
            {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-card shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300 group">
                    <div className="relative h-48 overflow-hidden">
                    <img
                        src={vendor.image}
                        alt={vendor.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                    {vendor.status && (
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium bg-success text-white">
                        {vendor.status}
                        </div>
                    )}
                    </div>

                    <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-text">{vendor.name}</h3>
                        <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-button">
                        <FiStar className="text-primary" />
                        <span className="font-semibold text-text">{vendor.rating}</span>
                        </div>
                    </div>
                    <p className="text-text-light text-sm mb-3">{vendor.cuisine}</p>
                    <div className="flex items-center justify-between text-sm text-text-lighter mb-4">
                        <div className="flex items-center space-x-1">
                        <FiMapPin className="text-accent" />
                        <span>{vendor.distance ? `${vendor.distance}km` : 'Nearby'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                        <FiClock />
                        <span>Updated {vendor.updated}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/customer/order', { 
                        state: { vendor, userLocation: contextLocation } 
                        })}
                        className="w-full bg-primary text-white py-3 rounded-button hover:bg-primary-dark transition font-medium flex items-center justify-center space-x-2">
                        <FiShoppingCart />
                        <span>Order Now</span>
                    </button>
                    </div>
                </div>
                ))}
            </div>
            )}

            {/* Map View */}
            {viewMode === 'map' && locationEnabled && contextLocation && (
            <div className="relative">
                <div className="h-[600px] rounded-card overflow-hidden shadow-card">
                <MapContainer
                    center={[contextLocation.lat, contextLocation.lon]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}>
                    <ChangeMapView center={[contextLocation.lat, contextLocation.lon]} />
                    
                    <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* User location marker */}
                    <Marker 
                    position={[contextLocation.lat, contextLocation.lon]}
                    icon={userIcon}>
                    <Popup>
                        <div className="text-center">
                        <strong>Your Location</strong>
                        </div>
                    </Popup>
                    </Marker>
                    
                    {/* Radius circle */}
                    <Circle
                    center={[contextLocation.lat, contextLocation.lon]}
                    radius={radius}
                    pathOptions={{
                        color: 'blue',
                        fillColor: 'blue',
                        fillOpacity: 0.1
                    }}
                    />

                    {/* Vendor markers */}
                    {filteredVendors.map((vendor) => (
                    <Marker
                        key={vendor.id}
                        position={[vendor.coordinates.lat, vendor.coordinates.lng]}
                        icon={vendorIcon}
                        eventHandlers={{
                        click: () => setSelectedVendor(vendor)
                        }}>
                        <Popup>
                        <div className="min-w-[200px]">
                            <h3 className="font-bold text-lg mb-1">{vendor.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                            {vendor.distance ? `${vendor.distance}km away` : 'Nearby'}
                            </p>
                            <p className="text-xs text-gray-500 mb-2">
                            Updated: {vendor.updated}
                            </p>
                            <button
                            onClick={() => navigate('/customer/order', { 
                                state: { vendor, userLocation: contextLocation } 
                            })}
                            className="w-full mt-2 py-2 bg-primary text-white rounded-button hover:bg-primary-dark transition">
                            Order Now
                            </button>
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
                </div>
                )}
            </div>
            )}

            {/* Empty State */}
            {!locationEnabled && (
            <div className="text-center py-16">
                <FiMapPin className="mx-auto text-6xl text-text-lighter mb-4" />
                <h3 className="text-2xl font-bold text-text mb-2">Enable Location to See Vendors</h3>
                <p className="text-text-light mb-6">
                Click "Update Location" above to find vendors near you
                </p>
            </div>
            )}
        </div>

        {/*How it works section */}
        <div className="bg-white mt-1 mb-4 py-6">
            <div className="how-section max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center text-text mt-12 mb-12 font-display">How it Works</h2>
                <div className="grid grid-cols-1 mb-12 md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiSearch className="text-4xl text-text" />
                        </div>
                        <h3 className="text-2xl font-bold text-text mb-2 font-display">1. Find Food</h3>
                        <p className="text-text-light">Browse menus from vendors near you. Filter by location and popularity.</p>
                    </div>
                    <div className="text-center">
                        <div className="bg-accent w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiShoppingCart className="text-4xl text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-text mb-2 font-display">2. Order</h3>
                        <p className="text-text-light">Place your order easily. Customize your meal and pay online.</p>
                    </div>
                    <div className="text-center">
                        <div className="bg-success w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiTruck className="text-4xl text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-text mb-2 font-display">3. Enjoy</h3>
                        <p className="text-text-light">Pick up your food or have it delivered to your doorstep while hot.</p>
                    </div>
                </div>
            </div>
        </div>    

        {/*Vendor reach section */}
        <div className="vendor-cta bg-neutral-light">
            <div className="max-w-4xl mx-auto  mt-10 mb-10 px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold text-text mb-4 font-display">Are you a food vendor?</h2>

                <p className="text-text text-lg mb-8">
                    Expand your reach and serve more customers by listing your restaurant on ChakulaExpress.
                </p>

                {/*should navigate to vendor login/registration */}
                <button 
                        onClick={() => navigate('/vendor/register')}
                        className="bg-primary text-white px-8 py-4 rounded-button hover:bg-primary-dark transition font-bold text-lg flex items-center justify-center mx-auto space-x-2">
                    <Store className="text-2xl" />
                    <span>Start Selling Today</span>
                </button>

            </div>
        </div>

        {/*Footer*/}    
        <footer className="footer bg-background text-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-text">© 2025 ChakulaExpress. Made with love in Kenya. 🇰🇪</p>
            </div>
        </footer>
        </div>     

    );

};

export default LandingPage;
