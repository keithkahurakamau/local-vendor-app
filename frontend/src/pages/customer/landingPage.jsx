





import React, {useState, useMemo, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import {  FiSearch, FiMapPin, FiShoppingCart, FiStar, FiClock, FiTruck} from 'react-icons/fi';
import { BiRestaurant } from 'react-icons/bi';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { useLocation } from '../../context/LocationContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;




const LandingPage = () => {
    const navigate = useNavigate();

    const { location: userLocation, error: locationError, loading: locationLoading, getCurrentLocation } = useGeoLocation();
    const { updateLocation } = useLocation();
    
    const [searchQuery, setSearchQuery] = useState('');
    //currently selected food category
    const [activeCategory, setActiveCategory] = useState('all');
    //currently selected view (list or map)
    const [viewMode, setViewMode] = useState('list');

    //location-based filtering
    const [locationFilter, setLocationFilter] = useState(false);
    const [searchRadius, setSearchRadius] = useState(5000); // 5km in meters

    // State for location loading and error
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const [localLocationError, setLocalLocationError] = useState(null);

    //list of categories displayed as filter buttons
    const popularCategories = [
    { id: 'all', name: 'All' },
    { id: 'nyama-choma', name: 'Nyama Choma' },
    { id: 'pilau', name: 'Pilau' },
    { id: 'chapati', name: 'Chapati' },
    { id: 'ugali-fish', name: 'Ugali Fish' }
    ];

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    };


    // Format distance for display
    const formatDistance = (meters) => {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    };


    //mock data with coordinates for map - moved before useMemo to avoid temporal dead zone
    const vendors = [
        {
        id: 1,
        name: 'Mama Oliech Restaurant',
        image: 'https://media.istockphoto.com/id/1464175219/photo/tilapia-stew-ugali-and-sukuma-wiki-kenyan-food.jpg?s=170667a&w=0&k=20&c=dAc7aGsqQjQES90FBy7a71QjfNMN6pZJJI7sx8QK5-M=',
        rating: 4.5,
        cuisine: 'Whole Tilapia, Nyama Choma, Omena',
        categories: ['ugali-fish','nyama-choma', 'chapati'],
        distance: 1.2,
        updated: '5h ago',
        status: 'Open',
        location: 'Nairobi',
        coordinates: [-1.2921, 36.8219]
    },
    {
        id: 2,
        name: 'Swahili Plate',
        image: 'https://images.unsplash.com/photo-1634324092536-74480096b939?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGlsYXV8ZW58MHx8MHx8fDA%3D',
        rating: 4.5,
        cuisine: 'Biryani, Pilau, Mahamri, Chai',
        categories: ['pilau'],
        distance: 2.5,
        updated: '20m ago',
        status: null,
        location: 'Westlands',
        coordinates: [-1.2634, 36.8103]
    },
    {
        id: 3,
        name: 'Pizza Inn Westlands',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
        rating: 4.7,
        cuisine: 'BBQ Meat, Chicken Tikka, Terrific Tuesday',
        categories: ['pizza'],
        distance: 2.8,
        updated: '1h ago',
        status: 'Open',
        location: 'Westlands',
        coordinates: [-1.2642, 36.8086]
    },
    {
        id: 4,
        name: 'Kilele Nyama',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
        rating: 4.7,
        cuisine: 'Mbuzi Choma, Nyama Choma, Wet Fry, Mukimo',
        categories: ['nyama-choma', 'Mukimo'],
        distance: 3.1,
        updated: '3h ago',
        status: null,
        location: 'Kilimani',
        coordinates: [-1.2986, 36.8412]
    },
    {
        id: 5,
        name: 'Green Bowl',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
        rating: 4.9,
        cuisine: 'Avocado Salad, Smoothies, Wraps',
        categories: ['smoothies'],
        distance: 1.5,
        updated: '19h ago',
        status: 'Healthy',
        location: 'Parklands',
        coordinates: [-1.2418, 36.8645]
    },
    {
        id: 6,
        name: 'Java House',
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
        rating: 4.6,
        cuisine: 'Coffee, Burgers, Breakfast, Cakes',
        categories: ['coffee'],
        distance: 0.9,
        updated: 'just now',
        status: null,
        location: 'CBD',
        coordinates: [-1.2921, 36.8219]
    }
    ];

    // Update location context when user location changes
    useEffect(() => {
        if (userLocation) {
            updateLocation(userLocation.lat, userLocation.lon);
        }
    }, [userLocation, updateLocation]);

    // Calculate real distances and filter vendors based on location
    const vendorsWithRealDistance = useMemo(() => {
        if (!userLocation) return vendors;

        return vendors.map(vendor => {
            const distance = calculateDistance(
                userLocation.lat, 
                userLocation.lon, 
                vendor.coordinates[0], 
                vendor.coordinates[1]
            );
            return {
                ...vendor,
                calculatedDistance: distance,
                calculatedDistanceDisplay: formatDistance(distance)
            };
        });
    }, [userLocation]);

    // Filter vendors including location-based filtering
    const filteredVendors = useMemo(() => {
        let filtered = vendorsWithRealDistance.filter(vendor => {
            // Filter by category
            if (activeCategory !== 'all' && !vendor.categories.includes(activeCategory)) return false;

            // Filter by search query, search across name, cuisine, location
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const searchableText = `${vendor.name} ${vendor.cuisine} ${vendor.location}`.toLowerCase();
                if (!searchableText.includes(query)) return false;
            }

            // Filter by location if location filter is enabled
            if (locationFilter && vendor.calculatedDistance && vendor.calculatedDistance > searchRadius) {
                return false;
            }

            return true;
        });

        // Sort by distance if user location is available
        if (userLocation) {
            filtered.sort((a, b) => {
                const distanceA = a.calculatedDistance || Infinity;
                const distanceB = b.calculatedDistance || Infinity;
                return distanceA - distanceB;
            });
        }

        return filtered;
    }, [searchQuery, activeCategory, locationFilter, searchRadius, userLocation, vendorsWithRealDistance]);




    //clears all filters and resets page to default state
    const handleClearSearch = () => {
        setSearchQuery('');
        setActiveCategory('all');
    };

    //update active category when a category button is clicked
    const handleCategoryClick = (categoryId) => {
        setActiveCategory(categoryId);
    };

    // Handle update location button click
    const handleUpdateLocation = async () => {
        setIsLocationLoading(true);
        setLocalLocationError(null);
        
        try {
            await getCurrentLocation();
        } catch (error) {
            console.error('Failed to get location:', error);
            setLocalLocationError('Failed to get your location. Please try again.');
        } finally {
            setIsLocationLoading(false);
        }
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
                            className="flex items-center bg-orange-500 hover:bg-orange-600 space-x-2 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                        >
                            <BiRestaurant className="text-xl" />
                            <span className="hidden sm:inline">Vendor Login</span>
                        </button>
                        {/* Admin login button */}
                        <button className="bg-text text-white px-4 py-2 rounded-button hover:bg-primary-dark transition font-medium">
                            Admin Login
                        </button>

                    </div>
                </div>
            </div>
        </nav>

        {/* Hero Section */}
        <div 
            className="relative h-[500px] bg-cover bg-center"
            //apply dark overlay to background image for better text visibility
            style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), 
            url('/images/hero2.jpg')`
            }}
        >
            {/* Overlay content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                {/*credibility badge */}
                <div className="bg-secondary text-text px-4 py-2 rounded-full mb-6 font-medium">
                    ⭐ #1 Food Delivery in Nairobi
                </div>
                {/*main headline */}
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 font-display">
                    Authentic Kenyan Flavors,
                </h1>
                {/*continuation of headline but highlighted */}
                <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 font-display">
                    Delivered Fast.
                </h1>
                {/*subheading */}
                <p className="text-white text-lg md:text-xl mb-7 max-w-2xl">
                    From sizzling Nyama Choma to spicy Pilau. Order from top-rated local vendors and enjoy a feast in minutes.
                </p>
                

            </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
            {/*search card container*/}
            <div className="bg-white rounded-card shadow-card-hover p-6">
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
                    {/*location/distance filter button */}
                    <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-neutral-100 border border-neutral rounded-button hover:bg-background-gray transition text-text">
                    <FiMapPin className="text-accent" />
                    <span>Find within 5km radius</span>
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
                            }`}
                        >
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

            </div>
        </div>
        
        {/*Nearby Vendors Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/*section header and view controls */}
            <div className="flex justify-between items-center mb-8">
                {/*title and description*/}
                <div>
                    <h2 className="text-3xl font-bold text-text font-display">Nearby Vendors</h2>
                    <p className="text-text-light mt-1">Discover local favorites around Nairobi</p>
                    <p className="text-text-light mt-1">
                    {filteredVendors.length === 0 ? 'No vendors found matching your criteria' : `Showing ${filteredVendors.length} vendor${filteredVendors.length !== 1 ? 's' : ''}`}
            </p>
                </div>

                {/*location update and view toggle */}
                <div className="flex items-center space-x-4">

                    {/*update user location button */}
                    <button 
                        onClick={handleUpdateLocation}
                        disabled={isLocationLoading}
                        className="flex items-center space-x-2 border-accent bg-background text-accent hover:text-accent-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiMapPin className={isLocationLoading ? 'animate-pulse' : ''} />
                        <span>{isLocationLoading ? 'Updating...' : 'Update Location'}</span>
                    </button>


                    {/* toggle between list and map*/}
                    <div className="flex space-x-2">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-button transition ${viewMode === 'list' ? 'bg-primary text-white' : 'border border-primary-light bg-background text-primary hover:text-accent bg-background-gray'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-2 rounded-button transition ${viewMode === 'map' ? 'bg-primary text-white' : 'border border-primary-light bg-background text-primary hover:text-accent bg-background-gray'}`}
                    >
                        Map
                    </button>
                    </div>
                </div>
            </div>


            {/* Conditional rendering based on view mode */}
            {viewMode === 'list' ? (
                /* List View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/*loop through vendors */}
                    {filteredVendors.map((vendor) => (
                        <div key={vendor.id} className="bg-white rounded-card shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300 group">
                            {/*vendor image */}
                            <div className="relative h-48 overflow-hidden">
                                <img
                                src={vendor.image}
                                alt={vendor.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                />
                                {/*vendor status badge */}
                                {vendor.status && (
                                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
                                vendor.status === 'Open' ? 'bg-success text-white' :
                                vendor.status === 'Closed' ? 'bg-warning text-white' :
                                'bg-accent text-white'
                                }`}>
                                {vendor.status}
                                </div>
                                )}
                            </div>

                            {/*vendor details */}
                            <div className="p-5">
                                {/*vendor name and rating */}
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-text">{vendor.name}</h3>

                                    <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-button">
                                        <FiStar className="text-primary" />
                                        <span className="font-semibold text-text">{vendor.rating}</span>
                                    </div>
                                </div>
                                {/*vendor cuisine */}
                                <p className="text-text-light text-sm mb-3">{vendor.cuisine}</p>

                                {/*vendor distance and last updated */}
                                <div className="flex items-center justify-between text-sm text-text-lighter mb-4">
                                    <div className="flex items-center space-x-1">
                                        <FiMapPin className="text-accent" />
                                        <span>{userLocation && vendor.calculatedDistanceDisplay ? vendor.calculatedDistanceDisplay : vendor.distance}</span>
                                    </div>
                                    {/*Last updated time */}
                                    <div className="flex items-center space-x-1">
                                        <FiClock />
                                        <span>Updated {vendor.updated}</span>
                                    </div>
                                </div>

                                {/*order button */}
                                <button 
                                    onClick={() => navigate(`/order?vendor=${vendor.id}`)}
                                    className="w-full bg-primary text-white py-3 rounded-button hover:bg-primary-dark transition font-medium flex items-center justify-center space-x-2"
                                >
                                    <FiShoppingCart />
                                    <span>Order Now</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Map View */
                <div className="bg-white rounded-card shadow-card overflow-hidden">
                    <div className="h-96 w-full">
                        <MapContainer 
                            center={[-1.2921, 36.8219]} 
                            zoom={12} 
                            style={{ height: '100%', width: '100%' }}
                            className="rounded-card"
                        >
                            <TileLayer 
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {/* Render markers for filtered vendors */}
                            {filteredVendors.map((vendor) => (
                                <Marker 
                                    key={vendor.id} 
                                    position={vendor.coordinates}
                                >
                                    <Popup className="custom-popup">
                                        <div className="p-2 min-w-[200px]">
                                            {/* Vendor image and basic info */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <img 
                                                    src={vendor.image} 
                                                    alt={vendor.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                <div>
                                                    <h4 className="font-bold text-text">{vendor.name}</h4>
                                                    <div className="flex items-center gap-1">
                                                        <FiStar className="text-primary h-3 w-3" />
                                                        <span className="text-sm text-text-light">{vendor.rating}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Vendor cuisine */}
                                            <p className="text-sm text-text-light mb-2">{vendor.cuisine}</p>
                                            
                                            {/* Vendor status and distance */}
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    vendor.status === 'Open' ? 'bg-success text-white' :
                                                    vendor.status === 'Closed' ? 'bg-warning text-white' :
                                                    'bg-accent text-white'
                                                }`}>
                                                    {vendor.status || 'Status Unknown'}
                                                </span>

                                                <span className="text-xs text-text-light flex items-center gap-1">
                                                    <FiMapPin className="h-3 w-3" />
                                                    {userLocation && vendor.calculatedDistanceDisplay ? vendor.calculatedDistanceDisplay : vendor.distance}
                                                </span>
                                            </div>
                                            
                                            {/* Order button */}
                                            <button 
                                                onClick={() => navigate(`/order?vendor=${vendor.id}`)}
                                                className="w-full bg-primary text-white py-2 rounded-button hover:bg-primary-dark transition font-medium flex items-center justify-center space-x-2 text-sm"
                                            >
                                                <FiShoppingCart className="h-3 w-3" />
                                                <span>Order Now</span>
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            )}
        </div>

        {/*How it works section */}
        <div className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <h2 className="text-4xl font-bold text-center text-text mb-12 font-display">How it Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
        <div className="bg-gradient-to-r from-primary to-warning py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold text-white mb-4 font-display">Are you a food vendor?</h2>

                <p className="text-white text-lg mb-8">
                    Expand your reach and serve more customers by listing your restaurant on ChakulaExpress.
                </p>

                {/*should navigate to vendor login/registration */}
                <button 
                    onClick={() => navigate('/vendor/register')}
                    className="bg-white text-primary px-8 py-4 rounded-button hover:bg-background-gray transition font-bold text-lg flex items-center justify-center mx-auto space-x-2"
                >
                    <BiRestaurant className="text-2xl" />
                    <span>Start Selling Today</span>
                </button>

            </div>
        </div>

        {/*Footer*/}
        
        <footer className="bg-background text-white py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-text-lighter">© 2025 ChakulaExpress. Made with love in Kenya. 🇰🇪</p>
            </div>
        </footer>
        </div>     

    );

};

export default LandingPage;
