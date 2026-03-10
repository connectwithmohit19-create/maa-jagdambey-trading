import axios from 'axios';


const api = axios.create({
  baseURL: "http://localhost:5001/api",
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mjt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mjt_token');
      localStorage.removeItem('mjt_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password });
export const getMe = () => api.get('/auth/me');
export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

// ─── Dashboard ────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getLowStockProducts = () => api.get('/dashboard/low-stock');

// ─── Products ─────────────────────────────────────────────────
export const getProducts = (params = {}) => api.get('/products', { params });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const getProductCategories = () => api.get('/products/categories/all');

// ─── Customers ───────────────────────────────────────────────
export const getCustomers = (params = {}) => api.get('/customers', { params });
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const getPriceCategories = () => api.get('/customers/price-categories/all');

// ─── Orders ──────────────────────────────────────────────────
export const getOrders = (params = {}) => api.get('/orders', { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrderStatus = (id, order_status) =>
  api.patch(`/orders/${id}/status`, { order_status });
export const recordOrderPayment = (id, data) =>
  api.post(`/orders/${id}/payment`, data);
export const getCustomerOrders = (customerId) =>
  api.get(`/orders/customer/${customerId}`);

// ─── Payments ────────────────────────────────────────────────
export const getPayments = (params = {}) => api.get('/payments', { params });

export default api;

// ─── Employees ───────────────────────────────────────────────
export const getEmployees = (params = {}) => api.get('/employees', { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const markAttendance = (id, data) => api.post(`/employees/${id}/attendance`, data);
export const getEmployeeAttendance = (id, params = {}) => api.get(`/employees/${id}/attendance`, { params });
export const recordEmployeePayment = (id, data) => api.post(`/employees/${id}/payment`, data);
export const recordEmployeePurchase = (id, data) => api.post(`/employees/${id}/purchase`, data);
export const getTodayAttendance = () => api.get('/employees/attendance/today');

// ─── Reports ─────────────────────────────────────────────────
export const getSalesReport = (params = {}) => api.get('/reports/sales', { params });
export const getOutstandingReport = (params = {}) => api.get('/reports/outstanding', { params });
export const getStockReport = (params = {}) => api.get('/reports/stock', { params });
export const getEmployeeReport = (params = {}) => api.get('/reports/employees', { params });

// ─── Portal (admin management) ───────────────────────────────
export const setPortalCredentials = (data) => api.post('/portal/admin/set-credentials', data);

// ─── Portal (customer-facing, use portalApi for these) ───────

export const portalApi = axios.create({ baseURL: 'http://localhost:5001/api/portal', timeout: 15000, headers: { 'Content-Type': 'application/json' } });
portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('mjt_portal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
portalApi.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('mjt_portal_token');
    localStorage.removeItem('mjt_portal_customer');
    if (window.location.pathname.startsWith('/portal')) window.location.href = '/portal/login';
  }
  return Promise.reject(err);
});

export const portalLogin = (username, password) => portalApi.post('/login', { username, password });
export const portalGetMe = () => portalApi.get('/me');
export const portalGetDashboard = () => portalApi.get('/dashboard');
export const portalGetOrders = (params = {}) => portalApi.get('/orders', { params });
export const portalGetOrder = (id) => portalApi.get(`/orders/${id}`);
export const portalGetPayments = () => portalApi.get('/payments');

// ─── Public Catalogue (no auth needed) ───────────────────────
export const catalogueApi = axios.create({
  baseURL: 'http://localhost:5001/api/catalogue',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
export const getCatalogueProducts = (params = {}) => catalogueApi.get('/products', { params });
export const getCatalogueProduct  = (id) => catalogueApi.get(`/products/${id}`);
export const getCatalogueCategories = () => catalogueApi.get('/categories');
