import api from './api';

/**
 * Geofence Service
 * Handles all geofence (safe zone) management API calls
 */
const geofenceService = {
  /**
   * Get all geofences for a specific child or all children
   * @param {number} childId - Child's ID (optional, if not provided returns all)
   * @returns {Promise<Object>} List of geofences
   */
  getGeofences: async (childId = null) => {
    try {
      const params = childId ? { child_id: childId } : {};
      const response = await api.get('/parent/geofences', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new geofence (safe zone)
   * @param {number} childId - Child's ID
   * @param {Object} data - Geofence data
   * @param {string} data.name - Geofence name (e.g., "Home", "School")
   * @param {number} data.latitude - Center latitude
   * @param {number} data.longitude - Center longitude
   * @param {number} data.radius - Radius in meters
   * @returns {Promise<Object>} Created geofence data
   */
  createGeofence: async (childId, data) => {
    try {
      const payload = {
        child_id: childId,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius || 100, // Default 100 meters
        is_active: data.is_active !== undefined ? data.is_active : true,
      };

      const response = await api.post('/parent/geofences', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an existing geofence
   * @param {number} id - Geofence ID
   * @param {Object} data - Updated geofence data
   * @param {string} data.name - Geofence name (optional)
   * @param {number} data.latitude - Center latitude (optional)
   * @param {number} data.longitude - Center longitude (optional)
   * @param {number} data.radius - Radius in meters (optional)
   * @param {boolean} data.is_active - Active status (optional)
   * @returns {Promise<Object>} Updated geofence data
   */
  updateGeofence: async (id, data) => {
    try {
      const response = await api.put(`/parent/geofences/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a geofence
   * @param {number} id - Geofence ID
   * @returns {Promise<Object>} Deletion response
   */
  deleteGeofence: async (id) => {
    try {
      const response = await api.delete(`/parent/geofences/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a specific geofence by ID
   * @param {number} id - Geofence ID
   * @returns {Promise<Object>} Geofence data
   */
  getGeofenceById: async (id) => {
    try {
      const response = await api.get(`/parent/geofences/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default geofenceService;

