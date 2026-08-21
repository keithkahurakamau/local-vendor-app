import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, MapPin, Navigation, Clock, LogOut,
  ShoppingBag, Plus, Upload, Trash2, Save, Loader2, Pencil, X, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { originIcon } from '../../components/map/markers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vendorAPI } from '../../services/api'; // Correct import
import { useAuth } from '../../context/AuthContext'; // NEW: Use Context for Logout

// --- LEAFLET ICON FIX ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- MAP COMPONENTS ---
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
      icon={originIcon()}
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
  const { logout } = useAuth(); // Use Auth Context

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
            // Basic check if logged in (token presence handled by api interceptor)
            if (!userStr) {
                // Double check if token exists standalone
                if(!localStorage.getItem('token')) return;
            }

            // This calls GET /api/vendor/status
            // The interceptor in api.js will attach the token
            const response = await vendorAPI.getVendorStatus();
            
            // NOTE: response is the Axios object, so we access .data
            const { is_open, remaining_seconds, address: savedAddress, menu_items } = response.data;

            const seconds = parseInt(remaining_seconds, 10) || 0;

            setIsOpen(is_open);
            setRemainingSeconds(seconds);
            
            if (savedAddress) setAddress(savedAddress);
            
            if (menu_items && Array.isArray(menu_items) && menu_items.length > 0) {
                const formattedMenu = menu_items.map(item => ({
                    id: Date.now() + Math.random(), 
                    name: item.name,
                    desc: item.description || '',
                    price: item.price,
                    image: item.image
                }));
                setMenuItems(formattedMenu);
            }

        } catch (error) {
            console.error("Failed to fetch status:", error);
            if (error.response && (error.response.status === 401 || error.response.status === 422)) {
                // Token invalid
                logout(); // Clear context
                navigate('/vendor/login');
            }
        }
    };

    fetchStatus();
  }, [navigate, logout]);

  // --- 2. TIMER LOGIC ---
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

  // --- 3. STATUS CHANGE ---
  const handleStatusChange = async (targetStatus) => {
      if (targetStatus === false) {
          if (!window.confirm("Close up? You'll disappear from the map.")) return;
          try {
              await vendorAPI.closeVendor();
              setIsOpen(false);
              setRemainingSeconds(0);
          } catch (error) {
              // The server refuses to close while paid orders are still unfinished,
              // because the customer has already been charged. Make the vendor
              // acknowledge exactly who they would be stranding.
              const data = error.response?.data;
              if (error.response?.status === 409 && data?.outstanding) {
                  const list = (data.orders || [])
                      .map((o) => `  • ${o.order_number} — ${o.status} — KES ${o.amount} (${o.customer_phone})`)
                      .join('\n');
                  const proceed = window.confirm(
                      `You have ${data.outstanding} paid order(s) still waiting:\n\n${list}\n\n` +
                      `These customers have already paid. Close anyway and notify them?`
                  );
                  if (!proceed) return;
                  try {
                      const forced = await vendorAPI.closeVendor(true);
                      setIsOpen(false);
                      setRemainingSeconds(0);
                      const n = forced.data?.customers_notified ?? 0;
                      if (n) alert(`Closed. ${n} customer(s) have been emailed.`);
                  } catch (e) {
                      alert('Could not close. Please try again.');
                  }
              } else {
                  alert('Could not close. Please try again.');
              }
          }
      } else {
          if (menuItems.length === 0) {
              alert("You cannot open without a menu. Add items below first.");
              return;
          }
          handleBroadcast();
      }
  };

  // --- 4. GPS & GEOLOCATION ---
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
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      if (newAddress.trim()) handleLocationSearch(newAddress);
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
        setPosition({ lat: parseFloat(bestResult.lat), lng: parseFloat(bestResult.lon) });
        setAddress(bestResult.display_name);
      }
    } catch (error) { console.error("Geocoding error:", error); } 
    finally { setIsSearching(false); }
  };

  const handleReverseGeocode = async (lat, lng) => {
    setPosition({ lat, lng });
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const result = await response.json();
      if (result && result.display_name) setAddress(result.display_name);
      else setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch (error) {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // --- 5. MENU MANAGEMENT ---
  const handleEditClick = (item) => {
    setNewItem({ 
        name: item.name, 
        desc: item.desc, 
        price: item.price, 
        image: item.image
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
        return;
      }
      setNewItem({ ...newItem, image: file }); 
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result); 
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.price) {
        alert("Name and Price are required.");
        return;
    }

    setIsUploading(true);
    let finalImageUrl = newItem.image; 

    try {
        if (newItem.image instanceof File) {
            const uploadRes = await vendorAPI.uploadImage(newItem.image);
            if (uploadRes.success) {
                finalImageUrl = uploadRes.url;
            } else {
                throw new Error("Image upload failed");
            }
        } 
        
        const itemPayload = {
            name: newItem.name,
            desc: newItem.desc,
            price: parseFloat(newItem.price),
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
        alert("Failed to save item. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  // --- 6. BROADCAST (GO LIVE) ---
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
            description: item.desc,
            price: parseFloat(item.price),
            image: item.image 
          })),
      };

      const response = await vendorAPI.checkIn(payload);

      if (response.success) {
        setIsOpen(true);
        setRemainingSeconds(response.remaining_seconds); 
        alert("You are now LIVE! Customers can see you.");
      }
    } catch (e) {
        console.error("Broadcast error:", e);
        if (e.response?.status === 401) {
             navigate('/vendor/login');
        } else {
             alert(e.response?.data?.error || 'Check-in failed');
        }
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleLogout = () => {
      logout();
      window.location.href = '/'; // Hard redirect to clear everything
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
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </nav>

      {/* Added "Back to Dashboard" button just in case */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <button onClick={() => navigate('/vendor/dashboard')} className="flex items-center text-sm text-gray-500 hover:text-orange-600">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-8">
        
        {/* STATUS CARD */}
        <section className="panel p-5 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-display text-[16px] font-bold text-text">Your broadcast</h2>
                  <p className="mt-0.5 text-[12.5px] text-text-lighter">
                    {isOpen && remainingSeconds > 0
                      ? <>Closes in <span className="tabular font-bold text-primary">{formatTime(remainingSeconds)}</span> unless you check in again.</>
                      : "You are off the map right now."}
                  </p>
                </div>
            </div>
            {isOpen && remainingSeconds > 0 && (
                <span className="chip-live flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[9.5px]">
                  <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-success" />
                  Live now
                </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
              isOpen ? 'border-success/50 bg-success/8' : 'border-text/10 bg-white/40 opacity-60 hover:opacity-100'}`}>
              <input type="radio" name="status" checked={isOpen}
                onChange={() => handleStatusChange(true)} className="sr-only" />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                isOpen ? 'border-success bg-success' : 'border-neutral-dark'}`}>
                {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-[13.5px] font-bold text-text">Open for business</span>
            </label>
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
              !isOpen ? 'border-warning/50 bg-warning/8' : 'border-text/10 bg-white/40 opacity-60 hover:opacity-100'}`}>
              <input type="radio" name="status" checked={!isOpen}
                onChange={() => handleStatusChange(false)} className="sr-only" />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                !isOpen ? 'border-warning bg-warning' : 'border-neutral-dark'}`}>
                {!isOpen && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-[13.5px] font-bold text-text">Closed for business</span>
            </label>
          </div>
        </section>

        {/* LOCATION SECTION */}
        <section className={`panel p-5 sm:p-7 transition-opacity duration-300 ${!isOpen ? 'opacity-80' : ''}`}>
          <div className="mb-1 flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <h2 className="font-display text-[16px] font-bold text-text">Where you're set up</h2>
          </div>
          <p className="mb-5 text-[12.5px] text-text-lighter">
            Drag the pin or tap the map — customers navigate straight to this spot.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="Search for location..."
                className="field w-full py-3 pl-10 pr-9 text-[14px] font-semibold"
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />}
            </div>
            <button onClick={handleUpdateGPS} disabled={isLocating}
              className="btn-ghost flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-[13px] disabled:opacity-60">
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-primary" />}
              {isLocating ? 'Locating…' : 'Use my GPS'}
            </button>
          </div>

          <div className="tabular mb-3 flex items-center gap-3 rounded-lg border border-text/8 bg-white/60 px-3 py-2 text-[11px] text-text-lighter">
             <span><span className="font-bold text-text-light">LAT</span> {position.lat.toFixed(6)}</span>
             <span className="h-3 w-px bg-neutral" />
             <span><span className="font-bold text-text-light">LNG</span> {position.lng.toFixed(6)}</span>
          </div>

          <div className="relative z-0 h-72 w-full overflow-hidden rounded-2xl border border-text/10">
             <MapContainer center={position} zoom={16} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                />
                <MapUpdater center={position} />
                <DraggableMarker position={position} setPosition={setPosition} onDragEnd={handleReverseGeocode} />
             </MapContainer>
             <div className="pointer-events-none absolute inset-x-0 top-2.5 z-[500] flex justify-center px-3">
               <span className="panel px-3 py-1.5 text-[10.5px] font-bold text-text-light">
                 Tap or drag the pin to your exact spot
               </span>
             </div>
          </div>
        </section>

        {/* MENU SECTION */}
        <section className="panel p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-[16px] font-bold text-text">Today&apos;s menu</h2>
            <span className="chip-dim px-2.5 py-1 text-[9.5px]">Live preview</span>
          </div>

          <div className="space-y-4 mb-8">
            {menuItems.map((item) => (
              <div key={item.id} className={`group flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-2xl transition-all ${editingId === item.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-100 hover:border-orange-200 bg-gray-50/50'}`}>
                <div className="h-20 w-20 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : "🍲"}
                </div>
                <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
                  <div className="font-bold text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{item.desc}</div>
                  <div className="font-bold text-orange-600">KES {item.price}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditClick(item)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg"><Pencil className="h-5 w-5" /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-5 w-5" /></button>
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
                    <><Upload className="h-5 w-5" /><span className="text-[10px] mt-1 font-medium">Img</span></>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={isUploading} />
                </label>
              </div>
              <div className="sm:col-span-3">
                <input type="text" placeholder="Dish Name" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl outline-none"
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} disabled={isUploading} />
              </div>
              <div className="sm:col-span-4">
                <input type="text" placeholder="Description" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl outline-none"
                  value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} disabled={isUploading} />
              </div>
              <div className="sm:col-span-2">
                <input type="number" placeholder="Price" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl font-bold outline-none"
                  value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} disabled={isUploading} />
              </div>
              <div className="sm:col-span-1">
                <button
                  onClick={handleSaveItem}
                  disabled={isUploading}
                  className={`w-full h-full rounded-xl flex items-center justify-center text-white ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} ${isUploading ? 'opacity-70' : ''}`}
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (editingId ? <Save className="h-5 w-5" /> : "+")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="pb-10 space-y-4">
          <button onClick={handleBroadcast} disabled={isBroadcasting || menuItems.length === 0} className={`btn-ember flex w-full items-center justify-center gap-3 py-4 text-[16px] ${isBroadcasting ? 'opacity-70' : ''}`}>
            {isBroadcasting ? <><Loader2 className="h-6 w-6 animate-spin" /> Broadcasting...</> : <><Save className="h-6 w-6" /> Broadcast Location & Menu</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default VendorCheckIn;