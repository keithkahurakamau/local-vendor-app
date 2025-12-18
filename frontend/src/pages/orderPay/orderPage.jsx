
import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Clock, Plus, Minus, ShoppingBag, Trash2, Star, Flame, ChefHat, ArrowRight } from 'lucide-react';


const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const vendorIdFromUrl = searchParams.get('vendor');
  

  // --- VENDOR DATA (matching landing page) ---
  const allVendors = [
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

  // Get vendor from URL parameter or use default
  const vendor = useMemo(() => {
    if (vendorIdFromUrl) {
      const foundVendor = allVendors.find(v => v.id === parseInt(vendorIdFromUrl));
      if (foundVendor) {
        return {
          ...foundVendor,

          distance: `${foundVendor.distance} km away`,
          lastSeen: foundVendor.updated,
          reviews: 150 // Fixed reviews count for demo
        };
      }
    }
    // Default fallback
    return {
      id: 1,
      name: "Mama Otis Smokies & Chapo",
      image: "https://images.unsplash.com/photo-1567129937968-cdad8f07e2f8?q=80&w=300&h=200&fit=crop",
      distance: "0.5 km away",
      lastSeen: "10 mins ago",
      rating: 4.8,
      reviews: 156
    };
  }, [vendorIdFromUrl]);

  const menuItems = [
    { 
      id: 1, 
      name: "Smokie Pasua", 
      description: "Fresh smokie with kachumbari", 
      price: 30, 
      image: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?q=80&w=150&h=150&fit=crop",
      popular: true
    },
    { 
      id: 2, 
      name: "Chapati Soft", 
      description: "Hot soft layered chapati", 
      price: 20, 
      image: "https://images.unsplash.com/photo-1626508035297-003243277026?q=80&w=150&h=150&fit=crop",
      popular: false
    },
    { 
      id: 3, 
      name: "Samosa Beef", 
      description: "Spicy beef filled triangle", 
      price: 50, 
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=150&h=150&fit=crop",
      popular: true
    },
  ];

  // --- STATE ---
  const [cart, setCart] = useState([]);
  const [landmark, setLandmark] = useState("");
  const navigate = useNavigate();

  // --- FUNCTIONS ---
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === itemId ? { ...i, qty: i.qty - 1 } : i)
        .filter((i) => i.qty > 0)
    );
  };

  const deleteFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 pb-20">
      
      {/* --- VENDOR HEADER --- */}
      <div className="relative bg-white shadow-xl overflow-hidden">
        {/* Decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
        
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.05) 35px, rgba(0,0,0,.05) 70px)`
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Vendor Image */}
            <div className="w-full md:w-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-2xl"></div>
              <img 
                src={vendor.image} 
                alt={vendor.name} 
                className="w-full md:w-72 h-48 object-cover rounded-2xl shadow-2xl ring-4 ring-white group-hover:scale-[1.02] transition-transform duration-300"
              />
              {/* Featured Badge */}
              <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5" />
                Featured Vendor
              </div>
            </div>

            {/* Vendor Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 leading-tight">
                  {vendor.name}
                </h1>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="font-bold text-amber-900">{vendor.rating}</span>
                    <span className="text-amber-700 text-sm">({vendor.reviews})</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Distance */}
                <span className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-shadow">
                  <MapPin size={16} /> {vendor.distance}
                </span>
                
                {/* Last seen - CHANGED TO ORANGE */}
                <span className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-shadow">
                  <Clock size={16} /> Check-in: {vendor.lastSeen}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* --- MENU DISPLAY --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></span>
              Menu Items
            </h2>
            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
              {menuItems.length} items
            </span>
          </div>

          {menuItems.map((item, idx) => (
            <div 
              key={item.id} 
              className="bg-white p-5 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 hover:border-orange-200 transition-all duration-300 group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex gap-5">
                {/* Food Image */}
                <div className="relative flex-shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-28 h-28 object-cover rounded-xl shadow-md ring-2 ring-white group-hover:scale-105 group-hover:rotate-2 transition-transform duration-300" 
                  />
                  {item.popular && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white p-1.5 rounded-full shadow-lg">
                      <Flame className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-1">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                    {item.popular && (
                      <span className="inline-block mt-2 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                        ⭐ Popular
                      </span>
                    )}
                  </div>

                  {/* Price & Add button */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="space-y-0.5">
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Price</div>
                      <div className="font-black text-2xl text-emerald-600">
                        KES {item.price}
                      </div>
                    </div>
                    <button 
                      onClick={() => addToCart(item)}
                      className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    >
                      <Plus size={18} strokeWidth={2.5} /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- CART DISPLAY --- */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 sticky top-6 overflow-hidden">
            {/* Cart Header - CHANGED TO ORANGE */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <ShoppingBag className="w-6 h-6" strokeWidth={2.5} />
                </div>
                Your Order
              </h2>
              {cart.length > 0 && (
                <p className="text-orange-100 text-sm mt-2 font-medium">
                  {cart.reduce((acc, item) => acc + item.qty, 0)} items in cart
                </p>
              )}
            </div>

            <div className="p-6">
              {/* --- CART ITEMS --- */}
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-semibold">Your cart is empty</p>
                  <p className="text-gray-400 text-sm mt-1">Add items to get started</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6 max-h-72 overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="font-bold text-gray-900 flex-1 pr-2">{item.name}</span>
                        <button 
                          onClick={() => deleteFromCart(item.id)} 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition-all active:scale-95"
                          >
                            <Minus size={14} strokeWidth={2.5} />
                          </button>
                          <div className="bg-gradient-to-br from-emerald-600 to-green-600 text-white min-w-[2.5rem] h-10 flex items-center justify-center rounded-lg font-black shadow-sm">
                            {item.qty}
                          </div>
                          <button 
                            onClick={() => addToCart(item)}
                            className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition-all active:scale-95"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Item total price */}
                        <div className="text-right">
                          <div className="text-xs text-gray-500 font-medium">Total</div>
                          <div className="font-black text-lg text-gray-900">
                            KES {item.price * item.qty}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- USER LANDMARK INPUT --- */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Delivery Location (Landmark)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Near the main gate"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full border-2 border-gray-300 focus:border-emerald-500 rounded-xl p-3.5 text-sm focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* --- TOTAL AMOUNT --- */}
              {cart.length > 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-xl p-5 mb-6 border-2 border-dashed border-emerald-200">
                  <div className="flex justify-between items-center text-lg font-black text-gray-900">
                    <span>Total Amount</span>
                    <span className="text-2xl bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      KES {totalAmount}
                    </span>
                  </div>
                </div>
              )}

              {/* --- PAYMENT BUTTON --- */}
              <button 
                onClick={() => navigate('/payment', { state: { cart, total: totalAmount, vendor, landmark } })}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-5 rounded-xl font-black text-lg shadow-2xl hover:shadow-emerald-200 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3 group"
                disabled={cart.length === 0}
              >
                GO TO PAYMENT
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPage;