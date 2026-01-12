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
      // Calls /api/customer/vendor/:id
      const response = await api.get(`/customer/vendor/${vendorId}`);
      if (response.data.success) {
        return response.data.vendor;
      }
      return null;
    } catch (error) {
      console.error("Error fetching vendor details:", error);
      throw error;
    }
  }
};

export default mapService;