import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const AI_URL = process.env.REACT_APP_AI_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE_URL });
const aiApi = axios.create({ baseURL: AI_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  sendOtp: (rationCardNumber, mobileNumber) =>
    api.post('/api/auth/user/send-otp', { rationCardNumber, mobileNumber }),

  verifyOtp: (rationCardNumber, mobileNumber, otp) =>
    api.post('/api/auth/user/verify-otp', { rationCardNumber, mobileNumber, otp }),

  adminLogin: (username, password) =>
    api.post('/api/auth/admin/login', { username, password }),
};

export const userApi = {
  getProfile: () => api.get('/api/user/profile'),
  getMembers: () => api.get('/api/user/members'),
  getStock: () => api.get('/api/user/stock'),
  getTransactions: () => api.get('/api/user/transactions'),
  getNotifications: () => api.get('/api/user/notifications'),
  markNotificationRead: (id) => api.put(`/api/user/notifications/${id}/read`),
};

export const tokenApi = {
  generate: (data) => api.post('/api/tokens/generate', data),
  getMyTokens: () => api.get('/api/tokens/my-tokens'),
  cancel: (tokenNumber) => api.put(`/api/tokens/${tokenNumber}/cancel`),
};

export const stockApi = {
  getByShop: (shopId) => api.get(`/api/stock/shop/${shopId}`),
  getAlternatives: (itemId) => api.get(`/api/stock/alternatives/${itemId}`),
  getLowStockAlerts: () => api.get('/api/stock/admin/alerts'),
};

export const adminApi = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  getUsers: () => api.get('/api/admin/users'),
  getShops: () => api.get('/api/admin/shops'),
  getTransactionReport: () => api.get('/api/admin/reports/transactions'),
};

export const aiModuleApi = {
  predictDemand: (data) => aiApi.post('/api/ai/predict-demand', data),
  suggestAlternatives: (data) => aiApi.post('/api/ai/suggest-alternatives', data),
  getRedistribution: (data) => aiApi.post('/api/ai/redistribution', data),
  getUsagePatterns: (data) => aiApi.post('/api/ai/usage-patterns', data),
  health: () => aiApi.get('/health'),
};

export default api;