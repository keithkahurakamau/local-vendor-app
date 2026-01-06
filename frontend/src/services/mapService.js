import api from './api';

const mapService = {
  /**
   * Search for vendors near user location with specific food item
   * @param {string} item - Food item to search for
   * @param {number} lat - User latitude
   * @param {number} lon - User longitude
   * @param {number} radius - Search radius in meters (default: 5000)
   * @returns {Promise<Array>} - List of nearby vendors
   */
  searchVendors: async (item, lat, lon, radius = 5000) => {
    try {
      const response = await api.get('/api/customer/search', {
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
   * @returns {Promise<Array>} - List of nearby vendors
   */
  getNearbyVendors: async (lat, lon, radius = 5000) => {
    try {
      const response = await api.get('/api/customer/nearby', {
        params: { lat, lon, radius }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching nearby vendors:', error);
      throw error;
    }
  },

  /**
   * Search for places using Nominatim (OpenStreetMap)
   * @param {string} query - Place name to search for
   * @returns {Promise<Array>} - List of places with coordinates
   */
  searchPlaces: async (query) => {
    try {
      // Using native fetch here to avoid sending backend auth tokens to OSM
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=KE`,
        {
          headers: {
            // REQUIRED: Nominatim policy requires a valid User-Agent to identify the app.
            // Replace 'LocalVendorApp/1.0' with your actual app name.
            'User-Agent': 'LocalVendorApp/1.0',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`OSM API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.map(place => ({
        name: place.display_name,
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        type: place.type
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  },

  /**
   * Get detailed information about a specific vendor
   * @param {number|string} vendorId - Vendor ID
   * @returns {Promise<Object>} - Vendor details
   */
  getVendorDetails: async (vendorId) => {
    try {
      const response = await api.get(`/api/customer/vendor/${vendorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      throw error;
    }
  },

  /**
   * Get nearby landmarks for delivery location selection
   * @param {number} lat - User latitude
   * @param {number} lon - User longitude
   * @param {number} radius - Search radius in meters (default: 200)
   * @returns {Promise<Array>} - List of nearby landmarks
   */
  getNearbyLandmarks: async (lat, lon, radius = 200) => {
    try {
      const response = await api.get('/api/customer/landmarks', {
        params: { lat, lon, radius }
      });

      if (response.data.success) {
        // Transform backend response to match expected format
        const landmarks = response.data.landmarks.map((landmark, index) => ({
          id: index + 1,
          lat: landmark.latitude,
          lon: landmark.longitude,
          name: landmark.name,
          type: landmark.type,
          distance: landmark.distance
        }));

        return { success: true, landmarks };
      } else {
        throw new Error('Backend returned error');
      }
    } catch (error) {
      console.error('Error fetching nearby landmarks:', error);
      // Return empty landmarks on error - user can still enter location manually
      return { success: false, error: error.message, landmarks: [] };
    }
  },

  /**
   * Initiate M-Pesa payment
   * @todo Move this to a dedicated paymentService.js in future refactoring.
   * @param {number|string} vendorId - Vendor ID
   * @param {number} amount - Payment amount
   * @param {string} customerPhone - Customer phone number
   * @returns {Promise<Object>} - Payment initiation response
   */
  initiatePayment: async (vendorId, amount, customerPhone) => {
    try {
      const response = await api.post('/api/customer/pay', {
        vendor_id: vendorId,
        amount: amount,
        customer_phone: customerPhone
      });
      return response.data;
    } catch (error) {
      console.error('Error initiating payment:', error);
      throw error;
    }
  }
};

export default mapService;