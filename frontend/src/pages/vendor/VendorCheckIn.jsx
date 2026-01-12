import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, MapPin, Navigation, Clock, LogOut,
  ShoppingBag, Plus, Upload, Trash2, Save, Loader2, Pencil, X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vendorAPI } from '../../services/api';

// Fix Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Helper Components ---
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 15); }, [center, map]);
  return null;
};

const DraggableMarker = ({ position, setPosition, onDragEnd }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onDragEnd) onDragEnd(e.latlng.lat, e.latlng.lng);
    }
  });

  return position ? (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const newPos = e.target.getLatLng();
          setPosition(newPos);
          if (onDragEnd) onDragEnd(newPos.lat, newPos.lng);
        }
      }}
    />
  ) : null;
};

const VendorCheckIn = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0); 
  
  const [position, setPosition] = useState({ lat: -1.2921, lng: 36.8219 });
  const [address, setAddress] = useState(""); 
  const [isLocating, setIsLocating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Menu State
  const [menuItems, setMenuItems] = useState([]);

  // Edit State
  const [newItem, setNewItem] = useState({ name: '', desc: '', price: '', image: null });
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);

  // --- 1. INITIAL LOAD & STATUS CHECK ---
  useEffect(() => {
    const fetchStatus = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return; 

            const response = await vendorAPI.getVendorStatus();
            const { is_open, remaining_seconds, address: savedAddress, menu_items } = response.data;

            setIsOpen(is_open);
            setRemainingSeconds(remaining_seconds > 0 ? remaining_seconds : 0);
            
            if (savedAddress) setAddress(savedAddress);
            
            if (menu_items && Array.isArray(menu_items) && menu_items.length > 0) {
                const formattedMenu = menu_items.map(item => ({
                    id: Date.now() + Math.random(),
                    name: item.name || '',
                    // FIX: Handle backend 'description' and ensure string fallback
                    desc: item.description || item.desc || '', 
                    price: item.price || '', // Ensure no nulls
                    image: item.image || null
                }));
                setMenuItems(formattedMenu);
            }

        } catch (error) {
            console.error("Failed to fetch status:", error);
            if (error.response && (error.response.status === 401 || error.response.status === 422)) {
                alert("Session expired. Please login again.");
                localStorage.removeItem('user');
                navigate('/vendor/login');
            }
        }
    };

    fetchStatus();
  }, [navigate]);

  // --- 2. REAL-TIME COUNTDOWN TIMER ---
  useEffect(() => {
    let timer;
    if (isOpen && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsOpen(false); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } 
    return () => clearInterval(timer);
  }, [isOpen, remainingSeconds]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0h 0m 0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  // --- HANDLERS ---
  const handleStatusChange = async (status) => {
      if (status === false) {
          if (window.confirm("Are you sure you want to close? You will disappear from the map.")) {
              try {
                  await vendorAPI.closeVendor();
                  setIsOpen(false);
                  setRemainingSeconds(0);
              } catch (error) {
                  console.error("Error closing:", error);
              }
          }
      } else {
          setIsOpen(true);
      }
  };

  const handleUpdateGPS = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        setIsLocating(false);
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => { alert("Could not detect location."); setIsLocating(false); }
    );
  };

  const handleAddressChange = (e) => {
    const newAddress = e.target.value;
    setAddress(newAddress);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (newAddress.trim()) {
        handleLocationSearch(newAddress);
      }
    }, 1000);

    setSearchTimeout(timeout);
  };

  const handleLocationSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=KE`
      );
      const results = await response.json();

      if (results.length > 0) {
        const bestResult = results[0];
        const newPosition = {
          lat: parseFloat(bestResult.lat),
          lng: parseFloat(bestResult.lon)
        };
        setPosition(newPosition);
        setAddress(bestResult.display_name);
      } else {
        alert("Location not found.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const result = await response.json();

      if (result && result.display_name) {
        setAddress(result.display_name);
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (error) {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  const handleEditClick = (item) => {
    // FIX: Ensure values are never undefined/null to prevent React uncontrolled input warning
    setNewItem({ 
        name: item.name || '', 
        desc: item.desc || '', 
        price: item.price || '', 
        image: item.image || null 
    });
    setEditingId(item.id);
    setImagePreview(item.image); 
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewItem({ name: '', desc: '', price: '', image: null });
    setImagePreview(null);
    setEditingId(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        e.target.value = '';
        return;
      }
      setNewItem({ ...newItem, image: file }); 
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result); 
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.price) return;

    setIsUploading(true);
    let finalImageUrl = newItem.image; 

    try {
        if (newItem.image instanceof File) {
            const uploadRes = await vendorAPI.uploadImage(newItem.image);
            finalImageUrl = uploadRes.url;
        } 
        
        const itemPayload = {
            name: newItem.name,
            desc: newItem.desc || '', // Ensure string
            price: newItem.price,
            image: finalImageUrl || null
        };

        if (editingId) {
            setMenuItems(menuItems.map(item =>
                item.id === editingId ? { ...itemPayload, id: editingId } : item
            ));
            setEditingId(null);
        } else {
            setMenuItems([...menuItems, { ...itemPayload, id: Date.now() }]);
        }

        setNewItem({ name: '', desc: '', price: '', image: null });
        setImagePreview(null);

    } catch (error) {
        console.error("Error saving item:", error);
        alert("Failed to upload image.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleBroadcast = async () => {
    if (menuItems.length === 0) {
        alert("Please add at least one menu item.");
        return;
    }

    setIsBroadcasting(true);
    try {
      const payload = {
          latitude: position.lat,
          longitude: position.lng,
          address: address,
          menu_items: menuItems.map(item => ({
            name: item.name,
            description: item.desc, // Backend expects 'description'
            price: parseFloat(item.price),
            image: item.image 
          })),
      };

      const response = await vendorAPI.checkIn(payload);

      if (response.success) {
        setIsOpen(true);
        setRemainingSeconds(3 * 60 * 60); // Reset timer to 3 hours
        alert("You are now LIVE! Status refreshed for 3 hours.");
      }
    } catch (e) {
        console.error("Broadcast error:", e);
        if (e.response && (e.response.status === 401 || e.response.status === 422)) {
             alert("Your session has expired. Please login again.");
             navigate('/vendor/login');
        } else {
             alert(e.response?.data?.error || 'Check-in failed');
        }
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/50 pb-20 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 bg-orange-600 rounded-lg flex items-center justify-center">
             <Store className="h-5 w-5 text-white" />
           </div>
           <span className="font-bold text-gray-900 hidden sm:block">Hyper-Local Vendor</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/vendor/orders')} className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors">
            <ShoppingBag className="h-4 w-4" /> View Orders
          </button>
          <button onClick={() => {
              localStorage.removeItem('user'); 
              navigate('/vendor/login');
          }} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Status Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-orange-600 mt-1" />
                <div>
                <h2 className="text-lg font-bold text-gray-900">Vendor Status</h2>
                <p className="text-sm text-gray-500">Auto-closes in <span className="font-bold text-orange-600">{formatTime(remainingSeconds)}</span> if active.</p>
                </div>
            </div>
            {isOpen && remainingSeconds > 0 && (
                <span className="animate-pulse bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    LIVE NOW
                </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${isOpen ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 opacity-50'}`}>
              <input 
                type="radio" 
                name="status" 
                checked={isOpen} 
                onChange={() => handleStatusChange(true)} 
                className="h-5 w-5 text-green-600" 
              />
              <span className="ml-3 font-bold text-gray-900">Open for Business</span>
            </label>
            <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${!isOpen ? 'border-red-500 bg-red-50 shadow-md' : 'border-gray-200 opacity-50'}`}>
              <input 
                type="radio" 
                name="status" 
                checked={!isOpen} 
                onChange={() => handleStatusChange(false)} 
                className="h-5 w-5 text-red-600" 
              />
              <span className="ml-3 font-bold text-gray-900">Closed for Business</span>
            </label>
          </div>
        </section>

        {/* Location Section */}
        <section className={`bg-white rounded-3xl shadow-sm border border-orange-100 p-6 sm:p-8 transition-opacity duration-300 ${!isOpen ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
          <h2 className="text-lg font-bold text-gray-900 mb-6">Current Location</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
              <input
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="Search for location or enter address..."
                className="w-full pl-10 pr-4 py-3 border-2 border-orange-300 rounded-xl bg-orange-50 text-base font-semibold text-gray-800 shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />
              )}
            </div>
            <button onClick={handleUpdateGPS} disabled={isLocating} className="px-6 py-3 bg-white border border-orange-200 text-orange-700 font-bold rounded-xl hover:bg-orange-50 flex items-center gap-2">
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />} Update GPS
            </button>
          </div>
          <div className="h-64 w-full rounded-2xl overflow-hidden border-2 border-orange-100 relative z-0">
             <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={position} />
                <DraggableMarker position={position} setPosition={setPosition} onDragEnd={handleReverseGeocode} />
             </MapContainer>
          </div>
        </section>

        {/* Menu Section */}
        <section className={`bg-white rounded-3xl shadow-sm border border-orange-100 p-6 sm:p-8 transition-opacity duration-300 ${!isOpen ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Menu Update</h2>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Live Preview</span>
          </div>

          <div className="space-y-4 mb-8">
            {menuItems.map((item) => (
              <div key={item.id} className={`group flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-2xl transition-all ${editingId === item.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-100 hover:border-orange-200 bg-gray-50/50'}`}>
                <div className="h-20 w-20 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    "🍲"
                  )}
                </div>
                <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
                  <div className="font-bold text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{item.desc}</div>
                  <div className="font-bold text-orange-600">KES {item.price}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                    title="Edit Item"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4 text-orange-600" /> : <Plus className="h-4 w-4 text-orange-600" />}
                {editingId ? "Edit Dish Details" : "Add New Item "}
              </span>
              {editingId && (
                <button onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <X className="h-3 w-3" /> Cancel Edit
                </button>
              )}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-2">
                <label className={`h-full min-h-[50px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors p-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px] mt-1 font-medium">Img</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
              <div className="sm:col-span-3">
                <input type="text" placeholder="Dish Name" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm text-gray-900 placeholder-gray-500"
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} disabled={isUploading} />
              </div>
              <div className="sm:col-span-4">
                <input type="text" placeholder="Short Description" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm text-gray-900 placeholder-gray-500"
                  value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} disabled={isUploading} />
              </div>
              <div className="sm:col-span-2">
                <input type="number" placeholder="Price" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm font-bold text-gray-900 placeholder-gray-500"
                  value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} disabled={isUploading} />
              </div>
              <div className="sm:col-span-1">
                <button
                  onClick={handleSaveItem}
                  disabled={isUploading}
                  className={`w-full h-full rounded-xl flex items-center justify-center shadow-lg transition-all text-white ${editingId ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'} ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
                  title={editingId ? "Update Dish" : "Add Dish"}
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingId ? <Save className="h-5 w-5" /> : "+")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="pb-10 space-y-4">
          <button 
            onClick={() => navigate('/vendor/orders')} 
            className="w-full py-4 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-2xl font-bold text-lg border-2 border-orange-200 hover:border-orange-300 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <ShoppingBag className="h-6 w-6" /> View Orders
          </button>

          <button onClick={handleBroadcast} disabled={isBroadcasting || !isOpen} className={`w-full py-5 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 ${!isOpen ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}>
            {isBroadcasting ? <><Loader2 className="h-6 w-6 animate-spin" /> Broadcasting...</> : <><Save className="h-6 w-6" /> Broadcast Location & Menu</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default VendorCheckIn;