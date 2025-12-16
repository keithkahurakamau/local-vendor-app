import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Store, User, Mail, Phone, Upload, Lock, 
  Loader2, Eye, EyeOff, MapPin, Crosshair, Navigation, AlertCircle, CheckCircle 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Helper: Update Map View when coordinates change ---
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

// --- Helper: Handle Manual Clicks on Map ---
const LocationMarker = ({ position, setPosition, setFormData }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setFormData(prev => ({
        ...prev,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      }));
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const VendorRegister = () => {
  const navigate = useNavigate();
  
  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '', 
    latitude: '',
    longitude: '',
    password: '',
    confirmPassword: '',
    image: null
  });
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Map State
  const [markerPosition, setMarkerPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([-1.2921, 36.8219]); // Default: Nairobi
  const [mapZoom, setMapZoom] = useState(13);

  // --- HANDLER: Get GPS Location ---
  const handleGetLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = { lat: latitude, lng: longitude };
        
        // Update State
        setMarkerPosition(newPos);
        setMapCenter([latitude, longitude]);
        setMapZoom(16);
        setFormData(prev => ({
          ...prev,
          latitude: latitude,
          longitude: longitude
        }));
        
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please click the map to set location manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("The request to get user location timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // General Input Handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Image Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFormData(prev => ({ ...prev, image: e.dataTransfer.files[0] }));
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, image: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.latitude || !formData.longitude) {
      alert("Please set a location on the map.");
      setIsLoading(false);
      return;
    }
    
    // Simulate API
    setTimeout(() => {
      setIsLoading(false);
      navigate('/vendor/dashboard');
    }, 2000);
  };

  return (
    // CRITICAL FIX: fixed inset-0 z-50 covers the whole screen.
    // overflow-y-auto allows scrolling for the long form.
    <div className="fixed inset-0 z-50 w-screen h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 font-sans overflow-y-auto">
      
      {/* Header */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-md">
            <Store className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:block">Hyper-Local</span>
        </div>
        <Link 
          to="/vendor/login"
          className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl shadow-sm hover:bg-gray-50 hover:text-orange-600 transition-colors"
        >
          Login
        </Link>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-white/50 overflow-hidden mb-10">
          
          <div className="px-8 pt-8 pb-4 border-b border-gray-100">
             <h1 className="text-2xl font-bold text-gray-900">Vendor Registration</h1>
             <p className="text-gray-500 text-sm mt-1">Join the network and start selling within your 5km radius.</p>
          </div>

          <div className="p-8 space-y-10">
            
            {/* Vendor Details */}
            <section>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Store className="h-4 w-4" /> Vendor Details
              </h3>
              
              <div className="space-y-6">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    required
                    placeholder="e.g. Mama Oliech's Kitchen"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    value={formData.businessName}
                    onChange={handleChange}
                  />
                </div>

                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Owner Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="ownerName"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="John Doe"
                        value={formData.ownerName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="vendor@mail.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="0712 345 678"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* --- LOCATION SECTION --- */}
                <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900">Store Location</label>
                        <p className="text-xs text-gray-500 mt-1">We need your exact coordinates for the 5km search.</p>
                      </div>
                      
                      {/* GPS Button */}
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isLocating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <Navigation className="h-4 w-4 fill-current" />
                            Use Current Location
                          </>
                        )}
                      </button>
                   </div>
                   
                   {/* Location Error Alert */}
                   {locationError && (
                     <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                       <AlertCircle className="h-4 w-4 shrink-0" />
                       {locationError}
                     </div>
                   )}

                   {/* Map Container */}
                   <div className="h-72 w-full rounded-xl overflow-hidden border-2 border-white shadow-sm relative z-0">
                      <MapContainer 
                        center={mapCenter} 
                        zoom={mapZoom} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapUpdater center={mapCenter} zoom={mapZoom} />
                        <LocationMarker 
                          position={markerPosition} 
                          setPosition={setMarkerPosition} 
                          setFormData={setFormData}
                        />
                      </MapContainer>
                      
                      {/* Manual Pin Instruction Overlay */}
                      {!markerPosition && !isLocating && (
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg text-xs font-semibold text-gray-700 border border-gray-200 pointer-events-none flex items-center gap-2">
                            <Crosshair className="h-3 w-3 text-orange-600" />
                            Tap map to set pin manually
                         </div>
                      )}
                   </div>

                   {/* Coordinates & Custom Address Field */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Coordinates (Read Only) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">GPS Coordinates</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                          <input 
                            type="text" 
                            readOnly 
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 font-mono"
                            value={formData.latitude ? `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}` : 'Not set'}
                          />
                        </div>
                      </div>

                      {/* Manual Address Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Building / Landmark / Street</label>
                        <input 
                          type="text" 
                          name="address"
                          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                          placeholder="e.g. Bazaar Plaza, 2nd Floor"
                          value={formData.address}
                          onChange={handleChange}
                        />
                      </div>
                   </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Storefront Image</label>
                  <div
                    className={`relative w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      dragActive ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleImageChange}
                    />
                    {formData.image ? (
                      <div className="flex items-center text-green-600 gap-2">
                        <CheckCircle className="h-6 w-6" />
                        <span className="font-medium">{formData.image.name}</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2">
                           <Upload className="h-6 w-6 text-orange-500" />
                        </div>
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold text-orange-600">Click to upload</span> or drag and drop
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-gray-100"></div>

            {/* Security Section */}
            <section>
              <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Lock className="h-4 w-4" /> Security Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-200 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">
                By registering, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorRegister;