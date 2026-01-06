import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiStar, FiClock, FiMapPin, FiSearch,
  FiPlus, FiMinus, FiShoppingCart, FiTrash2, FiAlertCircle,
  FiChevronDown, FiCheck, FiX
} from 'react-icons/fi';
import mapService from '../../services/mapService';

const OrderPage = () => {
  const navigate = useNavigate();
  const { vendorId } = useParams();
  const location = useLocation();

  // --- STATE ---
  const [vendor, setVendor] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  
  // UI State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [animatingItems, setAnimatingItems] = useState(new Set());

  // Landmark State
  const [landmarks, setLandmarks] = useState([]);
  const [selectedLandmark, setSelectedLandmark] = useState('');
  const [landmarkDropdownOpen, setLandmarkDropdownOpen] = useState(false);
  const [landmarkInput, setLandmarkInput] = useState('');

  // Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- 1. DATA FETCHING (Matched to customer_routes.py) ---
  useEffect(() => {
    const fetchVendorData = async () => {
      setLoading(true);

      // Strategy: Try to use passed state first, otherwise fetch from API
      if (location.state?.vendor && location.state.vendor.menuItems) {
        // Fast load from previous page
        const v = location.state.vendor;
        setVendor(v);
        setMenuItems(v.menuItems || []);
        setCategories(v.categories || []);
        setLoading(false);
      } else {
        // Deep load from API
        const response = await mapService.getVendorDetails(vendorId);
        if (response.success && response.vendor) {
          setVendor(response.vendor);
          // Your Python backend returns 'menuItems' and 'categories' inside the vendor object
          setMenuItems(response.vendor.menuItems || []);
          setCategories(response.vendor.categories || []);
        } else {
          setError(response.error || "Failed to load vendor");
        }
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId, location.state]);

  // --- 2. LOCATION AND LANDMARK FETCHING ---
  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Fetch nearby landmarks
            const landmarkResponse = await mapService.getNearbyLandmarks(latitude, longitude, 100);
            if (landmarkResponse.success && landmarkResponse.landmarks.length > 0) {
              setLandmarks(landmarkResponse.landmarks);
              // Auto-prefill with closest landmark
              setLandmarkInput(landmarkResponse.landmarks[0].name);
              setSelectedLandmark(landmarkResponse.landmarks[0].name);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
    };

    if (vendor) {
      getUserLocation();
    }
  }, [vendor]);



  // --- 2. FILTER LOGIC ---
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      // Your backend returns category IDs like 'main', 'all', etc.
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, activeCategory, searchQuery]);

  // --- 3. CART LOGIC ---
  const handleCart = (action, item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      let newCart;

      if (action === 'add') {
        newCart = existing
          ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
          : [...prev, { ...item, qty: 1 }]; // Add new item

        // Add animation for new item
        if (!existing) {
          setAnimatingItems(prevSet => new Set([...prevSet, item.id]));
          setTimeout(() => {
            setAnimatingItems(prevSet => {
              const newSet = new Set(prevSet);
              newSet.delete(item.id);
              return newSet;
            });
          }, 500);
        }
      } else if (action === 'remove') {
        newCart = prev.map(i => i.id === item.id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0);
      } else {
        newCart = prev;
      }

      return newCart;
    });
  };

  // Calculate Totals
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);



  // --- RENDER HELPERS ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
    </div>
  );

  if (error || !vendor) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-red-50 p-4 rounded-full mb-4"><FiAlertCircle className="text-3xl text-red-500"/></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Vendor Unavailable</h2>
      <p className="text-gray-500 mb-6">{error || "We couldn't find this vendor."}</p>
      <button onClick={() => navigate(-1)} className="text-orange-600 font-bold hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <FiArrowLeft className="text-xl text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg text-gray-900 truncate">{vendor.name}</h1>
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            {vendor.status} • {vendor.distance}
          </p>
        </div>
        <div className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
          <FiStar className="fill-current" /> {vendor.rating}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Menu & Hero */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hero Image */}
          <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-gray-200">
            {/* Fallback to vendor image if item has no image (since python route generates items dynamically) */}
            <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-3xl font-bold mb-1">{vendor.name}</h2>
              <div className="flex items-center gap-4 text-sm font-medium text-white/90">
                <span className="flex items-center gap-1"><FiClock /> {vendor.lastSeen ? "Recently Active" : "Offline"}</span>
                <span className="flex items-center gap-1"><FiMapPin /> {vendor.address}</span>
              </div>
            </div>
          </div>

          {/* Search & Categories Sticky Header */}
          <div className="sticky top-[64px] z-30 bg-gray-50 py-2 space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder={`Search in ${vendor.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat.id 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {cat.name} <span className="text-xs opacity-70 ml-1">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items List */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Menu Items</h3>
            {filteredItems.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500">No items found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const inCart = cart.find(c => c.id === item.id);
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 hover:border-orange-200 transition-colors">
                      {/* Note: Python route doesn't return specific item images, so we use vendor image or placeholder */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        <img src={vendor.image} alt={item.name} className="w-full h-full object-cover opacity-90" />
                      </div>
                      
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                          {item.popular && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">POPULAR</span>}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 mb-2">{item.description}</p>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <span className="font-bold text-gray-900">KES {item.price}</span>
                          
                          {inCart ? (
                            <div className="flex items-center gap-3 bg-gray-900 text-white rounded-lg px-2 py-1 shadow-lg">
                              <button onClick={() => handleCart('remove', item)} className="hover:text-orange-300"><FiMinus size={14}/></button>
                              <span className="text-sm font-bold w-4 text-center">{inCart.qty}</span>
                              <button onClick={() => handleCart('add', item)} className="hover:text-orange-300"><FiPlus size={14}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleCart('add', item)}
                              className="bg-gray-100 text-gray-900 p-2 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-colors"
                            >
                              <FiPlus size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Cart (Desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className={`sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
            cartCollapsed ? 'h-16' : 'min-h-[400px]'
          }`}>
            {/* Collapsible Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FiShoppingCart />
                Your Order
                {cart.length > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    {cart.reduce((a, b) => a + b.qty, 0)}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCartCollapsed(!cartCollapsed)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <FiChevronDown className={`text-gray-500 transition-transform ${cartCollapsed ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Expandable Content */}
            {!cartCollapsed && (
              <>
                <div className={`p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar transition-all duration-300 ${
                  cart.length === 0 ? 'max-h-32' : 'max-h-[50vh]'
                }`}>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiShoppingCart className="text-2xl" />
                      </div>
                      <p className="font-medium">Your cart is empty</p>
                      <p className="text-sm">Add items to start ordering</p>
                    </div>
                  ) : (
                    <>
                      {/* Cart Items with Animations */}
                      {cart.map(item => (
                        <div
                          key={item.id}
                          className={`flex justify-between items-center text-sm p-3 rounded-lg border transition-all duration-300 ${
                            animatingItems.has(item.id)
                              ? 'bg-green-50 border-green-200 animate-pulse'
                              : 'bg-gray-50 border-gray-100 hover:border-orange-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-50 text-orange-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs">
                              {item.qty}x
                            </div>
                            <span className="font-medium text-gray-900 line-clamp-1">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600 font-medium">KES {(item.price * item.qty)}</span>
                            <button
                              onClick={() => handleCart('remove', item)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Dynamic Content Based on Cart State */}
                      {cart.length > 0 && (
                        <div className="mt-6 space-y-3">
                          {/* Landmark Selection */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Delivery Location</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Enter delivery location..."
                                value={landmarkInput}
                                onChange={(e) => {
                                  setLandmarkInput(e.target.value);
                                  setSelectedLandmark(e.target.value);
                                  setLandmarkDropdownOpen(true);
                                }}
                                onFocus={() => setLandmarkDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setLandmarkDropdownOpen(false), 200)}
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />

                              {landmarkDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {/* Nearby Landmarks */}
                                  {landmarks.length > 0 && (
                                    <div className="py-1">
                                      <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">Nearby Landmarks</div>
                                      {landmarks.map((landmark, index) => (
                                        <button
                                          key={index}
                                          onClick={() => {
                                            setLandmarkInput(landmark.name);
                                            setSelectedLandmark(landmark.name);
                                            setLandmarkDropdownOpen(false);
                                          }}
                                          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-900">{landmark.name}</span>
                                            <span className="text-xs text-gray-500">{landmark.distance}m</span>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Checkout Section */}
                {cart.length > 0 && (
                  <div className="p-5 bg-gray-50 border-t border-gray-100 space-y-4">
                    {/* Total Display */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        KES {cartTotal}
                      </div>
                      <div className="text-sm text-gray-500">Total amount</div>
                    </div>

                    {/* Checkout Button */}
                    <button
                      onClick={() => navigate('/payment', { state: { cart, vendor, landmark: selectedLandmark } })}
                      disabled={cartTotal < vendor.minOrder}
                      className={`w-full py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105 ${
                        cartTotal < vendor.minOrder
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 hover:bg-orange-600 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {cartTotal < vendor.minOrder ? `Min Order KES ${vendor.minOrder}` : 'Proceed to Checkout'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* MOBILE FLOATING CART (Bottom Sheet) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden p-4 bg-white border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] z-50">
          <button
            onClick={() => setShowOrderModal(true)}
            disabled={cartTotal < vendor.minOrder}
            className={`w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-between shadow-xl transition-all transform hover:scale-105 ${
              cartTotal < vendor.minOrder ? 'bg-gray-300 text-gray-500' : 'bg-gray-900 text-white hover:bg-orange-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-sm font-bold animate-pulse ${
                cartTotal < vendor.minOrder ? 'bg-gray-400 text-gray-600' : 'bg-white/20 text-white'
              }`}>
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
              <span>View Order</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">KES {cartTotal}</div>
            </div>
          </button>
        </div>
      )}

      {/* ORDER MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowOrderModal(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FiShoppingCart />
                Your Order
                {cart.length > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    {cart.reduce((a, b) => a + b.qty, 0)}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiX className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-12 px-6 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiShoppingCart className="text-2xl" />
                  </div>
                  <p className="font-medium">Your cart is empty</p>
                  <p className="text-sm">Add items to start ordering</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {/* Cart Items */}
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className={`flex justify-between items-center text-sm p-4 rounded-lg border transition-all duration-300 ${
                        animatingItems.has(item.id)
                          ? 'bg-green-50 border-green-200 animate-pulse'
                          : 'bg-gray-50 border-gray-100 hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-50 text-orange-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs">
                          {item.qty}x
                        </div>
                        <span className="font-medium text-gray-900 line-clamp-1">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600 font-medium">KES {(item.price * item.qty)}</span>
                        <button
                          onClick={() => handleCart('remove', item)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Landmark Selection */}
                  {cart.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <label className="text-sm font-medium text-gray-700">Delivery Location</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter delivery location..."
                          value={landmarkInput}
                          onChange={(e) => {
                            setLandmarkInput(e.target.value);
                            setSelectedLandmark(e.target.value);
                            setLandmarkDropdownOpen(true);
                          }}
                          onFocus={() => setLandmarkDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setLandmarkDropdownOpen(false), 200)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />

                        {landmarkDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {/* Nearby Landmarks */}
                            {landmarks.length > 0 && (
                              <div className="py-1">
                                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">Nearby Landmarks</div>
                                {landmarks.map((landmark, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      setLandmarkInput(landmark.name);
                                      setSelectedLandmark(landmark.name);
                                      setLandmarkDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-900">{landmark.name}</span>
                                      <span className="text-xs text-gray-500">{landmark.distance}m</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                {/* Total Display */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    KES {cartTotal}
                  </div>
                  <div className="text-sm text-gray-500">Total amount</div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    navigate('/payment', { state: { cart, vendor, landmark: selectedLandmark } });
                  }}
                  disabled={cartTotal < vendor.minOrder}
                  className={`w-full py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105 ${
                    cartTotal < vendor.minOrder
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-orange-600 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {cartTotal < vendor.minOrder ? `Min Order KES ${vendor.minOrder}` : 'Proceed to Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderPage;