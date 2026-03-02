import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService, getToken } from '../services';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@safetynet-parent:token';
const PARENT_KEY = '@safetynet-parent:parent';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [parent, setParent] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    loadPersistedAuth();
  }, []);

  /**
   * Load persisted authentication data from AsyncStorage
   * Optimized for smooth auto-login: set authenticated immediately, verify in background
   */
  const loadPersistedAuth = async () => {
    try {
      setIsLoading(true);
      
      // Load token and parent data from storage
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedParent = await AsyncStorage.getItem(PARENT_KEY);

      if (storedToken && storedParent) {
        const parentData = JSON.parse(storedParent);
        
        // Set authenticated immediately for smooth UX
        setTokenState(storedToken);
        setParent(parentData);
        setIsAuthenticated(true);
        setIsLoading(false); // Allow app to render immediately
        
        // Verify token in background (non-blocking)
        verifyTokenInBackground(storedToken);
      } else {
        // No stored data, user needs to login
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading persisted auth:', error);
      await clearAuthData();
      setIsLoading(false);
    }
  };

  /**
   * Verify token in background without blocking UI
   */
  const verifyTokenInBackground = async (token) => {
    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        // Token is valid, update parent data with latest from server
        setParent(response.data);
        await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(response.data));
        console.log('Token verified successfully');
      } else {
        // Token invalid, clear storage
        console.log('Token invalid, clearing auth data');
        await clearAuthData();
      }
    } catch (error) {
      // Network error or token invalid
      // Don't clear auth on network errors - user might be offline
      // Only clear if it's a 401 (unauthorized)
      if (error.status === 401 || error.response?.status === 401) {
        console.log('Token expired (401), clearing auth data');
        await clearAuthData();
      } else {
        console.log('Token verification failed (network error), keeping auth:', error.message);
        // Keep user logged in if it's just a network error
      }
    }
  };

  /**
   * Clear all authentication data
   */
  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(PARENT_KEY);
      setTokenState(null);
      setParent(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  /**
   * Persist authentication data to AsyncStorage
   */
  const persistAuthData = async (authToken, parentData) => {
    try {
      console.log('persistAuthData called with token:', authToken ? 'present' : 'missing', 'parent:', parentData ? 'present' : 'missing');
      await AsyncStorage.setItem(TOKEN_KEY, authToken);
      await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(parentData));
      setTokenState(authToken);
      setParent(parentData);
      setIsAuthenticated(true);
      console.log('persistAuthData completed - isAuthenticated set to true');
    } catch (error) {
      console.error('Error persisting auth data:', error);
      throw error;
    }
  };

  /**
   * Check if user is logged in
   */
  const isLoggedIn = () => {
    return isAuthenticated && token !== null && parent !== null;
  };

  /**
   * Login with email and password
   */
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await authService.login(email, password);
      
      console.log('AuthContext login response:', JSON.stringify(response, null, 2));
      
      // Response structure: { success: true, data: { token, parent } }
      if (response.success && response.data?.token && response.data?.parent) {
        console.log('Login successful, persisting auth data...');
        await persistAuthData(response.data.token, response.data.parent);
        console.log('Auth data persisted, isAuthenticated should be true now');
        setIsLoading(false);
        return { success: true, data: response.data };
      }
      
      console.log('Login failed - invalid response structure');
      setIsLoading(false);
      return { 
        success: false, 
        message: response.message || 'Login failed' 
      };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please check your credentials.' 
      };
    }
  };

  /**
   * Register a new parent account
   */
  const register = async (parentData) => {
    try {
      setIsLoading(true);
      const response = await authService.register(
        parentData.name,
        parentData.email,
        parentData.password,
        parentData.password_confirmation || parentData.confirmPassword, // Support both field names
        parentData.phone
      );
      
      console.log('AuthContext register response:', JSON.stringify(response, null, 2));
      
      // Response structure: { success: true, data: { token, parent } }
      if (response.success && response.data?.token && response.data?.parent) {
        console.log('Registration successful, persisting auth data...');
        await persistAuthData(response.data.token, response.data.parent);
        console.log('Auth data persisted, isAuthenticated should be true now');
        setIsLoading(false);
        return { success: true, data: response.data };
      }
      
      console.log('Registration failed - invalid response structure');
      setIsLoading(false);
      return { 
        success: false, 
        message: response.message || 'Registration failed' 
      };
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please try again.' 
      };
    }
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      // Call logout API
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local data regardless of API call result
      await clearAuthData();
      setIsLoading(false);
    }
  };

  /**
   * Update parent profile
   */
  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      
      if (response.success && response.data) {
        // Update parent data and persist
        setParent(response.data);
        await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(response.data));
        return { success: true, data: response.data };
      }
      
      return { 
        success: false, 
        message: response.message || 'Update failed' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Update failed. Please try again.' 
      };
    }
  };

  /**
   * Refresh parent data from server
   */
  const refreshProfile = async () => {
    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        setParent(response.data);
        await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(response.data));
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        // State
        parent,
        token,
        isLoading,
        isAuthenticated,
        
        // Functions
        login,
        logout,
        register,
        updateProfile,
        refreshProfile,
        isLoggedIn,
        checkAuth: loadPersistedAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
