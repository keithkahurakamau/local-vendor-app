import api from './api';

const mapService = {
  /**
   * Search for vendors near user location with specific food item
   * @param {string} item - Food item to search for
   * @param {number} lat - User latitude
   * @param {number} lon - User longitude
   * @param {number} radius - Search radius in meters (default: 5000)
   * @returns {Promise} - List of nearby vendors
   */
  searchVendors: async (item, lat, lon, radius = 5000) => {
    try {
      const response = await api.get('/customer/search', {
        params: {
          item: item.trim(),
          lat,
          lon,
          radius
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw error;
    }
  },

  /**
   * Get all vendors near user (regardless of menu)
   * @param {number} lat - User latitude
   * @param {number} lon - User longitude
   * @param {number} radius - Search radius in meters (default: 5000)
   * @returns {Promise} - List of nearby vendors
   */
  getNearbyVendors: async (lat, lon, radius = 5000) => {
    try {
      const response = await api.get('/customer/nearby', {
        params: { lat, lon, radius }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching nearby vendors:', error);
      throw error;
    }
  },

  /**
   * Get detailed information about a specific vendor
   * @param {number} vendorId - Vendor ID
   * @returns {Promise} - Vendor details
   */
  getVendorDetails: async (vendorId) => {
    try {
      const response = await api.get(`/customer/vendors/${vendorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      throw error;
    }
  },

  /**
   * Create order intent
   * @param {Object} orderData - Order details
   * @param {number} orderData.vendor_id - Vendor ID
   * @param {Array} orderData.items - Array of {name, quantity, price}
   * @param {string} orderData.customer_phone - Customer phone number
   * @param {number} orderData.total_amount - Total order amount
   * @returns {Promise} - Order creation response
   */
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/customer/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
};

export default mapService;