import React, {useState} from 'react';
import {  FiSearch, FiMapPin} from 'react-icons/fi';
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
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
        rating: 4.5,
        cuisine: 'Whole Tilapia, Ugali, Keshokheri, Omena',
        distance: '1.2 km',
        updated: '5h ago',
        status: 'Open'
    },
    {
        id: 2,
        name: 'Swahili Plate',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
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
        status: 'Hot'
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
        status: 'Healthy'
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
                <p className="text-white text-lg md:text-xl mb-8 max-w-2xl">
                    From sizzling Nyama Choma to spicy Pilau. Order from top-rated local vendors and enjoy a feast in minutes.
                </p>
                {/* Call-to-action buttons */}
                <div className="flex space-x-4">
                    <button className="bg-primary text-white px-8 py-3 rounded-button hover:bg-primary-dark transition font-medium text-lg">
                    Order Now
                    </button>
                    <button className="bg-text text-white px-8 py-3 rounded-button hover:bg-text-light transition font-medium text-lg">
                    View Vendors
                    </button>
                </div>

            </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
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
        {/*How it works section */}
        {/*Vendor reach section */}
        {/*Footer*/}


        </div>

    );

};

export default LandingPage;
