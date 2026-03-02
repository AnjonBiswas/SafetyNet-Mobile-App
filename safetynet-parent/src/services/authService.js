import api from './api';
import { setToken, removeToken } from './api';

/**
 * Parent Authentication Service
 * Handles all authentication-related API calls
 */
const authService = {
  /**
   * Register a new parent account
   * @param {string} name - Parent's full name
   * @param {string} email - Parent's email address
   * @param {string} password - Parent's password
   * @param {string} password_confirmation - Password confirmation
   * @param {string} phone - Parent's phone number (optional)
   * @returns {Promise<Object>} Response data with token and parent info
   */
  register: async (name, email, password, password_confirmation, phone = null) => {
    try {
      const response = await api.post('/parent/register', {
        name,
        email,
        password,
        password_confirmation,
        phone,
      });

      // Store token if registration successful
      if (response.data.success && response.data.data?.token) {
        await setToken(response.data.data.token);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Login with email and password
   * @param {string} email - Parent's email address
   * @param {string} password - Parent's password
   * @returns {Promise<Object>} Response data with token and parent info
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/parent/login', {
        email,
        password,
      });

      // Store token if login successful
      if (response.data.success && response.data.data?.token) {
        await setToken(response.data.data.token);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout current parent session
   * @returns {Promise<Object>} Response data
   */
  logout: async () => {
    try {
      const response = await api.post('/parent/logout');
      // Remove token from storage
      await removeToken();
      return response.data;
    } catch (error) {
      // Even if API call fails, remove token locally
      await removeToken();
      throw error;
    }
  },

  /**
   * Get current parent profile
   * @returns {Promise<Object>} Parent profile data
   */
  getProfile: async () => {
    try {
      const response = await api.get('/parent/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update parent profile
   * @param {Object} data - Profile data to update (name, phone, profile_image)
   * @returns {Promise<Object>} Updated parent profile data
   */
  updateProfile: async (data) => {
    try {
      const response = await api.put('/parent/profile', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default authService;

