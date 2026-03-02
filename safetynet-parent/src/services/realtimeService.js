import pusher, {
  subscribeToParentChannel as baseSubscribeToParentChannel,
  subscribeToSosChannel as baseSubscribeToSosChannel,
  unsubscribeFromChannel,
  disconnectPusher,
} from './pusherService';

/**
 * High-level realtime service wrapping Pusher.
 * Provides convenience methods for subscribing to parent and SOS channels
 * and handling common event types with consistent naming.
 */

/**
 * Subscribe to parent channel with standardized event names.
 *
 * Backend events (Laravel) are mapped as:
 * - SosAlertTriggered     -> sos_triggered
 * - LocationUpdated       -> location_updated
 * - GeofenceEventOccurred -> geofence_event
 * - ChildStatusChanged    -> child_status_changed
 *
 * @param {number} parentId
 * @param {Object} handlers
 * @param {Function} handlers.onSosTriggered
 * @param {Function} handlers.onLocationUpdated
 * @param {Function} handlers.onGeofenceEvent
 * @param {Function} handlers.onChildStatusChanged
 * @returns {object} Pusher channel
 */
export const subscribeToParentRealtime = (parentId, handlers = {}) => {
  const channel = baseSubscribeToParentChannel(parentId, {
    onSosAlert: (data) => {
      handlers.onSosTriggered && handlers.onSosTriggered(data);
    },
    onLocationUpdate: (data) => {
      handlers.onLocationUpdated && handlers.onLocationUpdated(data);
    },
    onGeofenceEvent: (data) => {
      handlers.onGeofenceEvent && handlers.onGeofenceEvent(data);
    },
  });

  // Child status changed (must be emitted by backend as 'ChildStatusChanged')
  channel.bind('ChildStatusChanged', (data) => {
    handlers.onChildStatusChanged && handlers.onChildStatusChanged(data);
  });

  // Connection state change logging / basic handling (Pusher auto-reconnects)
  pusher.connection.bind('state_change', (states) => {
    if (handlers.onConnectionStateChange) {
      handlers.onConnectionStateChange(states);
    }
  });

  return channel;
};

/**
 * Subscribe to SOS channel for live location updates during SOS.
 *
 * @param {number} alertId
 * @param {Function} onLocationUpdated
 * @returns {object} Pusher channel
 */
export const subscribeToSosRealtime = (alertId, onLocationUpdated) => {
  return baseSubscribeToSosChannel(alertId, (data) => {
    onLocationUpdated && onLocationUpdated(data);
  });
};

/**
 * Unsubscribe from a specific channel.
 */
export const unsubscribeRealtimeChannel = (channel) => {
  try {
    unsubscribeFromChannel(channel);
  } catch (error) {
    console.error('Error unsubscribing from realtime channel:', error);
  }
};

/**
 * Disconnect from realtime (e.g., on logout).
 */
export const disconnectRealtime = () => {
  try {
    disconnectPusher();
  } catch (error) {
    console.error('Error disconnecting realtime service:', error);
  }
};

export default {
  subscribeToParentRealtime,
  subscribeToSosRealtime,
  unsubscribeRealtimeChannel,
  disconnectRealtime,
};


