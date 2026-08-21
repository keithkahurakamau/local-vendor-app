import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Loader2, MapPin, Navigation, X, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { vendorAPI } from '../../services/api';
import { originIcon, destinationIcon } from '../../components/map/markers';

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
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Map Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Vendor Location (Default to Nairobi CBD)
  const [vendorLocation, setVendorLocation] = useState({ lat: -1.2921, lng: 36.8219 });
  const [updatingId, setUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState('');

  // The server owns the state machine; it returns `allowed` on a 409 so the UI never
  // has to duplicate the transition rules.
  const NEXT_STEP = { Paid: 'Preparing', Preparing: 'Ready', Ready: 'Collected' };

  const advanceStatus = async (order, e) => {
    e.stopPropagation();                       // don't open the map modal
    const target = NEXT_STEP[order.status];
    if (!target) return;

    setUpdatingId(order.id);
    setStatusError('');
    try {
      const res = await vendorAPI.updateOrderStatus(order.id, target);
      const updated = res.data.order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: updated.status } : o)));
    } catch (err) {
      setStatusError(err.response?.data?.error || 'Could not update that order.');
    } finally {
      setUpdatingId(null);
    }
  };


  useEffect(() => {
    fetchOrders();
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
    const isPaid = ['paid', 'completed', 'successful', 'preparing', 'ready', 'collected'].includes(order.status?.toLowerCase());
    
    if (!isPaid) {
      alert("Payment not successful. Location details are hidden.");
      return;
    }

    // 2. Validate Coordinates strict check
    if (!order.customer_lat || !order.customer_lon || order.customer_lat === 0) {
      alert("Customer did not provide valid GPS location (Manual address only).");
      return;
    }

    setSelectedOrder(order);
    setMapLoading(true);
    setRouteCoords([]);

    // 3. Fetch Route from OSRM
    try {
      // OSRM expects [Lng, Lat]
      const start = `${vendorLocation.lng},${vendorLocation.lat}`;
      const end = `${order.customer_lon},${order.customer_lat}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Swap back to [Lat, Lng] for Leaflet
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
    // CHANGE 1: Theme Background
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 font-sans p-6 relative">
      
      {/* ADDED: Escape / Back Button */}
      <div className="max-w-6xl mx-auto mb-6">
        <button 
          onClick={() => navigate('/vendor/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors font-medium bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-orange-100 border border-orange-100 w-fit"
        >
           <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        {/* CHANGE 2: Header Styling */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-xl shadow-orange-100/50 border border-orange-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="text-orange-600" /> Incoming Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage deliveries & track locations</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-orange-300" />
            <input 
              type="text" 
              placeholder="Search Order ID or Phone..." 
              className="w-full pl-10 pr-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ORDER LIST */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-orange-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">No Orders Found</h3>
            <p className="text-gray-500">Your order list is empty for now.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {statusError && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
                <X size={14} /> {statusError}
              </div>
            )}
            {filteredOrders.map((order) => {
              const isPaid = ['paid', 'successful', 'completed', 'preparing', 'ready', 'collected'].includes(order.status?.toLowerCase());
              
              return (
                <div 
                  key={order.id} 
                  onClick={() => handleOrderClick(order)}
                  // CHANGE 3: Card Hover Effects
                  className={`bg-white p-6 rounded-2xl shadow-sm border border-orange-100 transition-all 
                    ${isPaid ? 'hover:shadow-lg hover:shadow-orange-100/50 cursor-pointer hover:border-orange-200 hover:-translate-y-0.5' : 'opacity-75 cursor-not-allowed bg-gray-50'}
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
                          <span className="flex items-center gap-1 font-mono bg-gray-50 px-1.5 rounded">{order.customer_phone}</span>
                          {isPaid ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 rounded-full text-xs">
                              <MapPin size={12} /> Click to view map
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-xs bg-red-50 px-2 rounded-full">
                              <MapPin size={12} /> Location locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 md:w-auto md:flex-col md:items-end">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">KES {order.amount}</div>
                        <div className="text-xs text-gray-400 font-medium">{new Date(order.created_at).toLocaleString()}</div>
                      </div>
                      {NEXT_STEP[order.status] && (
                        <button
                          onClick={(e) => advanceStatus(order, e)}
                          disabled={updatingId === order.id}
                          className="btn-ember shrink-0 whitespace-nowrap px-4 py-2 text-xs disabled:opacity-60"
                        >
                          {updatingId === order.id
                            ? 'Saving...'
                            : `Mark ${NEXT_STEP[order.status]}`}
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

      {/* MAP MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl shadow-orange-900/20 overflow-hidden flex flex-col h-[85vh] border border-orange-100">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-orange-100 flex justify-between items-center bg-orange-50/50">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <Navigation className="text-orange-600" /> Route to Customer
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  {routeDistance ? `Total Distance: ${routeDistance} km` : 'Calculating optimal route...'}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-orange-100 text-gray-500 hover:text-orange-600 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
              {mapLoading && (
                <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
                  <p className="text-sm text-gray-500 font-medium">Calculating path via OSRM...</p>
                </div>
              )}
              
              <MapContainer center={[vendorLocation.lat, vendorLocation.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                />
                
                {/* Vendor Marker (Start) */}
                <Marker position={[vendorLocation.lat, vendorLocation.lng]} icon={originIcon()}>
                  <Popup>
                    <div className="panel px-3.5 py-2.5" style={{ minWidth: 150 }}>
                      <p className="font-display text-[13px] font-bold text-text">Your stall</p>
                      <p className="mt-0.5 text-[11px] text-text-lighter">Route starts here</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Customer Marker (End) */}
                <Marker position={[selectedOrder.customer_lat, selectedOrder.customer_lon]} icon={destinationIcon()}>
                  <Popup>
                    <div className="panel px-3.5 py-2.5" style={{ minWidth: 178 }}>
                      <p className="font-display text-[13px] font-bold text-text">Drop-off</p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-text-light">
                        {selectedOrder.delivery_location || 'Pinned location'}
                      </p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.customer_lat},${selectedOrder.customer_lon}`}
                        target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                      >
                        <Navigation size={11} /> Navigate there
                      </a>
                    </div>
                  </Popup>
                </Marker>

                {/* The Route Line */}
                {routeCoords.length > 0 && (
                  <>
                    <Polyline positions={routeCoords} color="#FFFFFF" weight={10} opacity={0.85} />
                    <Polyline positions={routeCoords} color="#FF6B35" weight={5} opacity={0.95} />
                    <FitBounds routeCoordinates={routeCoords} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Delivery Details Footer */}
            <div className="p-6 bg-white border-t border-orange-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Delivery Details</h4>
              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="bg-white p-2 rounded-full shadow-sm">
                    <MapPin className="text-orange-600 h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{selectedOrder.delivery_location || "No landmark provided"}</p>
                  <p className="text-sm text-gray-600 mt-1">Customer Phone: <span className="font-mono font-bold">{selectedOrder.customer_phone}</span></p>
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