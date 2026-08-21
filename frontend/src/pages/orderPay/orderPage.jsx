import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiMapPin, FiSearch,
  FiPlus, FiMinus, FiShoppingCart, FiTrash2, FiAlertCircle,
  FiChevronDown, FiX
} from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';
import mapService from '../../services/mapService';
// 1. IMPORT CART CONTEXT
import { useCart } from '../../context/CartContext'; 

// --- SAFE IMAGE COMPONENT ---
const VendorImage = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError || !src) {
        return (
            <div className={`${className} bg-orange-50 flex flex-col items-center justify-center text-orange-200`}>
                <BiStore className="text-2xl mb-1 opacity-50" />
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
  
  // 2. USE CART CONTEXT
  const { cart, addToCart, removeFromCart } = useCart();

  // --- STATE ---
  const [vendor, setVendor] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [cartCollapsed, setCartCollapsed] = useState(false);
  
  // USER INPUT STATE (Delivery Location)
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchVendorData = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedVendor = await mapService.getVendorDetails(vendorId);
        
        if (fetchedVendor) {
          setVendor(fetchedVendor);
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
  const handleAddToCart = (item) => {
      const itemObj = typeof item === 'string' ? { name: item, price: 0, id: item } : item;
      // Use Context method (handles validation)
      addToCart(vendor, itemObj);
  };

  const handleRemoveFromCart = (item) => {
      const itemId = item.id || item.name;
      removeFromCart(itemId);
  };

  // 3. Filter Cart Items for THIS Vendor (or show global if matching)
  // Actually, CartContext enforces single vendor, so cart.items is safe to use directly
  // providing cart.vendorId matches current vendorId.
  // If cart has items from another vendor, they will be visible in the cart UI until cleared.
  const currentCartItems = cart.items || [];
  const cartTotal = cart.total || 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
    </div>
  );

  if (error || !vendor) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-orange-50 p-4 text-center">
      <div className="bg-red-50 p-4 rounded-full mb-4"><FiAlertCircle className="text-3xl text-red-500"/></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Vendor Unavailable</h2>
      <p className="text-gray-500 mb-6">{error || "We couldn't find this vendor."}</p>
      <button onClick={() => navigate(-1)} className="text-orange-600 font-bold hover:underline">Go Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 pb-24 lg:pb-0">
      
      {/* HEADER / NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-orange-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button 
                onClick={() => navigate(-1)} 
                className="p-2.5 bg-white border border-orange-100 rounded-full text-gray-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm active:scale-95 flex-shrink-0"
              >
                <FiArrowLeft className="text-lg" />
              </button>
              
              <div className="flex flex-col min-w-0">
                <h1 className="font-bold text-xl text-gray-900 truncate leading-tight tracking-tight">
                  {vendor.name}
                </h1>
                <div className="flex items-center gap-3 text-xs mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${
                    vendor.status === 'Open' 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : 'bg-red-100 text-red-700 border-red-200'
                  }`}>
                      {vendor.status || 'Open'}
                  </span>
                  <span className="text-gray-500 flex items-center gap-1 truncate font-medium">
                      <FiMapPin size={12} className="text-orange-500 flex-shrink-0" /> 
                      <span className="truncate">{vendor.address || 'Local Vendor'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-orange-100 h-8">
                <div className="bg-orange-600 p-1.5 rounded-lg shadow-sm shadow-orange-200">
                    <BiStore className="text-white text-lg" />
                </div>
                <span className="font-bold text-gray-900 tracking-tight">
                    Hyper<span className="text-orange-600">Local</span>
                </span>
            </div>

          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: VENDOR INFO & MENU */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-orange-100 shadow-md">
            <VendorImage src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-3xl font-bold mb-1 shadow-black drop-shadow-md">{vendor.name}</h2>
              <div className="flex items-center gap-4 text-sm font-medium text-white/90">
                 <span className="bg-orange-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-orange-400/50">
                    {vendor.status === 'Open' ? 'Accepting Orders' : 'Local Favorite'}
                 </span>
              </div>
            </div>
          </div>

          <div className="sticky top-[72px] z-30 bg-orange-50/95 backdrop-blur-sm py-2 -mx-2 px-2 rounded-lg">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3.5 text-orange-300" />
              <input 
                type="text" 
                placeholder={`Search menu...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-orange-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all placeholder-gray-400"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                Menu Items <span className="text-sm font-normal text-gray-500">({filteredItems.length})</span>
            </h3>
            
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-orange-200">
                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiSearch className="text-2xl text-orange-300" />
                </div>
                <p className="text-gray-900 font-medium">No items found</p>
                <p className="text-gray-500 text-sm">Try searching for something else</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item, index) => {
                  const itemObj = typeof item === 'string' ? { name: item, price: 0, id: index } : item;
                  const itemId = itemObj.id || itemObj.name;
                  const inCart = currentCartItems.find(c => (c.id || c.name) === itemId);

                  return (
                    <div key={itemId} className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm flex gap-3 hover:border-orange-300 hover:shadow-orange-100/50 transition-all group">
                      <div className="w-20 h-20 bg-orange-50 rounded-lg flex-shrink-0 overflow-hidden relative">
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
                            <div className="flex items-center gap-3 bg-gray-900 text-white rounded-lg px-2 py-1 shadow-md shadow-orange-100">
                              <button onClick={() => handleRemoveFromCart(itemObj)} className="hover:text-orange-300 transition-colors"><FiMinus size={12}/></button>
                              <span className="text-xs font-bold w-3 text-center">{inCart.qty}</span>
                              <button onClick={() => handleAddToCart(itemObj)} className="hover:text-orange-300 transition-colors"><FiPlus size={12}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddToCart(itemObj)}
                              className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-500 hover:text-white transition-all duration-300 group-hover:shadow-md"
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
          <div className={`sticky top-24 bg-white rounded-2xl border border-orange-100 shadow-xl shadow-orange-100/20 overflow-hidden flex flex-col transition-all duration-300 ${
            cartCollapsed ? 'h-16' : 'min-h-[400px] max-h-[85vh]'
          }`}>
            <div className="p-5 border-b border-orange-100 bg-orange-50/50 backdrop-blur flex items-center justify-between cursor-pointer" onClick={() => setCartCollapsed(!cartCollapsed)}>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FiShoppingCart className="text-orange-600"/> Your Order
                {currentCartItems.length > 0 && (
                  <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    {currentCartItems.reduce((a, b) => a + b.qty, 0)}
                  </span>
                )}
              </h2>
              <FiChevronDown className={`text-orange-400 transition-transform duration-300 ${cartCollapsed ? 'rotate-180' : ''}`} />
            </div>

            {!cartCollapsed && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {currentCartItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FiShoppingCart className="text-3xl mx-auto mb-3 opacity-30 text-orange-300" />
                      <p className="font-medium text-sm">Cart is empty</p>
                    </div>
                  ) : (
                    currentCartItems.map(item => (
                      <div key={item.id || item.name} className="flex justify-between items-center text-sm p-3 rounded-xl border bg-white border-orange-50">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-50 text-orange-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs border border-orange-100">
                            {item.qty}
                          </div>
                          <span className="font-medium text-gray-900 line-clamp-1">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 font-medium text-xs">{(item.price * item.qty).toLocaleString()}</span>
                          <button onClick={() => handleRemoveFromCart(item)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {currentCartItems.length > 0 && (
                  <div className="p-5 bg-orange-50/30 border-t border-orange-100 space-y-4">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Location</label>
                        <input
                            type="text"
                            placeholder="Type location (e.g., Gate B, Floor 2)"
                            value={deliveryLocation}
                            onChange={(e) => setDeliveryLocation(e.target.value)}
                            className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-500 text-sm">Total Amount</span>
                        <span className="text-2xl font-bold text-gray-900">KES {cartTotal.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => navigate('/payment', { state: { cart: currentCartItems, vendor, landmark: deliveryLocation } })}
                      className="w-full py-3.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
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
      {currentCartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden p-4 bg-white border-t border-orange-100 shadow-2xl z-50">
          <button
            onClick={() => setShowOrderModal(true)}
            className="w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-between shadow-xl bg-gray-900 text-white hover:bg-orange-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-sm font-bold">
                {currentCartItems.reduce((a, b) => a + b.qty, 0)}
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
            
            <div className="p-5 border-b border-orange-100 flex items-center justify-between bg-orange-50/50 rounded-t-3xl">
              <h2 className="font-bold text-gray-900 text-lg">Your Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 bg-white rounded-full shadow-sm hover:bg-orange-50 text-gray-500">
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
               {currentCartItems.map(item => (
                  <div key={item.id || item.name} className="flex justify-between items-center text-sm p-3 bg-white border border-orange-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-50 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                            {item.qty}
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-bold">KES {(item.price * item.qty).toLocaleString()}</span>
                        <button onClick={() => handleRemoveFromCart(item)} className="text-gray-400 hover:text-red-500 p-1">
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 pt-6 border-t border-orange-100">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Delivery Location</label>
                    <input
                        type="text"
                        placeholder="Type location (e.g., Gate B, House 10)"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            <div className="p-6 border-t border-orange-100 bg-orange-50/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500">Total to pay</span>
                <span className="text-2xl font-bold text-gray-900">KES {cartTotal.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  navigate('/payment', { state: { cart: currentCartItems, vendor, landmark: deliveryLocation } });
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