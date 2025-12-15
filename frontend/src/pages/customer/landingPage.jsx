import React, {useState} from 'react';
import {  FiSearch, FiMapPin, FiShoppingCart, FiStar, FiClock, FiTruck} from 'react-icons/fi';
import { BiRestaurant } from 'react-icons/bi';

const LandingPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('popular');

    const popularCategories = [
        'Nyama Choma',
        'Pilau',
        'Chapati',
        'Ugali Fish'
    ];

    //mock data
    const vendors = [
        {
        id: 1,
        name: 'Mama Oliech Restaurant',
        image: 'https://media.istockphoto.com/id/1464175219/photo/tilapia-stew-ugali-and-sukuma-wiki-kenyan-food.jpg?s=170667a&w=0&k=20&c=dAc7aGsqQjQES90FBy7a71QjfNMN6pZJJI7sx8QK5-M=',
        rating: 4.5,
        cuisine: 'Whole Tilapia, Ugali, Keshokheri, Omena',
        distance: '1.2 km',
        updated: '5h ago',
        status: 'Open'
    },
    {
        id: 2,
        name: 'Swahili Plate',
        image: 'https://images.unsplash.com/photo-1634324092536-74480096b939?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGlsYXV8ZW58MHx8MHx8fDA%3D',
        rating: 4.5,
        cuisine: 'Biryani, Pilau, Mahamri, Chai',
        distance: '2.5 km',
        updated: '20m ago',
        status: null
    },
    {
        id: 3,
        name: 'Pizza Inn Westlands',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
        rating: 4.7,
        cuisine: 'BBQ Meat, Chicken Tikka, Terrific Tuesday',
        distance: '2.8 km',
        updated: '1h ago',
        status: null
    },
    {
        id: 4,
        name: 'Kilele Nyama',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
        rating: 4.7,
        cuisine: 'Mbui Choma, Wet Fry, Mukimo',
        distance: '3.1 km',
        updated: '3h ago',
        status: null
    },
    {
        id: 5,
        name: 'Green Bowl',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
        rating: 4.9,
        cuisine: 'Avocado Salad, Smoothies, Wraps',
        distance: '1.5 km',
        updated: '19h ago',
        status: null
    },
    {
        id: 6,
        name: 'Java House',
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
        rating: 4.6,
        cuisine: 'Coffee, Burgers, Breakfast, Cakes',
        distance: '0.9 km',
        updated: 'just now',
        status: null
    }
    ];

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
                        <button className="flex items-center bg-primary space-x-2 text-white hover:text-text transition">
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
                            key={category}
                            className={`px-4 py-2 rounded-full border transition ${
                            activeTab === category.toLowerCase()
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-text border-neutral hover:border-primary'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
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
                </div>

                {/*location update and view toggle */}
                <div className="flex items-center space-x-4">
                    {/*update user location button */}
                    <button className="flex items-center space-x-2 border-accent bg-background text-accent hover:text-accent-dark transition">
                    <FiMapPin />
                    <span>Update Location</span>
                    </button>

                    {/* toggle between list and map*/}
                    <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-primary text-white rounded-button">List</button>
                    <button className="px-4 py-2 border border-primary-light bg-background text-primary rounded-button hover:text-accent bg-background-gray">Map</button>
                    </div>
                </div>
            </div>
            {/*vendor cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/*loop through vendors */}
                {vendors.map((vendor) => (
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
                                    <span>{vendor.distance}</span>
                                </div>
                                {/*Last updated time */}
                                <div className="flex items-center space-x-1">
                                    <FiClock />
                                    <span>Updated {vendor.updated}</span>
                                </div>
                            </div>
                            {/*order button */}
                            <button className="w-full bg-primary text-white py-3 rounded-button hover:bg-primary-dark transition font-medium flex items-center justify-center space-x-2">
                                <FiShoppingCart />
                                <span>Order Now</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
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
                <button className="bg-white text-primary px-8 py-4 rounded-button hover:bg-background-gray transition font-bold text-lg flex items-center justify-center mx-auto space-x-2">
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
