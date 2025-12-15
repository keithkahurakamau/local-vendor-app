import React, {useState} from 'react';
import { FiUser} from 'react-icons/fi';
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
        {/* Search Bar */}
        {/* Popular Categories */}
        {/*Nearby Vendors Section */}
        {/*How it works section */}
        {/*Vendor reach section */}
        {/*Footer*/}


        </div>

    );

};

export default LandingPage;
