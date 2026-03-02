// IMPORTANT: Use axios browser build in React Native/Expo Go.
// The default axios entry can resolve to the Node build which imports `crypto`.
const axios = require('axios/dist/browser/axios.cjs');
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const CUSTOM_BASE = 'http://10.104.169.9:8000' // Change this to your computer's IP address
// const CUSTOM_BASE = 'http://10.10.201.220:8000'
const EMULATOR_BASE =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000' // Android emulator
    : 'http://localhost:8000' // iOS simulator

// Use CUSTOM_BASE if set, otherwise use EMULATOR_BASE
const BASE_URL = CUSTOM_BASE || EMULATOR_BASE
const API_BASE_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

// Log API base URL for debugging
console.log('🔌 API Configuration:');
console.log('  Base URL:', API_BASE_URL);
console.log('  Platform:', Platform.OS);
console.log('  Custom Base:', CUSTOM_BASE);
console.log('  Emulator Base:', EMULATOR_BASE);
console.log('  Using:', BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for slower networks
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token storage key
const TOKEN_KEY = '@safetynet:token';

/**
 * Get stored authentication token
 */
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Store authentication token
 */
export const setToken = async (token) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
    return false;
  }
};

/**
 * Remove authentication token
 */
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
};

// Request interceptor - Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For FormData uploads, remove Content-Type to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Remove invalid token
      await removeToken();

      // You can redirect to login screen here
      // NavigationService.navigate('Login');

      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      const currentIP = BASE_URL.replace('/api', '');
      const errorMessage = error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED'
        ? `Cannot connect to server at ${API_BASE_URL}.\n\nTroubleshooting:\n1. Ensure backend server is running:\n   php artisan serve --host=0.0.0.0 --port=8000\n2. Check if IP address is correct (current: ${currentIP})\n3. Verify device and server are on the same WiFi network\n4. Check Windows Firewall - allow port 8000\n5. Test in browser: ${currentIP}/api/test (if endpoint exists)`
        : error.message === 'Network Error' || error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK' || error.code === 'ETIMEDOUT'
          ? `Network error. Cannot reach server at ${API_BASE_URL}.\n\nTroubleshooting:\n1. Backend server must be running:\n   php artisan serve --host=0.0.0.0 --port=8000\n2. Current IP: ${currentIP}\n3. Verify device and server are on same WiFi network\n4. Check Windows Firewall - allow port 8000\n5. Find your current IP: ipconfig (Windows)\n6. Update IP in: SafetyNet-mobile/src/services/api.js line 6\n7. Try pinging the server IP from your device`
          : `Network error: ${error.message || 'Please check your internet connection and server status.'}\n\nCurrent API URL: ${API_BASE_URL}\nServer IP: ${currentIP}`;

      console.error('Network Error Details:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
        troubleshooting: {
          currentIP: BASE_URL.replace('/api', ''),
          platform: Platform.OS,
          suggestions: [
            'Check if backend server is running',
            'Verify IP address matches your computer\'s local IP',
            'Ensure device and computer are on same WiFi',
            'Check firewall settings',
          ],
        },
      });

      return Promise.reject({
        message: errorMessage,
        isNetworkError: true,
        code: error.code,
        apiUrl: API_BASE_URL,
      });
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An error occurred';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

/**
 * API Service Methods
 */

// Authentication
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/login', credentials);
    // Store token if login successful
    if (response.data.success && response.data.data?.token) {
      await setToken(response.data.data.token);
    }
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/logout');
    await removeToken();
    return response.data;
  },

  getUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },
};

// Reports
export const reportsAPI = {
  getAll: async () => {
    const response = await api.get('/reports');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  create: async (reportData) => {
    const response = await api.post('/reports', reportData);
    return response.data;
  },

  update: async (id, reportData) => {
    const response = await api.put(`/reports/${id}`, reportData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },
};

// Public Reports
export const publicReportsAPI = {
  getAll: async () => {
    const response = await api.get('/public-reports');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/public-reports/${id}`);
    return response.data;
  },

  create: async (reportData) => {
    const response = await api.post('/public-reports', reportData);
    return response.data;
  },

  update: async (id, reportData) => {
    const response = await api.put(`/public-reports/${id}`, reportData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/public-reports/${id}`);
    return response.data;
  },
};

// SOS Emergencies
export const sosAPI = {
  getAll: async () => {
    const response = await api.get('/sos-emergencies');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/sos-emergencies/${id}`);
    return response.data;
  },

  create: async (emergencyData) => {
    const response = await api.post('/sos-emergencies', emergencyData);
    return response.data;
  },

  update: async (id, emergencyData) => {
    const response = await api.put(`/sos-emergencies/${id}`, emergencyData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/sos-emergencies/${id}`);
    return response.data;
  },
};

// Emergency Contacts
export const emergencyContactsAPI = {
  getAll: async () => {
    const response = await api.get('/emergency-contacts');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/emergency-contacts/${id}`);
    return response.data;
  },

  create: async (contactData) => {
    const response = await api.post('/emergency-contacts', contactData);
    return response.data;
  },

  update: async (id, contactData) => {
    const response = await api.put(`/emergency-contacts/${id}`, contactData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/emergency-contacts/${id}`);
    return response.data;
  },
};

// Chat
export const chatAPI = {
  // Chat Users
  getUsers: async () => {
    const response = await api.get('/chat-users');
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/chat-users/${userId}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/chat-users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/chat-users/${userId}`, userData);
    return response.data;
  },

  // Chat Messages
  getMessages: async () => {
    const response = await api.get('/chat-messages');
    return response.data;
  },

  getMessageById: async (id) => {
    const response = await api.get(`/chat-messages/${id}`);
    return response.data;
  },

  sendMessage: async (messageData) => {
    const response = await api.post('/chat-messages', messageData);
    return response.data;
  },

  updateMessage: async (id, messageData) => {
    const response = await api.put(`/chat-messages/${id}`, messageData);
    return response.data;
  },

  // Chat Sessions
  getSessions: async () => {
    const response = await api.get('/chat-sessions');
    return response.data;
  },

  getSessionById: async (id) => {
    const response = await api.get(`/chat-sessions/${id}`);
    return response.data;
  },

  createSession: async (sessionData) => {
    const response = await api.post('/chat-sessions', sessionData);
    return response.data;
  },

  updateSession: async (id, sessionData) => {
    const response = await api.put(`/chat-sessions/${id}`, sessionData);
    return response.data;
  },
};

// Safe Zones
export const safeZonesAPI = {
  getAll: async () => {
    const response = await api.get('/safe-zones');
    return response.data;
  },
};

// Child location (for parent app live tracking - when child app is open)
export const childLocationAPI = {
  updateLocation: async (latitude, longitude, batteryLevel = null) => {
    const payload = { latitude: Number(latitude), longitude: Number(longitude) };
    if (batteryLevel !== null && batteryLevel !== undefined) {
      payload.battery_level = Math.min(100, Math.max(0, Math.round(batteryLevel)));
    }
    const response = await api.post('/child/location/update', payload);
    return response.data;
  },
  getSharingStatus: async () => {
    const response = await api.get('/child/location/sharing-status');
    return response.data;
  },
};

// Test endpoint
export const testAPI = {
  test: async () => {
    const response = await api.get('/test');
    return response.data;
  },
};

// Export default api instance
export default api;
