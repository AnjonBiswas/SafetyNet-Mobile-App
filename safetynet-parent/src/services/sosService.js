import api from './api';

/**
 * SOS Alerts Service
 * Handles all SOS alert-related API calls
 */
const sosService = {
  /**
   * Get all SOS alerts for linked children
   * @param {string} status - Filter by status: 'active', 'acknowledged', 'resolved', or 'all' (default)
   * @param {number} childId - Optional: Filter by specific child ID
   * @returns {Promise<Object>} List of SOS alerts
   */
  getAlerts: async (status = 'all', childId = null) => {
    try {
      const params = { status };
      if (childId) params.child_id = childId;
      
      const response = await api.get('/parent/sos/alerts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get SOS alerts for a specific child
   * @param {number} childId - Child ID
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<Object>} List of SOS alerts for the child
   */
  getChildAlerts: async (childId, status = 'all') => {
    return sosService.getAlerts(status, childId);
  },

  /**
   * Get detailed information about a specific SOS alert
   * @param {number} alertId - SOS Alert ID
   * @returns {Promise<Object>} Detailed alert data with location history
   */
  getAlertDetail: async (alertId) => {
    try {
      const response = await api.get(`/parent/sos/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Acknowledge an SOS alert
   * @param {number} alertId - SOS Alert ID
   * @returns {Promise<Object>} Updated alert data
   */
  acknowledgeAlert: async (alertId) => {
    try {
      const response = await api.post(`/parent/sos/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Resolve an SOS alert
   * @param {number} alertId - SOS Alert ID
   * @returns {Promise<Object>} Updated alert data
   */
  resolveAlert: async (alertId) => {
    try {
      const response = await api.post(`/parent/sos/alerts/${alertId}/resolve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get live location updates during an active SOS alert
   * @param {number} alertId - SOS Alert ID
   * @returns {Promise<Object>} Live location data
   */
  getLiveLocation: async (alertId) => {
    try {
      const response = await api.get(`/parent/sos/alerts/${alertId}/location/live`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get SOS videos for a specific child
   * @param {number} childId - Child ID
   * @returns {Promise<Object>} List of SOS videos
   */
  getChildVideos: async (childId) => {
    try {
      const response = await api.get(`/parent/sos/videos/${childId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default sosService;
