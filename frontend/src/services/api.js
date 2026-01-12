import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    // FIX: Read from the 'user' object where login saves it
    const userStr = localStorage.getItem('user');
    let token = null;
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            token = user.token || user.access_token; 
        } catch (e) {
            console.error("Error parsing user token", e);
        }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      console.warn("Session expired or unauthorized.");
    }
    return Promise.reject(error);
  }
);

export const customerAPI = {
  getVendors: (params) => api.get('/customer/vendors', { params }),
  searchVendors: (params) => api.get('/customer/search', { params }),
};

export const vendorAPI = {
    checkIn: (data) => api.post('/vendor/checkin', data),
    getVendorStatus: () => api.get('/vendor/status'),
    closeVendor: () => api.post('/vendor/close'),
    getOrders: () => api.get('/vendor/orders'),
    updateMenu: (menuItems) => api.post('/vendor/menu', { menu_items: menuItems }),
    
    uploadImage: async (imageFile) => {
        const formData = new FormData();
        formData.append('file', imageFile);
        const response = await api.post('/vendor/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    
    getMenuItems: () => api.get('/vendor/menu-items'),
    createMenuItem: (data) => api.post('/vendor/menu-items', data),
    updateMenuItem: (id, data) => api.put(`/vendor/menu-items/${id}`, data),
    deleteMenuItem: (id) => api.delete(`/vendor/menu-items/${id}`),
};

export const adminAPI = {};

export default api;