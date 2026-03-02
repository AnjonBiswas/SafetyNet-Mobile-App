import api from './api';
import { Platform } from 'react-native';

/**
 * Notification Service
 * Handles all notification-related API calls
 */
const notificationService = {
  /**
   * Get all notifications for the current parent
   * @param {Object} filter - Filter options
   * @param {boolean} filter.is_read - Filter by read status (true/false, optional)
   * @param {string} filter.type - Filter by type: 'sos', 'geofence', 'checkin', 'battery', 'link_request' (optional)
   * @param {number} filter.limit - Number of notifications to return (optional)
   * @param {number} filter.offset - Offset for pagination (optional)
   * @returns {Promise<Object>} List of notifications
   */
  getNotifications: async (filter = {}) => {
    try {
      const params = {};
      
      if (filter.is_read !== undefined) {
        params.is_read = filter.is_read;
      }
      
      if (filter.type) {
        params.type = filter.type;
      }
      
      if (filter.limit) {
        params.limit = filter.limit;
      }
      
      if (filter.offset) {
        params.offset = filter.offset;
      }

      const response = await api.get('/parent/notifications', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark a notification as read
   * @param {number} id - Notification ID
   * @returns {Promise<Object>} Updated notification data
   */
  markAsRead: async (id) => {
    try {
      const response = await api.put(`/parent/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Response data
   */
  markAllAsRead: async () => {
    try {
      const response = await api.put('/parent/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get count of unread notifications
   * @returns {Promise<Object>} Unread count data
   */
  getUnreadCount: async () => {
    try {
      const response = await api.get('/parent/notifications/unread-count');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a notification
   * @param {number} id - Notification ID
   * @returns {Promise<Object>} Deletion response
   */
  deleteNotification: async (id) => {
    try {
      const response = await api.delete(`/parent/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Register device token for push notifications
   * @param {string} token - Device push notification token
   * @param {string} platform - Platform: 'android' or 'ios' (auto-detected if not provided)
   * @param {string} deviceId - Unique device identifier (optional)
   * @param {string} deviceName - Device name/model (optional)
   * @returns {Promise<Object>} Registration response
   */
  saveDeviceToken: async (token, platform = null, deviceId = null, deviceName = null) => {
    try {
      // Auto-detect platform if not provided
      const detectedPlatform = platform || Platform.OS === 'ios' ? 'ios' : 'android';

      const payload = {
        token,
        platform: detectedPlatform,
      };

      // Add device_id and device_name if provided
      if (deviceId) {
        payload.device_id = deviceId;
      }
      if (deviceName) {
        payload.device_name = deviceName;
      }

      console.log('[notificationService] Registering device token:', {
        platform: detectedPlatform,
        hasDeviceId: !!deviceId,
        hasDeviceName: !!deviceName,
        tokenLength: token.length,
      });

      const response = await api.post('/parent/device-token', payload);
      
      if (response.data?.success) {
        console.log('[notificationService] ✅ Device token registered successfully');
      } else {
        console.warn('[notificationService] ⚠️ Device token registration response:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('[notificationService] ❌ Failed to register device token:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
};

export default notificationService;

