import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Adjust if backend runs on different port
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    const vendorToken = localStorage.getItem('vendorToken');
    const token = adminToken || vendorToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      // Token expired or invalid, clear token and redirect to login
      localStorage.removeItem('adminToken');
      localStorage.removeItem('vendorToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const customerAPI = {
  getVendors: (params) => api.get('/api/customer/vendors', { params }),
  searchVendors: (params) => api.get('/api/customer/search', { params }),
};

export default api;
