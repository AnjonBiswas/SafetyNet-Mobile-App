import { authAPI, getToken, setToken, removeToken } from './api';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
class AuthService {
  /**
   * Register a new user
   * @param {string} fullName - User's full name
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {string} passwordConfirmation - Password confirmation
   * @returns {Promise<Object>} Response data with user and token
   */
  async register(fullName, email, password, passwordConfirmation) {
    try {
      const response = await authAPI.register({
        full_name: fullName,
        email: email,
        password: password,
        password_confirmation: passwordConfirmation,
      });

      // Store token if registration successful
      if (response.success && response.data?.token) {
        await setToken(response.data.token);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed',
        errors: error.data?.errors || null,
      };
    }
  }

  /**
   * Login user
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} Response data with user and token
   */
  async login(email, password) {
    try {
      const response = await authAPI.login({
        email: email,
        password: password,
      });

      return {
        success: response.success,
        data: response.data,
        message: response.message,
      };
    } catch (error) {
      console.error('Login API Error:', {
        message: error.message,
        isNetworkError: error.isNetworkError,
        code: error.code,
        status: error.status,
        data: error.data,
      });
      
      return {
        success: false,
        message: error.message || 'Login failed',
        errors: error.data?.errors || null,
        isNetworkError: error.isNetworkError || false,
      };
    }
  }

  /**
   * Logout user
   * @returns {Promise<Object>} Response data
   */
  async logout() {
    try {
      const response = await authAPI.logout();
      await removeToken();
      return {
        success: response.success,
        message: response.message || 'Logged out successfully',
      };
    } catch (error) {
      // Even if API call fails, remove token locally
      await removeToken();
      return {
        success: true,
        message: 'Logged out locally',
      };
    }
  }

  /**
   * Get current authenticated user
   * @returns {Promise<Object>} User data
   */
  async getUser() {
    try {
      const response = await authAPI.getUser();
      return {
        success: response.success,
        data: response.data?.user || response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get user data',
        data: null,
      };
    }
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} True if token exists
   */
  async isAuthenticated() {
    const token = await getToken();
    return !!token;
  }

  /**
   * Get stored token
   * @returns {Promise<string|null>} Token or null
   */
  async getStoredToken() {
    return await getToken();
  }
}

export default new AuthService();
