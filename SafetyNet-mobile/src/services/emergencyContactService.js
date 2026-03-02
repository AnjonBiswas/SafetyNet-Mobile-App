import { emergencyContactsAPI } from './api'

/**
 * Emergency Contact Service
 * Handles all emergency contact-related API calls
 */
class EmergencyContactService {
  /**
   * Get all emergency contacts for the current user
   * @returns {Promise<Object>} List of contacts
   */
  async getAll() {
    try {
      const response = await emergencyContactsAPI.getAll()
      return {
        success: response.success,
        data: response.data || [],
        count: response.count || 0,
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch contacts',
        data: [],
        count: 0,
      }
    }
  }

  /**
   * Get a single contact by ID
   * @param {number} id - Contact ID
   * @returns {Promise<Object>} Contact data
   */
  async getOne(id) {
    try {
      const response = await emergencyContactsAPI.getById(id)
      return {
        success: response.success,
        data: response.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch contact',
        data: null,
      }
    }
  }

  /**
   * Create a new emergency contact
   * @param {Object} data - Contact data {name, phone, relation}
   * @returns {Promise<Object>} Created contact data
   */
  async create(data) {
    try {
      const response = await emergencyContactsAPI.create(data)
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Contact created successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create contact',
        errors: error.data?.errors || null,
        data: null,
      }
    }
  }

  /**
   * Update an existing contact
   * @param {number} id - Contact ID
   * @param {Object} data - Updated contact data
   * @returns {Promise<Object>} Updated contact data
   */
  async update(id, data) {
    try {
      const response = await emergencyContactsAPI.update(id, data)
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Contact updated successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update contact',
        errors: error.data?.errors || null,
        data: null,
      }
    }
  }

  /**
   * Delete a contact
   * @param {number} id - Contact ID
   * @returns {Promise<Object>} Deletion result
   */
  async delete(id) {
    try {
      const response = await emergencyContactsAPI.delete(id)
      return {
        success: response.success,
        message: response.message || 'Contact deleted successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete contact',
      }
    }
  }
}

export default new EmergencyContactService()
