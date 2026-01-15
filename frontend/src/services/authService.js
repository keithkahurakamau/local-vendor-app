import api from './api';

export const authService = {
  // Generic Login (Used by Vendors)
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    
    // FIX: Check for 'access_token' instead of 'token'
    if (response.data.access_token || response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Admin Login
  adminLogin: async (email, password) => {
    const response = await api.post('/auth/login', { email, password, role: 'admin' });
    
    // FIX: Check for 'access_token' here too
    if (response.data.access_token || response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Registration
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    
    // FIX: Check for 'access_token' here too (or 'user_id' if your register doesn't return a token)
    // Note: If your register endpoint doesn't return a token, you might need to auto-login after register.
    if (response.data.access_token || response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('user');
    // Optional: Redirect to login or clear other state
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};