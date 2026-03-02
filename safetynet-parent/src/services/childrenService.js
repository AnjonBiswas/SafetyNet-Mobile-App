import api from './api';

/**
 * Children Management Service
 * Handles all parent-child linking and child data retrieval
 */
const childrenService = {
  /**
   * Get all linked children for the current parent
   * @returns {Promise<Object>} List of children with their status
   */
  getChildren: async () => {
    try {
      const response = await api.get('/parent/children');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request to link with a child account
   * @param {string} emailOrCode - Child's email address or link code
   * @returns {Promise<Object>} Link request response
   */
  linkChild: async (emailOrCode) => {
    try {
      // Determine if it's an email or code
      const isEmail = emailOrCode.includes('@');
      const payload = isEmail
        ? { child_email: emailOrCode }
        : { child_code: emailOrCode };

      const response = await api.post('/parent/link-request/send', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unlink a child account
   * @param {number} childId - Child's ID
   * @returns {Promise<Object>} Unlink response
   */
  unlinkChild: async (childId) => {
    try {
      const response = await api.delete(`/parent/children/${childId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current location of a child
   * @param {number} childId - Child's ID
   * @returns {Promise<Object>} Child's current location data
   */
  getChildLocation: async (childId) => {
    try {
      const response = await api.get(`/parent/children/${childId}/location`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get location history for a child
   * @param {number} childId - Child's ID
   * @param {string} fromDate - Start date (ISO format, optional)
   * @param {string} toDate - End date (ISO format, optional)
   * @returns {Promise<Object>} Location history data
   */
  getChildLocationHistory: async (childId, fromDate = null, toDate = null) => {
    try {
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await api.get(`/parent/children/${childId}/location/history`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get live location updates for a child (during SOS or active tracking)
   * @param {number} childId - Child's ID
   * @returns {Promise<Object>} Live location data
   */
  getLiveLocation: async (childId) => {
    try {
      const response = await api.get(`/parent/children/${childId}/location/live`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default childrenService;

