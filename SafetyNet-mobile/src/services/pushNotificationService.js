import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { navigationRef } from '../navigation/AppNavigator';
import api from './api';

// Configure how notifications are handled when received in foreground
// IMPORTANT: shouldShowAlert must be true for notifications to appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('[PushNotifications] Notification handler called - showing notification');
    return {
      shouldShowAlert: true, // CRITICAL: Must be true to show notifications in foreground
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

/**
 * Register the device for push notifications, request permissions,
 * obtain the Expo push token, and save it to the backend.
 *
 * @returns {Promise<string|null>} The Expo push token or null if not available
 */
export const registerForPushNotificationsAsync = async () => {
  try {
    console.log('[PushNotifications] Starting registration process...');
    
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[PushNotifications] Current permission status:', existingStatus);
    
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      console.log('[PushNotifications] Requesting notification permissions...');
      const permissionRequest = {
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      };
      
      // For Android, we don't need special options, but we can add them if needed
      if (Platform.OS === 'android') {
        console.log('[PushNotifications] Requesting Android notification permissions...');
      }
      
      const { status } = await Notifications.requestPermissionsAsync(permissionRequest);
      finalStatus = status;
      console.log('[PushNotifications] Permission request result:', status);
      
      if (status !== 'granted') {
        console.error('[PushNotifications] ❌ Permission denied by user');
        console.error('[PushNotifications] Please enable notifications in:');
        console.error('[PushNotifications] Android: Settings > Apps > SafetyNet Mobile > Notifications');
        console.error('[PushNotifications] iOS: Settings > SafetyNet Mobile > Notifications');
      }
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotifications] ⚠️ Push notification permissions not granted. Status:', finalStatus);
      console.warn('[PushNotifications] Please enable notifications in device settings');
      return null;
    }
    
    console.log('[PushNotifications] ✅ Permissions granted');

    // Check if running in Expo Go
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    console.log('[PushNotifications] Running in Expo Go:', isExpoGo);
    
    // Helper to check if UUID is valid (not placeholder)
    const isValidUUID = (uuid) => {
      if (!uuid) return false;
      // Check if it's not the placeholder UUID
      if (uuid === '00000000-0000-0000-0000-000000000000') return false;
      // Basic UUID format check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    };
    
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const hasValidProjectId = isValidUUID(projectId);
    
    console.log('[PushNotifications] Project ID:', projectId || 'not set');
    console.log('[PushNotifications] Is valid UUID:', hasValidProjectId);

    // In Expo Go, push tokens require a valid projectId
    // Since we don't have one, skip push token registration
    // Local notifications will still work via Pusher
    if (isExpoGo && !hasValidProjectId) {
      console.log('[PushNotifications] ⚠️ Expo Go detected without valid projectId');
      console.log('[PushNotifications] ⚠️ Skipping push token registration (not supported in Expo Go without projectId)');
      console.log('[PushNotifications] ✅ Local notifications will work via Pusher when app is running');
      console.log('[PushNotifications] 💡 To enable push notifications, create a development build with EAS projectId');
      return null; // Return null but don't treat as error
    }

    // Get Expo push token (only for development builds or Expo Go with valid projectId)
    console.log('[PushNotifications] Getting Expo push token...');
    let tokenData;
    
    try {
      const tokenOptions = hasValidProjectId ? { projectId } : undefined;
      
      if (hasValidProjectId) {
        console.log('[PushNotifications] Using valid projectId for token request');
      } else {
        console.log('[PushNotifications] Requesting token without projectId (may show deprecation warning)');
      }
      
      console.log('[PushNotifications] Requesting Expo push token...');
      tokenData = await Notifications.getExpoPushTokenAsync(tokenOptions);
      
      console.log('[PushNotifications] Token data received:', {
        hasData: !!tokenData,
        hasToken: !!tokenData?.data,
        tokenPreview: tokenData?.data ? tokenData.data.substring(0, 30) + '...' : 'none',
      });
    } catch (error) {
      console.error('[PushNotifications] ❌ Error getting Expo push token');
      console.error('[PushNotifications] Error message:', error?.message);
      
      const errorMessage = error?.message || '';
      
      // Check if it's a projectId error
      const isProjectIdError = 
        errorMessage.includes('projectId') ||
        errorMessage.includes('No \'projectId\' found') ||
        errorMessage.includes('VALIDATION_ERROR') ||
        errorMessage.includes('Invalid uuid');
      
      if (isProjectIdError) {
        console.warn('[PushNotifications] ⚠️ ProjectId required but not available');
        console.warn('[PushNotifications] ⚠️ Push token registration skipped');
        console.warn('[PushNotifications] ✅ Local notifications will still work via Pusher');
        console.warn('[PushNotifications] 💡 To enable push notifications:');
        console.warn('[PushNotifications]    1. Create EAS project: eas init');
        console.warn('[PushNotifications]    2. Add projectId to app.json');
        console.warn('[PushNotifications]    3. Or create development build: npx expo run:android');
        return null; // Return null but don't treat as error
      } else {
        console.error('[PushNotifications] Non-projectId error:', errorMessage);
        console.warn('[PushNotifications] ⚠️ Push token unavailable - local notifications will still work via Pusher');
        return null;
      }
    }
    
    const token = tokenData?.data;

    if (!token) {
      console.error('[PushNotifications] ❌ Expo push token is null or undefined');
      console.error('[PushNotifications] Token data:', tokenData);
      console.warn('[PushNotifications] ⚠️ Push token unavailable - local notifications will still work via Pusher');
      return null;
    }
    
    console.log('[PushNotifications] ✅ Expo push token obtained:', token.substring(0, 30) + '...');

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      console.log('[PushNotifications] Configuring Android notification channel...');
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'SafetyNet Notifications',
          description: 'Notifications for SafetyNet alerts, messages, and updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF4063',
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });
        console.log('[PushNotifications] ✅ Android notification channel configured');
      } catch (error) {
        console.error('[PushNotifications] Failed to configure Android channel:', error);
      }
    }

    // Save token to backend with device information
    try {
      // Get device information for better tracking
      const deviceInfo = {
        platform: Platform.OS,
        deviceName: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
      };
      
      // Try to get device ID if available
      let deviceId = null;
      try {
        // Use a combination of platform and a simple identifier
        deviceId = `${Platform.OS}-${Constants.deviceId || Constants.sessionId || 'unknown'}`;
      } catch (e) {
        console.warn('Could not get device ID:', e);
      }

      console.log('[PushNotifications] Registering device token with backend:', {
        token_preview: token.substring(0, 30) + '...',
        platform: deviceInfo.platform,
        deviceId: deviceId,
        deviceName: deviceInfo.deviceName,
      });

      const response = await api.post('/child/device-token', {
        token,
        platform: deviceInfo.platform,
        device_id: deviceId,
        device_name: deviceInfo.deviceName,
      });
      
      if (response.data?.success) {
        console.log('[PushNotifications] ✅ Device token registered successfully with backend');
        console.log('[PushNotifications] Registration response:', response.data);
      } else {
        console.warn('[PushNotifications] ⚠️ Device token registration response:', response.data);
      }
    } catch (error) {
      console.error('[PushNotifications] ❌ Failed to save device token to backend');
      console.error('[PushNotifications] Error:', error.message);
      console.error('[PushNotifications] Response data:', error.response?.data);
      console.error('[PushNotifications] Response status:', error.response?.status);
      console.error('[PushNotifications] Full error:', error);
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Set up listeners for notifications.
 *
 * @param {Object} callbacks
 * @param {Function} callbacks.onNotificationReceived - Called when notification is received in foreground
 * @param {Function} callbacks.onNotificationResponse - Called when user taps on a notification
 * @returns {{receivedListener: Notifications.Subscription, responseListener: Notifications.Subscription}}
 */
export const setupNotificationListeners = (callbacks = {}) => {
  const receivedListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      if (callbacks.onNotificationReceived) {
        callbacks.onNotificationReceived(notification);
      }
    }
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      if (callbacks.onNotificationResponse) {
        callbacks.onNotificationResponse(response);
      } else {
        // Default navigation handling
        handleNotificationResponseNavigation(response);
      }
    }
  );

  return { receivedListener, responseListener };
};

