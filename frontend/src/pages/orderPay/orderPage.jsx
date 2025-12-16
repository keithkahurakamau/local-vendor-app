import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';

const OrderPage = () => {
  // --- MOCK DATA ---
  // Vendor info (this would usually come from a backend API)
  const vendor = {
    id: 1,
    name: "Mama Otis Smokies & Chapo",
    image: "https://images.unsplash.com/photo-1567129937968-cdad8f07e2f8?q=80&w=300&h=200&fit=crop",
    distance: "0.5 km away",
    lastSeen: "10 mins ago",
  };

  // Menu items (mocked for now)
  const menuItems = [
    { id: 1, name: "Smokie Pasua", description: "Fresh smokie with kachumbari", price: 30, image: "https://images.unsplash.com/photo-1595295333158-4742f28fbd85?q=80&w=150&h=150&fit=crop" },
    { id: 2, name: "Chapati Soft", description: "Hot soft layered chapati", price: 20, image: "https://images.unsplash.com/photo-1626508035297-003243277026?q=80&w=150&h=150&fit=crop" },
    { id: 3, name: "Samosa Beef", description: "Spicy beef filled triangle", price: 50, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=150&h=150&fit=crop" },
  ];

  // --- STATE ---
  const [cart, setCart] = useState([]); // Cart items
  const [landmark, setLandmark] = useState(""); // User's delivery landmark
  const navigate = useNavigate();

  // --- FUNCTIONS ---
  // Add item to cart
  const addToCart = (item) => {
    setCart((prev) => {
      // Check if item is already in cart
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        // Increment quantity if it exists
        return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      // Otherwise, add new item with qty 1
      return [...prev, { ...item, qty: 1 }];
    });
  };

  // Remove item from cart (decrease quantity)
  const removeFromCart = (itemId) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === itemId ? { ...i, qty: i.qty - 1 } : i)
        .filter((i) => i.qty > 0) // Remove item if quantity becomes 0
    );
  };

  // Delete item completely from cart
  const deleteFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Calculate total amount
  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- VENDOR HEADER --- */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto p-6 flex flex-col md:flex-row items-center gap-6">
          {/* Vendor Image */}
          <div className="w-full md:w-1/4">
            <img 
              src={vendor.image} 
              alt={vendor.name} 
              className="w-full h-40 object-cover rounded-lg shadow-md"
            />
          </div>
          {/* Vendor Details */}
          <div className="w-full md:w-3/4 space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">{vendor.name}</h1>
            <div className="flex items-center text-gray-600 gap-4">
              {/* Vendor distance */}
              <span className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <MapPin size={16} /> {vendor.distance}
              </span>
              {/* Last seen / check-in */}
              <span className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                <Clock size={16} /> Check-in: {vendor.lastSeen}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
        
        {/* --- MENU DISPLAY --- */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-700">Menu Items</h2>
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 transition hover:shadow-md">
              {/* Food Image */}
              <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                {/* Price & Add button */}
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-lg text-emerald-600">KES {item.price}</span>
                  <button 
                    onClick={() => addToCart(item)}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- CART DISPLAY --- */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 sticky top-4">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-4 mb-4">
              <ShoppingBag className="text-emerald-600" /> Your Order
            </h2>

            {/* --- CART ITEMS --- */}
            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Your cart is empty.</p>
            ) : (
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                        >
                          <Minus size={12} />
                        </button>
                        <div className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">
                          {item.qty}
                        </div>
                        <button 
                          onClick={() => addToCart(item)}
                          className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      {/* Item Name */}
                      <span className="text-gray-700 font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Item total price */}
                      <span className="font-bold text-gray-900">KES {item.price * item.qty}</span>
                      {/* Delete button */}
                      <button onClick={() => deleteFromCart(item.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- USER LANDMARK INPUT --- */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                User Location (Landmark)
              </label>
              <input 
                type="text" 
                placeholder="e.g. Near the main gate"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* --- TOTAL AMOUNT --- */}
            <div className="flex justify-between items-center text-lg font-bold text-gray-800 mb-6 border-t pt-4">
              <span>Total</span>
              <span>KES {totalAmount}</span>
            </div>

            {/* --- PAYMENT BUTTON --- */}
            <button 
              onClick={() => navigate('/payment', { state: { cart, total: totalAmount, vendor, landmark } })}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cart.length === 0}
            >
              GO TO PAYMENT
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderPage;