import axios from 'axios';

let apiBaseURL = import.meta.env.VITE_API_URL || '';
if (apiBaseURL) {
  if (!apiBaseURL.endsWith('/api') && !apiBaseURL.endsWith('/api/')) {
    apiBaseURL = apiBaseURL.replace(/\/$/, '') + '/api';
  }
} else {
  apiBaseURL = 'https://vaultbank-backend-3x09.onrender.com/api';
}

const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vaultbank_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (expired/invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('vaultbank_token');
      localStorage.removeItem('vaultbank_user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
