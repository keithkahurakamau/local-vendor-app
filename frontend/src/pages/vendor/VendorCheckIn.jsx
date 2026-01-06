import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, MapPin, Navigation, Clock, LogOut,
  ShoppingBag, Plus, Upload, Trash2, Save, Loader2, Pencil, X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


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
  const [position, setPosition] = useState({ lat: -1.2921, lng: 36.8219 });
  const [address, setAddress] = useState("Moi Avenue, Nairobi CBD");
  const [isLocating, setIsLocating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Menu State
  const [menuItems, setMenuItems] = useState([]);

  // Edit State
  const [newItem, setNewItem] = useState({ name: '', desc: '', price: '', image: null });
  const [editingId, setEditingId] = useState(null); // Tracks which item is being edited
  const [imagePreview, setImagePreview] = useState(null); // For displaying selected image

  // --- HANDLERS ---
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

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for search
    const timeout = setTimeout(() => {
      if (newAddress.trim()) {
        handleLocationSearch(newAddress);
      }
    }, 1000); // Search after 1 second of no typing

    setSearchTimeout(timeout);
  };

  const handleLocationSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Use Nominatim API for geocoding (OpenStreetMap)
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
        alert("Location not found. Please try a different search term.");
      }
    } catch (error) {
      alert("Error searching for location. Please try again.");
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
        // Fallback to coordinates if no name found
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      // Fallback to coordinates
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // Populate form with item details for editing
  const handleEditClick = (item) => {
    setNewItem({ ...item, image: null }); // Keep existing image or require re-upload
    setEditingId(item.id);
    // Optional: Scroll to bottom to show user the form is ready
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
      // Check file size limit (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('Image size must be less than 5MB');
        e.target.value = ''; // Clear the input
        return;
      }

      setNewItem({ ...newItem, image: file });
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = () => {
    if (!newItem.name || !newItem.price) return;

    if (editingId) {
      // UPDATE Logic
      setMenuItems(menuItems.map(item =>
        item.id === editingId
        ? { ...item, name: newItem.name, desc: newItem.desc, price: newItem.price }
        : item
      ));
      setEditingId(null);
    } else {
      // CREATE Logic
      const item = { ...newItem, id: Date.now(), image: imagePreview || "🍲" };
      setMenuItems([...menuItems, item]);
    }
    // Reset Form
    setNewItem({ name: '', desc: '', price: '', image: null });
    setImagePreview(null);
  };

  const handleDeleteItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const token = localStorage.getItem('vendorToken');
      if (!token) {
        alert("Please login first");
        navigate('/vendor/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/vendor/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: position.lat,
          longitude: position.lng,
          address: address,
          menu_items: menuItems.map(item => ({
            name: item.name,
            description: item.desc,
            price: parseFloat(item.price)
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsOpen(true);
        alert("You are now LIVE on the 5km radius map!");
      } else {
        alert(data.error || 'Check-in failed');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/50 pb-20 font-sans">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 bg-orange-600 rounded-lg flex items-center justify-center">
             <Store className="h-5 w-5 text-white" />
           </div>
           <span className="font-bold text-gray-900 hidden sm:block">Hyper-Local Vendor</span>
        </div>
        <button onClick={() => navigate('/vendor/login')} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">

        {/* Status Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <Clock className="h-6 w-6 text-orange-600 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Vendor Status</h2>
              <p className="text-sm text-gray-500">Auto-closed if inactive for <span className="font-bold text-orange-600">3 hours</span>.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer ${isOpen ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <input type="radio" name="status" checked={isOpen} onChange={() => setIsOpen(true)} className="h-5 w-5 text-green-600" />
              <span className="ml-3 font-bold text-gray-900">Open for Business</span>
            </label>
            <label className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer ${!isOpen ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
              <input type="radio" name="status" checked={!isOpen} onChange={() => setIsOpen(false)} className="h-5 w-5 text-red-600" />
              <span className="ml-3 font-bold text-gray-900">Closed for Business</span>
            </label>
          </div>
        </section>

        {/* Location Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6 sm:p-8">
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
        <section className="bg-white rounded-3xl shadow-sm border border-orange-100 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Menu Update</h2>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Live Preview</span>
          </div>

          {/* Menu Items List */}
          <div className="space-y-4 mb-8">
            {menuItems.map((item) => (
              <div key={item.id} className={`group flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-2xl transition-all ${editingId === item.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-100 hover:border-orange-200 bg-gray-50/50'}`}>
                <div className="h-20 w-20 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                  {item.image.startsWith('data:') ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    item.image
                  )}
                </div>
                <div className="flex-1 w-full space-y-2 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
                  <div className="font-bold text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{item.desc}</div>
                  <div className="font-bold text-orange-600">KES {item.price}</div>
                </div>

                {/* Actions: Pencil & Trash */}
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

          {/* Add / Edit Form */}
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
                <label className="h-full min-h-[50px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors p-2">
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
                  />
                </label>
              </div>
              <div className="sm:col-span-3">
                <input type="text" placeholder="Dish Name" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm text-gray-900 placeholder-gray-500"
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="sm:col-span-4">
                <input type="text" placeholder="Short Description" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm text-gray-900 placeholder-gray-500"
                  value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <input type="number" placeholder="Price" className="w-full h-full px-4 py-2 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm font-bold text-gray-900 placeholder-gray-500"
                  value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="sm:col-span-1">
                <button
                  onClick={handleSaveItem}
                  className={`w-full h-full rounded-xl flex items-center justify-center shadow-lg transition-all text-white ${editingId ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
                  title={editingId ? "Update Dish" : "Add Dish"}
                >
                  {editingId ? <Save className="h-5 w-5" /> : "+"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Broadcast Button */}
        <div className="pb-10">
          <button onClick={handleBroadcast} disabled={isBroadcasting} className="w-full py-5 bg-gray-900 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3">
            {isBroadcasting ? <><Loader2 className="h-6 w-6 animate-spin" /> Broadcasting...</> : <><Save className="h-6 w-6" /> Broadcast Location & Menu</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default VendorCheckIn;
