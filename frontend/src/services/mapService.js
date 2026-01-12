import api from './api';

const mapService = {
  /**
   * Search for vendors near user location with specific food item
   */
  searchVendors: async (item, lat, lon, radius = 5000) => {
    try {
      // FIX: Changed from '/api/customer/search' to '/customer/search'
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
   */
  getNearbyVendors: async (lat, lon, radius = 5000) => {
    try {
      // FIX: Changed from '/api/customer/nearby' to '/customer/nearby'
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
   * Search for places using Nominatim (OpenStreetMap)
   */
  searchPlaces: async (query) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=KE`,
        {
          headers: {
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
   */
  getVendorDetails: async (vendorId) => {
    try {
      // FIX: Changed from '/api/customer/vendor/...' to '/customer/vendor/...'
      const response = await api.get(`/customer/vendor/${vendorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      throw error;
    }
  },

  /**
   * Get nearby landmarks
   */
  getNearbyLandmarks: async (lat, lon, radius = 200) => {
    try {
      // FIX: Changed from '/api/customer/landmarks' to '/customer/landmarks'
      const response = await api.get('/customer/landmarks', {
        params: { lat, lon, radius }
      });

      if (response.data.success) {
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
      return { success: false, error: error.message, landmarks: [] };
    }
  },

  initiatePayment: async (vendorId, amount, customerPhone) => {
    try {
      // FIX: Changed from '/api/customer/pay' to '/customer/pay'
      const response = await api.post('/customer/pay', {
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