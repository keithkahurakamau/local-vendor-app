import axios from 'axios';

// Base URL configuration
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Token to requests
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
});

// --- 1. AUTH API ---
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
};

// --- 2. VENDOR API ---
export const vendorAPI = {
  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await api.post('/vendor/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  checkIn: async (payload) => {
    const response = await api.post('/vendor/checkin', payload);
    return response.data;
  },
  getVendorStatus: async () => {
    return api.get('/vendor/status');
  },
  closeVendor: async () => {
    return api.post('/vendor/close');
  },
  getOrders: () => api.get('/vendor/orders'),
  updateOrderStatus: (id, status) => api.patch(`/vendor/order/${id}/status`, { status })
};

// --- 3. CUSTOMER API ---
export const customerAPI = {
  searchVendors: (item, lat, lon) => api.get('/customer/search', { params: { item, lat, lon } }),
  
  // FIX: Added this function because landingPage.jsx looks for 'getVendors'
  getVendors: (lat, lon, radius = 5000) => api.get('/customer/vendors', { params: { lat, lon, radius } }),

  // Keep this one too as mapService.js might use it
  getNearbyVendors: (lat, lon, radius = 5000) => api.get('/customer/vendors', { params: { lat, lon, radius } }),
  
  getVendorDetails: (id) => api.get(`/customer/vendor/${id}`),
  
  initiatePayment: (data) => api.post('/customer/pay', data),
  
  checkPaymentStatus: (checkoutId) => api.get(`/customer/payment-status/${checkoutId}`)
};

export default api;