import AsyncStorage from '@react-native-async-storage/async-storage';

const TRUSTED_CONTACTS_KEY = '@safetynet:trustedContacts';
const MAX_CONTACTS = 3;

/**
 * Trusted Contact Service
 * Mock service for managing trusted contacts (local storage only)
 * Enforces maximum of 3 contacts
 */
class TrustedContactService {
  /**
   * Get all trusted contacts
   * @returns {Promise<Object>} List of contacts
   */
  async getContacts() {
    try {
      const contactsData = await AsyncStorage.getItem(TRUSTED_CONTACTS_KEY);
      if (contactsData) {
        const contacts = JSON.parse(contactsData);
        return {
          success: true,
          data: contacts,
          count: contacts.length,
        };
      }

      // Return empty array if none exist
      return {
        success: true,
        data: [],
        count: 0,
      };
    } catch (error) {
      console.error('Error getting contacts:', error);
      return {
        success: false,
        message: 'Failed to load contacts',
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Get a single contact by ID
   * @param {string} id - Contact ID
   * @returns {Promise<Object>} Contact data
   */
  async getContact(id) {
    try {
      const result = await this.getContacts();
      if (!result.success) {
        return result;
      }

      const contact = result.data.find((c) => c.id === id);
      if (!contact) {
        return {
          success: false,
          message: 'Contact not found',
          data: null,
        };
      }

      return {
        success: true,
        data: contact,
      };
    } catch (error) {
      console.error('Error getting contact:', error);
      return {
        success: false,
        message: 'Failed to load contact',
        data: null,
      };
    }
  }

  /**
   * Add a new trusted contact
   * @param {Object} contactData - Contact data {name, phone, relationship, priority}
   * @returns {Promise<Object>} Created contact
   */
  async addContact(contactData) {
    try {
      const result = await this.getContacts();
      if (!result.success) {
        return result;
      }

      const contacts = result.data;

      // Check if max limit reached
      if (contacts.length >= MAX_CONTACTS) {
        return {
          success: false,
          message: `Maximum of ${MAX_CONTACTS} trusted contacts allowed`,
          data: null,
        };
      }

      // Check for duplicate phone number
      const duplicate = contacts.find(
        (c) => c.phone === contactData.phone
      );
      if (duplicate) {
        return {
          success: false,
          message: 'A contact with this phone number already exists',
          data: null,
        };
      }

      // Create new contact
      const newContact = {
        id: Date.now().toString(),
        name: contactData.name,
        phone: contactData.phone,
        relationship: contactData.relationship || 'Friend',
        priority: contactData.priority || contacts.length + 1,
        createdAt: new Date().toISOString(),
      };

      contacts.push(newContact);
      await AsyncStorage.setItem(TRUSTED_CONTACTS_KEY, JSON.stringify(contacts));

      return {
        success: true,
        data: newContact,
        message: 'Contact added successfully',
      };
    } catch (error) {
      console.error('Error adding contact:', error);
      return {
        success: false,
        message: 'Failed to add contact',
        data: null,
      };
    }
  }

  /**
   * Update an existing contact
   * @param {string} id - Contact ID
   * @param {Object} contactData - Updated contact data
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(id, contactData) {
    try {
      const result = await this.getContacts();
      if (!result.success) {
        return result;
      }

      const contacts = result.data;
      const contactIndex = contacts.findIndex((c) => c.id === id);

      if (contactIndex === -1) {
        return {
          success: false,
          message: 'Contact not found',
          data: null,
        };
      }

      // Check for duplicate phone number (excluding current contact)
      if (contactData.phone) {
        const duplicate = contacts.find(
          (c) => c.id !== id && c.phone === contactData.phone
        );
        if (duplicate) {
          return {
            success: false,
            message: 'A contact with this phone number already exists',
            data: null,
          };
        }
      }

      // Update contact
      const updatedContact = {
        ...contacts[contactIndex],
        ...contactData,
        id, // Preserve ID
      };

      contacts[contactIndex] = updatedContact;
      await AsyncStorage.setItem(TRUSTED_CONTACTS_KEY, JSON.stringify(contacts));

      return {
        success: true,
        data: updatedContact,
        message: 'Contact updated successfully',
      };
    } catch (error) {
      console.error('Error updating contact:', error);
      return {
        success: false,
        message: 'Failed to update contact',
        data: null,
      };
    }
  }

  /**
   * Delete a contact
   * @param {string} id - Contact ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteContact(id) {
    try {
      const result = await this.getContacts();
      if (!result.success) {
        return result;
      }

      const contacts = result.data.filter((c) => c.id !== id);

      if (contacts.length === result.data.length) {
        return {
          success: false,
          message: 'Contact not found',
        };
      }

      await AsyncStorage.setItem(TRUSTED_CONTACTS_KEY, JSON.stringify(contacts));

      return {
        success: true,
        message: 'Contact deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting contact:', error);
      return {
        success: false,
        message: 'Failed to delete contact',
      };
    }
  }

  /**
   * Check if max contacts reached
   * @returns {Promise<boolean>}
   */
  async isMaxReached() {
    const result = await this.getContacts();
    return result.count >= MAX_CONTACTS;
  }
}

export default new TrustedContactService();

