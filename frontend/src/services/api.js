import axios from 'axios';

// Base URL configuration
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- ROBUST TOKEN INTERCEPTOR ---
api.interceptors.request.use(
  (config) => {
    let token = null;

    try {
      // 1. Check for standalone token
      token = localStorage.getItem('token');

      // 2. If not found, check inside the 'user' object
      if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          token = user.token || user.access_token;
        }
      }

      // 3. Attach if found
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- 1. AUTH API ---
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetToken: (token) => api.get(`/auth/reset-password/${token}`),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  // account
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
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
  closeVendor: async (force = false) => {
    return api.post('/vendor/close', { force });
  },
  getOrders: () => api.get('/vendor/orders'),
  updateProfile: (data) => api.put('/vendor/profile', data),
  getAnalytics: () => api.get('/vendor/analytics'),
  updateOrderStatus: (id, status) => api.patch(`/vendor/order/${id}/status`, { status }),
  // promotions
  getPromotions: () => api.get('/vendor/promotions'),
  createPromotion: (data) => api.post('/vendor/promotions', data),
  togglePromotion: (id, isActive) => api.patch(`/vendor/promotions/${id}`, { is_active: isActive }),
  deletePromotion: (id) => api.delete(`/vendor/promotions/${id}`)
};

// --- 3. CUSTOMER API ---
export const customerAPI = {
  searchVendors: (item, lat, lon) => api.get('/customer/search', { params: { item, lat, lon } }),
  getVendors: (lat, lon, radius = 5000) => api.get('/customer/nearby', { params: { lat, lon, radius } }),
  getNearbyVendors: (lat, lon, radius = 5000) => api.get('/customer/nearby', { params: { lat, lon, radius } }),
  getVendorDetails: (id) => api.get(`/customer/vendor/${id}`),
  initiatePayment: (data) => api.post('/customer/pay', data),
  checkPaymentStatus: (checkoutId) => api.get(`/customer/payment-status/${checkoutId}`),
  getMyOrders: () => api.get('/customer/orders'),
  getMyOrder: (orderNumber) => api.get(`/customer/orders/${orderNumber}`),
  // reviews
  leaveReview: (orderNumber, rating, comment) =>
    api.post(`/customer/orders/${orderNumber}/review`, { rating, comment }),
  getVendorReviews: (vendorId) => api.get(`/customer/vendor/${vendorId}/reviews`),
  // favourites
  getFavourites: () => api.get('/customer/favourites'),
  addFavourite: (vendorId) => api.post(`/customer/favourites/${vendorId}`),
  removeFavourite: (vendorId) => api.delete(`/customer/favourites/${vendorId}`),
  // saved addresses
  getAddresses: () => api.get('/customer/addresses'),
  createAddress: (data) => api.post('/customer/addresses', data),
  updateAddress: (id, data) => api.put(`/customer/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/customer/addresses/${id}`),
  // reorder / cancel / promos
  reorder: (orderNumber) => api.post(`/customer/orders/${orderNumber}/reorder`),
  cancelOrder: (orderNumber) => api.post(`/customer/orders/${orderNumber}/cancel`),
  previewPromo: (code, vendorId, subtotal) =>
    api.post('/customer/promo/preview', { code, vendorId, subtotal }),
  // notifications (same rows serve both roles - keyed by user id)
  getNotifications: () => api.get('/customer/notifications'),
  markNotificationRead: (id) => api.post(`/customer/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/customer/notifications/read-all')
};

export default api;