import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMapPin, FiShoppingCart, FiStar, FiClock, FiTruck, FiGrid, FiMap, FiArrowRight, FiInstagram, FiTwitter, FiFacebook } from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';

const LandingPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); 

    // --- DATA ---
    const popularCategories = [
        { id: 'all', name: 'All' },
        { id: 'nyama-choma', name: 'Nyama Choma' },
        { id: 'pilau', name: 'Pilau' },
        { id: 'chapati', name: 'Chapati' },
        { id: 'ugali-fish', name: 'Ugali Fish' },
        { id: 'pizza', name: 'Pizza' }
    ];

    const vendors = [
        {
            id: 1,
            name: 'Mama Oliech Restaurant',
            image: 'https://media.istockphoto.com/id/1464175219/photo/tilapia-stew-ugali-and-sukuma-wiki-kenyan-food.jpg?s=170667a&w=0&k=20&c=dAc7aGsqQjQES90FBy7a71QjfNMN6pZJJI7sx8QK5-M=',
            rating: 4.8,
            cuisine: 'Whole Tilapia, Nyama Choma',
            categories: ['ugali-fish', 'nyama-choma'],
            distance: 1.2,
            updated: '5h ago',
            status: 'Open',
            location: 'Nairobi'
        },
        {
            id: 2,
            name: 'Swahili Plate',
            image: 'https://images.unsplash.com/photo-1634324092536-74480096b939?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGlsYXV8ZW58MHx8MHx8fDA%3D',
            rating: 4.5,
            cuisine: 'Biryani, Pilau, Mahamri',
            categories: ['pilau'],
            distance: 2.5,
            updated: '20m ago',
            status: 'Busy',
            location: 'Westlands'
        },
        {
            id: 3,
            name: 'Pizza Inn Westlands',
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
            rating: 4.2,
            cuisine: 'BBQ Meat, Chicken Tikka',
            categories: ['pizza'],
            distance: 2.8,
            updated: '1h ago',
            status: 'Open',
            location: 'Westlands'
        },
        {
            id: 4,
            name: 'Kilele Nyama',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
            rating: 4.7,
            cuisine: 'Mbuzi Choma, Wet Fry',
            categories: ['nyama-choma'],
            distance: 3.1,
            updated: '3h ago',
            status: 'Closed',
            location: 'Kilimani'
        },
        {
            id: 5,
            name: 'Green Bowl',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
            rating: 4.9,
            cuisine: 'Avocado Salad, Smoothies',
            categories: ['smoothies'],
            distance: 1.5,
            updated: '19h ago',
            status: 'Open',
            location: 'Parklands'
        },
        {
            id: 6,
            name: 'Java House',
            image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
            rating: 4.6,
            cuisine: 'Coffee, Burgers, Breakfast',
            categories: ['coffee'],
            distance: 0.9,
            updated: 'Now',
            status: 'Open',
            location: 'CBD'
        }
    ];

    // --- LOGIC ---
    const filteredVendors = useMemo(() => {
        return vendors.filter(vendor => {
            if (activeCategory !== 'all' && !vendor.categories.includes(activeCategory)) return false;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const searchableText = `${vendor.name} ${vendor.cuisine} ${vendor.location}`.toLowerCase();
                return searchableText.includes(query);
            }
            return true;
        });
    }, [searchQuery, activeCategory]);

    const handleCategoryClick = (id) => setActiveCategory(id);
    const handleClearSearch = () => { setSearchQuery(''); setActiveCategory('all'); };

    const handleViewToggle = (mode) => {
        if (mode === viewMode) return;
        setViewMode(mode);
        if (mode === 'map') {
            setTimeout(() => { navigate('/customer/map'); }, 250); 
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 font-sans text-gray-800 flex flex-col">
            
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="bg-orange-600 p-2 rounded-lg">
                                <BiStore className="text-white text-xl" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-gray-900">
                                Hyper<span className="text-orange-600">Local</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/vendor/login')} className="hidden md:flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors">
                                <BiStore /> Vendor Login
                            </button>
                            <button onClick={() => navigate('/admin/login')} className="bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition-transform active:scale-95">
                                Admin
                            </button>
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
                        🚀 Your neighborhood marketplace
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
                                placeholder="Search vendors, food (e.g. Pilau)..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-orange-200 transition-colors text-gray-700 font-medium">
                            <FiMapPin className="text-orange-500" />
                            <span>Within 5km</span>
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
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex-grow">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Nearby Local Vendors</h2>
                        <p className="text-gray-500 mt-2">{filteredVendors.length} spots found near you</p>
                    </div>

                    {/* Custom Slider */}
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

                {filteredVendors.length > 0 ? (
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
                                            <FiClock /> {vendor.updated}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">{vendor.cuisine}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                                        <span className="flex items-center gap-1"><FiMapPin className="text-orange-500" /> {vendor.distance} km</span>
                                        <span className="flex items-center gap-1"><FiTruck className="text-orange-500" /> Delivery</span>
                                    </div>
                                    <button onClick={() => navigate('/order')} className="w-full mt-auto bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg">
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
                )}
            </div>

            {/* --- NEW MEGA FOOTER --- */}
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

                        {/* Vendor Invitation Card (The Footer Feature You Requested) */}
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