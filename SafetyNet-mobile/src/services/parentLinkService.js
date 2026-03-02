import api from './api';

/**
 * Parent Link Service
 * Child-side API for managing parent link requests and linked parents.
 */
const parentLinkService = {
  /**
   * Get all pending parent link requests for this child.
   * GET /api/child/link-requests
   */
  getLinkRequests: async () => {
    const response = await api.get('/child/link-requests');
    return response.data;
  },

  /**
   * Accept a parent link request.
   * POST /api/child/link-requests/{link_id}/accept
   */
  acceptLink: async (linkId) => {
    const response = await api.post(`/child/link-requests/${linkId}/accept`);
    return response.data;
  },

  /**
   * Reject a parent link request.
   * POST /api/child/link-requests/{link_id}/reject
   */
  rejectLink: async (linkId) => {
    const response = await api.post(`/child/link-requests/${linkId}/reject`);
    return response.data;
  },

  /**
   * Get all linked parents for this child.
   * GET /api/child/parents
   */
  getLinkedParents: async () => {
    const response = await api.get('/child/parents');
    return response.data;
  },

  /**
   * Remove/unlink a parent.
   * DELETE /api/child/parents/{parent_id}
   */
  removeParent: async (parentId) => {
    const response = await api.delete(`/child/parents/${parentId}`);
    return response.data;
  },

  /**
   * Update per-parent location sharing preference.
   * PUT /api/child/location/sharing
   */
  updateLocationSharing: async (parentId, enabled) => {
    const response = await api.put('/child/location/sharing', {
      parent_id: parentId,
      enabled,
    });
    return response.data;
  },
};

export default parentLinkService;


