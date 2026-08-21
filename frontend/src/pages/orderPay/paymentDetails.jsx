import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiShoppingCart, FiMapPin,
  FiShield, FiLock, FiSmartphone, FiX
} from 'react-icons/fi';
import { BiStore } from 'react-icons/bi';
import mapService from '../../services/mapService';
import { customerAPI } from '../../services/api';
import LocationPicker from '../../components/map/LocationPicker';
import { useAuth } from '../../context/AuthContext';
// We keep this import, but we will add a backup manual check
import { useLocation as useLocationContext } from '../../context/LocationContext';

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

export default function PaymentDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 1. Try to get location from Context first (set by the map/landing page).
  const { userLocation } = useLocationContext() || {};

  const { cart = [], vendor = {}, landmark = '' } = location.state || {};

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState(landmark || "");

  // --- saved addresses ---
  const [addresses, setAddresses] = useState([]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    customerAPI.getAddresses()
      .then((res) => {
        if (cancelled) return;
        const list = res.data.addresses || [];
        setAddresses(list);
        // Prefill with the default only if the user hasn't typed anything yet.
        const preferred = list.find((a) => a.is_default);
        if (preferred && !landmark) setDeliveryLocation(preferred.details);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, landmark]);

  // --- promo code ---
  const [pickedPoint, setPickedPoint] = useState(null);   // { lat, lon }
  const [showPicker, setShowPicker] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);      // { code, discount, total }
  const [promoError, setPromoError] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoBusy(true);
    setPromoError('');
    try {
      const { data } = await customerAPI.previewPromo(code, vendor.id, subtotal);
      setPromo(data);
    } catch (err) {
      setPromo(null);
      setPromoError(err.response?.data?.error || 'That code did not work.');
    } finally {
      setPromoBusy(false);
    }
  };

  const calculateFees = () => {
    const deliveryFee = 0; 
    const serviceFee = 0;  
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const grandTotal = subtotal + deliveryFee + serviceFee;
    return { subtotal, deliveryFee, serviceFee, grandTotal };
  };

  const { subtotal, deliveryFee, serviceFee, grandTotal: rawTotal } = calculateFees();
  const discount = promo?.discount || 0;
  const grandTotal = Math.max(0, rawTotal - discount);

  // --- NEW: Helper to force-get GPS if Context failed ---
  const getManualLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          }
        );
      }
    });
  };

  const handlePayment = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 9) {
      alert("Please enter a valid M-Pesa phone number (e.g., 7XXXXXXXX)");
      return;
    }
    if (!deliveryLocation.trim()) {
      alert("Please enter a delivery location.");
      return;
    }

    setLoading(true);

    try {
      // --- CRITICAL FIX: Resolve Location Logic ---
      // A pin the customer placed deliberately beats a passive GPS reading.
      let finalLat = pickedPoint?.lat ?? userLocation?.lat;
      let finalLng = pickedPoint?.lon ?? userLocation?.lon;

      // If Context location is missing, FORCE a manual check
      if (!finalLat || !finalLng) {
        console.log("Context location missing. Requesting manual GPS...");
        try {
            const manualLoc = await getManualLocation();
            finalLat = manualLoc.lat;
            finalLng = manualLoc.lng;
            console.log("Manual GPS acquired:", finalLat, finalLng);
        } catch (gpsError) {
            console.warn("Could not get GPS:", gpsError);
            // Optional: You can alert the user or proceed with null (Map won't work)
            alert("We could not get your GPS location. The delivery map might not work accurately.");
        }
      }

      console.log("SENDING PAYMENT WITH:", { finalLat, finalLng });

      const response = await mapService.initiatePayment(
        vendor.id,
        subtotal,
        `+254${phoneNumber}`,
        cart,
        deliveryLocation,
        finalLat, // Correct Latitude
        finalLng, // Correct Longitude
        promo?.code
      );

      navigate('/payment-success', {
        state: {
          amount: grandTotal,
          vendor,
          phone: `+254${phoneNumber}`,
          orderId: response.order_number || `HL-${Date.now().toString().slice(-6)}`,
          paymentResponse: response
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      navigate('/payment-failed', {
        state: {
          error: error.message || "Payment failed. Please try again.",
          vendor,
          cart
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 font-sans text-gray-800">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-orange-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-white border border-orange-100 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-colors text-gray-700"
          >
            <FiArrowLeft className="text-lg" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 p-1.5 rounded-lg">
              <BiStore className="text-white text-lg" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Hyper<span className="text-orange-600">Local</span>
            </span>
          </div>
          
          <div className="w-10"></div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Vendor Card */}
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-orange-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-100 flex-shrink-0 border border-orange-50">
                  <VendorImage src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{vendor.name || "Vendor"}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    {vendor.distance && (
                      <span className="flex items-center gap-1">
                        <FiMapPin className="text-orange-500" /> 
                        {vendor.distance} away
                      </span>
                    )}
                    {vendor.status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        vendor.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {vendor.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Order Items */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiShoppingCart className="text-orange-600"/> Order Items ({cart.length})
              </h3>
              
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <FiShoppingCart className="mx-auto text-4xl text-gray-300 mb-4" />
                  <p className="text-gray-500">No items in cart</p>
                  <button onClick={() => navigate('/customer/map')} className="mt-4 text-orange-600 font-medium hover:underline">
                    Back to Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={item.id || index} className="flex items-center justify-between p-3 bg-white border border-orange-50 rounded-xl hover:border-orange-200 transition-colors shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-orange-50">
                            <VendorImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
                          <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 whitespace-nowrap">KES {item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* EDITABLE DELIVERY LOCATION */}
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiMapPin className="text-orange-600"/> Delivery Location
            </h3>
            
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                {addresses.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {addresses.map((a) => (
                      <button key={a.id} type="button"
                        onClick={() => setDeliveryLocation(a.details)}
                        className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all ${
                          deliveryLocation === a.details
                            ? 'bg-orange-600 text-white'
                            : 'bg-white border border-orange-200 text-gray-600 hover:border-orange-400'}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Address / Landmark
                </label>
                <input 
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="Enter delivery details (e.g. Building, Floor)"
                    className="w-full bg-white border border-orange-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none block p-2.5 transition-all"
                />
                <button type="button" onClick={() => setShowPicker((v) => !v)}
                    className="mt-3 w-full py-2 rounded-lg border border-orange-200 bg-white text-xs font-bold text-gray-700 hover:border-orange-400 transition-colors">
                    {showPicker ? 'Hide map' : pickedPoint ? 'Change the pin on the map' : 'Pin the exact spot on a map'}
                </button>

                {showPicker && (
                  <div className="mt-3">
                    <LocationPicker
                      height={230}
                      label="Where should the vendor meet you?"
                      onChange={(p) => {
                        setPickedPoint(p);
                        if (!deliveryLocation.trim() && p.address) setDeliveryLocation(p.address);
                      }}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <FiShield size={12} className="text-orange-400" />
                    {pickedPoint
                      ? 'Pin set — your vendor will navigate straight to it.'
                      : 'Your vendor will use this to find you.'}
                </p>
            </div>
          </div>

          {/* Payment Security */}
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                <FiShield className="text-blue-600 text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Secure Payment</h3>
                <p className="text-sm text-gray-500">Your payment is protected with end-to-end encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiLock className="text-green-600" />
              <span>SSL secured connection</span>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: Payment --- */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-white rounded-2xl border border-orange-100 shadow-xl shadow-orange-100/20 overflow-hidden">
            <div className="p-6 border-b border-orange-100 bg-orange-50/30">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Complete Payment</h2>
              <p className="text-gray-500 text-sm">Review bill and pay securely</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Summary */}
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>KES {subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>KES {deliveryFee}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Service Fee</span>
                  <span>KES {serviceFee}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Discount ({promo.code})</span>
                    <span>- KES {discount}</span>
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Promo code"
                      className="flex-1 min-w-0 px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button type="button" onClick={applyPromo} disabled={promoBusy || !promoInput.trim()}
                      className="shrink-0 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors">
                      {promoBusy ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p className="mt-1.5 text-xs font-semibold text-red-500">{promoError}</p>}
                  {promo && (
                    <p className="mt-1.5 text-xs font-semibold text-green-600">
                      {promo.percent_off}% off applied.
                    </p>
                  )}
                </div>

                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-orange-100">
                  <span>Total Amount</span>
                  <span>KES {grandTotal}</span>
                </div>
              </div>

              {/* M-Pesa Input Section */}
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-600 p-2 rounded-lg shadow-sm">
                     <FiSmartphone className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">M-Pesa Express</h3>
                    <p className="text-xs text-gray-600">Enter phone for STK Push</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3.5 text-gray-500 font-medium">
                      +254
                    </div>
                    <input
                      type="tel"
                      placeholder="7XXXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setPhoneNumber(value);
                      }}
                      className="w-full pl-14 pr-4 py-3 bg-white border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium text-lg tracking-wide shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={loading || cart.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${
                    loading || cart.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-orange-600 shadow-orange-200 transform hover:-translate-y-0.5"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiLock /> Pay KES {grandTotal}
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate(-1)}
                  className="w-full py-4 rounded-xl font-bold border-2 border-red-50 bg-white text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <FiX className="text-xl" /> Cancel Order
                </button>
              </div>

            </div>

            <div className="bg-orange-50/50 border-t border-orange-100 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <FiShield className="text-green-600" />
                <span>Secured by M-Pesa & HyperLocal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}