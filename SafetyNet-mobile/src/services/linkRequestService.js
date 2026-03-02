import api from './api';

/**
 * Link Request Service
 * Bidirectional parent-child linking service for SafetyNet Child App
 */
const linkRequestService = {
  /**
   * Send link request to parent via email
   * POST /api/child/link-request/send
   */
  sendRequestToParent: async (email, message = null) => {
    const response = await api.post('/child/link-request/send', {
      parent_email: email,
      message: message,
    });
    return response.data;
  },

  /**
   * Get all sent link requests
   * GET /api/child/link-requests/sent
   */
  getSentRequests: async () => {
    const response = await api.get('/child/link-requests/sent');
    return response.data;
  },

  /**
   * Cancel a sent link request
   * DELETE /api/child/link-requests/{id}/cancel
   */
  cancelRequest: async (id) => {
    const response = await api.delete(`/child/link-requests/${id}/cancel`);
    return response.data;
  },

  /**
   * Get received link requests (from parents)
   * GET /api/child/link-requests/received
   */
  getReceivedRequests: async (status = 'pending') => {
    const response = await api.get('/child/link-requests/received');
    return response.data;
  },

  /**
   * Accept a link request from parent
   * POST /api/child/link-requests/{id}/accept
   */
  acceptRequest: async (id) => {
    const response = await api.post(`/child/link-requests/${id}/accept`);
    return response.data;
  },

  /**
   * Reject a link request from parent
   * POST /api/child/link-requests/{id}/reject
   */
  rejectRequest: async (id, reason = null) => {
    const response = await api.post(`/child/link-requests/${id}/reject`, {
      reason: reason,
    });
    return response.data;
  },

  /**
   * Get count of pending received requests
   * GET /api/child/link-requests/received/count
   */
  getPendingCount: async () => {
    const response = await api.get('/child/link-requests/received/count');
    return response.data;
  },

  /**
   * Get all linked parents
   * GET /api/child/parents
   */
  getLinkedParents: async () => {
    const response = await api.get('/child/parents');
    return response.data;
  },

  /**
   * Remove/unlink a parent
   * DELETE /api/child/parents/{id}
   */
  removeParent: async (id) => {
    const response = await api.delete(`/child/parents/${id}`);
    return response.data;
  },

  /**
   * Create a direct link with a parent via QR code scan (automatic acceptance)
   * POST /api/child/parents/link-direct
   */
  linkDirect: async (parentEmail, parentId, parentName) => {
    const response = await api.post('/child/parents/link-direct', {
      parent_email: parentEmail,
      parent_id: parentId,
      parent_name: parentName,
    });
    return response.data;
  },
};

export default linkRequestService;