/**
 * Remove notification listeners
 */
export const removeNotificationListeners = (listeners) => {
  try {
    if (listeners?.receivedListener) {
      listeners.receivedListener.remove();
    }
    if (listeners?.responseListener) {
      listeners.responseListener.remove();
    }
  } catch (error) {
    console.error('Error removing notification listeners:', error);
  }
};

/**
 * Extract notification data payload safely
 */
const getNotificationData = (notificationOrResponse) => {
  if (!notificationOrResponse) return {};

  // Response from addNotificationResponseReceivedListener
  if (notificationOrResponse.notification) {
    return (
      notificationOrResponse.notification.request?.content?.data || {}
    );
  }

  // Notification from addNotificationReceivedListener
  return notificationOrResponse.request?.content?.data || {};
};

/**
 * Handle navigation when a notification is tapped.
 *
 * Supports the following types:
 * - LINK_REQUEST_RECEIVED
 * - LINK_REQUEST_ACCEPTED
 * - LINK_REQUEST_REJECTED
 * - SOS_ALERT
 * - Other notification types
 */
export const handleNotificationResponseNavigation = (response) => {
  const data = getNotificationData(response);
  const type = data.type;

  if (!navigationRef.isReady()) {
    console.warn('Navigation is not ready yet');
    return;
  }

  switch (type) {
    case 'LINK_REQUEST_RECEIVED': {
      // Navigate to ParentsScreen with Requests tab active
      navigationRef.navigate('Parents', { initialTab: 'requests' });
      break;
    }

    case 'LINK_REQUEST_ACCEPTED': {
      // Navigate to ParentsScreen
      navigationRef.navigate('Parents', { initialTab: 'parents' });
      break;
    }

    case 'LINK_REQUEST_REJECTED': {
      // Just show a message, no navigation needed
      // The notification itself contains the message
      break;
    }

    default: {
      // Fallback to dashboard
      navigationRef.navigate('Dashboard');
    }
  }
};

export default {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  removeNotificationListeners,
  handleNotificationResponseNavigation,
};

