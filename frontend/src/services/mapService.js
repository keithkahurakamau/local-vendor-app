import api from './api';

const mapService = {
  // 1. Fetch nearby vendors
  getNearbyVendors: async (lat, lng, radius = 5000, filters = {}) => {
    try {
      // Filtering and sorting happen server-side so the map, the list and the
      // bottom sheet can never disagree about what "nearest" or "best rated" means.
      const params = { lat, lon: lng, radius };
      if (filters.max_price) params.max_price = filters.max_price;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.min_rating) params.min_rating = filters.min_rating;
      if (filters.sort && filters.sort !== 'distance') params.sort = filters.sort;

      const response = await api.get('/customer/nearby', { params });
      return response.data.vendors || [];
    } catch (error) {
      console.error("Error fetching nearby vendors:", error);
      return [];
    }
  },

  // 2. Search for items
  searchVendors: async (item, lat, lng) => {
    try {
      const response = await api.get('/customer/search', {
        params: { item, lat, lon: lng }
      });
      return response.data.vendors || [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  },

  // 2b. Geocode a place name (Nominatim), so users can search by location as well
  //     as by dish. Same provider VendorCheckIn uses for its address lookup.
  searchPlaces: async (query) => {
    if (!query || !query.trim()) return [];
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=KE`
      );
      if (!response.ok) return [];
      const results = await response.json();
      return results.map((r) => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
      }));
    } catch (error) {
      console.error('Place search error:', error);
      return [];
    }
  },

  // 2c. Turn a coordinate back into a human address, so a dropped pin can be
  //     described in words the vendor will recognise on arrival.
  reverseGeocode: async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      if (!response.ok) return null;
      const result = await response.json();
      if (!result?.display_name) return null;
      const a = result.address || {};
      // Prefer a short, local description over the full civic string.
      const short = [a.road || a.pedestrian || a.suburb, a.suburb !== a.city ? a.city : null]
        .filter(Boolean).join(', ');
      return { full: result.display_name, short: short || result.display_name.split(',').slice(0, 2).join(',') };
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  },

  // 3. Get vendor details
  getVendorDetails: async (vendorId) => {
    try {
      const response = await api.get(`/customer/vendor/${vendorId}`);
      if (response.data.success) {
        return response.data.vendor;
      }
      return null;
    } catch (error) {
      console.error("Error fetching vendor details:", error);
      throw error;
    }
  },

  // 4. Initiate Payment
  initiatePayment: async (vendorId, amount, phoneNumber, items, deliveryLocation, lat, lng, promoCode) => {
    try {
      console.log("🚀 mapService sending GPS:", { lat, lng });

      const payload = {
        vendorId: vendorId,             
        amount: amount,                 
        phone: phoneNumber,             
        items: items,                   
        deliveryLocation: deliveryLocation,
        customerLat: lat,
        customerLon: lng,
        // Send only the code. The server revalidates it and recomputes the total,
        // so a tampered client price cannot be charged.
        promoCode: promoCode || undefined
      };

      const response = await api.post('/customer/pay', payload);
      return response.data;
    } catch (error) {
      console.error("Payment initiation error:", error);
      throw new Error(error.response?.data?.error || "Payment failed");
    }
  },

  // 5. Check Payment Status (Polling)
  checkPaymentStatus: async (checkoutId) => {
    try {
      const response = await api.get(`/customer/payment-status/${checkoutId}`);
      return response.data; // Returns { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' }
    } catch (error) {
      console.error("Status check error:", error);
      return { status: 'PENDING' }; // Default to pending on error to keep polling
    }
  }
};

export default mapService;