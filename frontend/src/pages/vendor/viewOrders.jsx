import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, Search, AlertCircle, Loader2, MapPin, Navigation, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vendorAPI } from '../../services/api';

// Fix Leaflet Icons
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// --- MAP FIT BOUNDS COMPONENT ---
const FitBounds = ({ routeCoordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoordinates, map]);
  return null;
};

const ViewOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Map Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Vendor Location (Default to Nairobi CBD, will update with browser GPS)
  const [vendorLocation, setVendorLocation] = useState({ lat: -1.2921, lng: 36.8219 }); 

  useEffect(() => {
    fetchOrders();
    // Get current vendor location for accurate routing
    navigator.geolocation.getCurrentPosition(
      (pos) => setVendorLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("Using default vendor location")
    );
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getOrders();
      if (response.data && response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status !== 404) setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = async (order) => {
    // 1. Check Payment Status
    const isPaid = ['paid', 'completed', 'successful'].includes(order.status?.toLowerCase());
    
    if (!isPaid) {
      alert("Payment not successful. Location details are hidden.");
      return;
    }

    if (!order.customer_lat || !order.customer_lon) {
      alert("Customer did not provide GPS location (Manual address only).");
      return;
    }

    setSelectedOrder(order);
    setMapLoading(true);
    setRouteCoords([]);

    // 2. Fetch Route from OSRM (Dijkstra/CH)
    try {
      const start = `${vendorLocation.lng},${vendorLocation.lat}`;
      const end = `${order.customer_lon},${order.customer_lat}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM returns [lon, lat], Leaflet needs [lat, lon]
        const swappedCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoords(swappedCoords);
        setRouteDistance((route.distance / 1000).toFixed(1)); // Meters to KM
      }
    } catch (e) {
      console.error("Routing error:", e);
      alert("Could not calculate route path.");
    } finally {
      setMapLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    (order.id?.toString() || '').includes(searchTerm) ||
    (order.customer_phone || '').includes(searchTerm) ||
    (order.mpesa_receipt_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'successful':
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="text-orange-600" /> Incoming Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage deliveries & track locations</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Order ID or Phone..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ORDER LIST */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <h3 className="text-lg font-bold text-gray-900">No Orders Found</h3>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => {
              const isPaid = ['paid', 'successful', 'completed'].includes(order.status?.toLowerCase());
              
              return (
                <div 
                  key={order.id} 
                  onClick={() => handleOrderClick(order)}
                  className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all 
                    ${isPaid ? 'hover:shadow-md cursor-pointer hover:border-orange-200' : 'opacity-75 cursor-not-allowed'}
                  `}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl hidden sm:block ${isPaid ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">Order #{order.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(order.status)} uppercase font-bold`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1 font-mono">{order.customer_phone}</span>
                          {isPaid ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <MapPin size={14} /> Click to view map
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-xs">
                              <MapPin size={14} /> Location locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">KES {order.amount}</div>
                      <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MAP MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Navigation className="text-orange-600" /> Route to Customer
                </h3>
                <p className="text-sm text-gray-500">
                  {routeDistance ? `Total Distance: ${routeDistance} km` : 'Calculating route...'}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
              {mapLoading && (
                <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
                </div>
              )}
              
              <MapContainer center={[vendorLocation.lat, vendorLocation.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                
                {/* Vendor Marker (Start) */}
                <Marker position={[vendorLocation.lat, vendorLocation.lng]}>
                  <Popup><strong>You (Vendor)</strong><br/>Start Point</Popup>
                </Marker>

                {/* Customer Marker (End) */}
                <Marker position={[selectedOrder.customer_lat, selectedOrder.customer_lon]}>
                  <Popup>
                    <strong>Customer</strong><br/>
                    {selectedOrder.delivery_location || "Marked Location"}<br/>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.customer_lat},${selectedOrder.customer_lon}`} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">
                      Open in Google Maps
                    </a>
                  </Popup>
                </Marker>

                {/* The Route Line */}
                {routeCoords.length > 0 && (
                  <>
                    <Polyline positions={routeCoords} color="#ea580c" weight={5} opacity={0.8} />
                    <FitBounds routeCoordinates={routeCoords} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Delivery Details Footer */}
            <div className="p-6 bg-white border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Details</h4>
              <div className="flex items-start gap-3">
                <MapPin className="text-orange-600 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{selectedOrder.delivery_location || "No landmark provided"}</p>
                  <p className="text-sm text-gray-500">Phone: {selectedOrder.customer_phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewOrders;