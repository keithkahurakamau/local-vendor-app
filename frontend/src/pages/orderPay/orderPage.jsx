import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiMapPin, FiSearch,
  FiPlus, FiMinus, FiShoppingCart, FiTrash2, FiAlertCircle,
  FiChevronDown, FiX
} from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';
import mapService from '../../services/mapService';

// --- SAFE IMAGE COMPONENT ---
const VendorImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className={`${className} bg-gray-100 flex flex-col items-center justify-center text-gray-400`}>
                <BiStore className="text-3xl mb-1 opacity-20" />
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

const OrderPage = () => {
  const navigate = useNavigate();
  const { vendorId } = useParams();
  const location = useLocation();

  // --- STATE ---
  const [vendor, setVendor] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [animatingItems, setAnimatingItems] = useState(new Set());
  
  // USER INPUT STATE (Delivery Location)
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchVendorData = async () => {
      setLoading(true);
      setError(null);

      // PRIORITY 1: Check if we have vendor data passed via location state
      if (location.state?.vendor && location.state.vendor.menuItems) {
        setVendor(location.state.vendor);
        setMenuItems(location.state.vendor.menuItems || []);
        setLoading(false);
        return;
      }

      // PRIORITY 2: If vendorId is provided in URL params, fetch from API
      if (vendorId && vendorId !== 'undefined') {
        try {
          const response = await mapService.getVendorDetails(vendorId);
          if (response.success && response.vendor) {
            setVendor(response.vendor);
            setMenuItems(response.vendor.menuItems || []);
          } else {
            setError("Failed to load vendor");
            // If API fails but we have vendor ID in state, try that
            if (location.state?.vendor) {
              setVendor(location.state.vendor);
              setMenuItems(location.state.vendor.menuItems || []);
              setError(null);
            }
          }
        } catch (err) {
          console.error("Error fetching vendor:", err);
          // If API fails but we have vendor data in state, use it
          if (location.state?.vendor) {
            setVendor(location.state.vendor);
            setMenuItems(location.state.vendor.menuItems || []);
            setError(null);
          } else {
            setError("Could not connect to server. Please check your connection.");
          }
        } finally {
          setLoading(false);
        }
      } else {
        // PRIORITY 3: No vendorId and no vendor data in state - redirect to map
        setError("No vendor selected. Please select a vendor from the map.");
        setLoading(false);
        // Optional: Auto-redirect after a delay
        setTimeout(() => {
          navigate('/customer/map', { replace: true });
        }, 3000);
      }
    };

    fetchVendorData();
  }, [vendorId, location.state, navigate]);

  // --- FILTERING ---
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const itemName = typeof item === 'string' ? item : item.name || '';
      return itemName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [menuItems, searchQuery]);

  // --- CART HANDLERS ---
  const handleCart = (action, item) => {
    setCart(prev => {
      const itemId = item.id || item.name; 
      const existing = prev.find(i => (i.id || i.name) === itemId);
      
      let newCart;

      if (action === 'add') {
        const itemObj = typeof item === 'string' ? { name: item, price: 0, id: item } : item;
        
        newCart = existing
          ? prev.map(i => (i.id || i.name) === itemId ? { ...i, qty: i.qty + 1 } : i)
          : [...prev, { ...itemObj, qty: 1 }];

        if (!existing) {
          setAnimatingItems(prevSet => new Set([...prevSet, itemId]));
          setTimeout(() => {
            setAnimatingItems(prevSet => {
              const newSet = new Set(prevSet);
              newSet.delete(itemId);
              return newSet;
            });
          }, 500);
        }
      } else if (action === 'remove') {
        newCart = prev.map(i => (i.id || i.name) === itemId ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0);
      } else {
        newCart = prev;
      }

      return newCart;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-600 border-t-transparent"></div>
    </div>
  );

  if (error || !vendor) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-red-50 p-6 rounded-full mb-6 border border-red-100"><FiAlertCircle className="text-4xl text-red-500"/></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Vendor Unavailable</h2>
      <p className="text-gray-500 mb-8">{error || "We couldn't find this vendor."}</p>
      <button onClick={() => navigate(-1)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0 font-sans">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center gap-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
          <FiArrowLeft className="text-xl" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg text-gray-900 truncate">{vendor.name}</h1>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className={`px-2 py-0.5 rounded-full ${vendor.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {vendor.status}
            </span>
            <span className="text-gray-500 truncate max-w-[200px] flex items-center gap-1">
                <FiMapPin size={12} /> {vendor.address}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: VENDOR INFO & MENU */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="relative h-56 md:h-72 rounded-3xl overflow-hidden bg-gray-200 shadow-md group">
            <VendorImage src={vendor.image} alt={vendor.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-2 shadow-black drop-shadow-md tracking-tight">{vendor.name}</h2>
              <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
                 <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    {vendor.status === 'Open' ? 'Accepting Orders' : 'Currently Closed'}
                 </span>
                 <span className="bg-orange-500 px-3 py-1 rounded-full text-white shadow-sm">
                    Verified Vendor
                 </span>
              </div>
            </div>
          </div>

          <div className="sticky top-[72px] z-30 bg-gray-50 py-2">
            <div className="relative group">
              <FiSearch className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <input 
                type="text" 
                placeholder={`Search menu...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm transition-all placeholder-gray-400 text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                Menu Items <span className="text-sm font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{filteredItems.length}</span>
            </h3>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiSearch className="text-2xl text-orange-300" />
                </div>
                <p className="text-gray-900 font-bold">No items found</p>
                <p className="text-gray-500 text-sm">Try searching for something else</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item, index) => {
                  const itemObj = typeof item === 'string' ? { name: item, price: 0, id: index } : item;
                  const itemId = itemObj.id || itemObj.name;
                  const inCart = cart.find(c => (c.id || c.name) === itemId);

                  return (
                    <div key={itemId} className={`bg-white p-3 rounded-2xl border transition-all duration-300 flex gap-4 group ${inCart ? 'border-orange-500 ring-1 ring-orange-500 shadow-md' : 'border-gray-100 hover:border-orange-200 hover:shadow-lg'}`}>
                      <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative shadow-inner">
                        <VendorImage src={itemObj.image} alt={itemObj.name} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-orange-700 transition-colors">{itemObj.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">{itemObj.desc || 'Delicious and fresh.'}</p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-gray-900 text-lg">
                             {itemObj.price > 0 ? `KES ${itemObj.price}` : <span className="text-xs text-gray-400 font-normal">N/A</span>}
                          </span>
                          
                          {inCart ? (
                            <div className="flex items-center gap-1 bg-gray-900 text-white rounded-lg p-1 shadow-md">
                              <button onClick={() => handleCart('remove', itemObj)} className="hover:bg-gray-700 p-1 rounded-md transition-colors"><FiMinus size={14}/></button>
                              <span className="text-sm font-bold w-6 text-center">{inCart.qty}</span>
                              <button onClick={() => handleCart('add', itemObj)} className="hover:bg-gray-700 p-1 rounded-md transition-colors"><FiPlus size={14}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleCart('add', itemObj)}
                              className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-100"
                            >
                              <FiPlus size={20} />
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

        {/* RIGHT COLUMN: CART (Desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className={`sticky top-24 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
            cartCollapsed ? 'h-20' : 'min-h-[450px] max-h-[85vh]'
          }`}>
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setCartCollapsed(!cartCollapsed)}>
              <h2 className="font-bold text-gray-900 text-xl flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><FiShoppingCart /></div>
                Your Order
                {cart.length > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {cart.reduce((a, b) => a + b.qty, 0)}
                  </span>
                )}
              </h2>
              <FiChevronDown className={`text-gray-400 transition-transform duration-300 ${cartCollapsed ? 'rotate-180' : ''}`} />
            </div>

            {!cartCollapsed && (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <FiShoppingCart className="text-4xl mx-auto mb-4 opacity-20" />
                      <p className="font-medium text-gray-500">Your cart is empty.</p>
                      <p className="text-sm">Add items from the menu to start.</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id || item.name} className="flex justify-between items-start text-sm pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="flex gap-3">
                          <div className="bg-orange-50 text-orange-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs border border-orange-100 mt-0.5">
                            {item.qty}x
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{item.name}</span>
                            <span className="text-gray-400 text-xs">KES {item.price} each</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-gray-900 font-bold">{(item.price * item.qty).toLocaleString()}</span>
                          <button onClick={() => handleCart('remove', item)} className="text-xs text-red-400 hover:text-red-600 hover:underline">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Details</label>
                        <input
                            type="text"
                            placeholder="e.g. Gate B, Office 302"
                            value={deliveryLocation}
                            onChange={(e) => setDeliveryLocation(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-gray-500 font-medium">Total Amount</span>
                        <span className="text-2xl font-extrabold text-gray-900">KES {cartTotal.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => navigate('/payment', { state: { cart, vendor, landmark: deliveryLocation } })}
                      className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-orange-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                      Checkout Securely
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden p-4 bg-white border-t border-gray-200 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-50">
          <button
            onClick={() => setShowOrderModal(true)}
            className="w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-between shadow-xl bg-gray-900 text-white hover:bg-orange-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white text-gray-900 px-2.5 py-0.5 rounded-full text-xs font-extrabold">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
              <span className="font-bold">View Order</span>
            </div>
            <div className="text-lg font-bold">KES {cartTotal.toLocaleString()}</div>
          </button>
        </div>
      )}

      {/* MOBILE ORDER MODAL */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowOrderModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-3xl">
              <h2 className="font-bold text-gray-900 text-xl">Current Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-500 border border-gray-200">
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
               {cart.map(item => (
                  <div key={item.id || item.name} className="flex justify-between items-center text-sm p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-50 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border border-orange-100">
                            {item.qty}
                        </div>
                        <div>
                            <span className="font-bold text-gray-900 block text-base">{item.name}</span>
                            <span className="text-xs text-gray-500">KES {item.price} each</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900">KES {(item.price * item.qty).toLocaleString()}</span>
                        <button onClick={() => handleCart('remove', item)} className="text-gray-300 hover:text-red-500 p-1">
                            <FiTrash2 size={18} />
                        </button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Delivery Location</label>
                    <input
                        type="text"
                        placeholder="Type location (e.g., Gate B, House 10)"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 pb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 font-medium">Total to pay</span>
                <span className="text-3xl font-extrabold text-gray-900">KES {cartTotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  navigate('/payment', { state: { cart, vendor, landmark: deliveryLocation } });
                }}
                className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-orange-600 transition-colors shadow-lg text-lg"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderPage;