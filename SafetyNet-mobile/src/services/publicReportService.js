import { publicReportsAPI } from './api';

/**
 * Public Report Service
 * Handles all public report-related API calls
 */
class PublicReportService {
  /**
   * Get all public reports
   * @returns {Promise<Object>} List of public reports
   */
  async getAll() {
    try {
      const response = await publicReportsAPI.getAll();
      return {
        success: response.success,
        data: response.data || [],
        count: response.count || 0,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch public reports',
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Get a single public report by ID
   * @param {number} id - Public report ID
   * @returns {Promise<Object>} Public report data
   */
  async getOne(id) {
    try {
      const response = await publicReportsAPI.getById(id);
      return {
        success: response.success,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch public report',
        data: null,
      };
    }
  }

  /**
   * Create a new public report (public endpoint, no auth required)
   * @param {Object} data - Public report data
   * @returns {Promise<Object>} Created public report data
   */
  async create(data) {
    try {
      const response = await publicReportsAPI.create(data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Public report submitted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to submit public report',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  /**
   * Update an existing public report (requires auth)
   * @param {number} id - Public report ID
   * @param {Object} data - Updated public report data
   * @returns {Promise<Object>} Updated public report data
   */
  async update(id, data) {
    try {
      const response = await publicReportsAPI.update(id, data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Public report updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update public report',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  /**
   * Delete a public report (requires auth)
   * @param {number} id - Public report ID
   * @returns {Promise<Object>} Deletion result
   */
  async delete(id) {
    try {
      const response = await publicReportsAPI.delete(id);
      return {
        success: response.success,
        message: response.message || 'Public report deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete public report',
      };
    }
  }
}

export default new PublicReportService();
