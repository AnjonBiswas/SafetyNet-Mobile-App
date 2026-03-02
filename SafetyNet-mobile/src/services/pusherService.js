import Pusher from 'pusher-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api'; // Import api to get the same base URL

// Get API base URL from api.js to ensure consistency
// Extract baseURL from the axios instance
const API_BASE_URL = api.defaults.baseURL;

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
        AsyncStorage.getItem('@safetynet:token')
          .then((token) => {
            const trimmedToken = token ? token.trim() : null;

            console.log('[Pusher] Authorizing channel:', {
              channel: channel.name,
              socketId: socketId,
              hasToken: !!trimmedToken,
              tokenPreview: trimmedToken ? trimmedToken.substring(0, 20) + '...' : 'missing',
            });

            if (!trimmedToken) {
              console.error('[Pusher] No token found for authorization');
              callback(new Error('No authentication token found'), null);
              return;
            }

            // Make auth request manually
            const authUrl = `${API_BASE_URL}/broadcasting/auth`;
            console.log('[Pusher] Making authorization request to:', authUrl);
            
            fetch(authUrl, {
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
              .then(async (response) => {
                const responseText = await response.text();
                console.log('[Pusher] Auth response:', {
                  status: response.status,
                  statusText: response.statusText,
                  responseText: responseText.substring(0, 200),
                });

                if (!response.ok) {
                  let errorMessage = `HTTP ${response.status}`;
                  try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                  } catch (e) {
                    errorMessage = responseText || errorMessage;
                  }
                  throw new Error(errorMessage);
                }

                try {
                  const data = JSON.parse(responseText);
                  console.log('[Pusher] Authorization successful:', channel.name);
                  return data;
                } catch (e) {
                  console.error('[Pusher] Failed to parse response:', e);
                  throw new Error('Invalid response from server');
                }
              })
              .then((data) => {
                callback(null, data);
              })
              .catch((error) => {
                console.error('[Pusher] Authorization error:', {
                  message: error.message,
                  channel: channel.name,
                  error: error,
                  type: error.name || 'Unknown',
                });
                
                // Provide more helpful error message for network errors
                if (error.message && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch'))) {
                  console.error('[Pusher] Network error - check API base URL:', API_BASE_URL);
                  console.error('[Pusher] Ensure backend server is running and accessible at this URL');
                  console.error('[Pusher] Current API base URL:', API_BASE_URL);
                }
                
                callback(error, null);
              });
          })
          .catch((error) => {
            console.error('[Pusher] Error getting token:', error);
            callback(error, null);
          });
      },
    };
  },
});

/**
 * Subscribe to child channel
 * @param {number} childId - Child ID
 * @param {object} callbacks - Event callbacks
 * @returns {object} Channel subscription
 */
export const subscribeToChildChannel = (childId, callbacks = {}) => {
  const channelName = `private-child.${childId}`;
  console.log('[Pusher] Subscribing to channel:', channelName);
  const channel = pusher.subscribe(channelName);

  // Log subscription events
  channel.bind('pusher:subscription_succeeded', () => {
    console.log('[Pusher] Successfully subscribed to channel:', channelName);
  });

  channel.bind('pusher:subscription_error', (error) => {
    console.error('[Pusher] Subscription error for channel:', channelName, error);
  });

  // Listen for chat messages
  if (callbacks.onChatMessage) {
    channel.bind('chat.message.sent', (data) => {
      console.log('[Pusher] Chat message received:', data);
      callbacks.onChatMessage(data);
    });
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
