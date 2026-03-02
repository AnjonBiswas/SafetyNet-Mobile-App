import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
// Update this to match your backend URL
// Priority: Environment variable > CUSTOM_BASE > EMULATOR_BASE
const CUSTOM_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.104.169.9:8000'; // Change this to your computer's IP address
const EMULATOR_BASE =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000' // Android emulator
    : 'http://localhost:8000'; // iOS simulator

// Use CUSTOM_BASE if set and not empty, otherwise use EMULATOR_BASE
const BASE_URL = (CUSTOM_BASE && CUSTOM_BASE.trim() !== '') ? CUSTOM_BASE : EMULATOR_BASE;
const API_BASE_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

// Log API URL for debugging (only in development 10.153.61.9)
if (__DEV__) {
  console.log('API Base URL:', API_BASE_URL);
}

// Token storage key
const TOKEN_KEY = '@safetynet-parent:token';

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

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      await removeToken();
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      const errorMessage = error.code === 'ECONNREFUSED'
        ? `Cannot connect to server at ${API_BASE_URL}.\n\nTroubleshooting:\n1. Ensure backend server is running\n2. Check if IP address is correct\n3. Verify device and server are on the same WiFi network`
        : `Network error: ${error.message || 'Please check your internet connection and server status.'}`;

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

// Export default api instance
export default api;
