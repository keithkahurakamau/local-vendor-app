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

const DraggableMarker = ({ position, setPosition }) => {
  useMapEvents({ click(e) { setPosition(e.latlng); } });
  return position ? <Marker position={position} /> : null;
};

const VendorCheckIn = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ lat: -1.2921, lng: 36.8219 });
  const [address, setAddress] = useState("Moi Avenue, Nairobi CBD");
  const [isLocating, setIsLocating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Menu State
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: "Swahili Pilau", desc: "Spiced rice with tender beef chunks", price: "350", image: "🥘" },
    { id: 2, name: "Chapati Ndengu", desc: "Soft layers with green gram stew", price: "200", image: "🫓" },
  ]);

  // Edit State
  const [newItem, setNewItem] = useState({ name: '', desc: '', price: '', image: null });
  const [editingId, setEditingId] = useState(null); // Tracks which item is being edited

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

  // Populate form with item details for editing
  const handleEditClick = (item) => {
    setNewItem({ ...item, image: null }); // Keep existing image or require re-upload
    setEditingId(item.id);
    // Optional: Scroll to bottom to show user the form is ready
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewItem({ name: '', desc: '', price: '', image: null });
    setEditingId(null);
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
      const item = { ...newItem, id: Date.now(), image: "🍲" };
      setMenuItems([...menuItems, item]);
    }
    // Reset Form
    setNewItem({ name: '', desc: '', price: '', image: null });
  };

  const handleDeleteItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleBroadcast = () => {
    setIsBroadcasting(true);
    setTimeout(() => {
      setIsOpen(true);
      setIsBroadcasting(false);
      alert("You are now LIVE on the 5km radius map!");
    }, 2000);
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
              <input type="text" value={address} readOnly className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm" />
            </div>
            <button onClick={handleUpdateGPS} disabled={isLocating} className="px-6 py-3 bg-white border border-orange-200 text-orange-700 font-bold rounded-xl hover:bg-orange-50 flex items-center gap-2">
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />} Update GPS
            </button>
          </div>
          <div className="h-64 w-full rounded-2xl overflow-hidden border-2 border-orange-100 relative z-0">
             <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={position} />
                <DraggableMarker position={position} setPosition={setPosition} />
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
                <div className="h-20 w-20 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm border border-gray-100">{item.image}</div>
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
                {editingId ? "Edit Dish Details" : "Add New Item"}
              </span>
              {editingId && (
                <button onClick={handleCancelEdit} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <X className="h-3 w-3" /> Cancel Edit
                </button>
              )}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-2">
                <div className="h-full min-h-[50px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors p-2">
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] mt-1 font-medium">Img</span>
                </div>
              </div>
              <div className="sm:col-span-3">
                <input type="text" placeholder="Dish Name" className="w-full h-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="sm:col-span-4">
                <input type="text" placeholder="Short Description" className="w-full h-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <input type="number" placeholder="Price" className="w-full h-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-gray-700"
                  value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <div className="sm:col-span-1">
                <button 
                  onClick={handleSaveItem}
                  className={`w-full h-full rounded-xl flex items-center justify-center shadow-lg transition-all text-white ${editingId ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
                  title={editingId ? "Update Dish" : "Add Dish"}
                >
                  {editingId ? <Save className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
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