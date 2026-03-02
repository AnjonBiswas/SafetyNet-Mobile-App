import Pusher from 'pusher-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const CUSTOM_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.2:8000';
const EMULATOR_BASE =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';
const BASE_URL = (CUSTOM_BASE && CUSTOM_BASE.trim() !== '') ? CUSTOM_BASE : EMULATOR_BASE;
const API_BASE_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

// Pusher Configuration
const PUSHER_KEY = '99ee065bba428c0519e2';
const PUSHER_CLUSTER = 'ap2';

// Initialize Pusher - we'll use authorizer for each channel subscription
const pusher = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  encrypted: true,
  authorizer: (channel, options) => {
    return {
      authorize: (socketId, callback) => {
        // Get token and make auth request
        AsyncStorage.getItem('@safetynet-parent:token')
          .then((token) => {
            const trimmedToken = token ? token.trim() : null;

            console.log('[Pusher] Authorizing channel (parent):', {
              channel: channel.name,
              socketId: socketId,
              hasToken: !!trimmedToken,
              tokenPreview: trimmedToken ? trimmedToken.substring(0, 20) + '...' : 'missing',
            });

            if (!trimmedToken) {
              console.error('[Pusher] No token found for authorization (parent)');
              callback(new Error('No authentication token found'), null);
              return;
            }

            // Make auth request manually
            fetch(`${API_BASE_URL}/parent/broadcasting/auth`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${trimmedToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  return response.json().then((err) => {
                    throw new Error(err.message || `HTTP ${response.status}`);
                  });
                }
                return response.json();
              })
              .then((data) => {
                console.log('[Pusher] Authorization successful (parent):', channel.name);
                callback(null, data);
              })
              .catch((error) => {
                console.error('[Pusher] Authorization error (parent):', error);
                callback(error, null);
              });
          })
          .catch((error) => {
            console.error('[Pusher] Error getting token (parent):', error);
            callback(error, null);
          });
      },
    };
  },
});

/**
 * Subscribe to parent channel
 * @param {number} parentId - Parent ID
 * @param {function} onSosAlert - Callback for SOS alerts
 * @param {function} onLocationUpdate - Callback for location updates
 * @param {function} onGeofenceEvent - Callback for geofence events
 * @returns {object} Channel subscription
 */
export const subscribeToParentChannel = (parentId, callbacks = {}) => {
  const channelName = `private-parent.${parentId}`;
  console.log('[Pusher] Subscribing to channel:', channelName);
  const channel = pusher.subscribe(channelName);

  // Log subscription events
  channel.bind('pusher:subscription_succeeded', () => {
    console.log('[Pusher] Successfully subscribed to channel:', channelName);
  });

  channel.bind('pusher:subscription_error', (error) => {
    console.error('[Pusher] Subscription error for channel:', channelName, error);
  });

  // Listen for SOS alerts
  // Backend broadcasts as 'sos.alert.triggered' (from broadcastAs())
  if (callbacks.onSosAlert) {
    console.log('[Pusher] Binding SOS alert listener to event: sos.alert.triggered');
    channel.bind('sos.alert.triggered', (data) => {
      console.log('[Pusher] SOS alert event received:', JSON.stringify(data, null, 2));
      callbacks.onSosAlert(data);
    });
    // Also bind to old event name for backward compatibility
    channel.bind('SosAlertTriggered', (data) => {
      console.log('[Pusher] SOS alert event received (legacy):', JSON.stringify(data, null, 2));
      callbacks.onSosAlert(data);
    });
  }

  // Listen for location updates
  if (callbacks.onLocationUpdate) {
    channel.bind('LocationUpdated', callbacks.onLocationUpdate);
  }

  // Listen for geofence events
  if (callbacks.onGeofenceEvent) {
    channel.bind('GeofenceEventOccurred', callbacks.onGeofenceEvent);
  }

  // Listen for notifications
  if (callbacks.onNotification) {
    channel.bind('NotificationCreated', callbacks.onNotification);
  }

  // Listen for chat messages
  if (callbacks.onChatMessage) {
    console.log('[Pusher] Binding chat message listener to event: chat.message.sent');
    channel.bind('chat.message.sent', (data) => {
      console.log('[Pusher] ✅ Chat message event received on parent channel:', {
        channel: channelName,
        event: 'chat.message.sent',
        data: data,
        hasMessage: !!data.message,
        messageId: data.message?.id,
        senderType: data.message?.sender_type,
        childId: data.message?.child_id,
      });
      callbacks.onChatMessage(data);
    });
  }

  return channel;
};

/**
 * Subscribe to SOS channel for live location updates
 * @param {number} alertId - SOS Alert ID
 * @param {function} onLocationUpdate - Callback for location updates
 * @returns {object} Channel subscription
 */
export const subscribeToSosChannel = (alertId, onLocationUpdate) => {
  const channel = pusher.subscribe(`private-sos.${alertId}`);

  if (onLocationUpdate) {
    channel.bind('LocationUpdated', onLocationUpdate);
  }

  return channel;
};

/**
 * Unsubscribe from channel
 * @param {object} channel - Pusher channel to unsubscribe
 */
export const unsubscribeFromChannel = (channel) => {
  if (channel) {
    pusher.unsubscribe(channel.name);
  }
};

/**
 * Disconnect Pusher
 */
export const disconnectPusher = () => {
  pusher.disconnect();
};

export default pusher;

