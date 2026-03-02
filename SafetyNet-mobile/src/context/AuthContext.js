import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

// Create Auth Context
const AuthContext = createContext(null);

// Storage keys
const USER_KEY = '@safetynet:user';
const TOKEN_KEY = '@safetynet:token';

/**
 * Auth Provider Component
 * Manages authentication state and provides auth methods
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize auth state from AsyncStorage
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Load user and token from storage on app start
   */
  const initializeAuth = async () => {
    const startTime = Date.now();
    const minimumLoadTime = 3000; // 3 seconds

    try {
      setIsLoading(true);

      // Load token and user from storage
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);

        // Verify token is still valid by fetching user data
        const userResponse = await authService.getUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(userResponse.data));
        } else {
          // Token invalid, clear storage
          await clearAuth();
        }
      }

      // Ensure minimum 3-second loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = minimumLoadTime - elapsedTime;
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await clearAuth();

      // Ensure minimum 3-second loading time even on error
      const elapsedTime = Date.now() - startTime;
      const remainingTime = minimumLoadTime - elapsedTime;
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a new user
   * @param {string} fullName - User's full name
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} passwordConfirmation - Password confirmation
   * @returns {Promise<Object>} Registration result
   */
  const register = async (fullName, email, password, passwordConfirmation) => {
    try {
      setIsLoading(true);
      const response = await authService.register(
        fullName,
        email,
        password,
        passwordConfirmation
      );

      if (response.success && response.data) {
        const userData = response.data.user;
        const authToken = response.data.token;

        // Store user and token
        setUser(userData);
        setToken(authToken);
        setIsLoggedIn(true);

        // Persist to storage
        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        return {
          success: true,
          message: response.message || 'Registration successful',
        };
      } else {
        return {
          success: false,
          message: response.message || 'Registration failed',
          errors: response.errors,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} Login result
   */
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await authService.login(email, password);

      if (response.success && response.data) {
        const userData = response.data.user;
        const authToken = response.data.token;

        // Validate that we have both user and token
        if (!userData || !authToken) {
          console.error('Login response missing user or token:', response);
          return {
            success: false,
            message: 'Invalid login response. Please try again.',
          };
        }

        // Store user and token
        setUser(userData);
        setToken(authToken);
        setIsLoggedIn(true);

        // Persist to storage
        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        console.log('Login successful, user authenticated');

        return {
          success: true,
          message: response.message || 'Login successful',
        };
      } else {
        console.error('Login failed:', response);
        return {
          success: false,
          message: response.message || 'Login failed',
          errors: response.errors,
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      setIsLoading(true);

      // Call logout API
      await authService.logout();

      // Clear local state and storage
      await clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
      // Clear auth even if API call fails
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear authentication state and storage
   * @returns {Promise<void>}
   */
  const clearAuth = async () => {
    try {
      setUser(null);
      setToken(null);
      setIsLoggedIn(false);

      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  /**
   * Refresh user data from API
   * @returns {Promise<Object>} Updated user data
   */
  const refreshUser = async () => {
    try {
      const response = await authService.getUser();
      if (response.success && response.data) {
        setUser(response.data);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
        return {
          success: true,
          data: response.data,
        };
      } else {
        // If refresh fails, user might be logged out
        if (response.message?.includes('Unauthorized') || response.message?.includes('401')) {
          await clearAuth();
        }
        return {
          success: false,
          message: response.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to refresh user data',
      };
    }
  };

  /**
   * Update user data directly (for local/mock updates)
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Update result
   */
  const updateUser = async (userData) => {
    try {
      const updatedUser = {
        ...user,
        ...userData,
      };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        message: 'Failed to update user data',
      };
    }
  };

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  const checkAuth = () => {
    return isLoggedIn && !!token && !!user;
  };

  // Context value
  const value = {
    // State
    user,
    token,
    isLoggedIn,
    isLoading,

    // Methods
    register,
    login,
    logout,
    refreshUser,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use Auth Context
 * @returns {Object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
