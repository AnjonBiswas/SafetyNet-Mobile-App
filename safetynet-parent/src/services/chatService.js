import api from './api';

const chatService = {
  /**
   * Get messages between parent and child
   */
  async getMessages(childId) {
    try {
      const timestamp = Date.now();
      const response = await api.get(`/parent/chat/${childId}/messages?t=${timestamp}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch messages',
        data: [],
      };
    }
  },

  /**
   * Send a text message
   */
  async sendMessage(childId, message) {
    try {
      const response = await api.post(`/parent/chat/${childId}/send`, {
        message,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send message',
      };
    }
  },

  /**
   * Send media (image, video, audio)
   */
  async sendMedia(childId, mediaUri, messageType, caption = null, duration = null) {
    try {
      const formData = new FormData();

      // Extract file name and type from URI
      const uriParts = mediaUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const fileType = fileName.split('.').pop();

      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (messageType === 'video') {
        mimeType = fileType === 'mp4' ? 'video/mp4' : 'video/quicktime';
      } else if (messageType === 'audio') {
        mimeType = fileType === 'mp3' ? 'audio/mpeg' : 'audio/m4a';
      } else if (fileType === 'png') {
        mimeType = 'image/png';
      } else if (fileType === 'gif') {
        mimeType = 'image/gif';
      }

      formData.append('media', {
        uri: mediaUri,
        type: mimeType,
        name: fileName,
      });
      formData.append('message_type', messageType);
      if (caption) {
        formData.append('message', caption);
      }
      if (duration !== null && messageType === 'audio') {
        formData.append('media_duration', duration.toString());
      }

      const response = await api.post(`/parent/chat/${childId}/send-media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error sending media:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send media',
      };
    }
  },

  /**
   * Mark messages as read
   */
  async markAsRead(childId) {
    try {
      const response = await api.put(`/parent/chat/${childId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark messages as read',
      };
    }
  },

  /**
   * Get unread message count
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/parent/chat/unread-count');
      console.log('[chatService] Unread count API response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('[chatService] Error getting unread count:', error);
      return {
        success: false,
        data: { unread_count: 0 },
      };
    }
  },
};

export default chatService;
