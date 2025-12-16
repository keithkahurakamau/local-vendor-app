import api from './api.js';

export const authService = {
  async adminLogin(email, password) {
    try {
      const response = await api.post('/auth/admin/login', { email, password });
      return response.data;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data.error || 'Login failed');
      } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection.');
      } else {
        // Other error
        throw new Error('An unexpected error occurred.');
      }
    }
  },

  async vendorLogin(email, password) {
    try {
      const response = await api.post('/auth/vendor/login', { email, password });
      return response.data;
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data.error || 'Login failed');
      } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection.');
      } else {
        // Other error
        throw new Error('An unexpected error occurred.');
      }
    }
  }
};