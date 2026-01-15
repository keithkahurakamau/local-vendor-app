import api from './api';

const mapService = {
  // 1. Fetch nearby vendors
  getNearbyVendors: async (lat, lng, radius = 5000) => {
    try {
      const response = await api.get('/customer/nearby', {
        params: { lat, lon: lng, radius }
      });
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
  initiatePayment: async (vendorId, amount, phoneNumber, items, deliveryLocation, lat, lng) => {
    try {
      console.log("🚀 mapService sending GPS:", { lat, lng });

      const payload = {
        vendorId: vendorId,             
        amount: amount,                 
        phone: phoneNumber,             
        items: items,                   
        deliveryLocation: deliveryLocation,
        customerLat: lat,
        customerLon: lng
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