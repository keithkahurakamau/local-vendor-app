import api from './api';

export const authService = {
  // Generic Login (Used by Vendors)
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Admin Login (Wrapper for clarity, uses same endpoint usually)
  adminLogin: async (email, password) => {
    const response = await api.post('/auth/login', { email, password, role: 'admin' });
    if (response.data.token) {
      // Store specifically for admin if needed, or share 'user' key
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Registration
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('user'));
  }
};