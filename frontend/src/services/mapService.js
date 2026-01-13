import api from './api';

const mapService = {
  // Fetch nearby vendors based on coordinates
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

  // Search for specific items
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

  // Get details for a specific vendor
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

  // --- MISSING FUNCTION ADDED HERE ---
  initiatePayment: async (vendorId, amount, phoneNumber, items, deliveryLocation) => {
    try {
      // Construct payload matching backend expectations
      const payload = {
        vendor_id: vendorId,
        amount: amount,
        phone_number: phoneNumber,
        items: items,
        delivery_location: deliveryLocation
      };

      const response = await api.post('/customer/pay', payload);
      return response.data;
    } catch (error) {
      console.error("Payment initiation error:", error);
      throw new Error(error.response?.data?.error || "Payment failed");
    }
  }
};

export default mapService;