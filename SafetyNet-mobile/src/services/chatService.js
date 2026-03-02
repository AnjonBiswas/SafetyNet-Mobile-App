import { chatAPI } from './api';

/**
 * Chat Service
 * Handles all chat-related API calls (users, messages, sessions)
 */
class ChatService {
  // ============ Chat Users ============

  /**
   * Get all chat users
   * @returns {Promise<Object>} List of chat users
   */
  async getAllUsers() {
    try {
      const response = await chatAPI.getUsers();
      return {
        success: response.success,
        data: response.data || [],
        count: response.count || 0,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat users',
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Get a single chat user by user_id
   * @param {string} userId - Chat user ID
   * @returns {Promise<Object>} Chat user data
   */
  async getUserById(userId) {
    try {
      const response = await chatAPI.getUserById(userId);
      return {
        success: response.success,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat user',
        data: null,
      };
    }
  }

  /**
   * Create a new chat user
   * @param {Object} data - Chat user data
   * @returns {Promise<Object>} Created chat user data
   */
  async createUser(data) {
    try {
      const response = await chatAPI.createUser(data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Chat user created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create chat user',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  /**
   * Update an existing chat user
   * @param {string} userId - Chat user ID
   * @param {Object} data - Updated chat user data
   * @returns {Promise<Object>} Updated chat user data
   */
  async updateUser(userId, data) {
    try {
      const response = await chatAPI.updateUser(userId, data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Chat user updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update chat user',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  // ============ Chat Messages ============

  /**
   * Get all chat messages
   * @returns {Promise<Object>} List of chat messages
   */
  async getAllMessages() {
    try {
      const response = await chatAPI.getMessages();
      return {
        success: response.success,
        data: response.data || [],
        count: response.count || 0,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat messages',
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Get a single chat message by ID
   * @param {number} id - Chat message ID
   * @returns {Promise<Object>} Chat message data
   */
  async getMessageById(id) {
    try {
      const response = await chatAPI.getMessageById(id);
      return {
        success: response.success,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat message',
        data: null,
      };
    }
  }

  /**
   * Send a new chat message
   * @param {Object} data - Chat message data
   * @returns {Promise<Object>} Created chat message data
   */
  async sendMessage(data) {
    try {
      const response = await chatAPI.sendMessage(data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Message sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to send message',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  /**
   * Update an existing chat message
   * @param {number} id - Chat message ID
   * @param {Object} data - Updated chat message data
   * @returns {Promise<Object>} Updated chat message data
   */
  async updateMessage(id, data) {
    try {
      const response = await chatAPI.updateMessage(id, data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Message updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update message',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  // ============ Chat Sessions ============

  /**
   * Get all chat sessions
   * @returns {Promise<Object>} List of chat sessions
   */
  async getAllSessions() {
    try {
      const response = await chatAPI.getSessions();
      return {
        success: response.success,
        data: response.data || [],
        count: response.count || 0,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat sessions',
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Get a single chat session by ID
   * @param {number} id - Chat session ID
   * @returns {Promise<Object>} Chat session data
   */
  async getSessionById(id) {
    try {
      const response = await chatAPI.getSessionById(id);
      return {
        success: response.success,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch chat session',
        data: null,
      };
    }
  }

  /**
   * Create a new chat session
   * @param {Object} data - Chat session data
   * @returns {Promise<Object>} Created chat session data
   */
  async createSession(data) {
    try {
      const response = await chatAPI.createSession(data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Chat session created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create chat session',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }

  /**
   * Update an existing chat session
   * @param {number} id - Chat session ID
   * @param {Object} data - Updated chat session data
   * @returns {Promise<Object>} Updated chat session data
   */
  async updateSession(id, data) {
    try {
      const response = await chatAPI.updateSession(id, data);
      return {
        success: response.success,
        data: response.data,
        message: response.message || 'Chat session updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update chat session',
        errors: error.data?.errors || null,
        data: null,
      };
    }
  }
}

export default new ChatService();
