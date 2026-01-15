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
                <BiStore className="text-2xl mb-1 opacity-30" />
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

      // Note: We prioritize fetching fresh data to ensure we have the Address and correct Menu structure.
      // The state passed from LandingPage might lack 'address' or use 'menu' instead of 'menuItems'.
      try {
        const fetchedVendor = await mapService.getVendorDetails(vendorId);
        
        // FIX: mapService returns the vendor object directly (or null), NOT { success: true, ... }
        if (fetchedVendor) {
          setVendor(fetchedVendor);
          // Backend returns 'menuItems' in the details endpoint
          setMenuItems(fetchedVendor.menuItems || []); 
        } else {
          setError("Failed to load vendor details.");
        }
      } catch (err) {
          console.error("OrderPage Error:", err);
          setError("Could not connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId]);

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
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <FiArrowLeft className="text-xl text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg text-gray-900 truncate">{vendor.name}</h1>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold ${vendor.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {vendor.status || 'Open'}
            </span>
            <span className="text-gray-500 truncate max-w-[150px] flex items-center gap-1">
                <FiMapPin size={10} /> {vendor.address || 'Local Vendor'}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: VENDOR INFO & MENU */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-gray-200 shadow-md">
            <VendorImage src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-3xl font-bold mb-1 shadow-black drop-shadow-md">{vendor.name}</h2>
              <div className="flex items-center gap-4 text-sm font-medium text-white/90">
                 <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    {vendor.status === 'Open' ? 'Accepting Orders' : 'Local Favorite'}
                 </span>
              </div>
            </div>
          </div>

          <div className="sticky top-[72px] z-30 bg-gray-50 py-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
              <input 
                type="text" 
                placeholder={`Search menu...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                Menu Items <span className="text-sm font-normal text-gray-500">({filteredItems.length})</span>
            </h3>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiSearch className="text-2xl text-gray-400" />
                </div>
                <p className="text-gray-900 font-medium">No items found</p>
                <p className="text-gray-500 text-sm">Try searching for something else</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item, index) => {
                  const itemObj = typeof item === 'string' ? { name: item, price: 0, id: index } : item;
                  const itemId = itemObj.id || itemObj.name;
                  const inCart = cart.find(c => (c.id || c.name) === itemId);

                  return (
                    <div key={itemId} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3 hover:border-orange-200 transition-colors group">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative">
                        <VendorImage src={itemObj.image} alt={itemObj.name} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-bold text-gray-900 line-clamp-2 leading-tight">{itemObj.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{itemObj.description}</p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-gray-900">
                             {itemObj.price > 0 ? `KES ${itemObj.price}` : <span className="text-xs text-gray-400 font-normal">Price on request</span>}
                          </span>
                          
                          {inCart ? (
                            <div className="flex items-center gap-3 bg-gray-900 text-white rounded-lg px-2 py-1 shadow-md">
                              <button onClick={() => handleCart('remove', itemObj)} className="hover:text-orange-300 transition-colors"><FiMinus size={12}/></button>
                              <span className="text-xs font-bold w-3 text-center">{inCart.qty}</span>
                              <button onClick={() => handleCart('add', itemObj)} className="hover:text-orange-300 transition-colors"><FiPlus size={12}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleCart('add', itemObj)}
                              className="bg-gray-100 text-gray-900 p-2 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-colors group-hover:bg-gray-200"
                            >
                              <FiPlus size={16} />
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
          <div className={`sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
            cartCollapsed ? 'h-16' : 'min-h-[400px] max-h-[85vh]'
          }`}>
            <div className="p-5 border-b border-gray-100 bg-gray-50/80 backdrop-blur flex items-center justify-between cursor-pointer" onClick={() => setCartCollapsed(!cartCollapsed)}>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FiShoppingCart /> Your Order
                {cart.length > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    {cart.reduce((a, b) => a + b.qty, 0)}
                  </span>
                )}
              </h2>
              <FiChevronDown className={`text-gray-500 transition-transform duration-300 ${cartCollapsed ? 'rotate-180' : ''}`} />
            </div>

            {!cartCollapsed && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FiShoppingCart className="text-3xl mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-sm">Cart is empty</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id || item.name} className="flex justify-between items-center text-sm p-3 rounded-xl border bg-white border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-50 text-orange-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs border border-orange-100">
                            {item.qty}
                          </div>
                          <span className="font-medium text-gray-900 line-clamp-1">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 font-medium text-xs">{(item.price * item.qty).toLocaleString()}</span>
                          <button onClick={() => handleCart('remove', item)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-5 bg-gray-50 border-t border-gray-100 space-y-4">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Location</label>
                        <input
                            type="text"
                            placeholder="Type location (e.g., Gate B, Floor 2)"
                            value={deliveryLocation}
                            onChange={(e) => setDeliveryLocation(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-500 text-sm">Total Amount</span>
                        <span className="text-2xl font-bold text-gray-900">KES {cartTotal.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => navigate('/payment', { state: { cart, vendor, landmark: deliveryLocation } })}
                      className="w-full py-3.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-orange-600 shadow-lg transition-all"
                    >
                      Proceed to Checkout
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
        <div className="fixed bottom-0 left-0 right-0 lg:hidden p-4 bg-white border-t border-gray-200 shadow-lg z-50">
          <button
            onClick={() => setShowOrderModal(true)}
            className="w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-between shadow-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-sm font-bold">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
              <span className="font-medium">View Order</span>
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
            
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-3xl">
              <h2 className="font-bold text-gray-900 text-lg">Your Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-500">
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
               {cart.map(item => (
                  <div key={item.id || item.name} className="flex justify-between items-center text-sm p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-50 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                            {item.qty}
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold">KES {(item.price * item.qty).toLocaleString()}</span>
                        <button onClick={() => handleCart('remove', item)} className="text-gray-400 hover:text-red-500 p-1">
                            <FiTrash2 size={16} />
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Total to pay</span>
                <span className="text-2xl font-bold text-gray-900">KES {cartTotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  navigate('/payment', { state: { cart, vendor, landmark: deliveryLocation } });
                }}
                className="w-full py-4 rounded-xl font-bold text-white bg-gray-900 hover:bg-orange-600 transition-colors shadow-lg"
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