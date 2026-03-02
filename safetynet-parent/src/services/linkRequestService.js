import api from './api';

/**
 * Link Request Service
 * Bidirectional parent-child linking service for SafetyNet Parent App
 */
const linkRequestService = {
  /**
   * Send link request to child via email
   * POST /api/parent/link-request/send
   */
  sendRequestToChild: async (email, message = null) => {
    const response = await api.post('/parent/link-request/send', {
      child_email: email,
      message: message,
    });
    return response.data;
  },

  /**
   * Get all sent link requests
   * GET /api/parent/link-requests/sent
   */
  getSentRequests: async () => {
    const response = await api.get('/parent/link-requests/sent');
    return response.data;
  },

  /**
   * Cancel a sent link request
   * DELETE /api/parent/link-requests/{id}/cancel
   */
  cancelRequest: async (id) => {
    const response = await api.delete(`/parent/link-requests/${id}/cancel`);
    return response.data;
  },

  /**
   * Get received link requests (from children)
   * GET /api/parent/link-requests/received
   */
  getReceivedRequests: async (status = 'pending') => {
    const response = await api.get('/parent/link-requests/received');
    return response.data;
  },

  /**
   * Accept a link request from child
   * POST /api/parent/link-requests/{id}/accept
   */
  acceptRequest: async (id) => {
    const response = await api.post(`/parent/link-requests/${id}/accept`);
    return response.data;
  },

  /**
   * Reject a link request from child
   * POST /api/parent/link-requests/{id}/reject
   */
  rejectRequest: async (id, reason = null) => {
    const response = await api.post(`/parent/link-requests/${id}/reject`, {
      reason: reason,
    });
    return response.data;
  },

  /**
   * Get count of pending received requests
   * GET /api/parent/link-requests/received/count
   */
  getPendingCount: async () => {
    const response = await api.get('/parent/link-requests/received/count');
    return response.data;
  },

  /**
   * Get all linked children
   * GET /api/parent/children
   */
  getLinkedChildren: async () => {
    const response = await api.get('/parent/children');
    return response.data;
  },

  /**
   * Remove/unlink a child
   * DELETE /api/parent/children/{id}
   */
  removeChild: async (id) => {
    const response = await api.delete(`/parent/children/${id}`);
    return response.data;
  },
};

export default linkRequestService;

